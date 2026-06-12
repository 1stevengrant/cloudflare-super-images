import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Only surface the contextual hint (e.g. "Removing background") if the fetch
 * takes longer than this — typically a cache miss where Cloudflare is doing
 * real work. On a cache hit the request finishes well below this threshold.
 */
const SLOW_FETCH_HINT_MS = 600

type Stats = {
  width: number
  height: number
  bytes: number
  /** Normalized format label, e.g. "AVIF", "WebP", "JPEG", "PNG". */
  format: string
}

type Props = {
  src: string
  alt: string
  className?: string
  /** Whether to overlay a stats badge in the corner (default true). */
  showBadge?: boolean
  /** Badge corner. */
  badgePosition?: 'tl' | 'tr' | 'bl' | 'br'
  /** Size of the badge. */
  badgeSize?: 'sm' | 'md'
  /** Hint shown next to the spinner before load. */
  hint?: string
  /** When the stats are known, bubble them up (for parents that want them). */
  onStats?: (stats: Stats) => void
  loading?: 'lazy' | 'eager'
}

/**
 * Fetches the image as a blob (so we can read Content-Type + byte size from
 * the actual response), shows a loading state while it's in flight, then
 * renders the image with an overlay badge: dimensions · size · format.
 *
 * This is a great demo prop because flipping `?format=...` in the URL
 * makes the badge update live.
 */
export function ImageInspector({
  src,
  alt,
  className,
  showBadge = true,
  badgePosition = 'br',
  badgeSize = 'sm',
  hint,
  onStats,
  loading = 'lazy',
}: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [errored, setErrored] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setStats(null)
    setErrored(false)
    setShowHint(false)

    // Only flip on the hint if the fetch is still running after a beat —
    // suggests Cloudflare is doing real work (e.g. first-time bg removal).
    const hintTimer = setTimeout(() => {
      if (!cancelled) setShowHint(true)
    }, SLOW_FETCH_HINT_MS)

    ;(async () => {
      try {
        const res = await fetch(src, {
          signal: controller.signal,
          // Match the kind of Accept header a real <img> request sends. Without
          // this, fetch() may send */*, and Cloudflare Images can conservatively
          // fall back from requested WebP/AVIF to JPEG.
          headers: {
            Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
          },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        const contentType = res.headers.get('content-type') ?? blob.type

        // Decode dimensions client-side.
        const objectUrl = URL.createObjectURL(blob)
        const img = new Image()
        const dims = await new Promise<{ w: number; h: number }>(
          (resolve, reject) => {
            img.onload = () =>
              resolve({ w: img.naturalWidth, h: img.naturalHeight })
            img.onerror = () => reject(new Error('decode failed'))
            img.src = objectUrl
          },
        )

        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }

        // Swap the rendered <img> to use the same blob (zero extra network).
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = objectUrl

        const next: Stats = {
          width: dims.w,
          height: dims.h,
          bytes: blob.size,
          format: prettyFormat(contentType),
        }
        setStats(next)
        onStats?.(next)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        if (!cancelled) setErrored(true)
        // eslint-disable-next-line no-console
        console.warn('ImageInspector failed', err)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(hintTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const renderSrc = stats && objectUrlRef.current ? objectUrlRef.current : null

  return (
    <>
      {renderSrc ? (
        <img
          src={renderSrc}
          alt={alt}
          loading={loading}
          className={`${className ?? ''} animate-[fadeIn_0.25s_ease-out]`}
        />
      ) : !errored ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.5)_50%,transparent_70%)] bg-[length:200%_100%] [animation:shimmer_1.6s_linear_infinite]" />
          <div className="relative flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            {hint && showHint && (
              <span className="animate-[fadeIn_0.25s_ease-out] text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {hint}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 text-xs text-zinc-500">
          Failed to load
        </div>
      )}

      {showBadge && stats && (
        <StatsBadge
          stats={stats}
          position={badgePosition}
          size={badgeSize}
        />
      )}
    </>
  )
}

function StatsBadge({
  stats,
  position,
  size,
}: {
  stats: Stats
  position: 'tl' | 'tr' | 'bl' | 'br'
  size: 'sm' | 'md'
}) {
  const pos = {
    tl: 'left-2 top-2',
    tr: 'right-2 top-2',
    bl: 'left-2 bottom-2',
    br: 'right-2 bottom-2',
  }[position]

  const sizing =
    size === 'md'
      ? 'gap-2 px-3 py-1.5 text-[11px]'
      : 'gap-1.5 px-2 py-1 text-[10px]'

  return (
    <div
      className={`pointer-events-none absolute z-10 ${pos} flex items-center ${sizing} rounded-full bg-zinc-900/85 font-mono font-medium text-white shadow-sm backdrop-blur`}
    >
      <span>
        {stats.width}×{stats.height}
      </span>
      <Dot />
      <span>{formatBytes(stats.bytes)}</span>
      <Dot />
      <span className="uppercase">{stats.format}</span>
    </div>
  )
}

function Dot() {
  return <span className="opacity-50">·</span>
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(b < 10 * 1024 ? 1 : 0)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function prettyFormat(contentType: string): string {
  const ct = contentType.toLowerCase()
  if (ct.includes('avif')) return 'AVIF'
  if (ct.includes('webp')) return 'WebP'
  if (ct.includes('png')) return 'PNG'
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'JPEG'
  if (ct.includes('gif')) return 'GIF'
  if (ct.includes('svg')) return 'SVG'
  // Strip "image/" prefix as a fallback.
  return ct.replace(/^image\//, '').toUpperCase() || '?'
}
