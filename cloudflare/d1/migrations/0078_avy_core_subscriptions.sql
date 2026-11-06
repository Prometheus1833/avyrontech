-- Add maintenance metadata to the existing service/subscription lifecycle.
ALTER TABLE subscriptions ADD COLUMN maintenance_enabled INTEGER NOT NULL DEFAULT 0 CHECK(maintenance_enabled IN(0,1));
ALTER TABLE subscriptions ADD COLUMN plan_sku TEXT;
ALTER TABLE subscriptions ADD COLUMN specifications_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(specifications_json) AND json_type(specifications_json)='object');
ALTER TABLE subscriptions ADD COLUMN product_slug TEXT REFERENCES product_items(slug) ON DELETE RESTRICT;
ALTER TABLE subscriptions ADD COLUMN external_url TEXT;
ALTER TABLE subscriptions ADD COLUMN target_label TEXT NOT NULL DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN maintenance_key TEXT;
ALTER TABLE subscriptions ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE subscriptions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX subscriptions_maintenance_target ON subscriptions(maintenance_key) WHERE maintenance_enabled=1 AND status<>'cancelled';
CREATE TABLE subscription_staff (
 subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 assigned_at INTEGER NOT NULL,
 PRIMARY KEY(subscription_id,user_id)
);
CREATE INDEX subscription_staff_user ON subscription_staff(user_id,subscription_id);
CREATE INDEX subscriptions_maintenance_client ON subscriptions(maintenance_enabled,client_id,status,id);
-- A human decision updates its production task atomically, without publishing
-- channel variants or claiming external execution/delivery.
CREATE TRIGGER social_editorial_job_sync AFTER UPDATE OF status ON ai_content_items
WHEN NEW.status<>OLD.status AND NEW.status IN('draft','pending_approval','approved','rejected')
BEGIN
 UPDATE ai_social_jobs SET
  status=CASE NEW.status WHEN 'draft' THEN 'draft_ready' WHEN 'pending_approval' THEN 'awaiting_approval' WHEN 'approved' THEN 'approved' ELSE 'skipped' END,
  last_error_code=CASE NEW.status WHEN 'rejected' THEN 'editorial_rejected' ELSE NULL END,
  updated_at=NEW.updated_at
 WHERE content_id=NEW.id AND project_id=NEW.project_id
 AND (status IN('draft_ready','awaiting_approval','approved') OR (status='skipped' AND last_error_code='editorial_rejected'));
END;
CREATE TRIGGER maintenance_beneficiary_insert BEFORE INSERT ON subscriptions WHEN NEW.maintenance_enabled=1 AND NEW.client_id<>(SELECT p.client_id FROM services v JOIN projects p ON p.id=v.project_id WHERE v.id=NEW.service_id) BEGIN SELECT RAISE(ABORT,'maintenance_beneficiary_mismatch'); END;
CREATE TRIGGER maintenance_beneficiary_update BEFORE UPDATE OF client_id,service_id,maintenance_enabled ON subscriptions WHEN NEW.maintenance_enabled=1 AND NEW.client_id<>(SELECT p.client_id FROM services v JOIN projects p ON p.id=v.project_id WHERE v.id=NEW.service_id) BEGIN SELECT RAISE(ABORT,'maintenance_beneficiary_mismatch'); END;
