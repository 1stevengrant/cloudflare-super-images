-- Products table for the Cloudflare Images demo.
CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,        -- short id used in URLs
  image_id     TEXT NOT NULL,           -- Cloudflare Images image ID
  caption      TEXT NOT NULL,
  price_cents  INTEGER NOT NULL,
  remove_bg    INTEGER NOT NULL DEFAULT 0,  -- 0 / 1
  created_at   INTEGER NOT NULL         -- ms epoch
);

CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
