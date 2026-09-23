import { useCallback, useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackFunnel } from "@/lib/siteAnalytics";
import LangSwitch from "@/components/site/LangSwitch";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageBackLink from "@/components/site/PageBackLink";
import Footer from "@/components/site/Footer";
import QuickNav, { type QuickNavItem } from "@/components/site/QuickNav";
import FloatingWhatsApp from "@/components/site/FloatingWhatsApp";
import { RequestExampleModal } from "@/components/site/RequestExampleModal";
import logo from "@/assets/avyron-logo.jpg";
import { StageProvider, useStage } from "@/components/logo3d/StageProvider";
import { isRealBrowser } from "@/components/logo3d/utils";
import LogoLoader, { useLoaderState } from "@/components/logo3d/LogoLoader";
import { Gallery, Genesis, Hero, NameStudio } from "@/components/logo3d/Interactive";
import { Audiences, Faq, FinalCta, Formats, Packages, Process, States, Tools } from "@/components/logo3d/Content";
import { LOGO3D_FAQ, LOGO3D_META, LOGO3D_PATHS, LOGO3D_TIERS } from "@/data/logo3d";
import "@/components/logo3d/logo3d.css";

const quickNav: Record<"ro" | "en", QuickNavItem[]> = {
  ro: [
    { id: "prezentare", label: "Prezentare" },
    { id: "cum-se-naste", label: "Cum se naște" },
    { id: "exemple", label: "Exemple" },
    { id: "numele-tau", label: "Numele tău în 3D" },
    { id: "pentru-cine", label: "Pentru cine" },
    { id: "preturi", label: "Prețuri" },
    { id: "faq", label: "Întrebări" },
  ],
  en: [
    { id: "prezentare", label: "Overview" },
    { id: "cum-se-naste", label: "How it's made" },
    { id: "exemple", label: "Examples" },
    { id: "numele-tau", label: "Your name in 3D" },
    { id: "pentru-cine", label: "Who it's for" },
    { id: "preturi", label: "Pricing" },
    { id: "faq", label: "FAQ" },
  ],
};

