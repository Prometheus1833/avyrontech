import { lazy, Suspense, useEffect } from "react";
import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";
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

const Index = () => {
  const { t } = useLang();
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
    import("@/lib/seo").then(({ setPageMeta, setJsonLd }) => {
      setPageMeta({ title: t.seo.title, description: t.seo.desc, path: "/" });
      setJsonLd("ld-faq", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: t.faq.items.map((it: { q: string; a: string }) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a },
        })),
      });
    });
  }, [t.seo.title, t.seo.desc, t.faq.items]);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero />
      <Suspense fallback={<div className="h-8" />}>
        <Problem />
        <Examples />
        <div className="h-8 md:h-16" aria-hidden />
        <Process />
        <DomainCheck />
        <Benefits />
        <CTA />
        <FAQ />
        <Socials />
        <Footer />
        <ContactBar />
      </Suspense>
    </main>
  );
};

export default Index;
