-- Nomenclator comercial AVYRON: coduri contabile, TVA si trasee de plata.
-- Configuratia completeaza sursele canonice ale serviciilor si produselor;
-- nu proceseaza plati si nu inlocuieste documentele financiar-contabile.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS commercial_catalog_codes (
  id                    TEXT PRIMARY KEY,
  entity_type           TEXT NOT NULL CHECK (entity_type IN ('service','product')),
  entity_key            TEXT NOT NULL,
  display_name          TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 180),
  accounting_code       TEXT CHECK (accounting_code IS NULL OR length(accounting_code) BETWEEN 2 AND 48),
  sku                   TEXT CHECK (sku IS NULL OR length(sku) BETWEEN 2 AND 64),
  category              TEXT NOT NULL DEFAULT 'general',
  base_price_minor      INTEGER CHECK (base_price_minor IS NULL OR base_price_minor >= 0),
  currency              TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) BETWEEN 3 AND 8),
  vat_basis_points      INTEGER NOT NULL DEFAULT 1900 CHECK (vat_basis_points BETWEEN 0 AND 10000),
  payment_route         TEXT NOT NULL DEFAULT 'unconfigured' CHECK (payment_route IN ('unconfigured','invoice','payment_link','stripe','bank_transfer','manual')),
  payment_status        TEXT NOT NULL DEFAULT 'needs_configuration' CHECK (payment_status IN ('needs_configuration','test','active','paused')),
  promotion_code        TEXT CHECK (promotion_code IS NULL OR length(promotion_code) BETWEEN 2 AND 80),
  active                INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  notes                 TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  UNIQUE(entity_type, entity_key),
  UNIQUE(accounting_code),
  UNIQUE(sku)
);
CREATE INDEX IF NOT EXISTS idx_commercial_catalog_type ON commercial_catalog_codes(entity_type, active, display_name);
CREATE INDEX IF NOT EXISTS idx_commercial_catalog_payment ON commercial_catalog_codes(payment_status, payment_route);

CREATE TABLE IF NOT EXISTS commercial_catalog_audit (
  id            TEXT PRIMARY KEY,
  catalog_id    TEXT NOT NULL REFERENCES commercial_catalog_codes(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  before_json   TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json    TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commercial_catalog_audit_item ON commercial_catalog_audit(catalog_id, created_at DESC);

PRAGMA optimize;
