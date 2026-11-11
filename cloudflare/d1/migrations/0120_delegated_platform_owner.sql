-- A delegated identity stays reserved without holding an active platform principal.
ALTER TABLE platform_principals ADD COLUMN management_mode TEXT NOT NULL DEFAULT 'protected'
  CHECK (management_mode IN ('protected','delegated')
    AND (management_mode <> 'delegated' OR (role = 'platform_owner' AND status <> 'active')));
