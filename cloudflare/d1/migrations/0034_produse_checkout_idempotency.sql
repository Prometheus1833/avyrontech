-- O comandă plătită poate acorda un singur drept, indiferent de câte ori
-- Stripe livrează webhook-ul sau câte instanțe Worker îl procesează simultan.
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_entitlements_order
  ON product_entitlements(order_id)
  WHERE order_id IS NOT NULL;

PRAGMA optimize;
