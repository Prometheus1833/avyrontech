import { WEBSITE_SUBSCRIPTION_PATH } from "./websiteSubscriptions";
import { z } from "zod";
import defaults from "./exampleCarouselDefaults.json";
import { SERVICE_PAGES } from "./servicePagePolicy";
export const CAROUSEL_PAGES = SERVICE_PAGES.filter(
  (p) => !["overview", "audit"].includes(p.key),
);
export const BUILTIN_EXAMPLE_IMAGES = defaults.items.map((i) =>
  i.image.slice(8),
);
export const EXAMPLE_STATES = {
  draft: "Ciornă",
  in_review: "În verificare",
  rejected: "De revizuit",
  approved: "Aprobat",
  published: "Publicat",
} as const;
export type ExampleState = keyof typeof EXAMPLE_STATES;
const privatePath =
  /^\/(?:api|profil|intern|auth|staff|admin|finance|s)(?:\/|$)/i;
/** Only public browser destinations. The server never fetches arbitrary URLs. */
export function publicExampleUrl(value: string, image = false) {
  if (
    !value ||
    /[\s\\]/.test(value) ||
    [...value].some((c) => c.charCodeAt(0) < 32) ||
    value.startsWith("//")
  )
    return false;
  if (value.startsWith("builtin:"))
    return image && BUILTIN_EXAMPLE_IMAGES.includes(value.slice(8));
  try {
    const u = new URL(value, "https://avyron.ro");
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      !u.hostname.includes(".") ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname) ||
      /^[\d.]+$/.test(u.hostname) ||
      u.hostname.includes(":")
    )
      return false;
    if (
      [...u.searchParams.keys()].some((k) =>
        /token|secret|password|signature|authorization|api.?key|session/i.test(
          k,
        ),
      )
    )
      return false;
    if (
      /(?:access_token|refresh_token|password|api_key|signature|session)=/i.test(
        u.hash,
      )
    )
      return false;
    let decodedPath = u.pathname;
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decodedPath);
      if (next === decodedPath) break;
      decodedPath = next;
    }
    const firstParty = [
      "avyron.ro",
      "www.avyron.ro",
      "app.avyron.ro",
      "api.avyron.ro",
    ].includes(u.hostname);
    if (
      firstParty &&
      (privatePath.test(decodedPath) ||
        ["app.avyron.ro", "api.avyron.ro"].includes(u.hostname))
    )
      return false;
    if (image && firstParty && !/^\/(assets|og|news)\//.test(u.pathname))
      return false;
    return value.startsWith("/") || value.startsWith("https://");
  } catch {
    return false;
  }
}
const text = z.string().trim().max(180);
const localized = z.object({ ro: text, en: text }).strict();
export const exampleItemSchema = z
  .object({
    key: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    name: text.min(1),
    href: z
      .string()
      .max(1200)
      .refine((v) => publicExampleUrl(v)),
    image: z
      .string()
      .max(1200)
      .refine((v) => publicExampleUrl(v, true)),
    alt: localized.refine((v) => !!v.ro && !!v.en),
    tag: localized,
    desc: z
      .object({
        ro: z.string().trim().max(650),
        en: z.string().trim().max(650),
      })
      .strict(),
    visibility: z.enum(["visible", "hidden", "archived"]),
  })
  .strict();
export const carouselConfigSchema = z
  .object({
    enabled: z.boolean(),
    autoplay: z.boolean(),
    speed: z.number().int().min(10).max(80),
    cardWidth: z.number().int().min(250).max(360),
    gap: z.number().int().min(8).max(32),
    imageFit: z.enum(["cover", "contain"]),
    arrows: z.boolean(),
    heading: z
      .object({ eyebrow: localized, title: localized, description: localized })
      .strict(),
    items: z
      .array(exampleItemSchema)
      .max(80)
      .refine(
        (items) => new Set(items.map((i) => i.key)).size === items.length,
      ),
  })
  .strict();
export type CarouselConfig = z.infer<typeof carouselConfigSchema>;
export type ExampleItem = z.infer<typeof exampleItemSchema>;
export const DEFAULT_EXAMPLE_CAROUSEL = carouselConfigSchema.parse(defaults);
export const blankCarousel = (): CarouselConfig => ({
  ...DEFAULT_EXAMPLE_CAROUSEL,
  items: [],
  heading: structuredClone(DEFAULT_EXAMPLE_CAROUSEL.heading),
});
export function defaultCarousel(key: string): CarouselConfig | null {
  return key === "premium-website"
    ? structuredClone(DEFAULT_EXAMPLE_CAROUSEL)
    : null;
}
export function publicCarousel(
  config: CarouselConfig | null,
): CarouselConfig | null {
  return config
    ? {
        ...config,
        items: config.enabled
          ? config.items.filter((i) => i.visibility === "visible")
          : [],
      }
    : null;
}
export function carouselPageForPath(path: string) {
  const clean = path.replace(/\/$/, "");
  if(clean===WEBSITE_SUBSCRIPTION_PATH.ro || clean===WEBSITE_SUBSCRIPTION_PATH.en) return {key:"premium-website",lang:clean===WEBSITE_SUBSCRIPTION_PATH.en?"en" as const:"ro" as const};
  const p = CAROUSEL_PAGES.find((p) => p.ro === clean || p.en === clean);
  return p
    ? { key: p.key, lang: clean === p.en ? ("en" as const) : ("ro" as const) }
    : null;
}
export type CarouselDetails = {
  key: string;
  revision: number;
  config: CarouselConfig;
  state: ExampleState;
  publishedRevision: number | null;
  published: CarouselConfig | null;
  permissions: { edit: boolean; approve: boolean; publish: boolean };
  history: Array<{ revision: number; created_at: number; actor_name: string }>;
  events?: Array<{
    action: string;
    revision: number;
    created_at: number;
    actor_name: string;
  }>;
};
