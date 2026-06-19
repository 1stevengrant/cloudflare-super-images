<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Data;

class ImageDetails
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public readonly string $id,
        public readonly bool $draft,
        public readonly ?string $uploaded,
        public readonly array $raw = [],
    ) {}

    /**
     * @param  array<string, mixed>  $result
     */
    public static function fromApiResult(array $result): self
    {
        return new self(
            id: (string) ($result['id'] ?? ''),
            draft: (bool) ($result['draft'] ?? false),
            uploaded: isset($result['uploaded']) ? (string) $result['uploaded'] : null,
            raw: $result,
        );
    }

    public function isReady(): bool
    {
        return ! $this->draft;
    }
}
