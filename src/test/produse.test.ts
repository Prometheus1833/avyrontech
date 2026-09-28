import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { FAQ } from "@/features/produse/data/faq";
import { ITEMS, ITEM_BY_SLUG, FEATURED_SLUG } from "@/features/produse/data/items";
import { PRODUSE_COUNTS } from "@/features/produse/data/counts";
import { OFFER } from "@/features/produse/data/offer";
import { PLANS } from "@/features/produse/data/plans";
import { PRODUSE_COLLECTION_SEGMENTS, PRODUSE_ITEM_ROUTES, PRODUSE_STATIC_SEGMENTS, PRODUSE_TYPE_SEGMENTS, produseRoutePairs } from "@/features/produse/data/routes";
import { COLLECTIONS } from "@/features/produse/data/collections";
import { CATEGORIES, EUR_FOR_RON, TYPES, TYPE_BY_ID } from "@/features/produse/data/taxonomy";
import { DEMOS } from "@/features/produse/demos/registry";
import { accessNow, defaultValues } from "@/features/produse/lib/item";
import { alternatePath, itemPath, parseRoute, typePath } from "@/features/produse/lib/paths";
import { searchItems } from "@/features/produse/lib/search";
import { metaFrom } from "@/features/produse/lib/seo";
import { DEMOS as DEMO_REGISTRY } from "@/features/produse/demos/registry";
import { SOURCE_FILE } from "@/features/produse/lib/source";

/**
 * Testele paginii Produse Avyron.
 *
 * Rostul lor e să prindă exact greșelile care nu se văd la o privire: un slug
 * dublat, un demo care nu există în registru, o rută care nu mai corespunde
 * catalogului, sau cifrele din cardul de pe home rămase în urmă.
 */

