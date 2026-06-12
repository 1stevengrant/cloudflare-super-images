import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Scissors, Upload, X } from 'lucide-react'
import { requestDirectUpload, saveProduct } from '#/lib/server'
import { FORMAT_LABEL, type ImageFormat } from '#/lib/images'

const FORMATS: ImageFormat[] = ['auto', 'avif', 'webp', 'jpeg', 'png']
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]
const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')

export const Route = createFileRoute('/')({ component: UploadPage })

type Status =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }

function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [price, setPrice] = useState('')
  const [removeBg, setRemoveBg] = useState(false)
  const [format, setFormat] = useState<ImageFormat>('auto')
  const [quality, setQuality] = useState<number>(85)
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const onPick = useCallback((picked: File | null) => {
    if (!picked) return
    if (!ACCEPTED_IMAGE_TYPES.includes(picked.type)) {
      setStatus({
        kind: 'error',
        message: 'Choose a supported image: JPG, PNG, GIF, WebP, HEIC, or HEIF.',
      })
      return
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setStatus({
        kind: 'error',
        message: `Cloudflare Images hosted uploads are capped at ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      })
      return
    }
    setFile(picked)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(picked)
    })
    setStatus({ kind: 'idle' })
  }, [])

  const clearFile = () => {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setStatus({ kind: 'error', message: 'Pick an image first.' })
      return
    }
    if (!caption.trim()) {
      setStatus({ kind: 'error', message: 'Add a caption.' })
      return
    }
    const priceNum = Number.parseFloat(price)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setStatus({ kind: 'error', message: 'Enter a valid price.' })
      return
    }

    try {
      // 1. Ask the server for a one-time Cloudflare Images upload URL.
      setStatus({ kind: 'requesting' })
      const { id, uploadURL } = await requestDirectUpload()

      // 2. Upload the file directly to Cloudflare Images using XHR
      //    so we can show a real progress bar.
      setStatus({ kind: 'uploading', progress: 0 })
      const uploadedImageId = await uploadWithProgress(uploadURL, file, (progress) =>
        setStatus({ kind: 'uploading', progress }),
      )

      // 3. Server verifies the direct upload is no longer a draft, then saves
      //    the product row in D1.
      setStatus({ kind: 'saving' })
      await saveProduct({
        data: {
          imageId: uploadedImageId ?? id,
          caption: caption.trim(),
          priceCents: Math.round(priceNum * 100),
          removeBg,
          format: normalizeFormatForBgRemoval(format, removeBg),
          // Quality only matters for lossy formats; we still store it so
          // the toggle on /products/$id behaves consistently.
          quality:
            normalizeFormatForBgRemoval(format, removeBg) === 'png'
              ? null
              : quality,
        },
      })

      router.navigate({ to: '/products' })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Upload failed.',
      })
    }
  }

  const isBusy =
    status.kind === 'requesting' ||
    status.kind === 'uploading' ||
    status.kind === 'saving'

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr]">
      <section className="lg:pt-6">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-600">
          Cloudflare Images
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl">
          Upload an image.
          <br />
          <span className="text-zinc-400">Serve it from the edge.</span>
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-zinc-600">
          Files are uploaded straight to Cloudflare Images, never through this
          server. Background removal, format negotiation, and resizing all
          happen at delivery time.
        </p>

        <ul className="mt-10 space-y-4 text-sm text-zinc-600">
          <Bullet>Direct creator uploads — files never touch this server.</Bullet>
          <Bullet>
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px] text-zinc-800">
              segment=foreground
            </code>{' '}
            removes backgrounds with one URL parameter.
          </Bullet>
          <Bullet>Resized variants generated on demand at the edge.</Bullet>
        </ul>
      </section>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="image"
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            const f = e.dataTransfer.files?.[0]
            if (f) onPick(f)
          }}
          className={`relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed transition ${
            dragActive
              ? 'border-brand-500 bg-brand-50'
              : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
          }`}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="preview"
                className="h-full w-full object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  clearFile()
                }}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              {file && (
                <span className="absolute bottom-3 left-3 rounded-md bg-zinc-900/85 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">
                  {file.name} · {formatBytes(file.size)}
                </span>
              )}
            </>
          ) : (
            <>
              <ImagePlus className="h-7 w-7 text-zinc-400" strokeWidth={1.5} />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700">
                  Drop an image, or click to browse
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-400">
                  JPG · PNG · GIF · WebP · HEIC/HEIF · max 10 MB
                </p>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            id="image"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="mt-5 grid gap-4">
          <Field label="Caption">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Hand-thrown ceramic mug"
              className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </Field>

          <Field label="Price (USD)">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="49.00"
                className="w-full rounded-md border border-zinc-300 bg-white py-2.5 pl-7 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </Field>

          <details className="group rounded-md border border-zinc-200 bg-white p-4 open:bg-zinc-50/50">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-zinc-900">
              Delivery options
              <span className="text-xs font-normal text-zinc-500 group-open:hidden">
                {removeBg ? 'BG removed · ' : ''}
                {FORMAT_LABEL[format]}
                {format !== 'png' ? ` · q${quality}` : ''}
              </span>
              <span className="hidden text-xs font-normal text-zinc-500 group-open:inline">
                Tweak format / quality
              </span>
            </summary>

            <div className="mt-4 grid gap-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setRemoveBg(checked)
                    if (checked) {
                      setFormat((current) =>
                        normalizeFormatForBgRemoval(current, checked),
                      )
                    }
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500"
                />
                <Scissors className="h-4 w-4 text-zinc-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900">
                    Remove background
                  </p>
                  <p className="text-xs text-zinc-500">
                    Applies <span className="font-mono">segment=foreground</span>{' '}
                    at delivery time. No re-upload needed.
                  </p>
                </div>
              </label>

              <div>
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  Format
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {FORMATS.map((f) => {
                    const disabled = disabledForBgRemoval(f, removeBg)
                    return (
                      <button
                        key={f}
                        type="button"
                        disabled={disabled}
                        title={
                          disabled
                            ? 'Background removal needs an alpha-capable output; using PNG instead.'
                            : undefined
                        }
                        onClick={() => setFormat(f)}
                        className={`rounded-md px-3 py-1.5 font-mono text-xs transition ${
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
                <p className="mt-1.5 text-xs text-zinc-500">
                  <span className="font-mono">Auto</span> lets Cloudflare
                  serve AVIF or WebP based on the browser's{' '}
                  <span className="font-mono">Accept</span> header.
                </p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                    Quality
                  </span>
                  <span className="font-mono text-xs text-zinc-700">
                    {format === 'png' ? '— (lossless)' : quality}
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
          </details>
        </div>

        {status.kind === 'error' && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {status.message}
          </p>
        )}

        {(status.kind === 'uploading' ||
          status.kind === 'requesting' ||
          status.kind === 'saving') && (
          <div className="mt-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full bg-brand-500 transition-[width] duration-150"
                style={{
                  width:
                    status.kind === 'uploading'
                      ? `${Math.max(5, status.progress)}%`
                      : status.kind === 'saving'
                        ? '100%'
                        : '8%',
                }}
              />
            </div>
            <p className="mt-2 font-mono text-[11px] text-zinc-500">
              {status.kind === 'requesting' && 'Requesting upload URL…'}
              {status.kind === 'uploading' &&
                `Uploading to Cloudflare Images… ${status.progress}%`}
              {status.kind === 'saving' && 'Verifying upload and saving to D1…'}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy || !file}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Working…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload to Cloudflare
            </>
          )}
        </button>
      </form>
    </div>
  )
}

function disabledForBgRemoval(format: ImageFormat, removeBg: boolean): boolean {
  return removeBg && (format === 'auto' || format === 'jpeg')
}

function normalizeFormatForBgRemoval(
  format: ImageFormat,
  removeBg: boolean,
): ImageFormat {
  return disabledForBgRemoval(format, removeBg) ? 'png' : format
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-[7px] inline-block h-1 w-1 flex-none rounded-full bg-brand-500" />
      <span>{children}</span>
    </li>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parseUploadedImageId(xhr.responseText))
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`))
      }
    }

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

function parseUploadedImageId(responseText: string): string | null {
  if (!responseText) return null

  try {
    const json = JSON.parse(responseText) as {
      result?: { id?: unknown }
    }
    return typeof json.result?.id === 'string' ? json.result.id : null
  } catch {
    return null
  }
}
