-- Identități noi pentru serviciile SEO și Ads. Codurile sunt alocate intern,
-- dar fiscalitatea și traseul de plată rămân de verificat înainte de facturare.
INSERT OR IGNORE INTO commercial_catalog_codes
  (id, entity_type, entity_key, display_name, accounting_code, sku, category,
   base_price_minor, currency, vat_basis_points, payment_route, payment_status,
   active, notes, created_at, updated_at, unit_label, price_model, billing_cycle, tax_status)
VALUES
  ('growth_seo_service','service','seo-ai','SEO & AI Performance and Visibility','AVY-SEO-SVC','svc-seo-ai','growth',NULL,'RON',0,'unconfigured','needs_configuration',1,'Serviciu-cadru; prețul se stabilește prin plan sau lucrare unică.',0,0,'serviciu','quote','monthly','unverified'),
  ('growth_ads_service','service','marketing-ads','Digital Marketing & Ads','AVY-ADS-SVC','svc-marketing-ads','growth',NULL,'RON',0,'unconfigured','needs_configuration',1,'Serviciu-cadru; bugetul media este separat.',0,0,'serviciu','quote','monthly','unverified'),
  ('growth_seo_audit','service','seo-ai-audit','Audit SEO & AI inițial','AVY-SEO-AUD','seo-ai-audit','growth',0,'RON',0,'unconfigured','needs_configuration',1,'Gratuit, fără obligații contractuale.',0,0,'audit','fixed','one_time','unverified'),
  ('growth_seo_essential','service','sub-seo-essential','SEO & AI Performance and Visibility — Essential','AVY-SEO-ESS','sub-seo-essential','growth',69000,'RON',0,'unconfigured','needs_configuration',1,'Abonament lunar.',0,0,'lună','fixed','monthly','unverified'),
  ('growth_seo_growth','service','sub-seo-growth','SEO & AI Performance and Visibility — Growth','AVY-SEO-GRW','sub-seo-growth','growth',129000,'RON',0,'unconfigured','needs_configuration',1,'Abonament lunar.',0,0,'lună','fixed','monthly','unverified'),
  ('growth_seo_premium','service','sub-seo-premium','SEO & AI Performance and Visibility — Premium','AVY-SEO-PRM','sub-seo-premium','growth',249000,'RON',0,'unconfigured','needs_configuration',1,'Abonament lunar.',0,0,'lună','fixed','monthly','unverified'),
  ('growth_seo_5_15','service','seo-opt-5-15','Optimizare SEO unică — 5–15 pagini','AVY-SEO-015','seo-opt-5-15','growth',55000,'RON',0,'unconfigured','needs_configuration',1,'Lucrare unică.',0,0,'lucrare','fixed','one_time','unverified'),
  ('growth_seo_15_30','service','seo-opt-15-30','Optimizare SEO unică — 15–30 pagini','AVY-SEO-030','seo-opt-15-30','growth',89000,'RON',0,'unconfigured','needs_configuration',1,'Lucrare unică.',0,0,'lucrare','fixed','one_time','unverified'),
  ('growth_seo_30_50','service','seo-opt-30-50','Optimizare SEO unică — 30–50 pagini','AVY-SEO-050','seo-opt-30-50','growth',129000,'RON',0,'unconfigured','needs_configuration',1,'Lucrare unică.',0,0,'lucrare','fixed','one_time','unverified'),
  ('growth_ads_start','service','sub-ads-start','Digital Marketing & Ads — Ads Start','AVY-ADS-STR','sub-ads-start','growth',99000,'RON',0,'unconfigured','needs_configuration',1,'Bugetul media este separat.',0,0,'lună','fixed','monthly','unverified'),
  ('growth_ads_growth','service','sub-ads-growth','Digital Marketing & Ads — Ads Growth','AVY-ADS-GRW','sub-ads-growth','growth',169000,'RON',0,'unconfigured','needs_configuration',1,'Bugetul media este separat.',0,0,'lună','fixed','monthly','unverified'),
  ('growth_ads_performance','service','sub-ads-performance','Digital Marketing & Ads — Ads Performance','AVY-ADS-PRF','sub-ads-performance','growth',299000,'RON',0,'unconfigured','needs_configuration',1,'Tarif de la 2.990 lei/lună; ofertă individuală.',0,0,'lună','starting_at','monthly','unverified'),
  ('growth_ads_setup','service','ads-setup','Configurare inițială Ads','AVY-ADS-SET','ads-setup','growth',59000,'RON',0,'unconfigured','needs_configuration',1,'Tarif de la 590 lei; ofertă individuală.',0,0,'configurare','starting_at','one_time','unverified');
