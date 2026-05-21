import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";

import Problem from "@/components/site/Problem";
import Process from "@/components/site/Process";
import Examples from "@/components/site/Examples";
import DomainCheck from "@/components/site/DomainCheck";
import Benefits from "@/components/site/Benefits";
import FAQ from "@/components/site/FAQ";
import Socials from "@/components/site/Socials";
import CTA from "@/components/site/CTA";
import ContactBar from "@/components/site/ContactBar";
import Footer from "@/components/site/Footer";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

const Index = () => {
  const { t } = useLang();
  const location = useLocation();

  // Scroll to hash anchor when arriving from another page
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    // Wait one tick for sections to mount
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
    </main>
  );
};

export default Index;
