import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";
import AgencyServices from "@/components/site/AgencyServices";
import { useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

const Problem = lazy(() => import("@/components/site/Problem"));
const Process = lazy(() => import("@/components/site/Process"));
const Examples = lazy(() => import("@/components/site/Examples"));
const DomainCheck = lazy(() => import("@/components/site/DomainCheck"));
const Benefits = lazy(() => import("@/components/site/Benefits"));
const FAQ = lazy(() => import("@/components/site/FAQ"));
const Socials = lazy(() => import("@/components/site/Socials"));
const CTA = lazy(() => import("@/components/site/CTA"));
const ContactBar = lazy(() => import("@/components/site/ContactBar"));
const Footer = lazy(() => import("@/components/site/Footer"));

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
  return <div ref={ref} style={!ready ? { minHeight } : undefined}>{ready ? children : null}</div>;
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
              ? "Avyron — digital agency from Iași, Romania"
              : "Avyron — agenție digitală din Iași, România",
        });

        setJsonLd("ld-organization", organizationLd);
        setJsonLd("ld-website", webSiteLd);
        setJsonLd("ld-localbusiness", localBusinessLd);
        setJsonLd("ld-faq", {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: t.faq.items.map((it: { q: string; a: string }) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a },
          })),
        });
      },
    );
  }, [t.seo.title, t.seo.desc, t.faq.items, location.pathname]);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />
      <QuickNav
        items={[
          { id: "hero", label: isRo ? "Start" : "Start", icon: Rocket },
          { id: "exemple", label: isRo ? "Domenii" : "Industries", icon: LayoutGrid },
          { id: "proces", label: isRo ? "Proces" : "Process", icon: Workflow },
          { id: "avantaje", label: isRo ? "Avantaje" : "Benefits", icon: BadgeCheck },
          { id: "cta", label: isRo ? "Demo gratuit" : "Free demo", icon: MessageSquare },
          { id: "faq", label: "FAQ", icon: HelpCircle },
        ]}
      />
      <Hero />
      <AgencyServices />
      <Suspense fallback={<div className="h-8" />}>
        <Deferred minHeight={520}><Problem /></Deferred>
        <Deferred minHeight={720} forceReady={location.hash === "#exemple"}><Examples /></Deferred>
        <div className="h-8 md:h-16" aria-hidden />
        <Deferred minHeight={500} forceReady={location.hash === "#proces"}><Process /></Deferred>
        <Deferred minHeight={360}><DomainCheck /></Deferred>
        <Deferred minHeight={440}><Benefits /></Deferred>
        <Deferred minHeight={520} forceReady={location.hash === "#cta"}><CTA /></Deferred>
        <Deferred minHeight={420} forceReady={location.hash === "#faq"}><FAQ /></Deferred>
        <Deferred minHeight={320}><Socials /></Deferred>
        <Deferred minHeight={260}><Footer /></Deferred>
        <ContactBar />
      </Suspense>
    </main>
  );
};

export default Index;
