<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages;

use Ghijk\CloudflareSuperImages\View\Components\CloudflareImage;
use Illuminate\Support\Facades\Blade;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class CloudflareSuperImagesServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('cloudflare-super-images')
            ->hasConfigFile()
            ->hasViews();
    }

    public function packageRegistered(): void
    {
        $this->app->singleton(CloudflareImages::class, function ($app): CloudflareImages {
            $config = CloudflareImagesConfig::fromArray(
                $app['config']->get('cloudflare-super-images', [])
            );

            return new CloudflareImages($config);
        });
    }

    public function packageBooted(): void
    {
        Blade::component('cloudflare-image', CloudflareImage::class);

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../resources/js' => resource_path('js/vendor/cloudflare-super-images'),
            ], 'cloudflare-super-images-js');
        }
    }
}
