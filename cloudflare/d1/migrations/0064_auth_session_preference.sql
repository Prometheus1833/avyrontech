-- Preserve the user's session preference through an optional staff MFA step.
PRAGMA foreign_keys = ON;

ALTER TABLE mfa_challenges ADD COLUMN remember_session INTEGER NOT NULL DEFAULT 0
  CHECK (remember_session IN (0, 1));

PRAGMA optimize;
