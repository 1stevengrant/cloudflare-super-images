<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Tests;

use Ghijk\CloudflareSuperImages\CloudflareSuperImagesServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

class TestCase extends Orchestra
{
    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            CloudflareSuperImagesServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('cloudflare-super-images.account_id', 'acct_123');
        $app['config']->set('cloudflare-super-images.account_hash', 'hash_abc');
        $app['config']->set('cloudflare-super-images.api_token', 'token_xyz');
    }
}
