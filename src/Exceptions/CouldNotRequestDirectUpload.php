<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Exceptions;

use Exception;

class CouldNotRequestDirectUpload extends Exception
{
    public static function requestFailed(string $body): self
    {
        return new self("Cloudflare Images direct_upload request failed: {$body}");
    }

    public static function unsuccessfulResponse(string $errors): self
    {
        return new self("Cloudflare Images returned an error while minting a direct upload: {$errors}");
    }
}
