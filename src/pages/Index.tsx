import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";
import AgencyServices from "@/components/site/AgencyServices";
import { useLocation } from "react-router-dom";
import { homeAnchorDepth, useHomeAnchor } from "@/lib/useHomeAnchor";
import { useLang } from "@/i18n/LanguageContext";

const Problem = lazyWithRetry(() => import("@/components/site/Problem"));
const Process = lazyWithRetry(() => import("@/components/site/Process"));
const LogoStudioIntro = lazyWithRetry(() => import("@/components/site/LogoStudioIntro"));
const Examples = lazyWithRetry(() => import("@/components/site/Examples"));
const DomainCheck = lazyWithRetry(() => import("@/components/site/DomainCheck"));
const QualityStandard = lazyWithRetry(() => import("@/components/site/QualityStandard"));
const Benefits = lazyWithRetry(() => import("@/components/site/Benefits"));
const HomepageQuickLinks = lazyWithRetry(() => import("@/components/site/HomepageQuickLinks"));
const LatestBlog = lazyWithRetry(() => import("@/components/site/LatestBlog"));
const Socials = lazyWithRetry(() => import("@/components/site/Socials"));
const CTA = lazyWithRetry(() => import("@/components/site/CTA"));
const ContactBar = lazyWithRetry(() => import("@/components/site/ContactBar"));
const Footer = lazyWithRetry(() => import("@/components/site/Footer"));

const Deferred = ({
  children,
  minHeight = 240,
  forceReady = false,
}: {
  children: ReactNode;
  minHeight?: number;
  forceReady?: boolean;
}) => {
  const { lang } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(forceReady);
  useEffect(() => {
    if (forceReady) {
      setReady(true);
      return;
    }
    if (ready || !ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[entries.length - 1]?.isIntersecting) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin: "500px 0px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [forceReady, ready]);
  // Fiecare secțiune are propriul Suspense: când chunk-ul ei se încarcă, doar
  // ea afișează un placeholder de aceeași înălțime. Un Suspense comun ascundea
  // toate secțiunile deja afișate, pagina se scurta și browserul arunca
  // vizitatorul înapoi la zona de servicii.
  return (
    <div ref={ref} role={ready ? undefined : "group"} tabIndex={ready ? -1 : 0} aria-label={ready ? undefined : lang === "ro" ? "Încarcă următoarea secțiune" : "Load the next section"} aria-busy={!ready} onFocus={() => setReady(true)} data-deferred-pending={ready ? undefined : "true"} style={!ready ? { minHeight } : undefined}>
      {ready ? <Suspense fallback={<div data-deferred-lazy="true" style={{ minHeight }} />}>{children}</Suspense> : null}
    </div>
  );
};

const Index = () => {
  const { t, lang } = useLang();
  const isRo = lang === "ro";
  const location = useLocation();

  const anchorDepth = homeAnchorDepth(location.hash);
  const anchorReady = useHomeAnchor(location.hash);

  useEffect(() => {
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, webSiteLd, domainCheckLd }]) => {
        setPageMeta({
          title: t.seo.title,
          description: t.seo.desc,
          path: location.pathname === "/en" ? "/en" : "/",
          alternates: { ro: "/", en: "/en" },
          image: "/og/home.jpg",
          imageAlt:
            location.pathname === "/en"
              ? "Avyron — websites, apps and digital products"
              : "Avyron — website-uri, aplicații și produse digitale",
        });

        setJsonLd("ld-organization", organizationLd);
        setJsonLd("ld-website", webSiteLd);
        setJsonLd("ld-domain-check", domainCheckLd);
      },
    );
  }, [t.seo.title, t.seo.desc, location.pathname]);

  return (
    <main className="min-h-screen overflow-x-clip" data-anchor-ready={anchorReady ? "true" : "false"}>
      <Nav />
      <Hero />
      <AgencyServices />
      <Deferred minHeight={1120} forceReady={anchorDepth >= 0}><Examples /></Deferred>
      <Deferred minHeight={520} forceReady={anchorDepth >= 1}><Problem /></Deferred>
      <div className="h-8 md:h-16" aria-hidden />
      <Deferred minHeight={300} forceReady={anchorDepth >= 2}><LogoStudioIntro /></Deferred>
      <Deferred minHeight={500} forceReady={anchorDepth >= 3}><Process /></Deferred>
      <Deferred minHeight={360} forceReady={anchorDepth >= 4}><DomainCheck /></Deferred>
      <Deferred minHeight={440} forceReady={anchorDepth >= 5}><Benefits /></Deferred>
      <Deferred minHeight={260} forceReady={anchorDepth >= 6}><QualityStandard /></Deferred>
      <Deferred minHeight={220} forceReady={anchorDepth >= 7}><HomepageQuickLinks /></Deferred>
      <Deferred minHeight={520} forceReady={anchorDepth >= 8}><CTA /></Deferred>
      <Deferred minHeight={540} forceReady={anchorDepth >= 9}><LatestBlog /></Deferred>
      <Deferred minHeight={320} forceReady={anchorDepth >= 10}><Socials /></Deferred>
      {/* Footerul trebuie să existe chiar și când vizitatorul sare direct la
          finalul paginii folosind bara de scroll. */}
      <Deferred minHeight={260} forceReady><Footer /></Deferred>
      <Suspense fallback={null}><ContactBar /></Suspense>
    </main>
  );
};

export default Index;
