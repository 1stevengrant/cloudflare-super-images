<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Facades;

use Ghijk\CloudflareSuperImages\CloudflareImages as CloudflareImagesManager;
use Ghijk\CloudflareSuperImages\Data\DirectUpload;
use Ghijk\CloudflareSuperImages\Data\ImageDetails;
use Ghijk\CloudflareSuperImages\ImageUrlBuilder;
use Illuminate\Support\Facades\Facade;

/**
 * @method static ImageUrlBuilder url(string $imageId)
 * @method static string variant(string $imageId, string $variant)
 * @method static DirectUpload requestDirectUpload(array $metadata = [])
 * @method static ImageDetails|null getImageDetails(string $imageId)
 * @method static void assertUploaded(string $imageId)
 * @method static bool delete(string $imageId)
 * @method static string accountHash()
 *
 * @see CloudflareImagesManager
 */
class CloudflareImages extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return CloudflareImagesManager::class;
    }
}
