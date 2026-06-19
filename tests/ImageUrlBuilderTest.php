<?php

declare(strict_types=1);

use Ghijk\CloudflareSuperImages\Enums\ImageFit;
use Ghijk\CloudflareSuperImages\Enums\ImageFormat;
use Ghijk\CloudflareSuperImages\Enums\ImageGravity;
use Ghijk\CloudflareSuperImages\Enums\ImagePreset;
use Ghijk\CloudflareSuperImages\ImageUrlBuilder;

function builder(): ImageUrlBuilder
{
    return new ImageUrlBuilder('https://imagedelivery.net', 'hash', 'img');
}

it('falls back to the public variant when no options are set', function () {
    expect((string) builder())->toBe('https://imagedelivery.net/hash/img/public');
});

it('builds width, height and fit options in order', function () {
    $url = builder()->width(600)->height(400)->fit(ImageFit::Cover)->toString();

    expect($url)->toBe('https://imagedelivery.net/hash/img/w=600,h=400,fit=cover');
});

it('adds zoom only when gravity is face', function () {
    $faced = builder()->gravity(ImageGravity::Face)->zoom(0.5)->toString();
    $autoGravity = builder()->gravity(ImageGravity::Auto)->zoom(0.5)->toString();

    expect($faced)->toBe('https://imagedelivery.net/hash/img/gravity=face,zoom=0.5');
    expect($autoGravity)->toBe('https://imagedelivery.net/hash/img/gravity=auto');
});

it('clamps zoom between 0 and 1', function () {
    $url = builder()->gravity(ImageGravity::Face)->zoom(5)->toString();

    expect($url)->toContain('zoom=1');
});

it('clamps quality between 1 and 100', function () {
    expect(builder()->quality(150)->toString())->toContain('quality=100');
    expect(builder()->quality(0)->toString())->toContain('quality=1');
});

it('forces png and segment when removing background with auto format', function () {
    $url = builder()->removeBackground()->toString();

    expect($url)->toBe('https://imagedelivery.net/hash/img/segment=foreground,format=png');
});

it('respects an explicit format while removing background', function () {
    $url = builder()->removeBackground()->format(ImageFormat::Webp)->toString();

    expect($url)->toBe('https://imagedelivery.net/hash/img/segment=foreground,format=webp');
});

it('omits the format param for auto without background removal', function () {
    expect(builder()->format(ImageFormat::Auto)->toString())
        ->toBe('https://imagedelivery.net/hash/img/public');
});

it('emits an explicit non-auto format', function () {
    expect(builder()->format(ImageFormat::Avif)->toString())
        ->toBe('https://imagedelivery.net/hash/img/format=avif');
});

it('applies preset dimensions and fit', function () {
    $url = builder()->preset(ImagePreset::Hero)->toString();

    expect($url)->toBe('https://imagedelivery.net/hash/img/w=1600,h=900,fit=cover');
});
