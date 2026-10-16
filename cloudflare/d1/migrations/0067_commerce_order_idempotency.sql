ALTER TABLE commerce_orders ADD COLUMN client_request_id TEXT;
ALTER TABLE commerce_orders ADD COLUMN client_request_json TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_orders_client_request
  ON commerce_orders(user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
