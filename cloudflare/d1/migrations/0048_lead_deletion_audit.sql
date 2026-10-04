-- 0048_lead_deletion_audit.sql — reasoned, recoverable lead removal.
-- Lead rows remain as restricted tombstones; the active CRM filters deleted_at.
PRAGMA foreign_keys = ON;

ALTER TABLE leads ADD COLUMN deletion_reason_code TEXT
  CHECK (deletion_reason_code IS NULL OR deletion_reason_code IN (
    'duplicate','spam','test_entry','invalid_contact','withdrawn','outside_scope','other'
  ));
ALTER TABLE leads ADD COLUMN deletion_reason_detail TEXT
  CHECK (deletion_reason_detail IS NULL OR length(deletion_reason_detail) <= 500);
ALTER TABLE leads ADD COLUMN deleted_by TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_deleted_audit
  ON leads(deleted_at DESC, deleted_by) WHERE deleted_at IS NOT NULL;

PRAGMA optimize;
