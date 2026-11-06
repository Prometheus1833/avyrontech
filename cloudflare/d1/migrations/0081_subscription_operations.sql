-- Reuse subscriptions/services/clients and the financial ledger. No provider activation.
ALTER TABLE subscriptions ADD COLUMN allocation_key TEXT;
CREATE UNIQUE INDEX subscriptions_active_allocation ON subscriptions(allocation_key) WHERE allocation_key IS NOT NULL AND status<>'cancelled';
CREATE TRIGGER subscription_allocation_beneficiary_insert BEFORE INSERT ON subscriptions
WHEN NEW.allocation_key IS NOT NULL AND NEW.client_id IS NOT (SELECT p.client_id FROM services v JOIN projects p ON p.id=v.project_id WHERE v.id=NEW.service_id)
BEGIN SELECT RAISE(ABORT,'subscription_allocation_beneficiary_mismatch'); END;
CREATE TRIGGER subscription_allocation_beneficiary_update BEFORE UPDATE OF client_id,service_id,allocation_key ON subscriptions
WHEN NEW.allocation_key IS NOT NULL AND NEW.client_id IS NOT (SELECT p.client_id FROM services v JOIN projects p ON p.id=v.project_id WHERE v.id=NEW.service_id)
BEGIN SELECT RAISE(ABORT,'subscription_allocation_beneficiary_mismatch'); END;
CREATE TABLE subscription_billing_settings (
 subscription_id TEXT PRIMARY KEY REFERENCES subscriptions(id) ON DELETE RESTRICT,
 client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
 entity_type TEXT NOT NULL CHECK(entity_type IN('individual','company','pfa','ngo','other')),
 legal_name TEXT NOT NULL,
 tax_id TEXT,
 billing_address TEXT NOT NULL,
 invoice_email TEXT NOT NULL,
 payment_terms_days INTEGER NOT NULL CHECK(payment_terms_days BETWEEN 0 AND 90),
 anchor_day INTEGER NOT NULL CHECK(anchor_day BETWEEN 1 AND 31),
 start_date INTEGER NOT NULL,
 updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 updated_at INTEGER NOT NULL
);
CREATE TABLE subscription_invoice_periods (
 subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 billing_date INTEGER NOT NULL,
 period_end INTEGER NOT NULL,
 due_date INTEGER NOT NULL,
 revenue_id TEXT NOT NULL UNIQUE REFERENCES financial_revenues(id) ON DELETE RESTRICT,
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(subscription_id,billing_date),
 CHECK(period_end>billing_date AND due_date>=billing_date)
);
CREATE INDEX subscription_period_revenue ON subscription_invoice_periods(revenue_id);
CREATE UNIQUE INDEX subscription_period_calendar_day ON subscription_invoice_periods(subscription_id,billing_date/86400000);
ALTER TABLE financial_expenses ADD COLUMN account_label TEXT NOT NULL DEFAULT '';
ALTER TABLE financial_expenses ADD COLUMN account_email TEXT;
ALTER TABLE financial_expenses ADD COLUMN workspace_label TEXT NOT NULL DEFAULT '';
ALTER TABLE financial_expenses ADD COLUMN responsible_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE financial_expenses ADD COLUMN subscription_revision INTEGER NOT NULL DEFAULT 1 CHECK(subscription_revision>0);
-- Finance edits invalidate an open subscription editor as well.
CREATE TRIGGER financial_subscription_revision AFTER UPDATE ON financial_expenses
WHEN NEW.subscription_revision=OLD.subscription_revision
BEGIN UPDATE financial_expenses SET subscription_revision=OLD.subscription_revision+1 WHERE id=NEW.id; END;
CREATE INDEX financial_internal_subscriptions ON financial_expenses(client_id,project_id,archived_at,billing_type,next_billing_date);
