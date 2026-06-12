-- Per-product display preferences for the demo:
--   format = "auto" (browser-negotiated AVIF/WebP) | "avif" | "webp" | "jpeg" | "png"
--   quality = 1..100, NULL means "Cloudflare default" (~85)
ALTER TABLE products ADD COLUMN format TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE products ADD COLUMN quality INTEGER;
