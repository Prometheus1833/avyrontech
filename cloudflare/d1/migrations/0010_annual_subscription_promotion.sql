-- 0010_annual_subscription_promotion.sql — scoped annual care-plan discount
PRAGMA foreign_keys = ON;

ALTER TABLE promotions ADD COLUMN discount_scope TEXT NOT NULL DEFAULT 'order'
  CHECK (discount_scope IN ('order', 'annual_subscription'));

ALTER TABLE commerce_orders ADD COLUMN discount_base_cents INTEGER NOT NULL DEFAULT 0
  CHECK (discount_base_cents >= 0);

-- Historical order-wide discounts used the complete subtotal as their base.
UPDATE commerce_orders
   SET discount_base_cents = subtotal_cents
 WHERE promotion_id IS NOT NULL;

INSERT INTO promotions
  (id, code, label, discount_percent, discount_scope, active, registration_required,
   per_user_limit, max_redemptions, starts_at, expires_at, created_by, created_at, updated_at)
VALUES
  ('promo-anualavy20', 'ANUALAVY20', '20% pentru abonamentul selectat pe 12 luni', 20,
   'annual_subscription', 1, 1, NULL, NULL, NULL, NULL, NULL, 1788177600000, 1788177600000)
ON CONFLICT(code) DO UPDATE SET
  label = excluded.label,
  discount_percent = excluded.discount_percent,
  discount_scope = excluded.discount_scope,
  active = 1,
  registration_required = 1,
  per_user_limit = NULL,
  max_redemptions = NULL,
  updated_at = excluded.updated_at;

CREATE INDEX IF NOT EXISTS idx_promotions_scope_active
  ON promotions(discount_scope, active, starts_at, expires_at);

PRAGMA optimize;
