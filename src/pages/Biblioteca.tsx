import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageBackLink from "@/components/site/PageBackLink";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown } from "lucide-react";

import ContextBar from "@/components/biblioteca/ContextBar";
import SectionNav from "@/components/biblioteca/SectionNav";
import ServiceSection from "@/components/biblioteca/ServiceSection";
import BriefBar from "@/components/biblioteca/BriefBar";
import ClosingCta from "@/components/biblioteca/ClosingCta";
import Preloader from "@/components/biblioteca/Preloader";
import { useBrief } from "@/components/biblioteca/useBrief";
import { useLenis } from "@/components/biblioteca/useLenis";
import { useSignals } from "@/components/biblioteca/useSignals";
import {
  LIBRARY_SECTIONS,
  SECTION_BY_ID,
  TOTAL_EFFECTS,
  TOTAL_SIGNATURE,
  type LibrarySection,
} from "@/data/bibliotecaCatalog";
import { detectTier, type QualityTier } from "@/lib/stage/capability";
import { pulseWarp, stageScroll } from "@/lib/stage/scrollState";
import { useLang } from "@/i18n/LanguageContext";
import { FEATURES } from "@/config/features";
import logo from "@/assets/avyron-logo.jpg";

const Backdrop = lazy(() => import("@/components/biblioteca/effects/Backdrop"));

const PATHS = { ro: "/biblioteca", en: "/en/library" };

const TIER_LABEL: Record<QualityTier, { ro: string; en: string }> = {
  ultra: { ro: "maximă", en: "maximum" },
  standard: { ro: "standard", en: "standard" },
  usor: { ro: "ușoară", en: "light" },
  none: { ro: "statică", en: "static" },
};

/**
 * Biblioteca Avyron.
 *
 * Vitrina de efecte, organizată pe ordinea produselor din site. Se intră din
 * pagina unui serviciu, se aterizează direct în secțiunea potrivită, iar la
 * final efectele alese pleacă spre ofertă cu codurile lor.
 *
 * Trei reguli care țin pagina în bugetul de performanță: un singur context
 * WebGL pentru fundal, demo-urile se încarcă abia când secțiunea se apropie,
 * iar tot textul e în HTML de la început — fără canvas, pagina rămâne
 * completă și indexabilă.
 */
