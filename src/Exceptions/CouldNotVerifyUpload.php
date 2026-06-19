<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Exceptions;

use Exception;

class CouldNotVerifyUpload extends Exception
{
    public static function stillDraft(string $imageId): self
    {
        return new self(
            "Cloudflare Images accepted the upload `{$imageId}`, but it still reports as a draft. Try verifying again in a moment."
        );
    }
}
