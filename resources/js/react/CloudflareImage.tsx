import { usePage } from '@inertiajs/react'
import type { ImgHTMLAttributes } from 'react'
import {
    buildImageUrl,
    type ImageFit,
    type ImageFormat,
    type ImageGravity,
    type ImagePreset,
} from '../buildImageUrl'

type CloudflareImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    imageId: string
    accountHash?: string
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

type SharedProps = {
    cloudflareImages?: { accountHash?: string }
}

export function CloudflareImage({
    imageId,
    accountHash,
    preset,
    width,
    height,
    fit,
    gravity,
    zoom,
    removeBackground,
    format,
    quality,
    ...imgAttributes
}: CloudflareImageProps) {
    const { props } = usePage<SharedProps>()
    const hash = accountHash ?? props.cloudflareImages?.accountHash ?? ''

    const src = buildImageUrl(hash, imageId, {
        preset,
        width,
        height,
        fit,
        gravity,
        zoom,
        removeBackground,
        format,
        quality,
    })

    return <img src={src} {...imgAttributes} />
}
