-- 0073_platform_owner_team.sql
-- Grant the three explicitly designated identities platform-owner authority.
-- A principal row alone grants nothing: the account must exist, be verified,
-- enabled, and carry the admin role. Never create an account or set a password
-- in a migration. A new owner must self-register, verify email, and be promoted
-- by an existing platform owner through the audited admin flow.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO platform_principals
  (email, role, status, created_by, created_at, updated_at)
VALUES
  ('prometheus@avyron.ro', 'platform_owner', 'active', 'migration:0073',
   CAST(strftime('%s','now') AS INTEGER)*1000, CAST(strftime('%s','now') AS INTEGER)*1000),
  ('avyrontech@gmail.com', 'platform_owner', 'active', 'migration:0073',
   CAST(strftime('%s','now') AS INTEGER)*1000, CAST(strftime('%s','now') AS INTEGER)*1000),
  ('anisoara@avyron.ro', 'platform_owner', 'active', 'migration:0073',
   CAST(strftime('%s','now') AS INTEGER)*1000, CAST(strftime('%s','now') AS INTEGER)*1000);

-- Existing suspensions and revocations remain in force.
UPDATE platform_principals
   SET role='platform_owner', updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE email IN ('prometheus@avyron.ro','avyrontech@gmail.com','anisoara@avyron.ro')
   AND status='active' AND role<>'platform_owner';

-- Promote only accounts already proven to control their email. This is not a
-- future-email trigger; absent accounts require the onboarding steps above.
INSERT OR IGNORE INTO user_roles(user_id,role)
SELECT id,'user' FROM users
 WHERE lower(email) IN ('prometheus@avyron.ro','avyrontech@gmail.com','anisoara@avyron.ro')
   AND email_verified=1 AND disabled_at IS NULL;

INSERT OR IGNORE INTO user_roles(user_id,role)
SELECT id,'admin' FROM users
 WHERE lower(email) IN ('prometheus@avyron.ro','avyrontech@gmail.com','anisoara@avyron.ro')
   AND email_verified=1 AND disabled_at IS NULL;

INSERT INTO audit_log(user_id,action,meta_json,created_at)
SELECT id,'platform_owner_granted','{"source":"migration:0073"}',CAST(strftime('%s','now') AS INTEGER)*1000
  FROM users
 WHERE lower(email) IN ('prometheus@avyron.ro','avyrontech@gmail.com','anisoara@avyron.ro')
   AND email_verified=1 AND disabled_at IS NULL
   AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=users.id AND role='admin');
