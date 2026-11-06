-- Archive is reversible and preserves the existing lead, stage and history.
ALTER TABLE leads ADD COLUMN archived_at INTEGER;
ALTER TABLE leads ADD COLUMN archived_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN archive_reason TEXT CHECK(archive_reason IS NULL OR archive_reason IN ('postponed','no_response','no_budget','not_interested','outside_scope'));
ALTER TABLE leads ADD COLUMN archive_note TEXT;
CREATE INDEX leads_archive_recent ON leads(archived_at,created_at DESC) WHERE deleted_at IS NULL;
