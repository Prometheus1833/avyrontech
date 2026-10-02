import { useEffect, useId, useRef, useState } from "react";
import {
  Box,
  BookOpen,
  Bot,
  Bug,
  ChevronDown,
  Code2,
  Gauge,
  Layers,
  Puzzle,
  ShoppingBag,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FEATURES } from "@/config/features";
import { homePath as produsePath } from "@/features/produse/lib/paths";
import { PRODUSE_COUNTS } from "@/features/produse/data/counts";
import { useLang } from "@/i18n/LanguageContext";



const TONES = {
  website: "from-cyan-400/25 to-blue-500/10 text-cyan-600 dark:text-cyan-300",
  logo: "from-violet-400/25 to-sky-500/10 text-violet-600 dark:text-violet-300",
  shop: "from-amber-400/25 to-orange-500/10 text-orange-600 dark:text-amber-300",
  blog: "from-rose-400/25 to-pink-500/10 text-rose-600 dark:text-rose-300",
  apps: "from-indigo-400/25 to-violet-500/10 text-indigo-600 dark:text-indigo-300",
  ai: "from-fuchsia-400/25 to-purple-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  qa: "from-emerald-400/25 to-teal-500/10 text-emerald-600 dark:text-emerald-300",
};

const copy = {
  ro: {
    eyebrow: "Soluții digitale gândite pentru rezultate",
    title: "Alegi punctul de pornire. Noi construim sistemul potrivit.",
    intro:
      "De la un site de prezentare clar până la un magazin, o aplicație sau o platformă internă, fiecare serviciu pornește de la obiectivul real și rămâne ușor de extins.",
    cta: "Descoperă",
    more: "Alte servicii",
    scrollHint: "derulează lista",
    choose: "Alege tipul de site",
    soon: "În curând",
    soonToast: "Website Cinematic 3D va fi disponibil în curând.",
    classic: {
      title: "Site Prezentare Profesional",
      text: "Rapid, clar și optimizat pentru solicitări.",
      cats: ["Clinici", "Avocați", "Construcții", "Restaurante", "Consultanți", "Saloane"],
      cta: "Deschide",
    },
    cinematic: {
      title: "Website Cinematic 3D",
      text: "Experiențe spațiale care vând prin imagine.",
      cats: ["Showrooms", "Pensiuni", "Brands", "Imobiliare", "Hoteluri", "Evenimente"],
    },
    featured: [
      { key: "website", title: "Site Prezentare Profesional", text: "Cod curat, livrat rapid, gata de recomandat clienților tăi.", path: "/servicii/website-prezentare-profesional", Icon: Code2 },
      { key: "apps", title: "Aplicație Mobilă", text: "Conturi, fluxuri și API documentat, pe care îl extinzi oricând.", path: "/servicii/aplicatii-si-platforme", Icon: Gauge },
      { key: "shop", title: "Magazin online", text: "Catalog, coș și plată funcționale, cu cod modificabil de tine.", path: "/servicii/magazin-online", Icon: ShoppingBag },
    ],
    rest: [
      { key: "logo", title: "Logo Dinamic 3D", text: "Logo original pentru print, volum și mișcare.", path: "/servicii/creare-logo-3d-dinamic-cinematic", Icon: Box },
      { key: "blog", title: "Blog Profesional", text: "Content hub rapid, optimizat SEO, care aduce cereri.", path: "/servicii/blog-profesional", Icon: BookOpen },
      { key: "ai", title: "Automatizări și AI", text: "Asistenți și procese care reduc munca repetitivă.", path: "/servicii/automatizari-si-ai", Icon: Bot },
      { key: "qa", title: "QA Testing Web/Mobile", text: "Testare manuală și automată, fără abonament.", path: "/servicii/qa-testing-web-mobile", Icon: Bug },
    ],
  },
  en: {
    eyebrow: "Digital solutions designed around outcomes",
    title: "Choose the starting point. We build the right system.",
    intro:
      "From a clear business website to a store, an app, or an internal platform, every service starts with the real objective and remains easy to extend.",
    cta: "Discover",
    more: "More services",
    scrollHint: "scroll the list",
    choose: "Choose your website type",
    soon: "Coming soon",
    soonToast: "Cinematic 3D Website is coming soon.",
    classic: {
      title: "Business Website",
      text: "Fast, clear and built for enquiries.",
      cats: ["Clinics", "Lawyers", "Construction", "Restaurants", "Consultants", "Salons"],
      cta: "Open",
    },
    cinematic: {
      title: "Cinematic 3D Website",
      text: "Spatial experiences that sell through visuals.",
      cats: ["Showrooms", "Guesthouses", "Brands", "Real estate", "Hotels", "Events"],
    },
    featured: [
      { key: "website", title: "Business websites", text: "Clean code, delivered fast, ready to hand to your clients.", path: "/en/services/professional-presentation-website", Icon: Code2 },
      { key: "apps", title: "Mobile app", text: "Accounts, flows and documented APIs you can extend anytime.", path: "/en/services/apps-and-platforms", Icon: Gauge },
      { key: "shop", title: "Online stores", text: "Catalog, cart and checkout with code your team can edit.", path: "/en/services/online-store", Icon: ShoppingBag },
    ],
    rest: [
      { key: "logo", title: "Dynamic 3D Logo", text: "An original logo for print, volume and motion.", path: "/en/services/cinematic-dynamic-3d-logo-design", Icon: Box },
      { key: "blog", title: "Professional Blog", text: "A fast, SEO-ready hub that turns expertise into leads.", path: "/en/services/professional-blog", Icon: BookOpen },
      { key: "ai", title: "Automation and AI", text: "Assistants and processes that cut repetitive work.", path: "/en/services/automation-and-ai", Icon: Bot },
      { key: "qa", title: "QA Testing Web/Mobile", text: "Manual and automated testing, no subscription.", path: "/en/services/web-mobile-qa-testing", Icon: Bug },
    ],
  },
} as const;

