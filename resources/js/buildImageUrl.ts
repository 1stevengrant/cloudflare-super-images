/**
 * TypeScript port of the package's PHP ImageUrlBuilder. Kept deliberately
 * dependency-free so the React and Vue components can share it.
 *
 * Mirrors Ghijk\CloudflareSuperImages\ImageUrlBuilder one to one, including the
 * segment=foreground transparency handling and the zoom/quality clamping.
 */

export type ImageFormat = 'auto' | 'avif' | 'webp' | 'jpeg' | 'png'
export type ImageFit = 'cover' | 'contain' | 'scale-down' | 'crop' | 'pad'
export type ImageGravity = 'auto' | 'face' | 'left' | 'right' | 'top' | 'bottom'
export type ImagePreset = 'thumbnail' | 'classic' | 'hero'

export const IMAGE_PRESETS: Record<ImagePreset, { width: number; height: number; fit: ImageFit }> = {
    thumbnail: { width: 200, height: 200, fit: 'cover' },
    classic: { width: 800, height: 800, fit: 'cover' },
    hero: { width: 1600, height: 900, fit: 'cover' },
}

export type ImageUrlOptions = {
    preset?: ImagePreset
    width?: number
    height?: number
    fit?: ImageFit
    gravity?: ImageGravity
    zoom?: number
    removeBackground?: boolean
    format?: ImageFormat
    quality?: number
}

const DELIVERY_HOST = 'https://imagedelivery.net'

export function buildImageUrl(
    accountHash: string,
    imageId: string,
    options: ImageUrlOptions = {},
    deliveryHost: string = DELIVERY_HOST,
): string {
    const opts = applyPreset(options)
    const params: string[] = []

    if (opts.width != null) {
        params.push(`w=${opts.width}`)
    }

    if (opts.height != null) {
        params.push(`h=${opts.height}`)
    }

    if (opts.fit) {
        params.push(`fit=${opts.fit}`)
    }

    if (opts.gravity) {
        params.push(`gravity=${opts.gravity}`)
    }

    if (opts.gravity === 'face' && opts.zoom != null) {
        params.push(`zoom=${clampFloat(opts.zoom, 0, 1)}`)
    }

    if (opts.quality != null) {
        params.push(`quality=${clamp(opts.quality, 1, 100)}`)
    }

    for (const param of formatParams(opts)) {
        params.push(param)
    }

    const tail = params.length ? params.join(',') : 'public'

    return `${deliveryHost}/${accountHash}/${imageId}/${tail}`
}

function applyPreset(options: ImageUrlOptions): ImageUrlOptions {
    if (!options.preset) {
        return options
    }

    const preset = IMAGE_PRESETS[options.preset]

    return {
        ...options,
        width: options.width ?? preset.width,
        height: options.height ?? preset.height,
        fit: options.fit ?? preset.fit,
    }
}

function formatParams(opts: ImageUrlOptions): string[] {
    if (opts.removeBackground) {
        const format = opts.format && opts.format !== 'auto' ? opts.format : 'png'

        return ['segment=foreground', `format=${format}`]
    }

    if (opts.format && opts.format !== 'auto') {
        return [`format=${opts.format}`]
    }

    return []
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)))
}

function clampFloat(value: number, min: number, max: number): number {
    return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}
