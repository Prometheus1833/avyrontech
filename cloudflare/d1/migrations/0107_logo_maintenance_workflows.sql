-- Additive options; no price changes, licence grants, activation or quota increases.
ALTER TABLE avy_skill_runs ADD COLUMN free_only INTEGER NOT NULL DEFAULT 0 CHECK(free_only IN(0,1));
ALTER TABLE subscriptions ADD COLUMN maintenance_service_key TEXT;
