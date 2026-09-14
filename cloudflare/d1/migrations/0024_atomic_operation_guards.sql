ALTER TABLE financial_usage_events ADD COLUMN reservation_mode TEXT NOT NULL DEFAULT 'legacy' CHECK(reservation_mode IN ('legacy','atomic'));
-- Serialize appointment validation in D1, including concurrent requests.
CREATE INDEX operation_appointment_period ON operation_records(assignee_id,starts_at,due_at) WHERE kind='appointment' AND archived_at IS NULL;
CREATE TRIGGER operation_appointment_insert BEFORE INSERT ON operation_records WHEN new.kind='appointment' BEGIN
 SELECT CASE WHEN new.assignee_id IS NULL OR new.starts_at IS NULL OR new.due_at IS NULL OR new.due_at<=new.starts_at THEN RAISE(ABORT,'appointment_invalid') END;
 SELECT CASE WHEN new.archived_at IS NULL AND new.status NOT IN ('cancelled','done') AND EXISTS (
  SELECT 1 FROM operation_records WHERE kind='appointment' AND archived_at IS NULL AND status NOT IN ('cancelled','done') AND assignee_id=new.assignee_id AND starts_at<new.due_at AND due_at>new.starts_at
 ) THEN RAISE(ABORT,'appointment_overlap') END;
END;
CREATE TRIGGER operation_appointment_update BEFORE UPDATE ON operation_records WHEN new.kind='appointment' BEGIN
 SELECT CASE WHEN new.assignee_id IS NULL OR new.starts_at IS NULL OR new.due_at IS NULL OR new.due_at<=new.starts_at THEN RAISE(ABORT,'appointment_invalid') END;
 SELECT CASE WHEN new.archived_at IS NULL AND new.status NOT IN ('cancelled','done') AND EXISTS (
  SELECT 1 FROM operation_records WHERE id!=new.id AND kind='appointment' AND archived_at IS NULL AND status NOT IN ('cancelled','done') AND assignee_id=new.assignee_id AND starts_at<new.due_at AND due_at>new.starts_at
 ) THEN RAISE(ABORT,'appointment_overlap') END;
END;
-- Usage insertion and quota consumption form one atomic operation. Unique
-- idempotency conflicts roll back both; competing reservations recheck here.
CREATE TRIGGER ai_usage_reservation_guard BEFORE INSERT ON financial_usage_events WHEN new.decision='allowed' AND new.reservation_mode='atomic' BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM financial_provider_quotas WHERE id=new.quota_id AND vendor_id=new.vendor_id AND status IN ('active','warning') AND quota_total IS NOT NULL AND (quota_used+new.units<=quota_total OR hard_stop_before_paid=0)
 ) THEN RAISE(ABORT,'ai_quota_reservation_conflict') END;
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM financial_agent_provider_policies p WHERE p.agent_slug=new.agent_slug AND p.vendor_id=new.vendor_id AND p.status='active'
   AND (p.max_request_cost_minor IS NULL OR new.estimated_cost_minor<=p.max_request_cost_minor)
   AND (p.daily_budget_minor IS NULL OR new.estimated_cost_minor+COALESCE((SELECT SUM(u.estimated_cost_minor) FROM financial_usage_events u WHERE u.agent_slug=new.agent_slug AND u.vendor_id=new.vendor_id AND u.decision='allowed' AND u.created_at>=CAST(strftime('%s',new.created_at/1000,'unixepoch','start of day') AS INTEGER)*1000),0)<=p.daily_budget_minor)
   AND (p.monthly_budget_minor IS NULL OR new.estimated_cost_minor+COALESCE((SELECT SUM(u.estimated_cost_minor) FROM financial_usage_events u WHERE u.agent_slug=new.agent_slug AND u.vendor_id=new.vendor_id AND u.decision='allowed' AND u.created_at>=CAST(strftime('%s',new.created_at/1000,'unixepoch','start of month') AS INTEGER)*1000),0)<=p.monthly_budget_minor)
 ) THEN RAISE(ABORT,'ai_budget_reservation_conflict') END;
 SELECT CASE WHEN EXISTS (
  SELECT 1 FROM financial_budgets b WHERE b.status='active' AND b.category IN ('general','ai') AND b.period_start<=new.created_at AND b.period_end>new.created_at AND (b.agent_slug IS NULL OR b.agent_slug=new.agent_slug)
   AND new.estimated_cost_minor+COALESCE((SELECT SUM(u.estimated_cost_minor) FROM financial_usage_events u WHERE u.decision='allowed' AND u.created_at>=b.period_start AND u.created_at<b.period_end AND (b.agent_slug IS NULL OR u.agent_slug=b.agent_slug)),0)>b.limit_minor
 ) THEN RAISE(ABORT,'ai_budget_reservation_conflict') END;
END;
CREATE TRIGGER ai_usage_reservation_apply AFTER INSERT ON financial_usage_events WHEN new.decision='allowed' AND new.reservation_mode='atomic' BEGIN
 UPDATE financial_provider_quotas SET quota_used=quota_used+new.units,updated_at=new.created_at WHERE id=new.quota_id;
END;
-- Intent changes invalidate a prior review and require a fresh exact revision.
CREATE TRIGGER ai_approval_decided_intent_locked BEFORE UPDATE OF request_json,summary,action_class,run_id,step_id,expires_at ON ai_approvals
WHEN old.status!='pending' AND (new.request_json IS NOT old.request_json OR new.summary IS NOT old.summary OR new.action_class IS NOT old.action_class OR new.run_id IS NOT old.run_id OR new.step_id IS NOT old.step_id OR new.expires_at IS NOT old.expires_at) BEGIN
 SELECT RAISE(ABORT,'approval_intent_locked');
END;
CREATE TRIGGER ai_approval_intent_changed AFTER UPDATE OF request_json,summary,action_class,run_id,step_id,expires_at ON ai_approvals
WHEN new.request_json IS NOT old.request_json OR new.summary IS NOT old.summary OR new.action_class IS NOT old.action_class OR new.run_id IS NOT old.run_id OR new.step_id IS NOT old.step_id OR new.expires_at IS NOT old.expires_at BEGIN
 UPDATE ai_approvals SET status='pending',revision=old.revision+1,approved_revision=NULL,decided_by=NULL,decided_at=NULL,decision_note=NULL WHERE id=new.id;
END;