describe("catalogul de produse", () => {
  it("are slug-uri unice", () => {
    const slugs = ITEMS.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("are slug-uri prietenoase cu URL-ul", () => {
    for (const item of ITEMS) expect(item.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("are ambele limbi pentru fiecare text vizibil", () => {
    for (const item of ITEMS) {
      for (const field of [item.name, item.short, item.desc]) {
        expect(field.ro.length).toBeGreaterThan(3);
        expect(field.en.length).toBeGreaterThan(3);
      }
      expect(item.features.ro.length).toBeGreaterThan(0);
      expect(item.features.en.length).toBe(item.features.ro.length);
      expect(item.keywords.ro.length).toBeGreaterThan(0);
      expect(item.keywords.en.length).toBeGreaterThan(0);
    }
  });

  it("folosește doar categorii și tipuri cunoscute", () => {
    for (const item of ITEMS) {
      expect(CATEGORIES[item.category], `categorie necunoscută: ${item.category}`).toBeDefined();
      expect(TYPE_BY_ID.get(item.type), `tip necunoscut: ${item.type}`).toBeDefined();
    }
  });

  it("are prețuri doar pe treptele acceptate, cu echivalent în euro", () => {
    for (const item of ITEMS) {
      if (!item.priceRon) continue;
      expect([30, 50, 75, 100, 150]).toContain(item.priceRon);
      expect(EUR_FOR_RON[item.priceRon]).toBeGreaterThan(0);
    }
  });

  it("nu pune preț de cumpărare separată pe produsele gratuite fără motiv", () => {
    const freeWithPrice = ITEMS.filter((item) => item.access === "free" && item.priceRon);
    // Excepția intenționată: Logo Studio e gratuit la previzualizare, plătit la descărcare.
    expect(freeWithPrice.map((item) => item.slug)).toEqual(["logo-studio-3d"]);
  });

  it("are produsul principal în catalog", () => {
    expect(ITEM_BY_SLUG.get(FEATURED_SLUG)).toBeDefined();
  });

  it("trimite doar la demo-uri existente în registru", () => {
    for (const item of ITEMS) {
      if (!item.demo) continue;
      expect(DEMOS[item.demo], `demo lipsă în registru: ${item.demo} (${item.slug})`).toBeDefined();
    }
  });

  it("are fișier sursă pentru fiecare produs marcat cu sursă publică", () => {
    for (const item of ITEMS) {
      if (!item.source) continue;
      expect(SOURCE_FILE[item.slug], `lipsește fișierul sursă pentru ${item.slug}`).toBeDefined();
    }
  });

  it("nu expune surse publice pentru produse plătite", () => {
    for (const slug of Object.keys(SOURCE_FILE)) {
      const item = ITEM_BY_SLUG.get(slug);
      expect(item, `slug inexistent în catalog: ${slug}`).toBeDefined();
      expect(item!.access, `produsul ${slug} e ${item!.access}, dar are sursa publică`).toBe("free");
    }
  });

  it("are valori implicite pentru fiecare prop din Editor Mode", () => {
    for (const item of ITEMS) {
      const values = defaultValues(item);
      for (const prop of item.props ?? []) expect(values[prop.key]).toBeDefined();
    }
  });
});

describe("rutele paginii", () => {
  it("ține lista de rute sincronă cu catalogul", () => {
    const fromRoutes = PRODUSE_ITEM_ROUTES.map((entry) => entry.slug).sort();
    const fromCatalog = ITEMS.map((item) => item.slug).sort();
    expect(fromRoutes).toEqual(fromCatalog);
  });

  it("folosește segmentul corect de tip pentru fiecare produs", () => {
    for (const entry of PRODUSE_ITEM_ROUTES) {
      const item = ITEM_BY_SLUG.get(entry.slug)!;
      expect(TYPE_BY_ID.get(item.type)!.seg.ro).toBe(entry.type);
    }
  });

  it("acoperă toate tipurile din taxonomie", () => {
    expect(PRODUSE_TYPE_SEGMENTS.map((entry) => entry.ro).sort()).toEqual(TYPES.map((type) => type.seg.ro).sort());
  });

  it("generează perechi RO/EN complete", () => {
    const pairs = produseRoutePairs();
    // acasă + pagini statice + tipuri + colecții + produse
    expect(pairs.length).toBe(1 + PRODUSE_STATIC_SEGMENTS.length + TYPES.length + PRODUSE_COLLECTION_SEGMENTS.length + ITEMS.length);
    for (const pair of pairs) {
      expect(pair.ro.startsWith("/produse-avyron")).toBe(true);
      expect(pair.en.startsWith("/en/avyron-products")).toBe(true);
    }
    expect(new Set(pairs.map((pair) => pair.ro)).size).toBe(pairs.length);
  });

  it("citește corect rutele și găsește echivalentul în cealaltă limbă", () => {
    const item = ITEM_BY_SLUG.get("buton-unda-refractie")!;
    const ro = itemPath("ro", item);
    expect(parseRoute(ro, "ro")).toEqual({ kind: "item", type: "component", slug: item.slug });
    expect(alternatePath(ro, "en")).toBe(itemPath("en", item));
    expect(parseRoute(typePath("en", "effect"), "en")).toEqual({ kind: "type", type: "effect" });
    expect(parseRoute("/produse-avyron/colectii", "ro")).toEqual({ kind: "collections" });
    expect(parseRoute("/produse-avyron/colectii/kit-landing-page", "ro")).toEqual({ kind: "collection", seg: "kit-landing-page" });
    expect(alternatePath("/produse-avyron/colectii/kit-landing-page", "en")).toBe("/en/avyron-products/collections/landing-page-kit");
    expect(parseRoute("/produse-avyron/nu-exista", "ro")).toEqual({ kind: "missing" });
    expect(alternatePath("/costurisiproduse", "en")).toBeNull();
  });
});

describe("colecțiile", () => {
  it("are segmente unice, în ambele limbi", () => {
    const ro = COLLECTIONS.map((collection) => collection.seg.ro);
    const en = COLLECTIONS.map((collection) => collection.seg.en);
    expect(new Set(ro).size).toBe(ro.length);
    expect(new Set(en).size).toBe(en.length);
    for (const segment of [...ro, ...en]) expect(segment).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("trimite doar la produse existente", () => {
    for (const collection of COLLECTIONS) {
      expect(collection.slugs.length).toBeGreaterThan(2);
      for (const slug of collection.slugs) expect(ITEM_BY_SLUG.get(slug), `slug inexistent în colecția ${collection.id}: ${slug}`).toBeDefined();
    }
  });

  it("are introducere scrisă în ambele limbi", () => {
    for (const collection of COLLECTIONS) {
      expect(collection.intro.ro.length).toBeGreaterThan(120);
      expect(collection.intro.en.length).toBeGreaterThan(120);
      expect(collection.name.ro.length).toBeGreaterThan(5);
      expect(collection.name.en.length).toBeGreaterThan(5);
    }
  });

  it("ține lista ușoară de segmente sincronă cu datele", () => {
    expect(PRODUSE_COLLECTION_SEGMENTS.map((entry) => entry.ro)).toEqual(COLLECTIONS.map((collection) => collection.seg.ro));
    expect(PRODUSE_COLLECTION_SEGMENTS.map((entry) => entry.en)).toEqual(COLLECTIONS.map((collection) => collection.seg.en));
  });

  it("acoperă fiecare tip de produs în cel puțin o colecție", () => {
    const covered = new Set(COLLECTIONS.flatMap((collection) => collection.slugs.map((slug) => ITEM_BY_SLUG.get(slug)!.type)));
    for (const type of ["component", "section", "effect", "tool", "api"]) expect(covered.has(type as never), `tip neacoperit: ${type}`).toBe(true);
  });
});

describe("căutarea", () => {
  it("găsește fără diacritice și în engleză", () => {
    expect(searchItems("notificari").map((item) => item.slug)).toContain("notificari-6-tipuri");
    expect(searchItems("toast").map((item) => item.slug)).toContain("notificari-6-tipuri");
    expect(searchItems("particles").map((item) => item.slug)).toContain("particle-lab");
    expect(searchItems("csv").map((item) => item.slug)).toContain("convertor-csv-json");
  });

  it("nu întoarce nimic pentru un termen inexistent", () => {
    expect(searchItems("zzzqqqxxx")).toHaveLength(0);
  });
});

describe("parteneriate și progresie", () => {
  it("are limite crescătoare de la Free la Studio", () => {
    const [free, pro, studio] = PLANS;
    expect(pro.limits.components).toBeGreaterThan(free.limits.components);
    expect(studio.limits.components).toBeGreaterThan(pro.limits.components);
    expect(studio.priceRon).toBeGreaterThan(pro.priceRon);
  });

  it("coboară produsele Studio în Pro după 60 de zile", () => {
    const studioItem = ITEMS.find((item) => item.access === "studio")!;
    const released = new Date(studioItem.released);
    const before = new Date(released.getTime() + 30 * 86400000);
    const after = new Date(released.getTime() + 61 * 86400000);
    expect(accessNow(studioItem, before)).toBe("studio");
    expect(accessNow(studioItem, after)).toBe("pro");
  });
});

describe("conținutul de conversie", () => {
  it("are întrebări frecvente cu răspunsuri în ambele limbi", () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(20);
    for (const entry of FAQ) {
      expect(entry.q.ro.endsWith("?")).toBe(true);
      expect(entry.a.ro.length).toBeGreaterThan(40);
      expect(entry.a.en.length).toBeGreaterThan(40);
    }
    expect(new Set(FAQ.map((entry) => entry.id)).size).toBe(FAQ.length);
  });

  it("are selectorul universal cu specificații pe fiecare opțiune", () => {
    expect(OFFER.length).toBeGreaterThanOrEqual(20);
    for (const option of OFFER) {
      expect(option.spec.ro.length).toBeGreaterThan(10);
      expect(option.spec.en.length).toBeGreaterThan(10);
    }
  });

  it("ține cifrele din cardul de pe home sincronizate cu catalogul", () => {
    expect(PRODUSE_COUNTS.total).toBe(ITEMS.length);
    expect(PRODUSE_COUNTS.free).toBe(ITEMS.filter((item) => item.access === "free").length);
  });
});

describe("fișierele care trebuie să existe pe disc", () => {
  const root = resolve(__dirname, "../features/produse");

  it("are fișierul sursă pe disc pentru fiecare produs cu sursă publică", () => {
    for (const [slug, file] of Object.entries(SOURCE_FILE)) {
      expect(existsSync(resolve(root, "source", file)), `lipsește fișierul ${file} pentru ${slug}`).toBe(true);
    }
  });

  it("are modulul de demo pe disc pentru fiecare cheie din registru", () => {
    const files = new Set(readdirSync(resolve(root, "demos")));
    const registry = readFileSync(resolve(root, "demos/registry.ts"), "utf8");
    for (const key of Object.keys(DEMOS)) {
      const match = registry.match(new RegExp(`"?${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"?:\\s*lazy\\(\\(\\) => import\\("\\./([\\w-]+)"\\)\\)`));
      expect(match, `nu găsesc modulul demo pentru ${key}`).toBeTruthy();
      expect(files.has(`${match![1]}.tsx`), `lipsește fișierul demo ${match![1]}.tsx`).toBe(true);
    }
  });

  it("nu lasă demo-uri orfane în registru", () => {
    const used = new Set(ITEMS.map((item) => item.demo).filter(Boolean));
    const orphans = Object.keys(DEMO_REGISTRY).filter((key) => !used.has(key));
    expect(orphans, `demo-uri fără produs: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("meta description", () => {
  it("strânge fraze întregi până are destul text", () => {
    const intro = "Prima frază scurtă. A doua frază adaugă exact contextul de care are nevoie cineva care caută pe Google acest lucru.";
    const meta = metaFrom(intro);
    expect(meta.length).toBeGreaterThanOrEqual(90);
    expect(meta.length).toBeLessThanOrEqual(165);
  });

  it("nu taie niciodată în mijlocul unui cuvânt", () => {
    const long = `Frază scurtă. ${"cuvinte ".repeat(60)}`;
    const meta = metaFrom(long);
    expect(meta.length).toBeLessThanOrEqual(166);
    expect(meta.endsWith("…")).toBe(true);
    expect(meta.replace("…", "").endsWith(" ")).toBe(false);
  });

  it("produce descrieri valide pentru fiecare colecție, în ambele limbi", () => {
    for (const collection of COLLECTIONS) {
      for (const lang of ["ro", "en"] as const) {
        const meta = metaFrom(collection.intro[lang]);
        expect(meta.length, `${collection.id} (${lang}): ${meta.length} caractere`).toBeGreaterThanOrEqual(90);
        expect(meta.length).toBeLessThanOrEqual(166);
      }
    }
  });
});
