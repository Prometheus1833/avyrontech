-- Metadata only, private and account-bound. Anonymous previews remain in the browser.
CREATE TABLE logo_studio_simulations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('static','dynamic')),
  source TEXT NOT NULL CHECK(source IN ('standard','ai')),
  brief_json TEXT NOT NULL CHECK(json_valid(brief_json)),
  concept_count INTEGER NOT NULL CHECK(concept_count BETWEEN 1 AND 4),
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX logo_simulations_account ON logo_studio_simulations(user_id,created_at DESC);
CREATE INDEX logo_simulations_pipeline ON logo_studio_simulations(kind,source,created_at DESC);

CREATE INDEX logo_simulations_expiry ON logo_studio_simulations(expires_at);
