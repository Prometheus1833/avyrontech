-- Detalii comerciale pentru facturare viitoare. Nu activeaza procesatori sau emitere de facturi.
-- Codurile si preturile istorice raman intacte; fiscalitatea veche necesita verificare explicita.
ALTER TABLE commercial_catalog_codes ADD COLUMN unit_label TEXT NOT NULL DEFAULT 'unitate'
  CHECK (length(unit_label) BETWEEN 1 AND 32);
ALTER TABLE commercial_catalog_codes ADD COLUMN price_model TEXT NOT NULL DEFAULT 'unreviewed'
  CHECK (price_model IN ('unreviewed','fixed','starting_at','quote'));
ALTER TABLE commercial_catalog_codes ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'unreviewed'
  CHECK (billing_cycle IN ('unreviewed','one_time','monthly','annual','custom'));
ALTER TABLE commercial_catalog_codes ADD COLUMN tax_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK (tax_status IN ('unverified','verified'));
ALTER TABLE commercial_catalog_codes ADD COLUMN tax_verified_at INTEGER;
ALTER TABLE commercial_catalog_codes ADD COLUMN tax_verified_by TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE commercial_catalog_provider_refs (
  id             TEXT PRIMARY KEY,
  catalog_id     TEXT NOT NULL REFERENCES commercial_catalog_codes(id) ON DELETE RESTRICT,
  provider       TEXT NOT NULL CHECK (provider IN ('stripe','revolut','oblio')),
  environment    TEXT NOT NULL CHECK (environment IN ('test','live')),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('product','price','article')),
  external_id    TEXT NOT NULL CHECK (length(external_id) BETWEEN 2 AND 160),
  created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  UNIQUE (catalog_id, provider, environment, reference_type),
  UNIQUE (provider, environment, reference_type, external_id)
);
CREATE INDEX idx_commercial_provider_refs_catalog ON commercial_catalog_provider_refs(catalog_id);

CREATE TABLE commercial_catalog_provider_ref_audit (
  id             TEXT PRIMARY KEY,
  catalog_id     TEXT NOT NULL REFERENCES commercial_catalog_codes(id) ON DELETE RESTRICT,
  actor_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL CHECK (action IN ('upsert','remove')),
  before_json    TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json     TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_commercial_provider_ref_audit_catalog ON commercial_catalog_provider_ref_audit(catalog_id, created_at DESC);

PRAGMA optimize;
