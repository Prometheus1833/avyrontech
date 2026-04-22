import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";
import Problem from "@/components/site/Problem";

import Examples from "@/components/site/Examples";
import DomainCheck from "@/components/site/DomainCheck";
import Benefits from "@/components/site/Benefits";
import Process from "@/components/site/Process";
import FAQ from "@/components/site/FAQ";
import CTA from "@/components/site/CTA";
import ContactBar from "@/components/site/ContactBar";
import Footer from "@/components/site/Footer";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Webcore — Site-uri care aduc clienți | Vizibilitate online";
    const desc = "Construim site-uri profesioniste, rapide și optimizate pentru Google, în 2-5 zile. Pentru afaceri locale, restaurante, saloane, profesii liberale.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + "/");
  }, []);

  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <Problem />
      <Marquee />
      <Examples />
      <DomainCheck />
      <Benefits />
      <Process />
      <CTA />
      <FAQ />
      <Footer />
      <ContactBar />
    </main>
  );
};

export default Index;
