<?php

declare(strict_types=1);

use Ghijk\CloudflareSuperImages\CloudflareImages;
use Ghijk\CloudflareSuperImages\CloudflareImagesConfig;
use Ghijk\CloudflareSuperImages\Exceptions\CouldNotRequestDirectUpload;
use Ghijk\CloudflareSuperImages\Exceptions\CouldNotVerifyUpload;
use Ghijk\CloudflareSuperImages\Exceptions\MissingCredentials;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

function images(): CloudflareImages
{
    return app(CloudflareImages::class);
}

it('builds delivery urls seeded with the configured account hash', function () {
    expect(images()->url('img')->toString())
        ->toBe('https://imagedelivery.net/hash_abc/img/public');
});

it('builds named variant urls', function () {
    expect(images()->variant('img', 'thumbnail'))
        ->toBe('https://imagedelivery.net/hash_abc/img/thumbnail');
});

it('requests a direct creator upload', function () {
    Http::fake([
        'api.cloudflare.com/*' => Http::response([
            'success' => true,
            'result' => ['id' => 'img1', 'uploadURL' => 'https://upload.example/abc'],
        ]),
    ]);

    $upload = images()->requestDirectUpload();

    expect($upload->id)->toBe('img1')
        ->and($upload->uploadUrl)->toBe('https://upload.example/abc')
        ->and($upload->accountHash)->toBe('hash_abc');

    Http::assertSent(fn ($request) => str_contains($request->url(), 'images/v2/direct_upload')
        && $request->hasHeader('Authorization', 'Bearer token_xyz'));
});

it('throws when the direct upload response is unsuccessful', function () {
    Http::fake([
        'api.cloudflare.com/*' => Http::response(['success' => false, 'errors' => ['nope']]),
    ]);

    images()->requestDirectUpload();
})->throws(CouldNotRequestDirectUpload::class);

it('returns null when image details are not found', function () {
    Http::fake(['api.cloudflare.com/*' => Http::response('', 404)]);

    expect(images()->getImageDetails('missing'))->toBeNull();
});

it('reads image details', function () {
    Http::fake([
        'api.cloudflare.com/*' => Http::response([
            'success' => true,
            'result' => ['id' => 'img1', 'draft' => false, 'uploaded' => '2024-01-01T00:00:00Z'],
        ]),
    ]);

    $details = images()->getImageDetails('img1');

    expect($details->id)->toBe('img1')
        ->and($details->isReady())->toBeTrue();
});

it('passes verification once the upload is no longer a draft', function () {
    Http::fake([
        'api.cloudflare.com/*' => Http::response([
            'success' => true,
            'result' => ['id' => 'img1', 'draft' => false],
        ]),
    ]);

    images()->assertUploaded('img1');
})->throwsNoExceptions();

it('throws after exhausting verification attempts on a persistent draft', function () {
    Sleep::fake();

    config()->set('cloudflare-super-images.verification.attempts', 3);
    app()->forgetInstance(CloudflareImages::class);

    Http::fake([
        'api.cloudflare.com/*' => Http::response([
            'success' => true,
            'result' => ['id' => 'img1', 'draft' => true],
        ]),
    ]);

    images()->assertUploaded('img1');
})->throws(CouldNotVerifyUpload::class);

it('reports success when deleting an asset', function () {
    Http::fake(['api.cloudflare.com/*' => Http::response(['success' => true])]);

    expect(images()->delete('img1'))->toBeTrue();
});

it('throws when credentials are missing', function () {
    $images = new CloudflareImages(CloudflareImagesConfig::fromArray(['account_hash' => 'hash_abc']));

    $images->requestDirectUpload();
})->throws(MissingCredentials::class);
