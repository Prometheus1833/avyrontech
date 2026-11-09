-- Acquisition analytics extends the native CRM; no fictional opportunities or accounts.
CREATE TABLE agency_platform_accounts (
 platform_id TEXT PRIMARY KEY,
 data_json TEXT NOT NULL CHECK(json_valid(data_json)),
 revision INTEGER NOT NULL CHECK(revision>=1),
 verified_at INTEGER,
 updated_by TEXT NOT NULL REFERENCES users(id),
 updated_at INTEGER NOT NULL
);
CREATE TABLE agency_opportunities (
 id TEXT PRIMARY KEY,
 platform_id TEXT NOT NULL,
 request_fingerprint TEXT NOT NULL,
 data_json TEXT NOT NULL CHECK(json_valid(data_json)),
 stage TEXT NOT NULL CHECK(stage IN ('identified','qualified','preparing','sent','negotiation','won','lost')),
 kind TEXT NOT NULL CHECK(kind IN ('commercial','subcontract','research','funding')),
 currency TEXT NOT NULL CHECK(currency IN ('RON','EUR','USD','GBP','AED')),
 service_id TEXT REFERENCES commercial_catalog_codes(id),
 client_id TEXT REFERENCES clients(id),
 owner_id TEXT REFERENCES users(id),
 priority TEXT NOT NULL CHECK(priority IN ('high','normal','low')),
 budget_min INTEGER CHECK(budget_min>=0), budget_max INTEGER CHECK(budget_max>=0),
 contract_minor INTEGER CHECK(contract_minor>=0),
 revision INTEGER NOT NULL CHECK(revision>=1),
 qualified_at INTEGER, sent_at INTEGER, won_at INTEGER, archived_at INTEGER,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(platform_id,request_fingerprint)
);
CREATE INDEX agency_opportunities_pipeline ON agency_opportunities(archived_at,stage,priority,updated_at DESC);
CREATE INDEX agency_opportunities_platform ON agency_opportunities(platform_id,archived_at,updated_at DESC);
CREATE TABLE agency_lead_links (
 opportunity_id TEXT PRIMARY KEY REFERENCES agency_opportunities(id),
 lead_id TEXT NOT NULL REFERENCES leads(id),
 created_by TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL
);
CREATE INDEX agency_lead_links_lead ON agency_lead_links(lead_id);
CREATE TABLE agency_entries (
 id TEXT PRIMARY KEY,
 opportunity_id TEXT NOT NULL REFERENCES agency_opportunities(id),
 kind TEXT NOT NULL CHECK(kind IN ('receipt','commission','platform_cost','delivery_cost','time')),
 amount_minor INTEGER NOT NULL CHECK(amount_minor>=0),
 minutes INTEGER NOT NULL CHECK(minutes>=0),
 currency TEXT NOT NULL CHECK(currency IN ('RON','EUR','USD','GBP','AED')),
 reference TEXT NOT NULL COLLATE NOCASE,
 note TEXT NOT NULL,
 occurred_on TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,
 voided_at INTEGER,void_reason TEXT,
 UNIQUE(opportunity_id,kind,reference),
 CHECK((kind='time' AND minutes>0 AND amount_minor=0) OR (kind<>'time' AND amount_minor>0 AND minutes=0))
);
CREATE INDEX agency_entries_opportunity ON agency_entries(opportunity_id,created_at DESC);
CREATE TABLE agency_events (
 id TEXT PRIMARY KEY,
 platform_id TEXT NOT NULL,
 opportunity_id TEXT REFERENCES agency_opportunities(id),
 actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL,
 revision INTEGER,
 created_at INTEGER NOT NULL,
 metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json))
);
CREATE INDEX agency_events_platform ON agency_events(platform_id,created_at DESC);
CREATE INDEX agency_events_opportunity ON agency_events(opportunity_id,created_at DESC);
