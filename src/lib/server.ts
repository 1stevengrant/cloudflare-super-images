import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import type { ImageFormat } from './images'

const MAX_CAPTION_LENGTH = 120
const MAX_PRICE_CENTS = 999_999_99
const DIRECT_UPLOAD_TTL_MINUTES = 10
const IMAGE_UPLOAD_VERIFY_ATTEMPTS = 10
const IMAGE_UPLOAD_VERIFY_INITIAL_DELAY_MS = 250
const IMAGE_UPLOAD_VERIFY_MAX_DELAY_MS = 2_000

/**
 * Cloudflare Images: request a one-time direct creator upload URL.
 *
 * The browser then POSTs the image directly to Cloudflare — bypassing our
 * Worker request body limits — and Cloudflare returns the image record under
 * the same `id` we get back here.
 *
 * Docs: https://developers.cloudflare.com/images/storage/upload-images/direct-creator-upload/
 */
export const requestDirectUpload = createServerFn({ method: 'POST' }).handler(
  async () => {
    const accountId = env.CF_ACCOUNT_ID
    const token = env.CF_IMAGES_TOKEN

    if (!accountId || !token) {
      throw new Error(
        'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN. See README → Setup.',
      )
    }

    const form = new FormData()
    form.append('requireSignedURLs', 'false')
    form.append(
      'expiry',
      new Date(Date.now() + DIRECT_UPLOAD_TTL_MINUTES * 60_000).toISOString(),
    )
    // Metadata is private and never exposed to viewers.
    form.append('metadata', JSON.stringify({ source: 'super-image-demo' }))

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Cloudflare Images direct_upload failed: ${text}`)
    }

    const json = (await res.json()) as {
      success: boolean
      result: { id: string; uploadURL: string }
      errors?: unknown
    }

    if (!json.success) {
      throw new Error(
        `Cloudflare Images error: ${JSON.stringify(json.errors)}`,
      )
    }

    return {
      id: json.result.id,
      uploadURL: json.result.uploadURL,
      accountHash: env.CF_ACCOUNT_HASH ?? '',
    }
  },
)

const VALID_FORMATS: readonly ImageFormat[] = [
  'auto',
  'avif',
  'webp',
  'jpeg',
  'png',
]

/**
 * Persist a finished upload as a "product" row in D1.
 */
export const saveProduct = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      imageId: string
      caption: string
      priceCents: number
      removeBg: boolean
      format: ImageFormat
      quality: number | null
    }) => {
      if (!/^[-_a-zA-Z0-9/]+$/.test(data.imageId)) {
        throw new Error('Invalid Cloudflare Images ID.')
      }
      if (!data.caption?.trim() || data.caption.length > MAX_CAPTION_LENGTH) {
        throw new Error(`Caption must be 1-${MAX_CAPTION_LENGTH} characters.`)
      }
      if (
        !Number.isInteger(data.priceCents) ||
        data.priceCents < 0 ||
        data.priceCents > MAX_PRICE_CENTS
      ) {
        throw new Error('Invalid price.')
      }
      if (!VALID_FORMATS.includes(data.format)) {
        throw new Error(`Invalid format: ${data.format}`)
      }
      const normalizedFormat =
        data.removeBg && (data.format === 'auto' || data.format === 'jpeg')
          ? 'png'
          : data.format
      const quality =
        normalizedFormat === 'png'
          ? null
          : data.quality == null
            ? 85
            : Math.max(1, Math.min(100, Math.round(data.quality)))

      return {
        ...data,
        caption: data.caption.trim(),
        format: normalizedFormat,
        quality,
      }
    },
  )
  .handler(async ({ data }) => {
    await assertImageUploaded(data.imageId)

    const id = crypto.randomUUID().slice(0, 8)
    const now = Date.now()

    await env.DB.prepare(
      `INSERT INTO products
         (id, image_id, caption, price_cents, remove_bg, format, quality, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        data.imageId,
        data.caption,
        data.priceCents,
        data.removeBg ? 1 : 0,
        data.format,
        data.quality,
        now,
      )
      .run()

    return { id }
  })

