import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";
import AgencyServices from "@/components/site/AgencyServices";
import { useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

const Problem = lazyWithRetry(() => import("@/components/site/Problem"));
const Process = lazyWithRetry(() => import("@/components/site/Process"));
const Examples = lazyWithRetry(() => import("@/components/site/Examples"));
const DomainCheck = lazyWithRetry(() => import("@/components/site/DomainCheck"));
const Benefits = lazyWithRetry(() => import("@/components/site/Benefits"));
const HomepageQuickLinks = lazyWithRetry(() => import("@/components/site/HomepageQuickLinks"));
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
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(forceReady);
  useEffect(() => {
    if (forceReady) {
      setReady(true);
      return;
    }
    if (ready || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
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
    <div ref={ref} data-deferred-pending={ready ? undefined : "true"} style={!ready ? { minHeight } : undefined}>
      {ready ? <Suspense fallback={<div data-deferred-lazy="true" style={{ minHeight }} />}>{children}</Suspense> : null}
    </div>
  );
};

const Index = () => {
  const { t, lang } = useLang();
  const isRo = lang === "ro";
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (attempts < 10) setTimeout(() => tryScroll(attempts + 1), 80);
    };
    tryScroll();
  }, [location.hash]);

  useEffect(() => {
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, webSiteLd, localBusinessLd }]) => {
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
        setJsonLd("ld-localbusiness", localBusinessLd);
      },
    );
  }, [t.seo.title, t.seo.desc, location.pathname]);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero />
      <AgencyServices />
      <Deferred minHeight={520}><Problem /></Deferred>
      <Deferred minHeight={720} forceReady={location.hash === "#exemple"}><Examples /></Deferred>
      <div className="h-8 md:h-16" aria-hidden />
      <Deferred minHeight={500} forceReady={location.hash === "#proces"}><Process /></Deferred>
      <Deferred minHeight={360}><DomainCheck /></Deferred>
      <Deferred minHeight={440}><Benefits /></Deferred>
      <Deferred minHeight={220}><HomepageQuickLinks /></Deferred>
      <Deferred minHeight={520} forceReady={location.hash === "#cta"}><CTA /></Deferred>
      <Deferred minHeight={320}><Socials /></Deferred>
      {/* Footerul trebuie să existe chiar și când vizitatorul sare direct la
          finalul paginii folosind bara de scroll. */}
      <Deferred minHeight={260} forceReady><Footer /></Deferred>
      <Suspense fallback={null}><ContactBar /></Suspense>
    </main>
  );
};

export default Index;
