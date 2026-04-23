import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";

import Problem from "@/components/site/Problem";
import Process from "@/components/site/Process";
import Examples from "@/components/site/Examples";
import DomainCheck from "@/components/site/DomainCheck";
import Benefits from "@/components/site/Benefits";
import FAQ from "@/components/site/FAQ";
import CTA from "@/components/site/CTA";
import ContactBar from "@/components/site/ContactBar";
import Footer from "@/components/site/Footer";
import { useEffect } from "react";
import { useLang } from "@/i18n/LanguageContext";

const Index = () => {
  const { t } = useLang();
  useEffect(() => {
    document.title = t.seo.title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", t.seo.desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + "/");
  }, [t.seo.title, t.seo.desc]);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero />
      <Problem />
      
      <Examples />
      <Process />
      <DomainCheck />
      <Benefits />
      <CTA />
      <FAQ />
      <Footer />
      <ContactBar />
    </main>
  );
};

export default Index;