async function assertImageUploaded(imageId: string) {
  // Direct Creator Upload creates a draft record first; once the browser POST
  // succeeds, the draft flag is removed. Verify that before committing the D1
  // product row so the catalog cannot point at an empty upload slot. Use the
  // REST status endpoint documented for Direct Creator Upload rather than the
  // hosted Images binding here: freshly completed direct uploads can be visible
  // in the Images dashboard before the binding's metadata view observes the
  // draft -> uploaded transition.
  let delayMs = IMAGE_UPLOAD_VERIFY_INITIAL_DELAY_MS

  for (let attempt = 1; attempt <= IMAGE_UPLOAD_VERIFY_ATTEMPTS; attempt++) {
    const image = await getCloudflareImageDetails(imageId)

    if (image && image.draft !== true) {
      return
    }

    if (attempt < IMAGE_UPLOAD_VERIFY_ATTEMPTS) {
      await sleep(delayMs)
      delayMs = Math.min(delayMs * 2, IMAGE_UPLOAD_VERIFY_MAX_DELAY_MS)
    }
  }

  throw new Error(
    'Cloudflare Images accepted the upload, but it still reports as a draft. Try saving again in a moment.',
  )
}

type CloudflareImageDetails = {
  id: string
  uploaded?: string
  draft?: boolean
}

async function getCloudflareImageDetails(
  imageId: string,
): Promise<CloudflareImageDetails | null> {
  const accountId = env.CF_ACCOUNT_ID
  const token = env.CF_IMAGES_TOKEN

  if (!accountId || !token) {
    throw new Error(
      'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN. See README → Setup.',
    )
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${encodeURIComponent(imageId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (res.status === 404) {
    return null
  }

  const json = (await res.json().catch(() => null)) as {
    success?: boolean
    result?: CloudflareImageDetails
    errors?: unknown
  } | null

  if (!res.ok || !json?.success) {
    throw new Error(
      `Cloudflare Images status check failed: ${JSON.stringify(json?.errors ?? res.statusText)}`,
    )
  }

  return json.result ?? null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type Product = {
  id: string
  imageId: string
  caption: string
  priceCents: number
  removeBg: boolean
  format: ImageFormat
  quality: number | null
  createdAt: number
}

type ProductRow = {
  id: string
  image_id: string
  caption: string
  price_cents: number
  remove_bg: number
  format: string
  quality: number | null
  created_at: number
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    imageId: row.image_id,
    caption: row.caption,
    priceCents: row.price_cents,
    removeBg: row.remove_bg === 1,
    format: (VALID_FORMATS as readonly string[]).includes(row.format)
      ? (row.format as ImageFormat)
      : 'auto',
    quality: row.quality,
    createdAt: row.created_at,
  }
}

export const listProducts = createServerFn({ method: 'GET' }).handler(
  async () => {
    const result = await env.DB.prepare(
      `SELECT id, image_id, caption, price_cents, remove_bg, format, quality, created_at
       FROM products
       ORDER BY created_at DESC
       LIMIT 200`,
    ).all<ProductRow>()

    return {
      products: (result.results ?? []).map(rowToProduct),
      accountHash: env.CF_ACCOUNT_HASH ?? '',
    }
  },
)

/**
 * Delete a product row and best-effort remove the backing Cloudflare Images
 * asset so we don't leave orphaned uploads behind.
 */
export const deleteProduct = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => {
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('Invalid product id.')
    }
    return id
  })
  .handler(async ({ data: id }) => {
    const row = await env.DB.prepare(
      `SELECT image_id FROM products WHERE id = ?`,
    )
      .bind(id)
      .first<{ image_id: string }>()

    await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run()

    // Best-effort cleanup of the Cloudflare Images asset. The catalog row is
    // already gone, so we never fail the request if this part errors.
    if (row?.image_id) {
      try {
        await env.IMAGES.hosted.image(row.image_id).delete()
      } catch {
        // ignore — orphaned image, but the product is removed.
      }
    }

    return { ok: true }
  })

export const getProduct = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const row = await env.DB.prepare(
      `SELECT id, image_id, caption, price_cents, remove_bg, format, quality, created_at
       FROM products WHERE id = ?`,
    )
      .bind(id)
      .first<ProductRow>()

    if (!row) return { product: null, accountHash: env.CF_ACCOUNT_HASH ?? '' }

    return {
      product: rowToProduct(row),
      accountHash: env.CF_ACCOUNT_HASH ?? '',
    }
  })
