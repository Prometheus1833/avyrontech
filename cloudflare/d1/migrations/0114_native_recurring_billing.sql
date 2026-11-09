-- Explicit client consent links the existing operational subscription to its native order.
-- No existing subscription, price, card, provider setting or payment is activated here.
CREATE TABLE billing_recurring_agreements (
 id TEXT PRIMARY KEY,
 subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 order_id TEXT NOT NULL UNIQUE REFERENCES commerce_orders(id) ON DELETE RESTRICT,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 first_charge_at INTEGER,
 consent_version TEXT NOT NULL,
 consented_at INTEGER NOT NULL,
 last_checked_at INTEGER NOT NULL DEFAULT 0,
 invoice_cursor TEXT,
 closed_at INTEGER
);
CREATE UNIQUE INDEX billing_recurring_one_open ON billing_recurring_agreements(subscription_id) WHERE closed_at IS NULL;
CREATE INDEX billing_recurring_payer ON billing_recurring_agreements(user_id,subscription_id);
CREATE TABLE billing_recurring_orders (
 order_id TEXT PRIMARY KEY REFERENCES commerce_orders(id) ON DELETE RESTRICT,
 agreement_id TEXT NOT NULL REFERENCES billing_recurring_agreements(id) ON DELETE RESTRICT
);
-- Preserve accepted history. New commercial terms require stopping the old payment agreement.
CREATE TRIGGER billing_recurring_service_guard BEFORE UPDATE OF price,billing_cycle,project_id ON services
WHEN (NEW.price IS NOT OLD.price OR NEW.billing_cycle IS NOT OLD.billing_cycle OR NEW.project_id IS NOT OLD.project_id)
 AND EXISTS(SELECT 1 FROM subscriptions s JOIN billing_recurring_agreements a ON a.subscription_id=s.id WHERE s.service_id=OLD.id AND a.closed_at IS NULL)
BEGIN SELECT RAISE(ABORT,'recurring_agreement_requires_review'); END;
CREATE TRIGGER billing_recurring_beneficiary_guard BEFORE UPDATE OF client_id,service_id ON subscriptions
WHEN (NEW.client_id IS NOT OLD.client_id OR NEW.service_id IS NOT OLD.service_id)
 AND EXISTS(SELECT 1 FROM billing_recurring_agreements a WHERE a.subscription_id=OLD.id AND a.closed_at IS NULL)
BEGIN SELECT RAISE(ABORT,'recurring_agreement_requires_review'); END;

CREATE TRIGGER billing_recurring_project_beneficiary_guard BEFORE UPDATE OF client_id ON projects
WHEN NEW.client_id IS NOT OLD.client_id AND EXISTS(SELECT 1 FROM billing_recurring_agreements a WHERE a.project_id=OLD.id AND a.closed_at IS NULL)
BEGIN SELECT RAISE(ABORT,'recurring_agreement_requires_review'); END;

CREATE INDEX IF NOT EXISTS website_subscription_native_lookup ON website_subscription_projects(subscription_id);
-- A failed, undistributed preparation may be closed; a concurrent response cannot revive it.
CREATE TRIGGER billing_recurring_closed_checkout BEFORE INSERT ON billing_checkout_sessions
WHEN EXISTS(SELECT 1 FROM billing_recurring_agreements a WHERE a.order_id=NEW.order_id AND a.closed_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'recurring_agreement_closed'); END;
-- Serialize competing checkout attempts without rewriting historical sessions.
CREATE TRIGGER billing_checkout_one_active BEFORE INSERT ON billing_checkout_sessions
WHEN NEW.status IN('created','pending') AND NEW.mode<>'setup' AND EXISTS(
 SELECT 1 FROM billing_checkout_sessions old WHERE old.order_id=NEW.order_id AND old.status IN('created','pending') AND old.mode<>'setup'
 AND (old.provider<>NEW.provider OR old.provider_session_id<>NEW.provider_session_id)
)
BEGIN SELECT RAISE(ABORT,'checkout_already_active'); END;
CREATE INDEX billing_recurring_due ON billing_recurring_agreements(closed_at,last_checked_at,id);
