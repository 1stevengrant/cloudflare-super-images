<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Data;

class DirectUpload
{
    public function __construct(
        public readonly string $id,
        public readonly string $uploadUrl,
        public readonly string $accountHash,
    ) {}

    /**
     * @return array{id: string, upload_url: string, account_hash: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'upload_url' => $this->uploadUrl,
            'account_hash' => $this->accountHash,
        ];
    }
}
