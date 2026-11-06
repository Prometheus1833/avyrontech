-- Explicit per-announcement acknowledgements. Opening a section never marks future items read.
CREATE TABLE staff_announcement_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id TEXT NOT NULL REFERENCES staff_announcements(id) ON DELETE CASCADE,
  read_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,announcement_id)
);
CREATE INDEX staff_announcement_reads_announcement ON staff_announcement_reads(announcement_id);

CREATE INDEX leads_activity_counts ON leads(product,source,lifecycle_stage) WHERE deleted_at IS NULL AND archived_at IS NULL;
