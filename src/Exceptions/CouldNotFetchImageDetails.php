<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Exceptions;

use Exception;

class CouldNotFetchImageDetails extends Exception
{
    public static function requestFailed(string $imageId, string $errors): self
    {
        return new self("Cloudflare Images status check for `{$imageId}` failed: {$errors}");
    }
}
