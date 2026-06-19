<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Exceptions;

use Exception;

class MissingCredentials extends Exception
{
    public static function make(): self
    {
        return new self(
            'Missing Cloudflare credentials. Set CF_ACCOUNT_ID and CF_IMAGES_TOKEN in your environment. See the package README for setup.'
        );
    }
}
