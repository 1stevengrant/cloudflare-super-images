// Ambient declarations for env vars / secrets loaded from `.env` (locally)
// or set via `wrangler secret put` / dashboard (in production). These don't
// live in wrangler.jsonc, so `wrangler types` doesn't pick them up.
declare namespace Cloudflare {
  interface Env {
    /** Cloudflare Account ID. */
    CF_ACCOUNT_ID: string
    /** Public-safe account hash used in imagedelivery.net URLs. */
    CF_ACCOUNT_HASH: string
    /** API token with "Images: Edit" permission, used to mint Direct Creator Upload URLs. */
    CF_IMAGES_TOKEN: string
  }
}
