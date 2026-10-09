-- Provider-neutral payments, subscriptions and invoicing control plane.
-- Sensitive card data never enters D1: only provider tokens and masked display data.

CREATE TABLE IF NOT EXISTS billing_customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revolut','netopia')),
  provider_customer_id TEXT NOT NULL,
  email TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, provider),
  UNIQUE(provider, provider_customer_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS billing_payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revolut','netopia')),
  provider_payment_method_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'card',
  brand TEXT,
  last4 TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','detached')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_payment_method_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_billing_methods_user ON billing_payment_methods(user_id, status, is_default DESC);

CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revolut','netopia')),
  provider_session_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('payment','subscription','setup')),
  status TEXT NOT NULL CHECK (status IN ('created','pending','paid','failed','expired','cancelled')),
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RON',
  checkout_url TEXT,
  save_payment_method INTEGER NOT NULL DEFAULT 0 CHECK (save_payment_method IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_session_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_billing_sessions_order ON billing_checkout_sessions(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_sessions_user ON billing_checkout_sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revolut','netopia')),
  provider_subscription_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('incomplete','trialing','active','past_due','paused','cancelled','expired')),
  period TEXT NOT NULL CHECK (period IN ('monthly','annual')),
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON',
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_subscription_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user ON billing_subscriptions(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'oblio' CHECK (provider IN ('oblio','manual')),
  provider_invoice_id TEXT,
  series TEXT,
  number TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','issued','failed','cancelled')),
  currency TEXT NOT NULL DEFAULT 'RON',
  total_minor INTEGER NOT NULL,
  document_url TEXT,
  error_code TEXT,
  issued_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_invoice_id),
  UNIQUE(order_id, provider),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_user ON billing_invoices(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_provider_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revolut','netopia')),
  provider_product_id TEXT,
  provider_price_id TEXT,
  provider_plan_id TEXT,
  provider_variation_id TEXT,
  period TEXT CHECK (period IS NULL OR period IN ('monthly','annual')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(sku, provider, period)
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revolut','netopia')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received','processed','ignored','failed')),
  error_code TEXT,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  UNIQUE(provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS idx_billing_webhooks_received ON billing_webhook_events(provider, received_at DESC);

ALTER TABLE commercial_catalog_codes ADD COLUMN preferred_payment_provider TEXT
  CHECK (preferred_payment_provider IS NULL OR preferred_payment_provider IN ('stripe','revolut','netopia'));
ALTER TABLE commercial_catalog_codes ADD COLUMN invoice_provider TEXT
  CHECK (invoice_provider IS NULL OR invoice_provider IN ('oblio','manual'));

CREATE TABLE IF NOT EXISTS billing_profiles (
  user_id TEXT PRIMARY KEY,
  entity_type TEXT CHECK (entity_type IS NULL OR entity_type IN ('individual','company')),
  legal_name TEXT,
  tax_id TEXT,
  registration_number TEXT,
  address TEXT,
  city TEXT,
  county TEXT,
  country_code TEXT NOT NULL DEFAULT 'RO',
  invoice_email TEXT,
  automatic_charging INTEGER NOT NULL DEFAULT 0 CHECK (automatic_charging IN (0,1)),
  default_provider TEXT CHECK (default_provider IS NULL OR default_provider IN ('stripe','revolut','netopia')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- FGO history remains readable in legacy revenue rows, but no new workflow uses it.
UPDATE financial_expenses
SET status = 'cancelled', updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE vendor_id IN (SELECT id FROM financial_vendors WHERE lower(name) = 'fgo')
  AND status IN ('active','needs_configuration','payment_due','overdue');

INSERT OR IGNORE INTO financial_vendors (id,name,category,service_type,status,website_url,notes,created_at,updated_at)
VALUES ('vendor-oblio','Oblio','accounting','invoicing','needs_configuration','https://www.oblio.eu/','Facturare si e-Factura prin API oficial; activare dupa configurarea credentialelor.',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
