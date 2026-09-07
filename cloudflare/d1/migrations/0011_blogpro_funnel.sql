-- 0011_blogpro_funnel.sql — configurator offers stored in D1 + first-party funnel events
--
-- 1) Lead-urile din configurator (blog profesional & alte produse) primesc
--    produsul, configurația aleasă, estimarea și momentul primului răspuns,
--    ca să putem calcula câte oferte sunt în așteptare și de cât timp.
-- 2) page_events ține numărătoarea proprie de vizite / sesiuni / conversii,
--    complementar Google Analytics.

ALTER TABLE leads ADD COLUMN product TEXT;
ALTER TABLE leads ADD COLUMN config_json TEXT;
ALTER TABLE leads ADD COLUMN estimate_ron INTEGER;
ALTER TABLE leads ADD COLUMN first_response_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_leads_product ON leads(product, created_at);

CREATE TABLE IF NOT EXISTS page_events (
  id         TEXT PRIMARY KEY,
  page       TEXT NOT NULL,              -- ex: 'blogpro'
  event      TEXT NOT NULL,              -- page_view | view_configurator | view_lead_form | cta_click | generate_lead
  session_id TEXT NOT NULL,
  lang       TEXT,
  path       TEXT,
  referrer   TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_page_events_page   ON page_events(page, created_at);
CREATE INDEX IF NOT EXISTS idx_page_events_event  ON page_events(page, event, created_at);
CREATE INDEX IF NOT EXISTS idx_page_events_sess   ON page_events(session_id, event);
