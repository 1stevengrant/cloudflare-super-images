<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages;

class CloudflareImagesConfig
{
    /**
     * @param  array<string, mixed>  $uploadMetadata
     */
    public function __construct(
        public readonly ?string $accountId,
        public readonly ?string $accountHash,
        public readonly ?string $apiToken,
        public readonly string $deliveryHost,
        public readonly bool $requireSignedUrls,
        public readonly int $uploadTtlMinutes,
        public readonly array $uploadMetadata,
        public readonly int $verifyAttempts,
        public readonly int $verifyInitialDelayMs,
        public readonly int $verifyMaxDelayMs,
    ) {}

    /**
     * @param  array<string, mixed>  $config
     */
    public static function fromArray(array $config): self
    {
        return new self(
            accountId: $config['account_id'] ?? null,
            accountHash: $config['account_hash'] ?? null,
            apiToken: $config['api_token'] ?? null,
            deliveryHost: $config['delivery_host'] ?? 'https://imagedelivery.net',
            requireSignedUrls: (bool) ($config['upload']['require_signed_urls'] ?? false),
            uploadTtlMinutes: (int) ($config['upload']['ttl_minutes'] ?? 10),
            uploadMetadata: $config['upload']['metadata'] ?? [],
            verifyAttempts: (int) ($config['verification']['attempts'] ?? 10),
            verifyInitialDelayMs: (int) ($config['verification']['initial_delay_ms'] ?? 250),
            verifyMaxDelayMs: (int) ($config['verification']['max_delay_ms'] ?? 2000),
        );
    }
}
