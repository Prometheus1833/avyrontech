-- 0003_profiles.sql — User profiles + avatar metadata (mirror Supabase profiles)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id                TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name      TEXT,
  avatar_url        TEXT,
  phone             TEXT,
  address           TEXT,
  entity_type       TEXT DEFAULT 'individual'
                    CHECK (entity_type IN ('individual','srl','pfa','ii','other')),
  company_name      TEXT,
  cui               TEXT,
  social_facebook   TEXT,
  social_instagram  TEXT,
  social_tiktok     TEXT,
  website           TEXT,
  language          TEXT DEFAULT 'ro' CHECK (language IN ('ro','en')),
  theme             TEXT DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  pseudonym         TEXT,
  staff_role        TEXT CHECK (staff_role IN ('dev','designer','marketing','support')),
  updated_at        INTEGER NOT NULL
);
