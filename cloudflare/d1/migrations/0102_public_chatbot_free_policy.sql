-- User-authorized activation of the existing Cloudflare Free public chatbot.
-- Preserve paused/custom/paid policies and every provider quota or model.
INSERT OR IGNORE INTO financial_audit_events(id,action,resource_type,resource_id,before_json,after_json,source,created_at)
SELECT 'fin_audit_avy_free_release_20261107','provider_policy.configure_free','agent_provider_policy','avy:fin_vendor_cloudflare_ai',
  json_object('status',status,'daily_budget_minor',daily_budget_minor,'monthly_budget_minor',monthly_budget_minor,'max_request_cost_minor',max_request_cost_minor),
  json_object('status','active','daily_budget_minor',0,'monthly_budget_minor',0,'max_request_cost_minor',0,'authorization','production_release_20261107'),
  'release_migration',unixepoch()*1000
FROM financial_agent_provider_policies WHERE agent_slug='avy' AND vendor_id='fin_vendor_cloudflare_ai' AND status='needs_configuration'
  AND COALESCE(daily_budget_minor,0)=0 AND COALESCE(monthly_budget_minor,0)=0 AND COALESCE(max_request_cost_minor,0)=0
  AND EXISTS(SELECT 1 FROM financial_provider_quotas q WHERE q.vendor_id='fin_vendor_cloudflare_ai' AND q.status IN('active','warning') AND q.quota_total>0 AND q.hard_stop_before_paid=1)
  AND EXISTS(SELECT 1 FROM ai_model_registry WHERE role='primary' AND status='configured' AND requires_billing=0)
  AND EXISTS(SELECT 1 FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version WHERE a.slug='avy' AND a.status='active' AND a.visibility='public' AND v.status='approved');

UPDATE financial_agent_provider_policies
SET status='active',daily_budget_minor=0,monthly_budget_minor=0,max_request_cost_minor=0,updated_at=unixepoch()*1000
WHERE agent_slug='avy' AND vendor_id='fin_vendor_cloudflare_ai' AND status='needs_configuration'
  AND COALESCE(daily_budget_minor,0)=0 AND COALESCE(monthly_budget_minor,0)=0 AND COALESCE(max_request_cost_minor,0)=0
  AND EXISTS(SELECT 1 FROM financial_provider_quotas q WHERE q.vendor_id='fin_vendor_cloudflare_ai' AND q.status IN('active','warning') AND q.quota_total>0 AND q.hard_stop_before_paid=1)
  AND EXISTS(SELECT 1 FROM ai_model_registry WHERE role='primary' AND status='configured' AND requires_billing=0)
  AND EXISTS(SELECT 1 FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version WHERE a.slug='avy' AND a.status='active' AND a.visibility='public' AND v.status='approved');
