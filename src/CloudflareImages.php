<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages;

use Ghijk\CloudflareSuperImages\Data\DirectUpload;
use Ghijk\CloudflareSuperImages\Data\ImageDetails;
use Ghijk\CloudflareSuperImages\Exceptions\CouldNotFetchImageDetails;
use Ghijk\CloudflareSuperImages\Exceptions\CouldNotRequestDirectUpload;
use Ghijk\CloudflareSuperImages\Exceptions\CouldNotVerifyUpload;
use Ghijk\CloudflareSuperImages\Exceptions\MissingCredentials;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

class CloudflareImages
{
    protected const API_BASE = 'https://api.cloudflare.com/client/v4';

    public function __construct(
        protected CloudflareImagesConfig $config,
    ) {}

    public function url(string $imageId): ImageUrlBuilder
    {
        return new ImageUrlBuilder($this->config->deliveryHost, $this->accountHash(), $imageId);
    }

    /*
     * Build a delivery URL for a named variant configured in the dashboard
     * (Images → Variants), e.g. "thumbnail". Named variants keep working when
     * Flexible Variants is disabled, but their size and crop are fixed.
     */
    public function variant(string $imageId, string $variant): string
    {
        return "{$this->config->deliveryHost}/{$this->accountHash()}/{$imageId}/{$variant}";
    }

    /**
     * Request a one-time Direct Creator Upload URL. The browser POSTs the file
     * directly to Cloudflare, bypassing your application's request body limits.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function requestDirectUpload(array $metadata = []): DirectUpload
    {
        $this->assertCredentials();

        $payload = array_merge($this->config->uploadMetadata, $metadata);

        $response = Http::withToken($this->config->apiToken)
            ->asMultipart()
            ->post($this->endpoint('images/v2/direct_upload'), [
                ['name' => 'requireSignedURLs', 'contents' => $this->config->requireSignedUrls ? 'true' : 'false'],
                ['name' => 'expiry', 'contents' => $this->expiry()],
                ['name' => 'metadata', 'contents' => json_encode($payload)],
            ]);

        if ($response->failed()) {
            throw CouldNotRequestDirectUpload::requestFailed($response->body());
        }

        $json = $response->json();

        if (! ($json['success'] ?? false)) {
            throw CouldNotRequestDirectUpload::unsuccessfulResponse(json_encode($json['errors'] ?? []));
        }

        return new DirectUpload(
            id: $json['result']['id'],
            uploadUrl: $json['result']['uploadURL'],
            accountHash: $this->accountHash(),
        );
    }

    public function getImageDetails(string $imageId): ?ImageDetails
    {
        $this->assertCredentials();

        $response = Http::withToken($this->config->apiToken)
            ->get($this->endpoint('images/v1/'.rawurlencode($imageId)));

        if ($response->status() === 404) {
            return null;
        }

        $json = $response->json();

        if ($response->failed()) {
            throw CouldNotFetchImageDetails::requestFailed($imageId, json_encode($json['errors'] ?? $response->status()));
        }

        if (! ($json['success'] ?? false)) {
            throw CouldNotFetchImageDetails::requestFailed($imageId, json_encode($json['errors'] ?? []));
        }

        return ImageDetails::fromApiResult($json['result'] ?? []);
    }

    /*
     * A Direct Creator Upload is created as a draft and only flips to "uploaded"
     * once the browser POST completes. Poll with exponential backoff until the
     * asset is ready before committing anything that points at it.
     */
    public function assertUploaded(string $imageId): void
    {
        $delayMs = $this->config->verifyInitialDelayMs;

        for ($attempt = 1; $attempt <= $this->config->verifyAttempts; $attempt++) {
            $details = $this->getImageDetails($imageId);

            if ($details !== null && $details->isReady()) {
                return;
            }

            if ($attempt < $this->config->verifyAttempts) {
                Sleep::for($delayMs)->milliseconds();
                $delayMs = min($delayMs * 2, $this->config->verifyMaxDelayMs);
            }
        }

        throw CouldNotVerifyUpload::stillDraft($imageId);
    }

    /*
     * Best-effort removal of the backing asset. Callers that have already
     * dropped their own record should not fail if this cleanup errors, so the
     * outcome is returned as a boolean rather than thrown.
     */
    public function delete(string $imageId): bool
    {
        $this->assertCredentials();

        $response = Http::withToken($this->config->apiToken)
            ->delete($this->endpoint('images/v1/'.rawurlencode($imageId)));

        return $response->successful();
    }

    public function accountHash(): string
    {
        return $this->config->accountHash ?? '';
    }

    protected function assertCredentials(): void
    {
        if (empty($this->config->accountId)) {
            throw MissingCredentials::make();
        }

        if (empty($this->config->apiToken)) {
            throw MissingCredentials::make();
        }
    }

    protected function endpoint(string $suffix): string
    {
        return self::API_BASE."/accounts/{$this->config->accountId}/{$suffix}";
    }

    protected function expiry(): string
    {
        return now()->addMinutes($this->config->uploadTtlMinutes)->toIso8601String();
    }
}
