-- Recenzii moderate pentru servicii. Sursa este extensibilă pentru importuri viitoare.
PRAGMA foreign_keys = ON;

CREATE TABLE service_reviews (
  id TEXT PRIMARY KEY,
  surface_key TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'direct' CHECK (source_type IN ('direct', 'external')),
  source_platform TEXT,
  source_url TEXT,
  external_id TEXT,
  display_name TEXT NOT NULL,
  contact_email TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('individual', 'srl', 'pfa', 'ii', 'other')),
  brand_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  publish_consent INTEGER NOT NULL DEFAULT 0 CHECK (publish_consent IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_note TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (source_type <> 'direct' OR (contact_email IS NOT NULL AND publish_consent = 1)),
  CHECK (source_type <> 'external' OR source_platform IS NOT NULL),
  CHECK (status = 'pending' OR reviewed_at IS NOT NULL)
);

CREATE INDEX idx_service_reviews_public ON service_reviews(surface_key, status, reviewed_at DESC);
CREATE INDEX idx_service_reviews_moderation ON service_reviews(status, created_at DESC);
CREATE UNIQUE INDEX idx_service_reviews_external ON service_reviews(source_platform, external_id)
  WHERE source_platform IS NOT NULL AND external_id IS NOT NULL;

PRAGMA optimize;
