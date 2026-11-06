-- Preserve the existing price and every purchase/entitlement. Only distinguish paid delivery from free preview.
UPDATE product_items SET access=CASE WHEN access='free' THEN 'pro' ELSE access END,pro_at=NULL,free_at=NULL
WHERE slug='logo-studio-3d';