const tileBase =
  "group relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-3 text-center shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 sm:p-4";

const AgencyServices = () => {
  const { lang } = useLang();
  const content = copy[lang];
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tone = (k: string) => TONES[k as keyof typeof TONES];

  return (
    <section id="servicii" aria-labelledby="agency-services-title" className="relative py-8 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-start gap-7 md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] md:gap-10 lg:gap-14">
          <div className="max-w-xl md:sticky md:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{content.eyebrow}</p>
            <h2 id="agency-services-title" className="mt-2.5 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {content.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{content.intro}</p>
          </div>

          <div data-testid="service-list" className="block">
            {/* 3 servicii principale, pătrate, în linie */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {content.featured.map(({ key, title, text, path, Icon }) => {
                const inner = (
                  <>
                    <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-brand/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-60" />
                    <span className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br sm:size-11 ${tone(key)}`}>
                      <Icon className="size-4 sm:size-5" aria-hidden />
                    </span>
                    <span className="w-full min-w-0">
                      <span className="block font-display text-[12px] font-semibold leading-tight tracking-tight sm:text-[15px]">{title}</span>
                      <span className="mt-1 hidden text-[11px] leading-snug text-muted-foreground sm:line-clamp-2">{text}</span>
                    </span>
                    {key === "website" && (
                      <ChevronDown aria-hidden className={`absolute right-2.5 top-2.5 size-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180 text-brand" : ""}`} />
                    )}
                  </>
                );
                return key === "website" ? (
                  <button
                    key={key}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpen((v) => !v)}
                    className={`${tileBase} ${open ? "border-brand/50 ring-1 ring-brand/30" : ""}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link key={key} to={path} aria-label={`${content.cta}: ${title}`} className={tileBase}>
                    {inner}
                  </Link>
                );
              })}
            </div>

            {/* Panou fluid: două tipuri de site */}
            <div
              id={panelId}
              ref={panelRef}
              className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${open ? "mt-2.5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}
              aria-hidden={!open}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{content.choose}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Link
                    to={content.featured[0].path}
                    tabIndex={open ? 0 : -1}
                    className="group rounded-2xl border border-border/70 bg-card/80 p-3.5 transition-all duration-300 hover:border-brand/40 hover:shadow-elev"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`grid size-8 place-items-center rounded-lg bg-gradient-to-br ${TONES.website}`}><Code2 className="size-4" aria-hidden /></span>
                      <span className="font-display text-sm font-semibold">{content.classic.title}</span>
                      <span aria-hidden className="ml-auto text-xs text-brand transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">{content.classic.text}</span>
                    <span className="mt-2.5 flex flex-wrap gap-1.5">
                      {content.classic.cats.map((c) => (
                        <span key={c} className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-medium">{c}</span>
                      ))}
                    </span>
                  </Link>
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => toast(content.soon, { description: content.soonToast })}
                    className="group relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/12 via-brand-2/[0.07] to-transparent p-3.5 text-left transition-all duration-300 hover:border-brand/50 hover:shadow-elev"
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand/30 to-brand-2/20 text-brand"><Sparkles className="size-4" aria-hidden /></span>
                      <span className="font-display text-sm font-semibold">{content.cinematic.title}</span>
                      <span className="ml-auto rounded-full bg-brand/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">{content.soon}</span>
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">{content.cinematic.text}</span>
                    <span className="mt-2.5 flex flex-wrap gap-1.5">
                      {content.cinematic.cats.map((c) => (
                        <span key={c} className="rounded-full border border-brand/25 bg-background/60 px-2 py-0.5 text-[10px] font-medium">{c}</span>
                      ))}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Restul serviciilor: listă cu scroll ascuns, derulează doar la scroll-ul utilizatorului */}
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{content.more}</span>
              <span className="text-[10px] text-muted-foreground/70">↕ {content.scrollHint}</span>
            </div>
            <div
              className="mt-1.5 max-h-[8.6rem] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card/50 [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="py-3">
                {content.rest.map(({ key, title, text, path, Icon }) => (
                  <Link
                    key={key}
                    to={path}
                    aria-label={`${content.cta}: ${title}`}
                    className="group grid snap-center grid-cols-[2.1rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60 sm:px-4"
                  >
                    <span className={`grid size-8 place-items-center rounded-lg bg-gradient-to-br ${tone(key)}`}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-sm font-semibold tracking-tight">{title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{text}</span>
                    </span>
                    <span aria-hidden className="text-xs text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-brand">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Produse Avyron (Artefacte): card mai sugestiv, cu tipurile de produse vizibile */}
        {FEATURES.produse && (
          <Link
            to={produsePath(lang)}
            data-testid="produse-avyron-card"
            className="group mt-5 grid gap-4 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/12 via-brand-2/[0.06] to-transparent p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/45 hover:shadow-elev sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
                {lang === "ro" ? "Pentru agenții, freelanceri și programatori" : "For agencies, freelancers and developers"}
              </span>
              <span className="mt-1 block font-display text-lg font-bold tracking-tight sm:text-xl">
                {lang === "ro" ? "Avyron Artefacte — construiește mai repede" : "Avyron Artefacts — build faster"}
              </span>
              <span className="mt-1 block max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                {lang === "ro"
                  ? `${PRODUSE_COUNTS.total} piese gata de folosit, din care ${PRODUSE_COUNTS.free} gratuite, cu cod de copiat direct în proiect.`
                  : `${PRODUSE_COUNTS.total} ready-to-use pieces, ${PRODUSE_COUNTS.free} of them free, with code to copy straight into your project.`}
              </span>
              <span className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                {([
                  [Puzzle, lang === "ro" ? "Componente UI" : "UI components"],
                  [Layers, lang === "ro" ? "Template-uri" : "Templates"],
                  [Wand2, lang === "ro" ? "Efecte 3D" : "3D effects"],
                  [Bot, lang === "ro" ? "Integrări API" : "API integrations"],
                ] as const).map(([I, label]) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-background/60 px-2.5 py-1.5 text-[11px] font-medium">
                    <I className="size-3.5 text-brand" aria-hidden />{label}
                  </span>
                ))}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_12px_30px_-16px_hsl(264_90%_60%)]">
              {lang === "ro" ? "Explorează artefactele" : "Explore artefacts"}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
};

export default AgencyServices;
