-- 0002_auth.sql — Authentication tables for Cloudflare Workers auth
-- Aplicare: npx wrangler d1 migrations apply avyron-db --remote
--
-- Folosit de cloudflare/workers/api (Hono + JWT).
-- Parolele sunt hash-uite cu PBKDF2-SHA256 (Web Crypto, 210k iter).

PRAGMA foreign_keys = ON;

-- ─── USERS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,                  -- uuid v4
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,                     -- "iter$salt_b64$hash_b64"
  display_name    TEXT,
  avatar_url      TEXT,
  email_verified  INTEGER NOT NULL DEFAULT 0,        -- 0/1
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── ROLES ────────────────────────────────────────────────────────────
-- separat de users → previne privilege escalation
CREATE TABLE IF NOT EXISTS user_roles (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL CHECK (role IN ('user','staff','admin')),
  PRIMARY KEY (user_id, role)
);

-- ─── SESSIONS (refresh tokens) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,                  -- opaque token (>=32B random)
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent      TEXT,
  ip              TEXT,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL                   -- epoch ms; rolling 30d
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ─── PASSWORD RESETS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  token       TEXT PRIMARY KEY,                      -- random 32B hex
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,                      -- 1h default
  used_at     INTEGER                                -- NULL until consumed
);
CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_resets(user_id);

-- ─── AUDIT LOG (security-sensitive actions) ───────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                         -- signup|login|logout|pw_reset|role_change
  ip          TEXT,
  meta_json   TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
