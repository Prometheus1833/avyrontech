-- Additive commercial completion; never activates sales, approves licences or changes prices.
CREATE TABLE product_sales_profiles (
 slug TEXT PRIMARY KEY REFERENCES product_items(slug) ON DELETE RESTRICT,
 license_name TEXT NOT NULL CHECK(length(license_name) BETWEEN 1 AND 160),
 license_terms TEXT NOT NULL CHECK(length(license_terms) BETWEEN 1 AND 12000),
 license_approved INTEGER NOT NULL DEFAULT 0 CHECK(license_approved IN (0,1)),
 delivery_mode TEXT NOT NULL CHECK(delivery_mode IN ('download','assisted')),
 delivery_instructions TEXT NOT NULL DEFAULT '' CHECK(length(delivery_instructions)<=4000),
 updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX idx_product_sales_approval ON product_sales_profiles(license_approved,delivery_mode);

CREATE INDEX idx_product_versions_latest ON product_versions(slug,created_at DESC,id DESC);
