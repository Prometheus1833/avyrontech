import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Check, ExternalLink, Globe2, Layers3, Mail, MousePointer2, Search, Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { GROWTH_SERVICES, type GrowthServiceKey } from "@/data/growthServices";
import { ADS_MONTHLY_OFFERS, ADS_SETUP, GROWTH_BUNDLE_DISCOUNT_PERCENT, SEO_MONTHLY_OFFERS, SEO_ONE_TIME_OFFERS, type GrowthOffer } from "@/data/growthOffers";
import { SUBSCRIPTION_PATH } from "@/data/subscriptionPlans";
import ServiceCinematicIntro from "@/components/services/ServiceCinematicIntro";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import Footer from "@/components/site/Footer";
import LangSwitch from "@/components/site/LangSwitch";
import PageBackLink from "@/components/site/PageBackLink";
import ThemeToggle from "@/components/site/ThemeToggle";
import { setPageMeta } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";
import "./growth-service.css";

const GrowthVisual = ({ kind, ro }: { kind: GrowthServiceKey; ro: boolean }) => {
  if (kind === "seo-ai") {
    return (
      <div className="growth-visual growth-visual--seo" aria-hidden="true">
        <div className="growth-orbit growth-orbit--one" />
        <div className="growth-orbit growth-orbit--two" />
        <div className="growth-search-card">
          <div className="growth-search-bar"><Search size={15} />{ro ? "cum mă găsesc clienții?" : "how do customers find me?"}<span>↵</span></div>
          <div className="growth-result">
            <span className="growth-result-icon"><Globe2 size={16} /></span>
            <span><b>AVYRON / {ro ? "Sursă clară" : "Clear source"}</b><small>{ro ? "Structură · conținut · încredere" : "Structure · content · trust"}</small></span>
          </div>
          <div className="growth-result growth-result--muted"><span className="growth-result-icon"><Sparkles size={16} /></span><span><b>AI / {ro ? "Context verificabil" : "Verifiable context"}</b><small>{ro ? "Răspunsuri bazate pe informații reale" : "Answers grounded in real information"}</small></span></div>
        </div>
        <span className="growth-visual-tag growth-visual-tag--seo">SEO / AI / CWV</span>
      </div>
    );
  }
  return (
    <div className="growth-visual growth-visual--ads" aria-hidden="true">
      <div className="growth-ads-grid" />
      <div className="growth-campaign-card">
        <div className="growth-campaign-head"><span className="growth-campaign-dot" />{ro ? "SISTEM DE CAMPANIE" : "CAMPAIGN SYSTEM"}<span>↗</span></div>
        <div className="growth-campaign-flow">
          <span>{ro ? "MESAJ" : "MESSAGE"}</span><i /><span>CLICK</span><i /><span>{ro ? "CERERE" : "ENQUIRY"}</span>
        </div>
        <div className="growth-campaign-bars"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
        <p>{ro ? "Ipoteză → test → decizie" : "Hypothesis → test → decision"}</p>
      </div>
      <div className="growth-ads-cursor"><MousePointer2 size={21} /></div>
      <span className="growth-visual-tag growth-visual-tag--ads">SEARCH / SOCIAL / CRO</span>
    </div>
  );
};

