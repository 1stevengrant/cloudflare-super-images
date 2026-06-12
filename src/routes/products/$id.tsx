import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ExternalLink, Loader2, Scissors, Trash2 } from 'lucide-react'
import { deleteProduct, getProduct } from '#/lib/server'
import {
  FORMAT_LABEL,
  IMAGE_PRESETS,
  buildImageUrl,
  buildVariantUrl,
  type ImageFormat,
  type ImageUrlOptions,
  type ImagePresetId,
} from '#/lib/images'
import { ImageInspector } from '#/lib/ImageInspector'

export const Route = createFileRoute('/products/$id')({
  loader: async ({ params }) => {
    const data = await getProduct({ data: params.id })
    if (!data.product) throw notFound()
    return data
  },
  component: ProductDetail,
})

const FORMATS: ImageFormat[] = ['auto', 'avif', 'webp', 'jpeg', 'png']
const DEFAULT_PRESET: ImagePresetId = 'thumbnail'
const DEFAULT_CUSTOM_WIDTH = 1200
const DEFAULT_CUSTOM_HEIGHT = 1200
const DEFAULT_CUSTOM_FIT: CustomFit = 'cover'
const DEFAULT_FACE_ZOOM = 0.25
const MAX_CUSTOM_DIMENSION = 10000

type DeliveryMode = 'flexible' | 'named'
type FlexiblePresetId = ImagePresetId | 'custom'
type CustomFit = NonNullable<ImageUrlOptions['fit']>

type FlexiblePreset = {
  id: FlexiblePresetId
  label: string
  description: string
  width: number
  height: number
  fit: CustomFit
}

const FLEXIBLE_CUSTOM_PRESET: FlexiblePreset = {
  id: 'custom',
  label: 'Custom',
  description: 'Manual dimensions for flexible delivery',
  width: DEFAULT_CUSTOM_WIDTH,
  height: DEFAULT_CUSTOM_HEIGHT,
  fit: DEFAULT_CUSTOM_FIT,
}

const FLEXIBLE_PRESETS: FlexiblePreset[] = [
  ...IMAGE_PRESETS,
  FLEXIBLE_CUSTOM_PRESET,
]

const FIT_OPTIONS: { value: CustomFit; label: string }[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'scale-down', label: 'Scale down' },
  { value: 'crop', label: 'Crop' },
  { value: 'pad', label: 'Pad' },
]

