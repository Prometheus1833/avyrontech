import { publicExampleUrl, type CarouselConfig } from "./exampleCarousels";
export type CarouselHeading = {
  title: string;
  eyebrow: string;
  description: string;
};
export const defaultCarouselHeading = (lang: "ro" | "en"): CarouselHeading => ({
  title: lang === "ro" ? "Exemple de proiecte" : "Project examples",
  eyebrow: "AVYRON",
  description: "",
});
export const carouselHeading = (
  config: CarouselConfig,
  lang: "ro" | "en",
  fallback: CarouselHeading,
) => ({
  title: config.heading.title[lang] || fallback.title,
  eyebrow: config.heading.eyebrow[lang] || fallback.eyebrow,
  description: config.heading.description[lang] || fallback.description,
});
export const exampleImage = (ref: string, images: Record<string, string>) =>
  ref.startsWith("builtin:") ? images[ref.slice(8)] || "" : ref;
export const carouselCardClass =
  "group w-[var(--example-card-mobile)] shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-soft transition-colors hover:border-brand/50 sm:w-[var(--example-card-width)]";
export const publicBootstrapJson = (
  key: string,
  config: CarouselConfig | null,
) =>
  JSON.stringify({ [key]: config })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
const esc = (v: unknown) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
/** Identical semantic content for no-JS visitors; no external URL is fetched server-side. */
export function renderCarouselStatic(
  config: CarouselConfig | null,
  lang: "ro" | "en",
  images: Record<string, string>,
  fallback: CarouselHeading,
) {
  if (!config?.enabled || !config.items.length) return "";
  const heading = carouselHeading(config, lang, fallback);
  const cards = config.items
    .filter((i) => i.visibility === "visible")
    .map((i) => {
      const image = exampleImage(i.image, images);
      if (!image || !publicExampleUrl(image, true) || !publicExampleUrl(i.href))
        return "";
      return `<a class="${carouselCardClass}" href="${esc(i.href)}"${i.href.startsWith("https://") ? ' target="_blank" rel="noopener noreferrer"' : ""}><div class="aspect-[16/10] overflow-hidden bg-muted"><img src="${esc(image)}" alt="${esc(i.alt[lang])}" width="800" height="500" loading="lazy" referrerpolicy="no-referrer" class="size-full object-${config.imageFit} object-top"></div><div class="flex items-start gap-3 p-4"><div class="min-w-0 flex-1"><h3 class="truncate font-display text-base font-bold">${esc(i.name)}</h3><span class="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-brand">${esc(i.tag[lang])}</span><p class="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">${esc(i.desc[lang])}</p></div><span class="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h10v10M7 17 17 7"/></svg></span></div></a>`;
    })
    .join("");
  return `<section class="mt-14 scroll-mt-28" style="--example-card-mobile:${Math.min(config.cardWidth, 272)}px;--example-card-width:${config.cardWidth}px"><div class="text-center"><p class="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">${esc(heading.eyebrow)}</p><h2 class="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">${esc(heading.title)}</h2><p class="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">${esc(heading.description)}</p></div><div class="mt-6 relative"><div data-testid="portfolio-carousel" class="flex overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]" style="gap:${config.gap}px" aria-label="${esc(heading.title)}">${cards}</div>${config.arrows && config.items.length > 1 ? `<div class="mt-4 flex justify-center gap-2"><button type="button" disabled aria-label="${lang === "ro" ? "Proiectul anterior" : "Previous project"}" class="grid size-9 place-items-center rounded-full border border-border bg-card">‹</button><button type="button" disabled aria-label="${lang === "ro" ? "Proiectul următor" : "Next project"}" class="grid size-9 place-items-center rounded-full border border-border bg-card">›</button></div>` : ""}</div></section>`;
}
