import type { Lang } from "../../../i18n/translations";

/** Text bilingv. Fiecare text vizibil din catalog există în ambele limbi. */
export type L = Record<Lang, string>;
export type LList = Record<Lang, string[]>;

export type ItemType = "component" | "section" | "template" | "effect" | "tool" | "api" | "doc" | "logo";

export type Access = "free" | "pro" | "studio";

export type Tech =
  | "react"
  | "next"
  | "html"
  | "tailwind"
  | "gsap"
  | "three"
  | "glsl"
  | "canvas"
  | "css"
  | "ts"
  | "worker";

export type PropDef =
  | { key: string; type: "color"; label: L; default: string }
  | { key: string; type: "number"; label: L; default: number; min: number; max: number; step?: number }
  | { key: string; type: "boolean"; label: L; default: boolean }
  | { key: string; type: "select"; label: L; default: string; options: Array<{ value: string; label: L }> }
  | { key: string; type: "text"; label: L; default: string; max?: number };

export type PropValues = Record<string, string | number | boolean>;

export type CatalogItem = {
  /** Identificator stabil, folosit în URL, registru CLI, coș și colecție. */
  slug: string;
  type: ItemType;
  category: string;
  tech: Tech[];
  access: Access;
  /** Preț pentru cumpărarea separată, în lei. Lipsă = doar prin parteneriat. */
  priceRon?: 30 | 50 | 75 | 100 | 150;
  status?: "new" | "popular" | "soon";
  /** Nuanța de accent a cardului și a fundalului când produsul e activ. */
  hue: number;
  /** Greutate estimată în kB gzip, afișată ca informație de performanță. */
  weightKb: number;
  gpu?: boolean;
  /** Data intrării în catalog — baza regulilor de trecere progresivă în parteneriate. */
  released: string;
  name: L;
  /** O frază: ce face. Folosită pe card și în meta description. */
  short: L;
  /** Paragraful de pe pagina produsului. */
  desc: L;
  features: LList;
  /** Termeni de căutare și sinonime (nu se afișează). */
  keywords: LList;
  /** Cheia demo-ului live din registru. */
  demo?: string;
  props?: PropDef[];
  /** Pachete npm necesare, afișate în ghid și puse în registrul CLI. */
  deps?: string[];
  /** Produsul are sursa publică în registru (doar produsele gratuite în F1). */
  source?: boolean;
};
