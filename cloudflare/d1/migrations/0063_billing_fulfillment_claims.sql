-- A signed provider can send different events for the same payment concurrently.
-- Claim each AVYRON order once before creating revenue or granting entitlements.
CREATE TABLE IF NOT EXISTS billing_order_fulfillments (
  order_id TEXT PRIMARY KEY REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revolut')),
  provider_reference TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_order_fulfillments_provider ON billing_order_fulfillments(provider,provider_reference);