function PauseToggle() {
  const { lang } = useLang();
  const { paused, setPaused } = useStage();
  const label = paused
    ? lang === "ro" ? "Pornește animațiile" : "Play animations"
    : lang === "ro" ? "Oprește animațiile" : "Pause animations";
  return (
    <button type="button" className="l3d-chip l3d-pause" aria-pressed={paused} onClick={() => setPaused(!paused)}>
      {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}

/** Section palette → background tint; reveal-on-scroll for [data-reveal], wipes and the timeline. */
function useScrollChoreography(lang: string) {
  const { stage } = useStage();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".l3d [data-reveal], .l3d .l3d-wipe, .l3d [data-timeline]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  useEffect(() => {
    if (!stage) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".l3d [data-palette]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const [a, b] = (e.target as HTMLElement).dataset.palette!.split(",");
          stage.setPalette(a, b);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [stage, lang]);
}

/** Lenis keeps scroll and the fixed canvas in the same frame (no drift between DOM and 3D). */
function useSmoothScroll() {
  useEffect(() => {
    if (!isRealBrowser()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;
    let destroyed = false;
    let lenis: { destroy: () => void } | null = null;
    import("lenis").then(({ default: Lenis }) => {
      if (destroyed) return;
      lenis = new Lenis({ autoRaf: true, lerp: 0.12, anchors: { offset: -16 } });
    });
    return () => {
      destroyed = true;
      lenis?.destroy();
    };
  }, []);
}

function Spotlight() {
  useEffect(() => {
    if (!isRealBrowser() || window.matchMedia("(hover: none)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const root = document.documentElement;
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          root.style.setProperty("--mx", `${x}px`);
          root.style.setProperty("--my", `${y}px`);
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <div className="l3d-spot" aria-hidden />;
}

function PageBody() {
  const { lang } = useLang();
  const ro = lang === "ro";
  const m = LOGO3D_META[lang];
  const loader = useLoaderState();
  const [modal, setModal] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  useScrollChoreography(lang);
  useSmoothScroll();

  const openPreview = useCallback((detail = "") => {
    setModal({ open: true, name: detail });
    trackFunnel("view_lead_form", "logo3d", { product: "logo_dinamic_3d" });
  }, []);

  // Hero text waits for the loader, or starts right away when there is none.
  const heroDelay = loader.show ? Math.max(120, 1700 - loader.elapsed) : 80;

  return (
    <>
      {loader.show && <LogoLoader elapsed={loader.elapsed} />}
      <div className="l3d-grain" aria-hidden />
      <Spotlight />

      <div className="l3d-content">
        <header className="l3d-wrap flex items-center justify-between gap-3 pt-6 sm:pt-8">
          <PageBackLink
            to={ro ? "/costurisiproduse" : "/en/pricing"}
            label={ro ? "Înapoi" : "Back"}
            title={ro ? "Înapoi la servicii" : "Back to services"}
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
            </div>
            <a href={ro ? "/#hero" : "/en#hero"} aria-label={ro ? "Acasă" : "Home"} className="flex items-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-white/5">
              <img src={logo} alt="Avyron" width={32} height={32} className="size-7 rounded-md ring-1 ring-white/15 sm:size-8" />
              <span className="font-display text-xs tracking-[0.2em] sm:text-sm">AVYRON</span>
            </a>
          </div>
        </header>
        <div className="l3d-wrap">
          <Breadcrumbs
            className="mt-5"
            items={[
              { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
              { name: ro ? "Costuri & Servicii" : "Pricing & Services", path: ro ? "/costurisiproduse" : "/en/pricing" },
              { name: m.name, path: LOGO3D_PATHS[lang] },
            ]}
          />
        </div>

        <Hero onPreview={() => openPreview()} heroDelay={heroDelay} />
        <States />
        <Genesis />
        <Gallery />
        <NameStudio onPreview={(name) => openPreview(name)} />
        <Audiences />
        <Packages onPreview={(tier) => openPreview(tier)} />
        <Formats />
        <Tools />
        <Process />
        <Faq />
        <FinalCta onPreview={() => openPreview()} />
      </div>

      <QuickNav items={quickNav[lang]} showLang />
      <PauseToggle />
      <FloatingWhatsApp />
      <RequestExampleModal
        open={modal.open}
        onClose={() => setModal({ open: false, name: "" })}
        source={{
          slug: "logo-dinamic-3d",
          name: modal.name ? `${m.name}: ${modal.name}` : m.name,
          category: ro ? "Logo și identitate" : "Logo and identity",
        }}
      />
      <div className="relative z-[1]">
        <Footer />
      </div>
    </>
  );
}

const LogoDinamic3DPage = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const m = LOGO3D_META[lang];

  useEffect(() => {
    window.scrollTo(0, 0);
    const path = LOGO3D_PATHS[lang];
    const url = `https://avyron.ro${path}`;
    const tiers = LOGO3D_TIERS[lang];
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, faqPageLd }]) => {
        setPageMeta({ title: m.title, description: m.description, path, alternates: { ...LOGO3D_PATHS } });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd("ld-service", serviceLd({ name: m.name, description: m.description, path }));
        setJsonLd("ld-product", {
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${url}#product`,
          name: m.name,
          description: m.description,
          url,
          brand: { "@type": "Brand", name: "Avyron" },
          category: ro ? "Design logo / Identitate vizuală / Animație 3D" : "Logo design / Visual identity / 3D animation",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "RON",
            lowPrice: tiers[0].priceRon,
            highPrice: tiers[tiers.length - 1].priceRon,
            offerCount: tiers.length,
            availability: "https://schema.org/InStock",
            seller: { "@id": "https://avyron.ro/#organization" },
            offers: tiers.map((t) => ({
              "@type": "Offer",
              name: `${m.name} — ${t.name}`,
              description: t.for,
              price: t.priceRon,
              priceCurrency: "RON",
              availability: "https://schema.org/InStock",
              url: `${url}#pachet-${t.key}`,
            })),
          },
        });
        setJsonLd("ld-faq", faqPageLd([...LOGO3D_FAQ[lang]]));
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Costuri & Servicii" : "Pricing & Services", path: ro ? "/costurisiproduse" : "/en/pricing" },
            { name: m.name, path },
          ]),
        );
      },
    );
  }, [lang, ro, m]);

  useEffect(() => {
    trackFunnel("page_view", "logo3d", { product: "logo_dinamic_3d" });
  }, []);

  return (
    <main className="l3d dark" lang={lang}>
      <div className="l3d-root-bg" aria-hidden />
      <StageProvider>
        <PageBody />
      </StageProvider>
    </main>
  );
};

export default LogoDinamic3DPage;
