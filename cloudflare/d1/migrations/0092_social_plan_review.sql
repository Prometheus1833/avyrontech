-- Plan review is separate from content approval and provider publication.
ALTER TABLE ai_social_jobs ADD COLUMN plan_review_state TEXT NOT NULL DEFAULT 'pending' CHECK(plan_review_state IN ('pending','approved','rejected'));
ALTER TABLE ai_social_jobs ADD COLUMN plan_reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ai_social_jobs ADD COLUMN plan_reviewed_at INTEGER;
