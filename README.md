# Cloudflare Super Images

A Laravel package for [Cloudflare Images](https://developers.cloudflare.com/images/). Build flexible delivery URLs, mint Direct Creator Upload URLs, verify uploads, and clean up assets, all from a clean, fluent API.

## What it does

* **Flexible delivery URLs**. Build `imagedelivery.net` URLs with width, height, fit, quality, and format through a fluent builder.
* **Background removal**. Append `segment=foreground` (Cloudflare's BiRefNet model) with a single chainable call. Transparency-safe format handling is automatic.
* **Smart crops**. Use `gravity=face` with an optional `zoom` to keep portraits framed.
* **Presets and named variants**. Ship with thumbnail, classic, and hero presets, or point at dashboard variants.
* **Direct Creator Upload**. Mint one-time upload URLs so the browser uploads straight to Cloudflare, bypassing your application's request body limits.
* **Upload verification**. Poll with exponential backoff until a draft upload flips to ready.

This package relies on **Flexible Variants** being enabled on your account (Dashboard, Images, Hosted Images, Delivery) so arbitrary transformation parameters such as `w=600,fit=cover` render.

## Installation

```bash
composer require ghijk/cloudflare-super-images
```

Publish the config file:

```bash
php artisan vendor:publish --tag="cloudflare-super-images-config"
```

## Configuration

Add your Cloudflare credentials to `.env`:

```dotenv
CF_ACCOUNT_ID=your-account-id
CF_ACCOUNT_HASH=your-public-delivery-hash
CF_IMAGES_TOKEN=your-images-edit-token
```

| Variable | Purpose |
| --- | --- |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID. |
| `CF_ACCOUNT_HASH` | Public-safe Images delivery hash (Images, Hosted Images, Developer Resources). Safe to expose in markup. |
| `CF_IMAGES_TOKEN` | API token with `Account, Cloudflare Images, Edit`, used to mint upload URLs and manage assets. |

## Building delivery URLs

```php
use Ghijk\CloudflareSuperImages\Facades\CloudflareImages;
use Ghijk\CloudflareSuperImages\Enums\ImageFit;
use Ghijk\CloudflareSuperImages\Enums\ImageFormat;
use Ghijk\CloudflareSuperImages\Enums\ImageGravity;
use Ghijk\CloudflareSuperImages\Enums\ImagePreset;

// Responsive product card
CloudflareImages::url($imageId)
    ->width(600)
    ->fit(ImageFit::Cover)
    ->format(ImageFormat::Auto)
    ->toString();

// Background removal (format defaults to PNG to preserve transparency)
CloudflareImages::url($imageId)
    ->removeBackground()
    ->width(800)
    ->toString();

// Face-aware crop
CloudflareImages::url($imageId)
    ->preset(ImagePreset::Thumbnail)
    ->gravity(ImageGravity::Face)
    ->zoom(0.5)
    ->toString();

// A named variant configured in the dashboard
CloudflareImages::variant($imageId, 'hero');
```

The builder casts to a string, so you can use it directly in markup or pass it anywhere a string is expected.

## Blade component

```blade
<x-cloudflare-image
    image-id="{{ $product->image_id }}"
    :width="600"
    fit="cover"
    :remove-background="$product->remove_bg"
    alt="{{ $product->caption }}"
    class="rounded-lg"
/>

<x-cloudflare-image image-id="{{ $product->image_id }}" preset="thumbnail" />

<x-cloudflare-image image-id="{{ $product->image_id }}" variant="hero" />
```

Any extra attributes (`alt`, `class`, `loading`) pass straight through to the rendered `<img>` tag.

## Inertia (React and Vue)

The package ships React and Vue components that build delivery URLs on the client from an `imageId`, so one image can render at many sizes without a server prop per variant. They share a small TypeScript port of the URL builder.

Publish the stubs into your app, where your existing Vite and TypeScript pipeline compiles them:

```bash
php artisan vendor:publish --tag="cloudflare-super-images-js"
```

This copies `buildImageUrl.ts`, `react/CloudflareImage.tsx`, and `vue/CloudflareImage.vue` into `resources/js/vendor/cloudflare-super-images`.

Share your public delivery hash once so the components can read it. In `app/Http/Middleware/HandleInertiaRequests.php`:

```php
use Ghijk\CloudflareSuperImages\Facades\CloudflareImages;

public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'cloudflareImages' => [
            'accountHash' => CloudflareImages::accountHash(),
        ],
    ];
}
```

Then use the component. Options map onto the same names as the PHP builder, and extra attributes pass through to the `<img>`:

```tsx
import { CloudflareImage } from '@/vendor/cloudflare-super-images/react/CloudflareImage'

<CloudflareImage imageId={product.image_id} preset="thumbnail" alt={product.caption} />
<CloudflareImage imageId={product.image_id} width={600} fit="cover" removeBackground />
```

```vue
<script setup lang="ts">
import CloudflareImage from '@/vendor/cloudflare-super-images/vue/CloudflareImage.vue'
</script>

<template>
    <CloudflareImage :image-id="product.image_id" preset="thumbnail" :alt="product.caption" />
    <CloudflareImage :image-id="product.image_id" :width="600" fit="cover" remove-background />
</template>
```

If you would rather not share the hash globally, pass it explicitly with an `accountHash` prop. To keep the URL built on the server instead, drop the components and pass `CloudflareImages::url($id)->...->toString()` as a plain string prop.

## Direct Creator Upload

Mint a one-time upload URL and hand it to the browser:

```php
use Ghijk\CloudflareSuperImages\Facades\CloudflareImages;

$upload = CloudflareImages::requestDirectUpload([
    'product_id' => $product->id,
]);

// $upload->id, $upload->uploadUrl, $upload->accountHash
return response()->json($upload->toArray());
```

The browser then POSTs the file directly to `$upload->uploadUrl`. Once that completes, verify the asset before persisting anything that points at it:

```php
// Polls with exponential backoff, throws CouldNotVerifyUpload if it never readies
CloudflareImages::assertUploaded($upload->id);
```

## Reading and deleting assets

```php
$details = CloudflareImages::getImageDetails($imageId);

if ($details?->isReady()) {
    // ...
}

// Best-effort cleanup, returns a boolean rather than throwing
CloudflareImages::delete($imageId);
```

## How upload works

```text
  Browser                    Your app                        Cloudflare
 ─────────                  ──────────                       ────────────
   │                                                            │
   │  1. requestDirectUpload()  ───────►  POST direct_upload    │
   │                                                            │
   │  ◄────  { id, uploadUrl }  ◄────────────────────────────── │
   │                                                            │
   │  2. POST file directly to uploadUrl  ────────────────────► │
   │                                                            │
   │  3. assertUploaded(id)  ───────────►  verify upload        │
   │                                                            │
   │  4. <x-cloudflare-image> renders imagedelivery.net URL ─── │
```

## Testing

```bash
composer test
```

The package ships with `Http::fake()` driven tests for the API client and pure unit tests for the URL builder.

## Credits

Ported from a TanStack Start on Cloudflare Workers demo into a reusable Laravel package.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
