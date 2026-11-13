-- Fill the approved monthly list prices for the original website plans.
-- Keep all identifiers, configured prices, payment flags and customer snapshots.
WITH rates(sku, price_minor) AS (
  VALUES ('AVY-WEB-SUB-START', 19900),
         ('AVY-WEB-SUB-BUSINESS', 29900),
         ('AVY-WEB-SUB-PREMIUM', 39900)
)
UPDATE commercial_catalog_codes
SET base_price_minor = (SELECT price_minor FROM rates WHERE rates.sku = commercial_catalog_codes.sku),
    notes = 'Dezvoltare inclusă: 0 lei. Tarif de listă lunar; activarea plăților și condițiile se verifică separat.',
    updated_at = unixepoch() * 1000
WHERE category = 'website-subscription' AND entity_type = 'service'
  AND currency = 'RON' AND base_price_minor IS NULL
  AND sku IN (SELECT sku FROM rates)
  AND id IN (SELECT catalog_id FROM website_subscription_plans WHERE current_revision = 1);
