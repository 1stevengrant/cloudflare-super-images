<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import {
    buildImageUrl,
    type ImageFit,
    type ImageFormat,
    type ImageGravity,
    type ImagePreset,
} from '../buildImageUrl'

const props = defineProps<{
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
}>()

const page = usePage<{ cloudflareImages?: { accountHash?: string } }>()

const src = computed(() => buildImageUrl(
    props.accountHash ?? page.props.cloudflareImages?.accountHash ?? '',
    props.imageId,
    {
        preset: props.preset,
        width: props.width,
        height: props.height,
        fit: props.fit,
        gravity: props.gravity,
        zoom: props.zoom,
        removeBackground: props.removeBackground,
        format: props.format,
        quality: props.quality,
    },
))
</script>

<template>
    <img :src="src" />
</template>
