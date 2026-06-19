<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages;

use Ghijk\CloudflareSuperImages\Enums\ImageFit;
use Ghijk\CloudflareSuperImages\Enums\ImageFormat;
use Ghijk\CloudflareSuperImages\Enums\ImageGravity;
use Ghijk\CloudflareSuperImages\Enums\ImagePreset;
use Illuminate\Support\Traits\Conditionable;
use Stringable;

class ImageUrlBuilder implements Stringable
{
    use Conditionable;

    protected ?int $width = null;

    protected ?int $height = null;

    protected ?ImageFit $fit = null;

    protected ?ImageGravity $gravity = null;

    protected ?float $zoom = null;

    protected bool $removeBackground = false;

    protected ImageFormat $format = ImageFormat::Auto;

    protected ?int $quality = null;

    public function __construct(
        protected string $deliveryHost,
        protected string $accountHash,
        protected string $imageId,
    ) {}

    public function width(int $width): static
    {
        $this->width = $width;

        return $this;
    }

    public function height(int $height): static
    {
        $this->height = $height;

        return $this;
    }

    public function fit(ImageFit $fit): static
    {
        $this->fit = $fit;

        return $this;
    }

    public function gravity(ImageGravity $gravity): static
    {
        $this->gravity = $gravity;

        return $this;
    }

    public function zoom(float $zoom): static
    {
        $this->zoom = $zoom;

        return $this;
    }

    public function removeBackground(bool $removeBackground = true): static
    {
        $this->removeBackground = $removeBackground;

        return $this;
    }

    public function format(ImageFormat $format): static
    {
        $this->format = $format;

        return $this;
    }

    public function quality(int $quality): static
    {
        $this->quality = $quality;

        return $this;
    }

    public function preset(ImagePreset $preset): static
    {
        return $this
            ->width($preset->width())
            ->height($preset->height())
            ->fit($preset->fit());
    }

    public function toString(): string
    {
        $tail = $this->options();

        return "{$this->deliveryHost}/{$this->accountHash}/{$this->imageId}/{$tail}";
    }

    public function __toString(): string
    {
        return $this->toString();
    }

    /*
     * Flexible Variants require at least one transformation parameter, so an
     * empty option set falls back to "public" (a built-in variant Cloudflare
     * creates automatically).
     */
    protected function options(): string
    {
        $params = [];

        if ($this->width !== null) {
            $params[] = "w={$this->width}";
        }

        if ($this->height !== null) {
            $params[] = "h={$this->height}";
        }

        if ($this->fit !== null) {
            $params[] = "fit={$this->fit->value}";
        }

        if ($this->gravity !== null) {
            $params[] = "gravity={$this->gravity->value}";
        }

        if ($this->gravity === ImageGravity::Face) {
            if ($this->zoom !== null) {
                $clampedZoom = $this->clampFloat($this->zoom, 0, 1);
                $params[] = "zoom={$clampedZoom}";
            }
        }

        if ($this->quality !== null) {
            $clampedQuality = $this->clamp($this->quality, 1, 100);
            $params[] = "quality={$clampedQuality}";
        }

        foreach ($this->formatParams() as $param) {
            $params[] = $param;
        }

        return $params === [] ? 'public' : implode(',', $params);
    }

    /*
     * segment=foreground needs a format that supports transparency. When the
     * caller leaves the format on "auto" while removing the background, PNG is
     * forced; an explicit non-auto format is always respected.
     *
     * @return array<int, string>
     */
    protected function formatParams(): array
    {
        if ($this->removeBackground) {
            $format = $this->format->isAuto() ? ImageFormat::Png : $this->format;

            return ['segment=foreground', "format={$format->value}"];
        }

        if (! $this->format->isAuto()) {
            return ["format={$this->format->value}"];
        }

        return [];
    }

    protected function clamp(int $value, int $min, int $max): int
    {
        return max($min, min($max, $value));
    }

    protected function clampFloat(float $value, float $min, float $max): float
    {
        return round(max($min, min($max, $value)), 2);
    }
}