const Biblioteca = () => {
  const { lang } = useLang();
  const [params] = useSearchParams();
  const [tier] = useState<QualityTier>(() => detectTier());
  const [loading, setLoading] = useState(true);
  const [backdropReady, setBackdropReady] = useState(false);
  const [activeId, setActiveId] = useState(LIBRARY_SECTIONS[0].id);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const { codes, toggle, remove } = useBrief();

  const lenisRef = useLenis(!loading);

  const origin: LibrarySection | null = useMemo(() => {
    const slug = params.get("de-la") ?? params.get("from") ?? "";
    return SECTION_BY_ID.get(slug) ?? null;
  }, [params]);

  useSignals({
    enabled: !loading,
    lang,
    tier,
    briefCount: codes.length,
    activeDemo,
  });

  // Metadate și date structurate. Textul catalogului e deja în DOM, deci ce
  // adăugăm aici doar îl explicitează pentru motoarele de căutare.
  useEffect(() => {
    const title =
      lang === "ro"
        ? "Biblioteca Avyron — efecte, animații și integrări pentru site-uri"
        : "Avyron Library — effects, animations and integrations for websites";
    const description =
      lang === "ro"
        ? `Vitrina cu ${TOTAL_EFFECTS} de efecte pe care le construim pentru clienți: animații la scroll, configuratoare 3D, tranziții cinematice, demo-uri live pe fiecare serviciu.`
        : `A showcase of ${TOTAL_EFFECTS} effects we build for clients: scroll animations, 3D configurators, cinematic transitions and live demos for every service.`;

    void Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path: PATHS[lang],
          alternates: PATHS,
          // Cât timp pagina nu e lansată, nu are ce căuta în index.
          ...(FEATURES.bibliotecaLive ? {} : { robots: "noindex, nofollow" }),
        });

        setJsonLd("biblioteca-collection", {
          "@type": "CollectionPage",
          name: title,
          description,
          inLanguage: lang === "ro" ? "ro-RO" : "en-US",
          hasPart: LIBRARY_SECTIONS.map((section) => ({
            "@type": "ItemList",
            name: section.name[lang],
            numberOfItems: section.effects.length,
            itemListElement: section.effects.map((effect, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "CreativeWork",
                identifier: effect.code,
                name: effect.name[lang],
                description: effect.desc[lang],
              },
            })),
          })),
        });

        setJsonLd(
          "biblioteca-breadcrumb",
          breadcrumbLd([
            { name: lang === "ro" ? "Acasă" : "Home", path: lang === "ro" ? "/" : "/en" },
            { name: lang === "ro" ? "Bibliotecă" : "Library", path: PATHS[lang] },
          ]),
        );
      },
    );
  }, [lang]);

  // Pagina e întunecată indiferent de tema site-ului: anunțăm browserul, ca
  // scrollbar-ul și controalele native să nu rămână albe.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.colorScheme;
    root.style.colorScheme = "dark";
    return () => {
      root.style.colorScheme = previous;
    };
  }, []);

  // Poziția de scroll pentru fundalul 3D: progres, viteză și impuls la
  // schimbarea de secțiune. Un singur ascultător pasiv pentru toată pagina.
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();

    const onScroll = () => {
      const now = performance.now();
      const height = document.documentElement.scrollHeight - window.innerHeight;
      stageScroll.progress = height > 0 ? window.scrollY / height : 0;
      const dt = Math.max(16, now - lastT);
      stageScroll.velocity = (window.scrollY - lastY) / dt;
      lastY = window.scrollY;
      lastT = now;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Secțiunea activă comandă nuanța fundalului și indicatorul lateral.
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.id;
        setActiveId((current) => {
          if (current === id) return current;
          const section = SECTION_BY_ID.get(id);
          if (section) {
            stageScroll.targetHue = section.hue;
            pulseWarp(0.85);
          }
          return id;
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.6] },
    );

    for (const section of LIBRARY_SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [loading]);

  // Aterizarea: după preloader sărim direct la secțiunea din care s-a venit.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    const target = hash || origin?.id;
    if (!target) return;
    const element = document.getElementById(target);
    if (!element) return;
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "auto", block: "start" });
      const section = SECTION_BY_ID.get(target);
      if (section) {
        stageScroll.targetHue = section.hue;
        stageScroll.hue = section.hue;
      }
    });
  }, [loading, origin]);

  const jump = useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (!element) return;
      const lenis = lenisRef.current;
      if (lenis) lenis.scrollTo(element, { offset: -8 });
      else element.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [lenisRef],
  );

  const showBackdrop = tier !== "none";

  return (
    <div className="relative min-h-screen text-white">
      {loading && <Preloader ready={backdropReady || !showBackdrop} onDone={() => setLoading(false)} />}

      {showBackdrop && (
        <div className="fixed inset-0 -z-10 bg-[#07080d]" aria-hidden="true">
          <Suspense fallback={null}>
            <Backdrop tier={tier} onReady={() => setBackdropReady(true)} />
          </Suspense>
        </div>
      )}
      {!showBackdrop && (
        <div
          className="fixed inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 0%, hsla(265,70%,30%,0.5), transparent 60%), radial-gradient(90% 70% at 85% 40%, hsla(200,80%,28%,0.4), transparent 65%), #07080d",
          }}
        />
      )}

      {origin ? (
        <ContextBar origin={origin} lang={lang} />
      ) : (
        <div className="sticky top-0 z-40 border-b border-white/10 bg-[#07080d]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <PageBackLink to={lang === "ro" ? "/" : "/en"} label={lang === "ro" ? "Înapoi" : "Back"} inverse />
            <Link to={lang === "ro" ? "/" : "/en"} className="mr-auto flex items-center gap-2 text-sm">
              <img src={logo} alt="" width={20} height={20} className="size-5 rounded object-cover" />
              <span className="font-semibold">Avyron</span>
              <span className="text-white/40">/ {lang === "ro" ? "Bibliotecă" : "Library"}</span>
            </Link>
            <a
              href="#brief"
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition-colors hover:border-white/50 hover:text-white"
            >
              {lang === "ro" ? "Cere ofertă" : "Get a quote"}
            </a>
          </div>
        </div>
      )}

      <SectionNav activeId={activeId} lang={lang} onJump={jump} />

      <header className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 sm:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/45">
          {lang === "ro" ? "Bibliotecă de efecte" : "Effects library"}
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
          {lang === "ro"
            ? "Tot ce putem construi, la un click distanță de proiectul tău"
            : "Everything we can build, one click away from your project"}
        </h1>
        <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-white/60">
          {lang === "ro"
            ? "Efectele de mai jos nu sunt inspirație. Sunt lucruri pe care le implementăm, cu cost și complexitate cunoscute. Atinge-le, alege-le, trimite-ne lista."
            : "The effects below are not inspiration. They are things we implement, with known cost and complexity. Touch them, pick them, send us the list."}
        </p>

        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6 font-mono text-xs">
          <div>
            <dt className="uppercase tracking-wider text-white/40">{lang === "ro" ? "Efecte" : "Effects"}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{TOTAL_EFFECTS}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider text-white/40">{lang === "ro" ? "Semnătură" : "Signature"}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{TOTAL_SIGNATURE}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider text-white/40">{lang === "ro" ? "Servicii" : "Services"}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{LIBRARY_SECTIONS.length}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider text-white/40">{lang === "ro" ? "Calitate" : "Quality"}</dt>
            <dd className="mt-1 text-2xl font-semibold text-white">{TIER_LABEL[tier][lang]}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => jump(LIBRARY_SECTIONS[0].id)}
          className="mt-10 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowDown className="size-4 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
          {lang === "ro" ? "Începe cu site-urile de prezentare" : "Start with presentation websites"}
        </button>
      </header>

      <main className="overflow-x-clip">
        {LIBRARY_SECTIONS.map((section, index) => (
          <ServiceSection
            key={section.id}
            section={section}
            index={index}
            lang={lang}
            selected={codes}
            onToggle={toggle}
            onDemoFocus={setActiveDemo}
          />
        ))}
      </main>

      <ClosingCta codes={codes} lang={lang} origin={origin} />

      <footer className="mx-auto max-w-6xl px-4 pb-40 text-sm text-white/40 sm:px-6">
        <p className="max-w-[70ch]">
          {lang === "ro"
            ? "Fiecare efect de aici a fost construit de noi, cu tehnici publice și biblioteci open-source. Nu copiem lucrări ale altor studiouri — le studiem tehnicile și le implementăm pe identitatea clientului."
            : "Every effect here was built by us, using public techniques and open-source libraries. We do not copy other studios' work — we study the techniques and implement them on the client's identity."}
        </p>
        <p className="mt-4">
          <Link className="underline underline-offset-4 hover:text-white" to={lang === "ro" ? "/" : "/en"}>
            {lang === "ro" ? "Înapoi la site" : "Back to the site"}
          </Link>
        </p>
      </footer>

      <BriefBar codes={codes} lang={lang} origin={origin} onRemove={remove} />
    </div>
  );
};

export default Biblioteca;
