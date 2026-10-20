-- Extend customer account categories without changing staff roles or existing profiles.
PRAGMA foreign_keys = ON;

CREATE TABLE profiles_next (
  id                TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name      TEXT,
  avatar_url        TEXT,
  phone             TEXT,
  address           TEXT,
  entity_type       TEXT DEFAULT 'individual'
                    CHECK (entity_type IN ('individual','srl','pfa','ii','startup','public_institution','avyron_partner','other')),
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

INSERT INTO profiles_next (
  id,display_name,avatar_url,phone,address,entity_type,company_name,cui,
  social_facebook,social_instagram,social_tiktok,website,language,theme,pseudonym,staff_role,updated_at
)
SELECT id,display_name,avatar_url,phone,address,entity_type,company_name,cui,
       social_facebook,social_instagram,social_tiktok,website,language,theme,pseudonym,staff_role,updated_at
FROM profiles;

DROP TABLE profiles;
ALTER TABLE profiles_next RENAME TO profiles;

PRAGMA optimize;
