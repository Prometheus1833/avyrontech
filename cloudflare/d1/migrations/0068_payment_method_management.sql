-- Only provider tokens and masked display details are stored in D1.
-- A Stripe setup webhook must match a setup session started by this account.
CREATE TABLE IF NOT EXISTS billing_method_setup_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'stripe'),
  provider_session_id TEXT NOT NULL UNIQUE,
  provider_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','completed','expired')),
  consented_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_method_setup_user ON billing_method_setup_sessions(user_id, status);

ALTER TABLE billing_payment_methods ADD COLUMN usage_scope TEXT NOT NULL DEFAULT 'future'
  CHECK (usage_scope IN ('future','recurring'));