const GrowthServicePage = ({ kind }: { kind: GrowthServiceKey }) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const service = GROWTH_SERVICES[kind];
  const c = service.copy[lang];
  const path = service.path[lang];
  const otherKind: GrowthServiceKey = kind === "seo-ai" ? "marketing-ads" : "seo-ai";
  const other = GROWTH_SERVICES[otherKind];
  const contactHref = `mailto:contact@avyron.ro?subject=${encodeURIComponent(c.name + " — AVYRON")}`;
  const offers = kind === "seo-ai" ? SEO_MONTHLY_OFFERS : ADS_MONTHLY_OFFERS;
  const money = (cents: number) => `${(cents / 100).toLocaleString(ro ? "ro-RO" : "en-US")} ${ro ? "lei" : "RON"}`;
  const offerCard = (offer: GrowthOffer) => (
    <article className="growth-offer" key={offer.sku}>
      <span className="growth-offer-code">AVYRON / {kind === "seo-ai" ? "DISCOVERY" : "PERFORMANCE"}</span>
      <h3>{offer.name}</h3>
      <p className="growth-offer-price">{offer.startingAt && <small>{ro ? "de la " : "from "}</small>}{money(offer.priceCents)}<span>/{ro ? "lună" : "month"}</span></p>
      <ul>{offer.features.map((feature) => <li key={feature.ro}><Check size={15} aria-hidden />{feature[lang]}</li>)}</ul>
      <a href={`mailto:contact@avyron.ro?subject=${encodeURIComponent(`${offer.name} — ${c.name}`)}`} className="growth-offer-link">{ro ? "Cere o propunere" : "Request a proposal"}<ArrowRight size={16} aria-hidden /></a>
    </article>
  );

  useEffect(() => {
    setPageMeta({
      title: c.metaTitle,
      description: c.metaDescription,
      path,
      alternates: service.path,
      image: kind === "seo-ai" ? "/og/seo-ai.png" : "/og/marketing-ads.png",
      imageAlt: c.name,
    });
    void Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, faqPageLd }]) => {
        setJsonLd("ld-organization", organizationLd);
        setJsonLd("ld-service", serviceLd({ name: c.name, description: c.metaDescription, path }));
        setJsonLd("ld-breadcrumb", breadcrumbLd([
          { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
          { name: ro ? "Servicii AVYRON" : "AVYRON Services", path: ro ? "/servicii" : "/en/services" },
          { name: c.name, path },
        ]));
        setJsonLd("ld-faq", faqPageLd(c.faq));
      },
    );
  }, [c, kind, path, ro, service.path]);

  return (
    <main className={`growth-page growth-page--${kind}`}>
      <ServiceCinematicIntro service={kind} />
      <div className="growth-ambient" aria-hidden="true" />
      <div className="growth-shell">
        <header className="growth-topbar">
          <PageBackLink to={ro ? "/servicii" : "/en/services"} label={ro ? "Servicii" : "Services"} title={ro ? "Înapoi la servicii" : "Back to services"} />
          <div className="growth-top-actions"><LangSwitch /><ThemeToggle /><Link to={ro ? "/" : "/en"} className="growth-wordmark" aria-label={ro ? "Avyron, acasă" : "Avyron, home"}>AVYRON<span>.</span></Link></div>
        </header>
        <Breadcrumbs className="growth-breadcrumbs" items={[
          { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
          { name: ro ? "Servicii AVYRON" : "AVYRON Services", path: ro ? "/servicii" : "/en/services" },
          { name: c.name, path },
        ]} />

        <section className="growth-hero" aria-labelledby="growth-title">
          <div className="growth-hero-copy">
            <p className="growth-eyebrow"><span className="growth-pulse" />{c.eyebrow}</p>
            <p className="growth-serial">AVYRON / {kind === "seo-ai" ? "DISCOVERY SYSTEMS" : "GROWTH SYSTEMS"} / 2026</p>
            <h1 id="growth-title"><span>{c.name}</span>{c.title}</h1>
            <p className="growth-lead">{c.lead}</p>
            <div className="growth-hero-actions">
              <a className="growth-button growth-button--primary" href={contactHref} onClick={() => trackEvent("contact_click", { method: "email", location: "growth_hero", product: kind })}>{c.ctaButton}<ArrowRight size={17} aria-hidden /></a>
              <a className="growth-button growth-button--quiet" href="#abordare">{ro ? "Explorează abordarea" : "Explore the approach"}<ArrowDown size={16} aria-hidden /></a>
            </div>
          </div>
          <GrowthVisual kind={kind} ro={ro} />
        </section>

        <section className="growth-statement" aria-label={ro ? "Principiu de lucru" : "Working principle"}>
          <span>01 / {ro ? "PERSPECTIVĂ" : "PERSPECTIVE"}</span>
          <p>{c.promise}</p>
          <div>{c.signals.map((signal, index) => <span key={signal}><b>0{index + 1}</b>{signal}</span>)}</div>
        </section>

        <section id="abordare" className="growth-section growth-scope" aria-labelledby="growth-scope-title">
          <div className="growth-section-head"><span>02 / {ro ? "ARHITECTURĂ" : "ARCHITECTURE"}</span><div><h2 id="growth-scope-title">{c.scopeTitle}</h2><p>{c.scopeLead}</p></div></div>
          <div className="growth-pillar-grid">{c.pillars.map((item, index) => <article key={item.title} className="growth-pillar"><span>0{index + 1}</span><div className="growth-pillar-mark">{kind === "seo-ai" ? <Search size={20} aria-hidden /> : <Layers3 size={20} aria-hidden />}</div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </section>

        <section className="growth-section growth-process" aria-labelledby="growth-process-title">
          <div className="growth-section-head"><span>03 / {ro ? "METODĂ" : "METHOD"}</span><div><h2 id="growth-process-title">{c.processTitle}</h2></div></div>
          <ol>{c.process.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
        </section>

        <section className="growth-section growth-deliverables" aria-labelledby="growth-deliverables-title">
          <div className="growth-section-head"><span>04 / {ro ? "LIVRABILE" : "DELIVERABLES"}</span><div><h2 id="growth-deliverables-title">{c.deliverablesTitle}</h2></div></div>
          <ul>{c.deliverables.map((item) => <li key={item}><Check size={16} aria-hidden />{item}</li>)}</ul>
        </section>

        <section id="tarife" className="growth-section growth-pricing" aria-labelledby="growth-pricing-title">
          <div className="growth-section-head"><span>05 / {ro ? "OFERTĂ" : "OFFER"}</span><div><h2 id="growth-pricing-title">{kind === "seo-ai" ? (ro ? "Vizibilitate construită în ritmul tău." : "Visibility built at your pace.") : (ro ? "Campanii cu un cadru comercial clar." : "Campaigns with clear commercial terms.")}</h2><p>{kind === "seo-ai" ? (ro ? "Alege optimizare lunară sau o intervenție punctuală. Auditul SEO & AI inițial este gratuit, fără obligații contractuale." : "Choose a monthly plan or a one-time optimization. The initial SEO & AI audit is free, with no contractual obligation.") : (ro ? "Monitorizarea AI și raportarea sunt incluse în fiecare plan. Bugetele publicitare sunt achitate separat de client, direct către platforme." : "AI assisted monitoring and reporting are included in every plan. Advertising budgets are paid separately by the client to the platforms.")}</p></div></div>
          <div className="growth-offer-grid">{offers.map(offerCard)}</div>
          {kind === "seo-ai" ? <div className="growth-one-time"><div><span className="growth-offer-code">{ro ? "LUCRARE UNICĂ" : "ONE-TIME WORK"}</span><h3>{ro ? "Optimizare SEO pentru paginile care contează" : "SEO optimization for the pages that matter"}</h3><p>{ro ? "Volumul de pagini determină pachetul. Conținutul și accesul necesar se stabilesc după audit." : "The number of pages determines the package. Content and access requirements are agreed after the audit."}</p></div><div className="growth-one-time-list">{SEO_ONE_TIME_OFFERS.map(offer => <a href={`mailto:contact@avyron.ro?subject=${encodeURIComponent(`Optimizare SEO ${offer.name} pagini — AVYRON`)}`} key={offer.sku}><span>{offer.name} {ro ? "pagini" : "pages"}</span><strong>{money(offer.priceCents)}</strong><ArrowRight size={16} aria-hidden /></a>)}</div></div> : <div className="growth-one-time"><div><span className="growth-offer-code">{ro ? "CONDIȚII COMERCIALE" : "COMMERCIAL TERMS"}</span><h3>{ro ? "Bugetul media rămâne la tine." : "You control the media budget."}</h3><p>{ro ? "Recomandăm un contract de minimum 3 luni pentru a acumula date și a optimiza campaniile." : "We recommend a minimum 3-month agreement to gather data and optimize campaigns."}</p></div><div className="growth-commercial-note"><strong>{ro ? "Configurare inițială Ads" : "Initial Ads setup"}</strong><span>{ro ? "de la" : "from"} {money(ADS_SETUP.priceCents)}</span></div></div>}
          <p className="growth-bundle">{ro ? `Contractezi SEO și Ads împreună? Primești ${GROWTH_BUNDLE_DISCOUNT_PERCENT}% reducere la cele două servicii, confirmată în oferta comună.` : `Contract SEO and Ads together? Receive a ${GROWTH_BUNDLE_DISCOUNT_PERCENT}% discount on the two services, confirmed in a combined proposal.`} <Link to={SUBSCRIPTION_PATH[lang] + `#abonamente-${kind === "seo-ai" ? "seo" : "ads"}`}>{ro ? "Vezi toate abonamentele" : "See all plans"}<ArrowRight size={15} aria-hidden /></Link></p>
          <p className="growth-os-note">{ro ? "Serviciile folosesc infrastructura AVYRON OS și agenții AI existenți pentru monitorizare, automatizare, generare de conținut și raportare, potrivit accesului și configurației proiectului." : "Services use the existing AVYRON OS infrastructure and AI agents for monitoring, automation, content generation and reporting, according to project access and configuration."} <Link to={ro ? "/configurator" : "/en/configurator"}>{ro ? "Alege extraopțiuni în Configuratorul AVYRON" : "Choose extras in the AVYRON Configurator"}<ArrowRight size={14} aria-hidden /></Link></p>
        </section>

        <aside className="growth-measurement"><div><span>06 / {ro ? "MĂSURARE" : "MEASUREMENT"}</span><h2>{c.measurementTitle}</h2></div><p>{c.measurement}</p></aside>

        <section className="growth-section growth-faq" aria-labelledby="growth-faq-title">
          <div className="growth-section-head"><span>07 / FAQ</span><div><h2 id="growth-faq-title">{ro ? "Întrebări frecvente" : "Frequently asked questions"}</h2></div></div>
          <div>{c.faq.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden>+</span></summary><p>{item.a}</p></details>)}</div>
        </section>

        <section className="growth-cta" aria-labelledby="growth-cta-title"><div><span>AVYRON / {ro ? "URMĂTORUL PAS" : "NEXT STEP"}</span><h2 id="growth-cta-title">{c.ctaTitle}</h2><p>{c.ctaText}</p></div><a className="growth-button growth-button--primary" href={contactHref} onClick={() => trackEvent("contact_click", { method: "email", location: "growth_footer", product: kind })}><Mail size={17} aria-hidden />{c.ctaButton}<ExternalLink size={15} aria-hidden /></a></section>

        <nav className="growth-related" aria-label={ro ? "Alte servicii" : "Other services"}><Link to={other.path[lang]}><span>{ro ? "CONTINUĂ EXPLORAREA" : "KEEP EXPLORING"}</span><strong>{other.copy[lang].name}</strong><ArrowRight size={20} aria-hidden /></Link><Link to={ro ? "/servicii" : "/en/services"}>{ro ? "Toate serviciile" : "All services"}<ArrowRight size={17} aria-hidden /></Link></nav>
      </div>
      <Footer />
    </main>
  );
};

export default GrowthServicePage;
