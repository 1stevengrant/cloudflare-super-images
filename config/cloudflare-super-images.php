<?php

declare(strict_types=1);

return [
    /*
     * Your Cloudflare account ID. Used when minting Direct Creator Upload URLs
     * and when reading or deleting image assets through the REST API.
     */
    'account_id' => env('CF_ACCOUNT_ID'),

    /*
     * The public-safe delivery hash for imagedelivery.net URLs. Found under
     * Images → Hosted Images → Developer Resources. Safe to expose in markup.
     */
    'account_hash' => env('CF_ACCOUNT_HASH'),

    /*
     * An API token with the "Cloudflare Images: Edit" permission. Used to mint
     * Direct Creator Upload URLs and to read or delete assets.
     */
    'api_token' => env('CF_IMAGES_TOKEN'),

    /*
     * The host that serves delivery URLs. There is rarely a reason to change
     * this away from Cloudflare's default.
     */
    'delivery_host' => 'https://imagedelivery.net',

    'upload' => [
        /*
         * When false, delivery URLs are public and require no signature. Set to
         * true for private user content and serve it through signed URLs.
         */
        'require_signed_urls' => false,

        /*
         * How long a minted Direct Creator Upload URL stays valid, in minutes.
         */
        'ttl_minutes' => 10,

        /*
         * Private metadata stored against every direct upload. Never exposed to
         * viewers. Merged with any metadata passed at upload time.
         */
        'metadata' => [
            'source' => 'cloudflare-super-images',
        ],
    ],

    'verification' => [
        /*
         * A direct upload is created as a draft and flips to "uploaded" once the
         * browser POST completes. These settings control the exponential backoff
         * used when polling for that transition.
         */
        'attempts' => 10,

        /*
         * The initial delay between verification attempts, in milliseconds.
         */
        'initial_delay_ms' => 250,

        /*
         * The ceiling for the backoff delay between attempts, in milliseconds.
         */
        'max_delay_ms' => 2000,
    ],
];
