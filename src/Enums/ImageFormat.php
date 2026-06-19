<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Enums;

enum ImageFormat: string
{
    case Auto = 'auto';
    case Avif = 'avif';
    case Webp = 'webp';
    case Jpeg = 'jpeg';
    case Png = 'png';

    public function label(): string
    {
        return match ($this) {
            self::Auto => 'Auto',
            self::Avif => 'AVIF',
            self::Webp => 'WebP',
            self::Jpeg => 'JPEG',
            self::Png => 'PNG',
        };
    }

    /*
     * "auto" lets Cloudflare negotiate AVIF/WebP/JPEG from the Accept header, so
     * the format param is omitted from the delivery URL entirely.
     */
    public function isAuto(): bool
    {
        return $this === self::Auto;
    }

    public function flattensTransparency(): bool
    {
        return $this === self::Jpeg;
    }
}