function ProductDetail() {
  const { product, accountHash } = Route.useLoaderData()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  if (!product) return null

  const onDelete = async () => {
    if (
      !window.confirm(
        'Delete this product? This also removes the image from Cloudflare Images.',
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      await deleteProduct({ data: product.id })
      await router.invalidate()
      router.navigate({ to: '/products' })
    } catch (err) {
      setDeleting(false)
      window.alert(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  // Demo controls — start from the product's saved preferences but let the
  // viewer queue up changes, then explicitly generate a new transformation.
  const initialFormat = normalizeFormatForBgRemoval(
    product.format ?? 'auto',
    product.removeBg,
  )
  const initialQuality = product.quality ?? 85
  const [format, setFormat] = useState<ImageFormat>(initialFormat)
  const [quality, setQuality] = useState<number>(initialQuality)
  const [preset, setPreset] = useState<FlexiblePresetId>(DEFAULT_PRESET)
  const [customWidth, setCustomWidth] = useState<number>(DEFAULT_CUSTOM_WIDTH)
  const [customHeight, setCustomHeight] = useState<number>(DEFAULT_CUSTOM_HEIGHT)
  const [customFit, setCustomFit] = useState<CustomFit>(DEFAULT_CUSTOM_FIT)
  const [removeBg, setRemoveBg] = useState<boolean>(product.removeBg)
  const [faceCrop, setFaceCrop] = useState<boolean>(false)
  const [faceZoom, setFaceZoom] = useState<number>(DEFAULT_FACE_ZOOM)
  const [appliedFormat, setAppliedFormat] = useState<ImageFormat>(initialFormat)
  const [appliedQuality, setAppliedQuality] = useState<number>(initialQuality)
  const [appliedPreset, setAppliedPreset] =
    useState<FlexiblePresetId>(DEFAULT_PRESET)
  const [appliedCustomWidth, setAppliedCustomWidth] =
    useState<number>(DEFAULT_CUSTOM_WIDTH)
  const [appliedCustomHeight, setAppliedCustomHeight] =
    useState<number>(DEFAULT_CUSTOM_HEIGHT)
  const [appliedCustomFit, setAppliedCustomFit] =
    useState<CustomFit>(DEFAULT_CUSTOM_FIT)
  const [appliedRemoveBg, setAppliedRemoveBg] = useState<boolean>(
    product.removeBg,
  )
  const [appliedFaceCrop, setAppliedFaceCrop] = useState<boolean>(false)
  const [appliedFaceZoom, setAppliedFaceZoom] =
    useState<number>(DEFAULT_FACE_ZOOM)
  // Named variants are the default — they always work. Flexible delivery is
  // the playground you switch into once Flexible variants are enabled.
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('named')
  const [stats, setStats] = useState<{
    width: number
    height: number
    bytes: number
    format: string
  } | null>(null)

  const hasPendingTransform =
    format !== appliedFormat ||
    quality !== appliedQuality ||
    preset !== appliedPreset ||
    (preset === 'custom' &&
      appliedPreset === 'custom' &&
      (customWidth !== appliedCustomWidth ||
        customHeight !== appliedCustomHeight ||
        customFit !== appliedCustomFit)) ||
    removeBg !== appliedRemoveBg ||
    faceCrop !== appliedFaceCrop ||
    (faceCrop && faceZoom !== appliedFaceZoom)

  const appliedPresetDef = getFlexiblePreset(appliedPreset, {
    width: appliedCustomWidth,
    height: appliedCustomHeight,
    fit: appliedCustomFit,
  })

  // Named-variant delivery: the three dashboard variants, always available —
  // even with Flexible variants turned off.
  const variantUrls = IMAGE_PRESETS.map((p) => ({
    preset: p,
    url: buildVariantUrl(accountHash, product.imageId, p.id),
  }))

  // Flexible delivery: a single image whose transform rides in the URL. Only
  // rendered once the viewer switches to Flexible mode.
  const heroUrl = buildImageUrl(accountHash, product.imageId, {
    width: appliedPresetDef.width,
    height: appliedPresetDef.height,
    fit: appliedPresetDef.fit,
    gravity: appliedFaceCrop ? 'face' : undefined,
    zoom: appliedFaceCrop ? appliedFaceZoom : undefined,
    removeBackground: appliedRemoveBg,
    format: appliedFormat,
    quality: appliedFormat === 'png' ? undefined : appliedQuality,
  })

  const originalUrl = buildImageUrl(accountHash, product.imageId, {})
  const flexible = deliveryMode === 'flexible'

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <DeliveryToggle
            deliveryMode={deliveryMode}
            setDeliveryMode={setDeliveryMode}
          />

          {flexible ? (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                <ImageInspector
                  key={heroUrl /* re-fetch + reset stats whenever URL changes */}
                  src={heroUrl}
                  alt={product.caption}
                  loading="eager"
                  hint={
                    appliedRemoveBg ? 'Removing background' : 'Optimizing image'
                  }
                  badgePosition="br"
                  badgeSize="md"
                  onStats={setStats}
                  className="block h-full w-full object-contain"
                />
                {(appliedRemoveBg || appliedFaceCrop) && (
                  <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                    {appliedRemoveBg && (
                      <span className="inline-flex items-center gap-1.5 rounded bg-white/95 px-2.5 py-1 font-mono text-[11px] text-zinc-600 ring-1 ring-zinc-200 backdrop-blur">
                        <Scissors className="h-3.5 w-3.5 text-brand-500" />
                        segment=foreground
                      </span>
                    )}
                    {appliedFaceCrop && (
                      <span className="inline-flex items-center gap-1.5 rounded bg-white/95 px-2.5 py-1 font-mono text-[11px] text-zinc-600 ring-1 ring-zinc-200 backdrop-blur">
                        gravity=face
                      </span>
                    )}
                  </div>
                )}
              </div>

              <DemoPanel
                format={format}
                setFormat={setFormat}
                quality={quality}
                setQuality={setQuality}
                preset={preset}
                setPreset={setPreset}
                customWidth={customWidth}
                setCustomWidth={setCustomWidth}
                customHeight={customHeight}
                setCustomHeight={setCustomHeight}
                customFit={customFit}
                setCustomFit={setCustomFit}
                stats={stats}
                removeBg={removeBg}
                setRemoveBg={(next) => {
                  setRemoveBg(next)
                  if (next) {
                    setFormat((current) =>
                      normalizeFormatForBgRemoval(current, true),
                    )
                  }
                }}
                faceCrop={faceCrop}
                setFaceCrop={setFaceCrop}
                faceZoom={faceZoom}
                setFaceZoom={setFaceZoom}
                appliedFormat={appliedFormat}
                appliedRemoveBg={appliedRemoveBg}
                appliedFaceCrop={appliedFaceCrop}
                hasPendingTransform={hasPendingTransform}
                onTransform={() => {
                  setStats(null)
                  setAppliedFormat(format)
                  setAppliedQuality(quality)
                  setAppliedPreset(preset)
                  setAppliedCustomWidth(customWidth)
                  setAppliedCustomHeight(customHeight)
                  setAppliedCustomFit(customFit)
                  setAppliedRemoveBg(removeBg)
                  setAppliedFaceCrop(faceCrop)
                  setAppliedFaceZoom(faceZoom)
                }}
              />
            </>
          ) : (
            <NamedVariantGallery variants={variantUrls} alt={product.caption} />
          )}
        </div>

        <aside className="flex flex-col">
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
            Product
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {product.caption}
          </h1>
          <p className="mt-3 font-mono text-3xl font-medium tabular-nums text-zinc-900">
            ${(product.priceCents / 100).toFixed(2)}
          </p>

          <button
            type="button"
            className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Add to cart
          </button>

          <dl className="mt-8 space-y-3 rounded-lg border border-zinc-200 bg-white p-5 text-sm">
            <Row label="Image ID">
              <code className="break-all text-[12px] text-zinc-700">
                {product.imageId}
              </code>
            </Row>
            <Row label="Background">
              {product.removeBg ? (
                <span className="inline-flex items-center gap-1.5 text-zinc-900">
                  <Scissors className="h-3.5 w-3.5" />
                  Removed
                </span>
              ) : (
                <span className="text-zinc-700">Original</span>
              )}
            </Row>
            <Row label="Uploaded">
              <span className="text-zinc-700">
                {new Date(product.createdAt).toLocaleString()}
              </span>
            </Row>
            <Row label="Original">
              <a
                href={originalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-zinc-900 underline-offset-4 hover:underline"
              >
                Open in new tab
                <ExternalLink className="h-3 w-3" />
              </a>
            </Row>
          </dl>

          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/60 p-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              {flexible ? 'Delivery URL' : 'Named variant URLs'}
            </p>
            {flexible ? (
              <code className="mt-2 block break-all text-[11px] leading-relaxed text-zinc-700">
                {heroUrl}
              </code>
            ) : (
              <div className="mt-2 space-y-2">
                {variantUrls.map(({ preset: p, url }) => (
                  <div key={p.id}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      {p.label}
                    </p>
                    <code className="block break-all text-[11px] leading-relaxed text-zinc-700">
                      {url}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="mt-6 inline-flex items-center justify-center gap-2 self-start rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleting ? 'Deleting…' : 'Delete product'}
          </button>
        </aside>
      </div>
    </div>
  )
}

function normalizeFormatForBgRemoval(
  format: ImageFormat,
  removeBg: boolean,
): ImageFormat {
  return removeBg && (format === 'auto' || format === 'jpeg') ? 'png' : format
}

function getFlexiblePreset(
  preset: FlexiblePresetId,
  custom: Pick<FlexiblePreset, 'width' | 'height' | 'fit'>,
): FlexiblePreset {
  if (preset === 'custom') {
    return {
      ...FLEXIBLE_CUSTOM_PRESET,
      width: custom.width,
      height: custom.height,
      fit: custom.fit,
    }
  }

  return IMAGE_PRESETS.find((p) => p.id === preset) ?? IMAGE_PRESETS[1]
}

function parseDimension(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(MAX_CUSTOM_DIMENSION, Math.round(parsed)))
}

function DeliveryToggle({
  deliveryMode,
  setDeliveryMode,
}: {
  deliveryMode: DeliveryMode
  setDeliveryMode: (m: DeliveryMode) => void
}) {
  const flexible = deliveryMode === 'flexible'
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Delivery
        </span>
        <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
          {(
            [
              ['named', 'Named variants'],
              ['flexible', 'Flexible'],
            ] as [DeliveryMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDeliveryMode(mode)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                deliveryMode === mode
                  ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
        {flexible
          ? 'Transforms ride in the URL — needs Flexible variants enabled in the dashboard.'
          : 'The three dashboard variants, served by name. These keep working with Flexible variants off.'}
      </p>
    </div>
  )
}

function NamedVariantGallery({
  variants,
  alt,
}: {
  variants: { preset: (typeof IMAGE_PRESETS)[number]; url: string }[]
  alt: string
}) {
  const byId = (id: ImagePresetId) => variants.find((v) => v.preset.id === id)
  const hero = byId('hero')
  const thumbnail = byId('thumbnail')
  const classic = byId('classic')

  return (
    <div className="space-y-3">
      {hero && <VariantCard variant={hero} alt={alt} aspect="aspect-video" />}
      <div className="grid grid-cols-2 gap-3">
        {thumbnail && (
          <VariantCard variant={thumbnail} alt={alt} aspect="aspect-square" />
        )}
        {classic && (
          <VariantCard variant={classic} alt={alt} aspect="aspect-square" />
        )}
      </div>
    </div>
  )
}

function VariantCard({
  variant,
  alt,
  aspect,
}: {
  variant: { preset: (typeof IMAGE_PRESETS)[number]; url: string }
  alt: string
  aspect: string
}) {
  const { preset, url } = variant
  return (
    <figure className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className={`relative ${aspect} bg-zinc-50`}>
        <ImageInspector
          src={url}
          alt={`${alt} — ${preset.label}`}
          badgePosition="br"
          hint="Loading variant"
          className="block h-full w-full object-contain"
        />
      </div>
      <figcaption className="flex items-center justify-between border-t border-zinc-200 px-3 py-2">
        <span className="font-mono text-[11px] text-zinc-700">
          /{preset.id}
        </span>
        <span className="font-mono text-[11px] text-zinc-400">
          {preset.width}×{preset.height}
        </span>
      </figcaption>
    </figure>
  )
}

function DemoPanel({
  format,
  setFormat,
  quality,
  setQuality,
  preset,
  setPreset,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  customFit,
  setCustomFit,
  stats,
  removeBg,
  setRemoveBg,
  faceCrop,
  setFaceCrop,
  faceZoom,
  setFaceZoom,
  appliedFormat,
  appliedRemoveBg,
  appliedFaceCrop,
  hasPendingTransform,
  onTransform,
}: {
  format: ImageFormat
  setFormat: (f: ImageFormat) => void
  quality: number
  setQuality: (n: number) => void
  preset: FlexiblePresetId
  setPreset: (p: FlexiblePresetId) => void
  customWidth: number
  setCustomWidth: (n: number) => void
  customHeight: number
  setCustomHeight: (n: number) => void
  customFit: CustomFit
  setCustomFit: (f: CustomFit) => void
  stats: {
    width: number
    height: number
    bytes: number
    format: string
  } | null
  removeBg: boolean
  setRemoveBg: (b: boolean) => void
  faceCrop: boolean
  setFaceCrop: (b: boolean) => void
  faceZoom: number
  setFaceZoom: (n: number) => void
  appliedFormat: ImageFormat
  appliedRemoveBg: boolean
  appliedFaceCrop: boolean
  hasPendingTransform: boolean
  onTransform: () => void
}) {
  // When `segment=foreground` is on, JPEG and Auto are misleading choices:
  // JPEG cannot represent transparency, and Auto hides the alpha-channel format
  // decision. Use explicit alpha-capable outputs instead.
  const disabledForBg = (f: ImageFormat) =>
    removeBg && (f === 'jpeg' || f === 'auto')

  // Detect when Cloudflare returns a fallback/negotiated format.
  const requested =
    appliedFormat === 'auto' ? null : FORMAT_LABEL[appliedFormat].toUpperCase()
  const delivered = stats?.format.toUpperCase()
  const formatMismatch =
    requested && delivered && requested !== delivered
  const faceCropFit = preset === 'custom' ? customFit : 'cover'
  const faceCropFitIsCropping = faceCropFit === 'cover' || faceCropFit === 'crop'

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Live transformation
        </p>
        {stats && (
          <p className="font-mono text-[11px] text-zinc-600">
            {stats.width}×{stats.height} · {prettyBytes(stats.bytes)} ·{' '}
            <span className="font-medium text-zinc-900">{stats.format}</span>
          </p>
        )}
      </div>

      <div className="mt-4">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Preset
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FLEXIBLE_PRESETS.map((p) => {
            const active = preset === p.id
            const width = p.id === 'custom' ? customWidth : p.width
            const height = p.id === 'custom' ? customHeight : p.height
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`flex flex-col rounded-md border p-3 text-left transition ${
                  active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <span className="text-sm font-medium text-zinc-900">
                  {p.label}
                </span>
                <span className="mt-1 font-mono text-[11px] text-zinc-500">
                  {width}×{height}
                </span>
                <span className="mt-1 text-[11px] leading-tight text-zinc-400">
                  {p.description}
                </span>
              </button>
            )
          })}
        </div>

        {preset === 'custom' && (
          <div className="mt-3 rounded-md border border-brand-100 bg-brand-50/50 p-3">
            <p className="mb-3 text-xs text-zinc-600">
              Flexible variants are on — dial in a one-off size and fit without
              creating another named dashboard variant.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Width
                </span>
                <input
                  type="number"
                  min={1}
                  max={MAX_CUSTOM_DIMENSION}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseDimension(e.target.value))}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 font-mono text-xs text-zinc-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Height
                </span>
                <input
                  type="number"
                  min={1}
                  max={MAX_CUSTOM_DIMENSION}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseDimension(e.target.value))}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 font-mono text-xs text-zinc-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Fit
                </span>
                <select
                  value={customFit}
                  onChange={(e) => {
                    const next = e.target.value as CustomFit
                    setCustomFit(next)
                    if (faceCrop && next !== 'cover' && next !== 'crop') {
                      setFaceCrop(false)
                    }
                  }}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 font-mono text-xs text-zinc-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  {FIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3 transition hover:bg-zinc-50 sm:col-span-2">
          <input
            type="checkbox"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500"
          />
          <Scissors className="h-4 w-4 text-zinc-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900">
              Remove background
            </p>
            <p className="text-xs text-zinc-500">
              Toggle <span className="font-mono">segment=foreground</span> to
              compare the cutout with the original background.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3 transition hover:bg-zinc-50 sm:col-span-2">
          <input
            type="checkbox"
            checked={faceCrop}
            onChange={(e) => {
              const checked = e.target.checked
              setFaceCrop(checked)
              if (checked && !faceCropFitIsCropping && preset === 'custom') {
                setCustomFit('cover')
              }
            }}
            className="h-4 w-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900">
              Face-centered crop
            </p>
            <p className="text-xs text-zinc-500">
              Adds <span className="font-mono">gravity=face</span> so square or
              hero crops keep detected faces in frame.
            </p>
          </div>
        </label>

        {faceCrop && (
          <div className="rounded-md border border-brand-100 bg-brand-50/50 p-3 sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                Face zoom
              </span>
              <span className="font-mono text-xs text-zinc-700">
                {faceZoom.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={faceZoom}
              onChange={(e) => setFaceZoom(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Appends <span className="font-mono">zoom={faceZoom.toFixed(2)}</span>{' '}
              with <span className="font-mono">gravity=face</span> for a tighter
              crop around detected faces.
            </p>
          </div>
        )}

        <div>
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            Format
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => {
              const disabled = disabledForBg(f)
              return (
                <button
                  key={f}
                  type="button"
                  disabled={disabled}
                  title={
                    disabled
                      ? 'Not compatible with background removal (no transparency).'
                      : undefined
                  }
                  onClick={() => setFormat(f)}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs transition ${
                    format === f
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-100`}
                >
                  {FORMAT_LABEL[f]}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              Quality
            </span>
            <span className="font-mono text-xs text-zinc-700">
              {format === 'png' ? '— lossless' : quality}
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            step={1}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            disabled={format === 'png'}
            className="w-full accent-brand-500 disabled:opacity-40"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-zinc-500">
          Adjust the controls, then click Transform to generate a new edge
          variant.
        </p>
        <button
          type="button"
          onClick={onTransform}
          disabled={!hasPendingTransform}
          className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
        >
          {hasPendingTransform ? 'Transform' : 'Transformed'}
        </button>
      </div>

      {formatMismatch && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
          You asked for <span className="font-mono font-semibold">{requested}</span>{' '}
          but Cloudflare delivered{' '}
          <span className="font-mono font-semibold">{delivered}</span>
          {appliedRemoveBg
            ? ' — with `segment=foreground`, Cloudflare may fall back to another alpha-capable format. AVIF is slower to encode, so WebP or PNG are common fallbacks.'
            : ' — Cloudflare can negotiate or fall back based on browser support and encoder cost.'}
        </p>
      )}

      {appliedFaceCrop && (
        <p className="mt-4 rounded-md bg-sky-50 px-3 py-2 text-[11px] text-sky-800 ring-1 ring-sky-200">
          Face crop is applied with{' '}
          <span className="font-mono font-semibold">gravity=face</span>. It works
          best on cropped layouts like <span className="font-mono">fit=cover</span>{' '}
          or <span className="font-mono">fit=crop</span> where Cloudflare has to
          choose what part of the image to preserve.
        </p>
      )}

      <p className="mt-4 text-[11px] text-zinc-500">
        Each unique combination is generated and cached at the edge on first
        request — that's why the very first AVIF/segment render takes a
        moment, then snaps in instantly afterward.
      </p>
    </div>
  )
}

function prettyBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(b < 10 * 1024 ? 1 : 0)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
