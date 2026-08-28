-- 0009_promotions.sql — server-authoritative pricing, promotions and orders
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS promotions (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL COLLATE NOCASE UNIQUE
                        CHECK (length(code) BETWEEN 4 AND 32),
  label                 TEXT NOT NULL CHECK (length(label) BETWEEN 3 AND 120),
  discount_percent      INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  active                INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  registration_required INTEGER NOT NULL DEFAULT 1 CHECK (registration_required IN (0, 1)),
  per_user_limit        INTEGER CHECK (per_user_limit IS NULL OR per_user_limit BETWEEN 1 AND 100),
  max_redemptions       INTEGER CHECK (max_redemptions IS NULL OR max_redemptions BETWEEN 1 AND 1000000),
  starts_at             INTEGER,
  expires_at            INTEGER,
  created_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_promotions_active
  ON promotions(active, starts_at, expires_at);

CREATE TABLE IF NOT EXISTS commerce_orders (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  items_json            TEXT NOT NULL CHECK (json_valid(items_json)),
  subtotal_cents        INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  promotion_id          TEXT REFERENCES promotions(id) ON DELETE SET NULL,
  promotion_code        TEXT,
  discount_percent      INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_cents        INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents           INTEGER NOT NULL CHECK (total_cents >= 0),
  currency              TEXT NOT NULL DEFAULT 'RON' CHECK (currency = 'RON'),
  requires_manual_quote INTEGER NOT NULL DEFAULT 0 CHECK (requires_manual_quote IN (0, 1)),
  status                TEXT NOT NULL DEFAULT 'requested'
                        CHECK (status IN ('requested','quoted','accepted','paid','cancelled')),
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_user
  ON commerce_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_status
  ON commerce_orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id              TEXT PRIMARY KEY,
  promotion_id    TEXT NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id        TEXT NOT NULL UNIQUE REFERENCES commerce_orders(id) ON DELETE CASCADE,
  discount_cents  INTEGER NOT NULL CHECK (discount_cents >= 0),
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion
  ON promotion_redemptions(promotion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_user
  ON promotion_redemptions(promotion_id, user_id, created_at DESC);

-- Codurile inițiale sunt introduse idempotent. Administrarea și crearea altor
-- coduri este permisă exclusiv contului prometheus@avyron.ro la nivel API.
INSERT OR IGNORE INTO promotions
  (id, code, label, discount_percent, active, registration_required, per_user_limit, created_at, updated_at)
VALUES
  ('promo-avy10',       'AVY10',       'Beneficiu pentru cont Avyron înregistrat', 10,  1, 1, 1, 1787918400000, 1787918400000),
  ('promo-avyong',      'AVYONG',      'Campanie Avyron 10%',                       10,  1, 1, 1, 1787918400000, 1787918400000),
  ('promo-socialavy',   'SOCIALAVY',   'Campanie social media',                     5,  1, 1, 1, 1787918400000, 1787918400000),
  ('promo-promethavy',  'PROMETHAVY',  'Campanie specială integrală',             100,  1, 1, 1, 1787918400000, 1787918400000),
  ('promo-exceptieavy', 'EXCEPTIEAVY', 'Campanie excepțională',                    50,  1, 1, 1, 1787918400000, 1787918400000);

PRAGMA optimize;
