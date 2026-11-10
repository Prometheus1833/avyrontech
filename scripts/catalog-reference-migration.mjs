/** Append-only identity backfill. Existing prices, tax, provider state and historical identities always win. */
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const bundled = await build({ stdin: { contents: `export { COMMERCIAL_REFERENCE_SOURCES as SERVICE_COMMERCIAL_SOURCES } from './src/data/serviceCommercialSources'; export { SERVICE_IDENTITIES } from './src/shared/commercialIdentity'; export { SKILL_SEEDS } from './src/shared/skills/catalog'; export { SITE_STAGES } from './src/shared/skills/siteStages';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent' });
const data = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const { SERVICE_COMMERCIAL_SOURCES: sources, SERVICE_IDENTITIES: identities, SKILL_SEEDS, SITE_STAGES } = data;
const q = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`;
const now = "CAST(strftime('%s','now') AS INTEGER)*1000";
const signature = createHash('sha256').update(JSON.stringify(data)).digest('hex');
let sql = `-- Catalog / Site Builder reference snapshot: ${signature}\n-- Non-destructive: complete identities; keep prices, taxes, providers and historical versions.\nPRAGMA foreign_keys=ON;\nCREATE TABLE _catalog_0117_before AS SELECT id,sku,accounting_code FROM commercial_catalog_codes;\n`;
const update = `ON CONFLICT(entity_type,entity_key) DO UPDATE SET sku=CASE WHEN NULLIF(trim(commercial_catalog_codes.sku),'') IS NULL THEN excluded.sku ELSE commercial_catalog_codes.sku END,accounting_code=CASE WHEN NULLIF(trim(commercial_catalog_codes.accounting_code),'') IS NULL THEN excluded.accounting_code ELSE commercial_catalog_codes.accounting_code END,updated_at=excluded.updated_at WHERE NULLIF(trim(commercial_catalog_codes.sku),'') IS NULL OR NULLIF(trim(commercial_catalog_codes.accounting_code),'') IS NULL;\n`;
for (const s of sources) {
  const preferredSku = s.sku || identities[s.entity_key]?.sku;
  const article = s.accounting_code || identities[s.entity_key]?.article;
  const choose = (field, suggested, fallback) => suggested ? `CASE WHEN NOT EXISTS(SELECT 1 FROM commercial_catalog_codes WHERE ${field}=${q(suggested)} AND NOT(entity_type='service' AND entity_key=${q(s.entity_key)})) THEN ${q(suggested)} ELSE ${fallback} END` : fallback;
  for (const id of ['free','pro','studio']) {
  sql += `WITH RECURSIVE seq(n) AS (SELECT 10 UNION ALL SELECT n+1 FROM seq WHERE n<2*(SELECT count(*)+50 FROM commercial_catalog_codes)), free AS (SELECT n FROM seq WHERE NOT EXISTS(SELECT 1 FROM commercial_catalog_codes WHERE accounting_code='AVS'||printf('%03d',n) OR sku='AVY-SRV-GEN-'||printf('%03d',n)) ORDER BY n LIMIT 1)
INSERT INTO commercial_catalog_codes(id,entity_type,entity_key,display_name,sku,accounting_code,category,base_price_minor,currency,vat_basis_points,payment_route,payment_status,active,notes,created_at,updated_at,unit_label,price_model,billing_cycle,tax_status)
SELECT 'catalog_0117_studio_'||p.id,'service','studio-plan-'||p.id,p.name,CASE WHEN NOT EXISTS(SELECT 1 FROM commercial_catalog_codes WHERE sku=${q('AVY-PLAN-'+id.toUpperCase())} AND NOT(entity_type='service' AND entity_key=${q('studio-plan-'+id)})) THEN ${q('AVY-PLAN-'+id.toUpperCase())} ELSE 'AVY-SRV-GEN-'||printf('%03d',n) END,'AVS'||printf('%03d',n),'studio-plan',p.price_ron_cents,'RON',0,'unconfigured','needs_configuration',1,'',${now},${now},'plan','fixed','annual','unverified' FROM free JOIN partnership_plans p ON p.id=${q(id)} WHERE 1 ${update}`;
}
sql += `WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<2*(SELECT count(*)+50 FROM commercial_catalog_codes)), free AS (SELECT n FROM seq WHERE n>9 AND NOT EXISTS(SELECT 1 FROM commercial_catalog_codes WHERE accounting_code='AVS'||printf('%03d',n) OR sku='AVY-SRV-GEN-'||printf('%03d',n)) ORDER BY n LIMIT 1)
INSERT INTO commercial_catalog_codes(id,entity_type,entity_key,display_name,sku,accounting_code,category,base_price_minor,currency,vat_basis_points,payment_route,payment_status,active,notes,created_at,updated_at,unit_label,price_model,billing_cycle,tax_status)
SELECT 'catalog_0117_service_'||${q(s.entity_key)},'service',${q(s.entity_key)},${q(s.display_name)},${choose('sku',preferredSku,"'AVY-SRV-GEN-'||printf('%03d',n)")},${choose('accounting_code',article,"'AVS'||printf('%03d',n)")},${q(s.category)},${q(s.base_price_minor)},${q(s.currency || 'RON')},0,'unconfigured','needs_configuration',1,'',${now},${now},'serviciu',${q(s.price_model || (s.base_price_minor === null ? 'quote' : 'starting_at'))},${q(s.billing_cycle || 'unreviewed')},'unverified' FROM free WHERE 1 ${update}`;
}
sql += `WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<2*((SELECT count(*) FROM commercial_catalog_codes)+(SELECT count(*) FROM product_items))+32),
free AS (SELECT n,row_number() OVER(ORDER BY n) rn FROM seq WHERE NOT EXISTS(SELECT 1 FROM commercial_catalog_codes WHERE accounting_code='AVD'||printf('%04d',n) OR sku GLOB 'AVY-DIG-*-'||printf('%04d',n))),
missing AS (SELECT p.*,c.id existing_id,c.sku existing_sku,c.accounting_code existing_article,row_number() OVER(ORDER BY p.slug) rn FROM product_items p LEFT JOIN commercial_catalog_codes c ON c.entity_type='product' AND c.entity_key=p.slug WHERE NULLIF(trim(c.sku),'') IS NULL OR NULLIF(trim(c.accounting_code),'') IS NULL)
INSERT INTO commercial_catalog_codes(id,entity_type,entity_key,display_name,sku,accounting_code,category,base_price_minor,currency,vat_basis_points,payment_route,payment_status,active,notes,created_at,updated_at,unit_label,price_model,billing_cycle,tax_status)
SELECT COALESCE(existing_id,'catalog_0117_product_'||slug),'product',slug,name_ro,COALESCE(CASE WHEN NULLIF(trim(existing_sku),'') IS NOT NULL THEN existing_sku END,'AVY-DIG-'||CASE type WHEN 'component' THEN 'CMP' WHEN 'section' THEN 'SEC' WHEN 'template' THEN 'TPL' WHEN 'effect' THEN '3DE' WHEN 'tool' THEN 'TOL' WHEN 'api' THEN 'API' WHEN 'doc' THEN 'DOC' WHEN 'logo' THEN 'LGO' ELSE 'GEN' END||'-'||printf('%04d',n)),COALESCE(CASE WHEN NULLIF(trim(existing_article),'') IS NOT NULL THEN existing_article END,'AVD'||printf('%04d',n)),type,price_ron_cents,'RON',0,'unconfigured','needs_configuration',CASE WHEN status='live' THEN 1 ELSE 0 END,'',${now},${now},'unitate',CASE WHEN price_ron_cents IS NULL THEN 'unreviewed' ELSE 'fixed' END,'unreviewed','unverified' FROM missing JOIN free USING(rn) WHERE 1 ${update}`;
// Registry-only items may represent valid bespoke services. Complete their codes too, retaining every other field.
for (const type of ['service','product']) {
 const article = type === 'service' ? 'AVS' : 'AVD', width = type === 'service' ? 3 : 4;
 const sku = type === 'service' ? "'AVY-SRV-GEN-'" : "'AVY-DIG-GEN-'";
 sql += `WITH RECURSIVE seq(n) AS (SELECT ${type==='service'?10:1} UNION ALL SELECT n+1 FROM seq WHERE n<2*(SELECT count(*)+50 FROM commercial_catalog_codes)), free AS (SELECT n,row_number() OVER(ORDER BY n) rn FROM seq WHERE NOT EXISTS(SELECT 1 FROM commercial_catalog_codes WHERE accounting_code=${q(article)}||printf('%0${width}d',n) OR sku GLOB ${q(type==='service'?'AVY-SRV-*-':'AVY-DIG-*-')}||printf('%0${width}d',n))), missing AS (SELECT id,row_number() OVER(ORDER BY entity_key) rn FROM commercial_catalog_codes WHERE entity_type=${q(type)} AND (NULLIF(trim(sku),'') IS NULL OR NULLIF(trim(accounting_code),'') IS NULL)), allocation AS MATERIALIZED (SELECT missing.id,free.n FROM missing JOIN free USING(rn))
UPDATE commercial_catalog_codes SET sku=CASE WHEN NULLIF(trim(sku),'') IS NULL THEN ${sku}||printf('%0${width}d',(SELECT n FROM allocation WHERE allocation.id=commercial_catalog_codes.id)) ELSE sku END,accounting_code=CASE WHEN NULLIF(trim(accounting_code),'') IS NULL THEN ${q(article)}||printf('%0${width}d',(SELECT n FROM allocation WHERE allocation.id=commercial_catalog_codes.id)) ELSE accounting_code END,updated_at=${now} WHERE id IN(SELECT id FROM allocation);\n`;
}
sql += `INSERT INTO commercial_catalog_audit(id,catalog_id,actor_user_id,before_json,after_json,created_at)
SELECT 'catalog_0117_'||lower(hex(randomblob(16))),c.id,NULL,CASE WHEN b.id IS NULL THEN NULL ELSE json_object('sku',b.sku,'accounting_code',b.accounting_code) END,json_object('source','catalog_backfill_0117','sku',c.sku,'accounting_code',c.accounting_code),${now} FROM commercial_catalog_codes c LEFT JOIN _catalog_0117_before b ON b.id=c.id WHERE b.id IS NULL OR c.sku IS NOT b.sku OR c.accounting_code IS NOT b.accounting_code;
DROP TABLE _catalog_0117_before;
`;
const seed = SKILL_SEEDS.find(s => s.slug === 'site-builder');
sql += `-- Upgrade only the untouched repository seed. Customized masters and run snapshots remain immutable.\nINSERT INTO avy_skill_versions(skill_slug,version,instructions,summary,created_at)
SELECT 'site-builder',2,${q(seed.instructions)},'Politică de calitate și reutilizare · 2026-11-10',${now} FROM avy_skills s JOIN avy_skill_versions v ON v.skill_slug=s.slug AND v.version=1 WHERE s.slug='site-builder' AND s.current_version=1 AND s.published_version=1 AND s.revision=1 AND v.created_by IS NULL AND NOT EXISTS(SELECT 1 FROM avy_skill_versions WHERE skill_slug='site-builder' AND version=2);
UPDATE avy_skills SET current_version=2,published_version=2,revision=revision+1,updated_at=${now} WHERE slug='site-builder' AND current_version=1 AND published_version=1 AND revision=1 AND EXISTS(SELECT 1 FROM avy_skill_versions WHERE skill_slug='site-builder' AND version=2 AND instructions=${q(seed.instructions)} AND created_by IS NULL);
`;
for (const s of SITE_STAGES) sql += `INSERT OR IGNORE INTO avy_skill_resources(id,skill_slug,title,domain,body,status,stage_key,source_kind,source_key,source_revision,created_at,updated_at) VALUES(${q('site_workflow_20261110_'+s.key)},'site-builder',${q(s.title+' · standard de livrare')},'general',${q(s.workflow)},'draft',${q(s.key)},'repository',${q('workflow:'+s.key)},'2026-11-10.2',${now},${now});\n`;
const path = 'cloudflare/d1/migrations/0117_catalog_site_builder_reference.sql';
const existing = await readFile(path,'utf8').catch(() => null);
if (process.argv.includes('--check')) { if (existing !== sql) throw new Error('Snapshotul 0117 diferă de surse. Creează o migrare nouă după lansare.'); console.log('Catalog și instrucțiuni: snapshot sincronizat.'); }
else { if (existing) throw new Error('Migrarea există; nu rescrie migrațiile istorice.'); await writeFile(path,sql); console.log(path); }
// Bootstrap skill keeps its operational routing; only the canonical instructions block is synchronized explicitly.
if (process.argv.includes('--bootstrap')) {
 const file = '.agents/skills/avy-site-builder/SKILL.md', original = await readFile(file,'utf8');
 const start = original.indexOf('Folosește pentru un mockup'), end = original.indexOf('## Sursa operațională');
 if(start < 0 || end < start) throw new Error('Bootstrap marker missing');
 await writeFile(file,original.slice(0,start)+seed.instructions+'\n\n'+original.slice(end));
}
