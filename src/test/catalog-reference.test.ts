// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, beforeEach, expect, it } from "vitest";
import { COMMERCIAL_REFERENCE_SOURCES as SERVICE_COMMERCIAL_SOURCES } from "@/data/serviceCommercialSources";
import { COMMERCE_CATALOG } from "@/data/commerceCatalog";
import { SITE_STAGES } from "@/shared/skills/siteStages";
import { SKILL_SEEDS } from "@/shared/skills/catalog";
let db: DatabaseSync;
const migration = readFileSync("cloudflare/d1/migrations/0117_catalog_site_builder_reference.sql", "utf8");
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const path of readdirSync("cloudflare/d1/migrations").filter(f => f.endsWith(".sql") && f < "0117").sort()) db.exec(readFileSync("cloudflare/d1/migrations/" + path, "utf8"));
});
afterEach(() => db.close());
it("completes the actual product catalogue and all service sources, preserves prices and is idempotent", () => {
  db.exec("INSERT INTO commercial_catalog_codes(id,entity_type,entity_key,display_name,created_at,updated_at) VALUES('reviewed-web','service','premium-website','Website reviewed',1,1)");
  db.exec("UPDATE commercial_catalog_codes SET sku='LEGACY-KEEP',accounting_code=NULL,base_price_minor=12345,tax_status='verified',vat_basis_points=2100,payment_status='test',notes='Reviewed' WHERE entity_type='service' AND entity_key='premium-website'");
  const before = db.prepare("SELECT id FROM commercial_catalog_codes WHERE entity_type='service' AND entity_key='premium-website'").get()!;
  db.exec(migration);
  expect(db.prepare("SELECT count(*) n FROM product_items p LEFT JOIN commercial_catalog_codes c ON c.entity_type='product' AND c.entity_key=p.slug WHERE c.sku IS NULL OR c.accounting_code IS NULL").get()!.n).toBe(0);
  for (const s of SERVICE_COMMERCIAL_SOURCES) expect(db.prepare("SELECT sku,accounting_code FROM commercial_catalog_codes WHERE entity_type='service' AND entity_key=?").get(s.entity_key)).toMatchObject({ sku: expect.any(String), accounting_code: expect.any(String) });
  expect(db.prepare("SELECT id,sku,base_price_minor,tax_status,vat_basis_points,payment_status,notes FROM commercial_catalog_codes WHERE entity_key='premium-website'").get()).toMatchObject({ id: before.id, sku: "LEGACY-KEEP", base_price_minor: 12345, tax_status: "verified", vat_basis_points: 2100, payment_status: "test", notes: "Reviewed" });
  expect(db.prepare("SELECT count(*) n FROM commercial_catalog_codes WHERE entity_type='product' AND (tax_status!='unverified' OR payment_status!='needs_configuration')").get()!.n).toBe(0);
  expect(db.prepare("SELECT currency FROM commercial_catalog_codes WHERE entity_key='care-plus'").get()!.currency).toBe("EUR");
  expect(db.prepare("SELECT count(*) n FROM commercial_catalog_codes WHERE category='studio-plan' AND billing_cycle='annual'").get()!.n).toBe(3);
  const snapshot = db.prepare("SELECT * FROM commercial_catalog_codes ORDER BY id").all(), events = db.prepare("SELECT count(*) n FROM commercial_catalog_audit").get()!.n;
  db.exec(migration);
  expect(db.prepare("SELECT * FROM commercial_catalog_codes ORDER BY id").all()).toEqual(snapshot);
  expect(db.prepare("SELECT count(*) n FROM commercial_catalog_audit").get()!.n).toBe(events);
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("skips used article numbers and SKU suffixes and preserves registry-only articles", () => {
  db.exec("INSERT INTO commercial_catalog_codes(id,entity_type,entity_key,display_name,sku,accounting_code,created_at,updated_at) VALUES('custom','product','custom-only','Own article','AVY-DIG-CMP-0001','AVD0002',1,1),('bespoke','service','custom-service','Bespoke',NULL,NULL,1,1)");
  db.exec(migration);
  expect(db.prepare("SELECT sku,accounting_code FROM commercial_catalog_codes WHERE id='bespoke'").get()).toMatchObject({sku:expect.stringMatching(/^AVY-SRV-GEN-/),accounting_code:expect.stringMatching(/^AVS/)});
  expect(db.prepare("SELECT sku,accounting_code FROM commercial_catalog_codes WHERE id='custom'").get()).toMatchObject({ sku: "AVY-DIG-CMP-0001", accounting_code: "AVD0002" });
  expect(db.prepare("SELECT count(*) n FROM commercial_catalog_codes WHERE entity_key IN(SELECT slug FROM product_items) AND accounting_code IN('AVD0001','AVD0002')").get()!.n).toBe(0);
  expect(db.prepare("SELECT count(*) n FROM commercial_catalog_codes WHERE sku IS NOT NULL").get()!.n).toBe(db.prepare("SELECT count(DISTINCT sku) n FROM commercial_catalog_codes").get()!.n);
});
it("appends the new built-in instructions without rewriting old versions or overwriting a customized master", () => {
  const original = db.prepare("SELECT instructions FROM avy_skill_versions WHERE skill_slug='site-builder' AND version=1").get()!.instructions;
  db.exec(migration);
  expect(db.prepare("SELECT instructions FROM avy_skill_versions WHERE skill_slug='site-builder' AND version=1").get()!.instructions).toBe(original);
  expect(db.prepare("SELECT instructions FROM avy_skill_versions WHERE skill_slug='site-builder' AND version=2").get()!.instructions).toBe(SKILL_SEEDS[0].instructions);
  for (const stage of SITE_STAGES) expect(db.prepare("SELECT body,status FROM avy_skill_resources WHERE id=?").get("site_workflow_20261110_" + stage.key)).toMatchObject({ body: stage.workflow, status: "draft" });
  db.close(); db = new DatabaseSync(":memory:");
  for (const path of readdirSync("cloudflare/d1/migrations").filter(f => f.endsWith(".sql") && f < "0117").sort()) db.exec(readFileSync("cloudflare/d1/migrations/" + path,"utf8"));
  db.exec("INSERT INTO avy_skill_versions(skill_slug,version,instructions,summary,created_at) VALUES('site-builder',2,'Custom instructions. '||'Keep the customer-specific master and its existing review process unchanged in this fixture.','Custom',1); UPDATE avy_skills SET current_version=2,published_version=2,revision=3 WHERE slug='site-builder'");
  db.exec(migration);
  expect(db.prepare("SELECT instructions FROM avy_skill_versions WHERE skill_slug='site-builder' AND version=2").get()!.instructions).toContain("Custom instructions");
  expect(db.prepare("SELECT current_version,published_version,revision FROM avy_skills WHERE slug='site-builder'").get()).toMatchObject({ current_version: 2, published_version: 2, revision: 3 });
});
it("uses the checkout catalogue as a source including maintenance, without duplicate service identities", () => {
  const keys = SERVICE_COMMERCIAL_SOURCES.map(s => s.entity_key);
  expect(new Set(keys).size).toBe(keys.length);
  for (const item of COMMERCE_CATALOG.filter(i => i.sku !== 'custom-request')) expect(SERVICE_COMMERCIAL_SOURCES.some(s => s.entity_key === item.sku || 'sku' in s && s.sku === item.sku)).toBe(true);
});
