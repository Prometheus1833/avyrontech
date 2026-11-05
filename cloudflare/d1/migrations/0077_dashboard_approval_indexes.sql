-- Unified inbox reads original module states; no copied approval records.
CREATE INDEX IF NOT EXISTS ai_content_pending_inbox ON ai_content_items(status,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS operation_pending_inbox ON operation_records(status,archived_at,kind,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS document_template_review_inbox ON document_template_versions(review_status,created_at DESC,id);
CREATE INDEX IF NOT EXISTS ai_learning_pending_inbox ON ai_learning_queue(status,updated_at DESC,id);
