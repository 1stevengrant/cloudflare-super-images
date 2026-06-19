<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\View\Components;

use Ghijk\CloudflareSuperImages\CloudflareImages;
use Ghijk\CloudflareSuperImages\Enums\ImageFit;
use Ghijk\CloudflareSuperImages\Enums\ImageFormat;
use Ghijk\CloudflareSuperImages\Enums\ImageGravity;
use Ghijk\CloudflareSuperImages\Enums\ImagePreset;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class CloudflareImage extends Component
{
    public string $url;

    public function __construct(
        CloudflareImages $images,
        string $imageId,
        ?string $variant = null,
        ?string $preset = null,
        ?int $width = null,
        ?int $height = null,
        ?string $fit = null,
        ?string $gravity = null,
        ?float $zoom = null,
        ?string $format = null,
        ?int $quality = null,
        bool $removeBackground = false,
    ) {
        if ($variant !== null) {
            $this->url = $images->variant($imageId, $variant);

            return;
        }

        $builder = $images->url($imageId);

        if ($preset !== null) {
            $builder->preset(ImagePreset::from($preset));
        }

        if ($width !== null) {
            $builder->width($width);
        }

        if ($height !== null) {
            $builder->height($height);
        }

        if ($fit !== null) {
            $builder->fit(ImageFit::from($fit));
        }

        if ($gravity !== null) {
            $builder->gravity(ImageGravity::from($gravity));
        }

        if ($zoom !== null) {
            $builder->zoom($zoom);
        }

        if ($format !== null) {
            $builder->format(ImageFormat::from($format));
        }

        if ($quality !== null) {
            $builder->quality($quality);
        }

        if ($removeBackground) {
            $builder->removeBackground();
        }

        $this->url = $builder->toString();
    }

    public function render(): View
    {
        // @phpstan-ignore argument.type
        return view('cloudflare-super-images::components.image');
    }
}
