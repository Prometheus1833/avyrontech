/**
 * Scrie catalogul Produse Avyron în SQL, pentru D1.
 *
 * De ce există: în browser catalogul e un fișier TypeScript, dar prețul și
 * accesul nu pot fi crezute din browser. Worker-ul citește `product_items` din
 * D1, iar fișierul ăsta ține cele două în acord: rulezi scriptul, obții o
 * migrare cu `INSERT ... ON CONFLICT DO UPDATE` și catalogul din baza de date
 * devine copia exactă a celui din cod.
 *
 * Rulare:
 *   node scripts/produse-catalog-sql.mjs            → scrie migrarea curentă
 *   node scripts/produse-catalog-sql.mjs --check    → verifică doar că e la zi
 *
 * Migrarea e append-only ca toate celelalte: când catalogul se schimbă, se
 * generează un fișier nou cu numărul următor, nu se rescrie cel vechi.
 */

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(root, "cloudflare/d1/migrations");
const SEED_NAME = "0033_produse_catalog_seed.sql";

/** Aduce catalogul TypeScript în Node, fără să ceară un runner extern. */
async function loadCatalog() {
  const bundle = await build({
    entryPoints: [join(root, "scripts/produse-catalog-entry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    logLevel: "silent",
  });
  const code = bundle.outputFiles[0].text;
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  return module;
}

const q = (value) => (value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);
const n = (value) => (value === null || value === undefined ? "NULL" : String(Math.round(value)));

/** Ziua în care produsul coboară în planul următor, din regulile de progresie. */
const shift = (released, days) => new Date(released).getTime() + days * 86400000;

export function catalogSql({ ITEMS, PROGRESSION, PLANS, generatedAt }) {
  const rows = ITEMS.map((item) => {
    const released = new Date(`${item.released}T00:00:00Z`).getTime();
    const proAt = item.access === "studio" ? shift(released, PROGRESSION.proAfterDays) : null;
    const freeAt = item.access === "free" ? null : shift(released, PROGRESSION.freeAfterDays);
    return `  (${[
      q(item.slug),
      q(item.type),
      q(item.category),
      q(item.access),
      n(item.priceRon ? item.priceRon * 100 : null),
      q(item.status === "soon" ? "soon" : "live"),
      n(released),
      n(proAt),
      n(freeAt),
      q(item.name.ro),
      q(item.name.en),
      String(item.weightKb ?? 0),
      item.gpu ? "1" : "0",
      n(generatedAt),
      n(generatedAt),
    ].join(",")})`;
  });

  const plans = PLANS.map(
    (plan) =>
      `  (${[q(plan.id), q(plan.name), n(plan.priceRon * 100), n(plan.priceEur * 100), n(plan.limits.components), n(plan.limits.sections), n(plan.limits.templates), n(generatedAt)].join(",")})`,
  );

  return `-- Catalogul Produse Avyron în D1 — GENERAT, nu se editează manual.
--
-- Sursa: src/features/produse/data/items.ts + plans.ts.
-- Regenerare: node scripts/produse-catalog-sql.mjs
--
-- Worker-ul citește de aici accesul, prețul și calendarul de trecere între
-- parteneriate; catalogul din browser rămâne doar prezentare.
-- Migrare append-only: la o schimbare de catalog se generează fișierul următor.

INSERT INTO product_items
  (slug,type,category,access,price_ron_cents,status,released_at,pro_at,free_at,name_ro,name_en,weight_kb,requires_gpu,created_at,updated_at)
VALUES
${rows.join(",\n")}
ON CONFLICT(slug) DO UPDATE SET
  type=excluded.type,
  category=excluded.category,
  access=excluded.access,
  price_ron_cents=excluded.price_ron_cents,
  status=excluded.status,
  released_at=excluded.released_at,
  pro_at=excluded.pro_at,
  free_at=excluded.free_at,
  name_ro=excluded.name_ro,
  name_en=excluded.name_en,
  weight_kb=excluded.weight_kb,
  requires_gpu=excluded.requires_gpu,
  updated_at=excluded.updated_at;

INSERT INTO partnership_plans
  (id,name,price_ron_cents,price_eur_cents,components_per_day,sections_per_day,templates_per_day,updated_at)
VALUES
${plans.join(",\n")}
ON CONFLICT(id) DO UPDATE SET
  name=excluded.name,
  price_ron_cents=excluded.price_ron_cents,
  price_eur_cents=excluded.price_eur_cents,
  components_per_day=excluded.components_per_day,
  sections_per_day=excluded.sections_per_day,
  templates_per_day=excluded.templates_per_day,
  updated_at=excluded.updated_at;
`;
}

/**
 * Lista de rute din `data/routes.ts` trebuie să rămână identică cu catalogul
 * (un test o verifică). O rescriem din același loc, ca să nu existe două
 * surse de adevăr pentru ce produse există.
 */
function writeItemRoutes(ITEMS, TYPES) {
  const file = join(root, "src/features/produse/data/routes.ts");
  const current = readFileSync(file, "utf8");
  const segment = new Map(TYPES.map((type) => [type.id, type.seg.ro]));
  const rows = ITEMS.map((item) => `  { type: "${segment.get(item.type)}", slug: "${item.slug}" },`).join("\n");
  const next = current.replace(
    /(export const PRODUSE_ITEM_ROUTES: Array<\{ type: string; slug: string \}> = \[\n)[\s\S]*?(\n\];)/,
    (_match, head, tail) => `${head}${rows}${tail}`,
  );
  if (next === current) return false;
  writeFileSync(file, next);
  return true;
}

/**
 * Cifrele din cardul de pe home stau într-un fișier separat, ca `items.ts` să
 * nu intre în chunk-ul paginii principale. Le scriem de aici, din aceeași
 * sursă, altfel rămân în urmă la fiecare produs adăugat.
 */
function writeCounts(ITEMS) {
  const file = join(root, "src/features/produse/data/counts.ts");
  const current = readFileSync(file, "utf8");
  const free = ITEMS.filter((item) => item.access === "free").length;
  const next = current
    .replace(/total: \d+,/, `total: ${ITEMS.length},`)
    .replace(/free: \d+,/, `free: ${free},`);
  if (next === current) return false;
  writeFileSync(file, next);
  return true;
}

const { ITEMS, PLANS, PROGRESSION, TYPES } = await loadCatalog();
// Data fixă: migrarea trebuie să iasă identică la fiecare rulare, altfel
// `--check` ar semnala o diferență la fiecare secundă care trece.
const generatedAt = Date.UTC(2026, 8, 24);
const sql = catalogSql({ ITEMS, PLANS, PROGRESSION, generatedAt });

const existing = readdirSync(MIGRATIONS).find((file) => file === SEED_NAME);
const target = join(MIGRATIONS, SEED_NAME);
const digest = (value) => createHash("sha256").update(value).digest("hex").slice(0, 12);

if (process.argv.includes("--check")) {
  if (!existing) {
    console.error(`lipsește ${SEED_NAME}; rulează: node scripts/produse-catalog-sql.mjs`);
    process.exit(1);
  }
  const current = readFileSync(target, "utf8");
  if (current !== sql) {
    console.error(`${SEED_NAME} nu mai corespunde catalogului (${digest(current)} ≠ ${digest(sql)}); regenerează-l.`);
    process.exit(1);
  }
  console.log(`catalog D1: la zi (${ITEMS.length} produse, ${PLANS.length} parteneriate)`);
} else {
  writeFileSync(target, sql);
  const routed = writeItemRoutes(ITEMS, TYPES);
  const counted = writeCounts(ITEMS);
  console.log(
    `catalog D1: ${ITEMS.length} produse și ${PLANS.length} parteneriate scrise în ${SEED_NAME}${routed ? "; rute actualizate" : ""}${counted ? "; cifre actualizate" : ""}`,
  );
}
