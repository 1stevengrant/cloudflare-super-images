# Super Images

A small demo app for **Cloudflare Images**, built with **TanStack Start** on
**Cloudflare Workers** and **D1**. Upload a large product photo, optionally apply
background removal, and serve multiple responsive product-card variants from one
stored image.

If you came here from the video: this is the repo you can clone to reproduce the
Cloudflare Images flow end-to-end.

## What this demonstrates

- **Direct Creator Upload**: the browser uploads straight to Cloudflare Images,
  avoiding Worker request body limits.
- **Background removal**: `segment=foreground` via Cloudflare Images delivery
  URLs, with no separate ML service.
- **Smart crops**: `gravity=face` and `zoom` keep portraits framed.
- **Flexible variants**: URLs like `w=600,fit=cover,format=auto` create many
  sizes/formats from one original asset.
- **D1 metadata**: product rows store captions, prices, output format, quality,
  and background-removal preferences.

## Prerequisites

- Node.js + pnpm
- A Cloudflare account with **Cloudflare Images** enabled
- Wrangler access to create a D1 database and deploy a Worker

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create local environment variables

```bash
cp .env.example .env
```

Fill in these values:

| Variable | Purpose |
| --- | --- |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID. |
| `CF_ACCOUNT_HASH` | Public-safe Images delivery hash from Images → Hosted Images → Developer Resources. |
| `CF_IMAGES_TOKEN` | API token with `Account → Cloudflare Images → Edit`; used to mint Direct Creator Upload URLs. |

Do not commit `.env`; it is intentionally ignored.

### 3. Enable Flexible Variants

In the Cloudflare dashboard, go to **Images → Hosted Images → Delivery** and turn
on **Flexible variants**. Without this, arbitrary transformation URLs such as
`w=600,fit=cover` will not render.

### 4. Create and configure D1

```bash
pnpm wrangler d1 create super-image-demo
```

Copy the returned `database_id` into `wrangler.jsonc` in
`d1_databases[0].database_id`, replacing the all-zero placeholder.

Apply the schema locally and remotely:

```bash
pnpm wrangler d1 migrations apply super-image-demo --local
pnpm wrangler d1 migrations apply super-image-demo --remote
```

### 5. Run locally

```bash
pnpm dev
```

Open <http://localhost:3000>, upload an image, then visit `/products`.

## Deploy

Set production secrets/vars and deploy:

```bash
pnpm wrangler secret put CF_ACCOUNT_ID
pnpm wrangler secret put CF_ACCOUNT_HASH
pnpm wrangler secret put CF_IMAGES_TOKEN
pnpm deploy
```

`CF_ACCOUNT_HASH` is safe to expose in image URLs, but keeping it with the other
Cloudflare values avoids accidentally hard-coding account-specific config in a
public fork.

## How it works

```text
  Browser                Worker (TanStack Start)         Cloudflare
 ─────────              ───────────────────────         ────────────
   │                                                       │
   │  1. requestDirectUpload()  ─────────►  POST /direct_upload
   │                                                       │
   │  ◄────  { id, uploadURL }   ◄─────────────────────────│
   │                                                       │
   │  2. POST file directly to uploadURL  ───────────────► │
   │                                                       │
   │  3. saveProduct({ imageId, … }) ──►  verify upload + INSERT INTO D1
   │                                                       │
   │  4. /products loader ─────────────►  SELECT FROM D1   │
   │                                                       │
   │  5. <img src="imagedelivery.net/HASH/IMG_ID/options">
   │       served by Cloudflare's edge ────────────────────│
```

The "remove background" checkbox does not create a new stored image. It stores a
boolean in D1 and appends `segment=foreground` when building delivery URLs.

## Project layout

```text
migrations/
  0001_create_products.sql       Products table
  0002_add_format_quality.sql    Output format/quality columns
src/
  lib/
    images.ts                    Cloudflare Images URL helpers
    server.ts                    Server functions for upload, D1, and deletes
  routes/
    index.tsx                    Upload page
    products/index.tsx           Product grid
    products/$id.tsx             Product detail + variants
wrangler.jsonc                   Worker, D1, and Images binding config
```

## Open-source safety notes

- `.env`, `.dev.vars`, `.wrangler/`, `dist/`, and `node_modules/` are ignored.
- The checked-in `wrangler.jsonc` uses a placeholder D1 `database_id`; replace it
  with your own before running migrations or deploying.
- Uploaded images are configured with `requireSignedURLs=false`, so delivery URLs
  are public. Use signed URLs for private user content.
- If you publish an existing git history, review old commits too. A fresh public
  repo or orphan branch is the cleanest way to avoid exposing deleted drafts.
