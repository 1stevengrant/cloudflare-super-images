/**
 * Helpers for building Cloudflare Images delivery URLs.
 *
 * Delivery URL shape:
 *   https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT-OR-OPTIONS>
 *
 * We rely on "Flexible Variants" being enabled on the account so we can
 * pass arbitrary transformation parameters in the URL (e.g. `w=400,fit=cover`).
 *
 *   Dashboard → Images → Hosted Images → Delivery → enable "Flexible variants"
 *
 * Background removal uses the `segment=foreground` parameter, which is a
 * built-in Cloudflare Images feature backed by the BiRefNet segmentation model.
 *   https://blog.cloudflare.com/background-removal/
 *
 * Face-aware cropping uses `gravity=face` with an optional `zoom` value when
 * the image is delivered through a crop-like fit.
 */

const DELIVERY_HOST = 'https://imagedelivery.net'

/** "auto" means: omit the format param so Cloudflare auto-negotiates AVIF/WebP/JPEG based on Accept. */
export type ImageFormat = 'auto' | 'avif' | 'webp' | 'jpeg' | 'png'
export type ImageGravity = 'auto' | 'face' | 'left' | 'right' | 'top' | 'bottom'

export const FORMAT_LABEL: Record<ImageFormat, string> = {
  auto: 'Auto',
  avif: 'AVIF',
  webp: 'WebP',
  jpeg: 'JPEG',
  png: 'PNG',
}

/**
 * Delivery presets shown on the product detail page.
 *
 * These map directly onto Cloudflare Images named variants. With Flexible
 * Variants enabled they work straight from the URL (w/h/fit), but you can also
 * recreate them in the dashboard under Images → Variants with these exact
 * dimensions and "Scale and crop" (= fit=cover):
 *
 *   thumbnail  →  200 × 200    Scale and crop
 *   classic    →  800 × 800    Scale and crop
 *   hero       → 1600 × 900    Scale and crop
 */
export type ImagePresetId = 'thumbnail' | 'classic' | 'hero'

export type ImagePreset = {
  id: ImagePresetId
  label: string
  description: string
  width: number
  height: number
  fit: NonNullable<ImageUrlOptions['fit']>
}

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'thumbnail',
    label: 'Thumbnail',
    description: 'Catalog grid & cart line items',
    width: 200,
    height: 200,
    fit: 'cover',
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Square product image',
    width: 800,
    height: 800,
    fit: 'cover',
  },
  {
    id: 'hero',
    label: 'Hero',
    description: 'Wide 16:9 banner',
    width: 1600,
    height: 900,
    fit: 'cover',
  },
]

export type ImageUrlOptions = {
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** How to fit width/height. `cover` for square thumbs, `scale-down` for hi-res. */
  fit?: 'cover' | 'contain' | 'scale-down' | 'crop' | 'pad'
  /** Crop focal point. `face` keeps detected faces centered for cover/crop. */
  gravity?: ImageGravity
  /** How tightly to crop toward a face when `gravity=face` (0-1). */
  zoom?: number
  /** Apply Cloudflare's foreground segmentation (background removal). */
  removeBackground?: boolean
  /** Output format. "auto" omits the param so the browser/Cloudflare negotiate. */
  format?: ImageFormat
  /** Quality 1-100 (ignored for png) */
  quality?: number
}

export function buildImageUrl(
  accountHash: string,
  imageId: string,
  opts: ImageUrlOptions = {},
): string {
  const params: string[] = []

  if (opts.width) params.push(`w=${opts.width}`)
  if (opts.height) params.push(`h=${opts.height}`)
  if (opts.fit) params.push(`fit=${opts.fit}`)
  if (opts.gravity) params.push(`gravity=${opts.gravity}`)
  if (opts.gravity === 'face' && opts.zoom != null) {
    params.push(`zoom=${clampFloat(opts.zoom, 0, 1)}`)
  }
  if (opts.quality) params.push(`quality=${clamp(opts.quality, 1, 100)}`)

  // Keep hosted Images flexible URLs to the subset verified against
  // imagedelivery.net. Some options documented for /cdn-cgi/image remote
  // transformations, such as `metadata=none` and `onerror=redirect`, are
  // rejected here with 403s and no CORS headers.

  // segment=foreground requires a format that supports transparency. If the
  // user picked "auto" while bg-removal is on, force PNG; otherwise honor it.
  if (opts.removeBackground) {
    params.push('segment=foreground')
    const fmt = opts.format && opts.format !== 'auto' ? opts.format : 'png'
    // PNG and WebP are the realistic transparent options; if user picked
    // jpeg/avif we still respect it (avif supports alpha), but jpeg flattens.
    params.push(`format=${fmt}`)
  } else if (opts.format && opts.format !== 'auto') {
    params.push(`format=${opts.format}`)
  }

  // Flexible Variants require at least one parameter; default to `public`
  // (a built-in variant Cloudflare creates automatically) if nothing was set.
  const tail = params.length ? params.join(',') : 'public'

  return `${DELIVERY_HOST}/${accountHash}/${imageId}/${tail}`
}

/**
 * Build a delivery URL for a *named variant* configured in the dashboard
 * (Images → Variants), e.g. `thumbnail`, `classic`, `hero`.
 *
 *   https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>
 *
 * Unlike flexible URLs, named variants keep working when "Flexible variants"
 * is turned off — but their size/crop is fixed by the dashboard config, so
 * per-request format, quality, and `segment=foreground` do not apply.
 */
export function buildVariantUrl(
  accountHash: string,
  imageId: string,
  variant: string,
): string {
  return `${DELIVERY_HOST}/${accountHash}/${imageId}/${variant}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function clampFloat(value: number, min: number, max: number): number {
  const next = Math.max(min, Math.min(max, value))
  return Number(next.toFixed(2))
}
