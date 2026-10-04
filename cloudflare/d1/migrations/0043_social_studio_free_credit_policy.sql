-- 0043_social_studio_free_credit_policy.sql
-- Politica explicita: instrumentele externe folosesc numai nivelul gratuit
-- pana la o aprobare separata a platform owner-ului.

PRAGMA foreign_keys = ON;

ALTER TABLE ai_social_policies
  ADD COLUMN credit_mode TEXT NOT NULL DEFAULT 'free_only'
  CHECK (credit_mode IN ('free_only','approved_paid'));

CREATE TABLE ai_social_tool_policies (
  project_id          TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  capability          TEXT NOT NULL,
  billing_mode        TEXT NOT NULL DEFAULT 'free_only'
                      CHECK (billing_mode IN ('free_only','approved_paid')),
  status              TEXT NOT NULL DEFAULT 'pending_connection'
                      CHECK (status IN ('available','pending_connection','blocked_paid','disabled')),
  requires_approval   INTEGER NOT NULL DEFAULT 1 CHECK (requires_approval IN (0,1)),
  max_calls_per_day   INTEGER NOT NULL DEFAULT 0 CHECK (max_calls_per_day BETWEEN 0 AND 1000),
  notes               TEXT NOT NULL DEFAULT '',
  last_checked_at     INTEGER,
  updated_at          INTEGER NOT NULL,
  PRIMARY KEY (project_id,provider,capability)
);

INSERT OR IGNORE INTO ai_social_tool_policies
  (project_id,provider,capability,billing_mode,status,requires_approval,max_calls_per_day,notes,updated_at)
VALUES
  ('aip_avyron_web','metricool','analytics','free_only','pending_connection',0,24,'Brandul există, dar rețelele sociale trebuie conectate înainte de citirea orelor și a performanței.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aip_avyron_web','metricool','scheduling','free_only','pending_connection',1,12,'Programarea rămâne o acțiune aprobabilă.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aip_avyron_web','adobe_express','non_premium_templates','free_only','available',1,12,'Folosește numai șabloane cu isPremiumContent=false.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aip_avyron_web','runway','image_generation','free_only','available',1,6,'Verifică modelul disponibil și costul înainte de fiecare generare; nu consuma credite fără aprobare.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aip_avyron_web','runway','video_generation','free_only','blocked_paid',1,0,'Planul Free nu oferă modele video; nu porni upgrade și nu consuma credite.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aip_avyron_web','google_drive','approved_source_read','free_only','available',1,24,'Citește numai fișiere indicate sau aprobate de operator.',CAST(strftime('%s','now') AS INTEGER)*1000);

UPDATE ai_agents
   SET guardrails=guardrails || ' Nu utiliza instrumente, modele sau funcții care consumă credite plătite. Verifică planul și costul înaintea fiecărei acțiuni externe; dacă gratuitatea nu este confirmată, oprește și marchează blocked_paid.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content'
   AND instr(guardrails,'blocked_paid')=0;

UPDATE ai_agent_versions
   SET guardrails=guardrails || ' Nu utiliza instrumente, modele sau funcții care consumă credite plătite. Verifică planul și costul înaintea fiecărei acțiuni externe; dacă gratuitatea nu este confirmată, oprește și marchează blocked_paid.'
 WHERE id='agent_version_ai_prod_content_2'
   AND instr(guardrails,'blocked_paid')=0;

PRAGMA optimize;
