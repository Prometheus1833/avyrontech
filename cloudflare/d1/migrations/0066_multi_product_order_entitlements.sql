-- One paid order may contain several different digital products.
DROP INDEX IF EXISTS idx_product_entitlements_order;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_entitlements_order_slug
  ON product_entitlements(order_id, slug)
  WHERE order_id IS NOT NULL AND slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_entitlements_order_plan
  ON product_entitlements(order_id)
  WHERE order_id IS NOT NULL AND plan IS NOT NULL;
