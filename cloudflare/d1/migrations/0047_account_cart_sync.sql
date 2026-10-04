-- 0047_account_cart_sync.sql — coș persistent pentru conturile AVYRON
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS account_carts (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items_json  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(items_json)),
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_carts_updated
  ON account_carts(updated_at DESC);

PRAGMA optimize;
