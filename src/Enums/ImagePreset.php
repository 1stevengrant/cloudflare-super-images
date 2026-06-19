<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Enums;

enum ImagePreset: string
{
    case Thumbnail = 'thumbnail';
    case Classic = 'classic';
    case Hero = 'hero';

    public function label(): string
    {
        return match ($this) {
            self::Thumbnail => 'Thumbnail',
            self::Classic => 'Classic',
            self::Hero => 'Hero',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Thumbnail => 'Catalog grid & cart line items',
            self::Classic => 'Square product image',
            self::Hero => 'Wide 16:9 banner',
        };
    }

    public function width(): int
    {
        return match ($this) {
            self::Thumbnail => 200,
            self::Classic => 800,
            self::Hero => 1600,
        };
    }

    public function height(): int
    {
        return match ($this) {
            self::Thumbnail => 200,
            self::Classic => 800,
            self::Hero => 900,
        };
    }

    public function fit(): ImageFit
    {
        return ImageFit::Cover;
    }
}
