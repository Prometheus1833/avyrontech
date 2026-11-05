import ServiceContentProvider from "@/components/services/ServiceContentProvider";
import ServiceCinematicIntro from "@/components/services/ServiceCinematicIntro";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import Footer from "@/components/site/Footer";
import LangSwitch from "@/components/site/LangSwitch";
import PageBackLink from "@/components/site/PageBackLink";
import ThemeToggle from "@/components/site/ThemeToggle";
import { ADS_MONTHLY_OFFERS,ADS_SETUP,GROWTH_BUNDLE_DISCOUNT_PERCENT,SEO_MONTHLY_OFFERS,SEO_ONE_TIME_OFFERS,type GrowthOffer } from "@/data/growthOffers";
import { GROWTH_SERVICES,type GrowthServiceKey } from "@/data/growthServices";
import { SERVICE_INLINE_GROWTH } from '@/data/managedServiceCopy/inline-growth';
import { SUBSCRIPTION_PATH } from "@/data/subscriptionPlans";
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { setPageMeta } from "@/lib/seo";
import { ArrowDown,ArrowRight,Check,ExternalLink,Globe2,Layers3,Mail,MousePointer2,Search,Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./growth-service.css";

const GrowthVisual = ({ kind, ro }: { kind: GrowthServiceKey; ro: boolean }) => {
 const serviceInlineCopy=useServicePageContent(kind,"inline",SERVICE_INLINE_GROWTH);

  if (kind === "seo-ai") {
    return (
      <div className="growth-visual growth-visual--seo" aria-hidden="true">
        <div className="growth-orbit growth-orbit--one" />
        <div className="growth-orbit growth-orbit--two" />
        <div className="growth-search-card">
          <div className="growth-search-bar"><Search size={15} />{(ro ? serviceInlineCopy.text_999b001cf909.ro : serviceInlineCopy.text_999b001cf909.en)}<span>↵</span></div>
          <div className="growth-result">
            <span className="growth-result-icon"><Globe2 size={16} /></span>
            <span><b>AVYRON / {(ro ? serviceInlineCopy.text_fe96665be563.ro : serviceInlineCopy.text_fe96665be563.en)}</b><small>{(ro ? serviceInlineCopy.text_03e6a60dec7f.ro : serviceInlineCopy.text_03e6a60dec7f.en)}</small></span>
          </div>
          <div className="growth-result growth-result--muted"><span className="growth-result-icon"><Sparkles size={16} /></span><span><b>AI / {(ro ? serviceInlineCopy.text_b3ca1b880b27.ro : serviceInlineCopy.text_b3ca1b880b27.en)}</b><small>{(ro ? serviceInlineCopy.text_0933cc6d0b8d.ro : serviceInlineCopy.text_0933cc6d0b8d.en)}</small></span></div>
        </div>
        <span className="growth-visual-tag growth-visual-tag--seo">SEO / AI / CWV</span>
      </div>
    );
  }
  return (
    <div className="growth-visual growth-visual--ads" aria-hidden="true">
      <div className="growth-ads-grid" />
      <div className="growth-campaign-card">
        <div className="growth-campaign-head"><span className="growth-campaign-dot" />{(ro ? serviceInlineCopy.text_9437fc3e973b.ro : serviceInlineCopy.text_9437fc3e973b.en)}<span>↗</span></div>
        <div className="growth-campaign-flow">
          <span>{(ro ? serviceInlineCopy.text_7ade7f823730.ro : serviceInlineCopy.text_7ade7f823730.en)}</span><i /><span>CLICK</span><i /><span>{(ro ? serviceInlineCopy.text_63d50944e7c9.ro : serviceInlineCopy.text_63d50944e7c9.en)}</span>
        </div>
        <div className="growth-campaign-bars"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
        <p>{(ro ? serviceInlineCopy.text_e5ecae6c9cde.ro : serviceInlineCopy.text_e5ecae6c9cde.en)}</p>
      </div>
      <div className="growth-ads-cursor"><MousePointer2 size={21} /></div>
      <span className="growth-visual-tag growth-visual-tag--ads">SEARCH / SOCIAL / CRO</span>
    </div>
  );
};

const GrowthServicePage = ({ kind }: { kind: GrowthServiceKey }) => {
 const serviceInlineCopy=useServicePageContent(kind,"inline",SERVICE_INLINE_GROWTH);

  const { lang } = useLang();
  const ro = lang === "ro";
  const service = useServicePageContent(kind,"growth",GROWTH_SERVICES[kind]);
  const c = service.copy[lang];
  const path = service.path[lang];
  const otherKind: GrowthServiceKey = kind === "seo-ai" ? "marketing-ads" : "seo-ai";
  const other = GROWTH_SERVICES[otherKind];
  const contactHref = `mailto:contact@avyron.ro?subject=${encodeURIComponent((kind === "seo-ai" ? (ro ? "Audit SEO & AI gratuit" : "Free SEO & AI audit") : c.name) + " — AVYRON")}`;
  const offers = kind === "seo-ai" ? SEO_MONTHLY_OFFERS : ADS_MONTHLY_OFFERS;
  const money = (cents: number) => `${(cents / 100).toLocaleString(ro ? "ro-RO" : "en-US")} ${ro ? "lei" : "RON"}`;
  const offerCard = (offer: GrowthOffer) => (
    <article className="growth-offer" key={offer.sku}>
      <span className="growth-offer-code">AVYRON / {(kind === "seo-ai" ? serviceInlineCopy.text_2c31b6ff84ed.ro : serviceInlineCopy.text_2c31b6ff84ed.en)}</span>
      <h3>{offer.name}</h3>
      <p className="growth-offer-price">{offer.startingAt && <small>{(ro ? serviceInlineCopy.text_32fbd16c9a11.ro : serviceInlineCopy.text_32fbd16c9a11.en)}</small>}{money(offer.priceCents)}<span>/{(ro ? serviceInlineCopy.text_3571a5568060.ro : serviceInlineCopy.text_3571a5568060.en)}</span></p>
      <ul>{offer.features.map((feature) => <li key={feature.ro}><Check size={15} aria-hidden />{feature[lang]}</li>)}</ul>
      <a href={`mailto:contact@avyron.ro?subject=${encodeURIComponent(`${offer.name} — ${c.name}`)}`} className="growth-offer-link">{(ro ? serviceInlineCopy.text_35a191de5261.ro : serviceInlineCopy.text_35a191de5261.en)}<ArrowRight size={16} aria-hidden /></a>
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
            <p className="growth-serial">AVYRON / {(kind === "seo-ai" ? serviceInlineCopy.text_2fed2bacce05.ro : serviceInlineCopy.text_2fed2bacce05.en)} / 2026</p>
            <h1 id="growth-title"><span>{c.name}</span>{c.title}</h1>
            <p className="growth-lead">{c.lead}</p>
            <div className="growth-hero-actions">
              <a className="growth-button growth-button--primary" href={contactHref} onClick={() => trackEvent("contact_click", { method: "email", location: "growth_hero", product: kind })}>{c.ctaButton}<ArrowRight size={17} aria-hidden /></a>
              <a className="growth-button growth-button--quiet" href="#abordare">{(ro ? serviceInlineCopy.text_f130d02d1ae2.ro : serviceInlineCopy.text_f130d02d1ae2.en)}<ArrowDown size={16} aria-hidden /></a>
            </div>
          </div>
          <GrowthVisual kind={kind} ro={ro} />
        </section>

        <section className="growth-statement" aria-label={ro ? "Principiu de lucru" : "Working principle"}>
          <span>01 / {(ro ? serviceInlineCopy.text_d92cc2ac68ce.ro : serviceInlineCopy.text_d92cc2ac68ce.en)}</span>
          <p>{c.promise}</p>
          <div>{c.signals.map((signal, index) => <span key={signal}><b>0{index + 1}</b>{signal}</span>)}</div>
        </section>

        <section id="abordare" className="growth-section growth-scope" aria-labelledby="growth-scope-title">
          <div className="growth-section-head"><span>02 / {(ro ? serviceInlineCopy.text_d17f12a4c925.ro : serviceInlineCopy.text_d17f12a4c925.en)}</span><div><h2 id="growth-scope-title">{c.scopeTitle}</h2><p>{c.scopeLead}</p></div></div>
          <div className="growth-pillar-grid">{c.pillars.map((item, index) => <article key={item.title} className="growth-pillar"><span>0{index + 1}</span><div className="growth-pillar-mark">{kind === "seo-ai" ? <Search size={20} aria-hidden /> : <Layers3 size={20} aria-hidden />}</div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </section>

        <section className="growth-section growth-process" aria-labelledby="growth-process-title">
          <div className="growth-section-head"><span>03 / {(ro ? serviceInlineCopy.text_14fa461a8662.ro : serviceInlineCopy.text_14fa461a8662.en)}</span><div><h2 id="growth-process-title">{c.processTitle}</h2></div></div>
          <ol>{c.process.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
        </section>

        <section className="growth-section growth-deliverables" aria-labelledby="growth-deliverables-title">
          <div className="growth-section-head"><span>04 / {(ro ? serviceInlineCopy.text_e4bff1523e3f.ro : serviceInlineCopy.text_e4bff1523e3f.en)}</span><div><h2 id="growth-deliverables-title">{c.deliverablesTitle}</h2></div></div>
          <ul>{c.deliverables.map((item) => <li key={item}><Check size={16} aria-hidden />{item}</li>)}</ul>
        </section>

        <section id="tarife" className="growth-section growth-pricing" aria-labelledby="growth-pricing-title">
          <div className="growth-section-head"><span>05 / {(ro ? serviceInlineCopy.text_c4829ea7bac7.ro : serviceInlineCopy.text_c4829ea7bac7.en)}</span><div><h2 id="growth-pricing-title">{kind === "seo-ai" ? ((ro ? serviceInlineCopy.text_16f1f003dace.ro : serviceInlineCopy.text_16f1f003dace.en)) : ((ro ? serviceInlineCopy.text_8c638d5d8f66.ro : serviceInlineCopy.text_8c638d5d8f66.en))}</h2><p>{kind === "seo-ai" ? ((ro ? serviceInlineCopy.text_afc003e0df28.ro : serviceInlineCopy.text_afc003e0df28.en)) : ((ro ? serviceInlineCopy.text_4b0551cf574a.ro : serviceInlineCopy.text_4b0551cf574a.en))}</p></div></div>
          <div className="growth-offer-grid">{offers.map(offerCard)}</div>
          {kind === "seo-ai" ? <div className="growth-one-time"><div><span className="growth-offer-code">{(ro ? serviceInlineCopy.text_7b7e4335ca7a.ro : serviceInlineCopy.text_7b7e4335ca7a.en)}</span><h3>{(ro ? serviceInlineCopy.text_601be2a85375.ro : serviceInlineCopy.text_601be2a85375.en)}</h3><p>{(ro ? serviceInlineCopy.text_d9d98e13eb3c.ro : serviceInlineCopy.text_d9d98e13eb3c.en)}</p></div><div className="growth-one-time-list">{SEO_ONE_TIME_OFFERS.map(offer => <a href={`mailto:contact@avyron.ro?subject=${encodeURIComponent(`Optimizare SEO ${offer.name} pagini — AVYRON`)}`} key={offer.sku}><span>{offer.name} {(ro ? serviceInlineCopy.text_3ff5a00bdd59.ro : serviceInlineCopy.text_3ff5a00bdd59.en)}</span><strong>{money(offer.priceCents)}</strong><ArrowRight size={16} aria-hidden /></a>)}</div></div> : <div className="growth-one-time"><div><span className="growth-offer-code">{(ro ? serviceInlineCopy.text_98588a95660f.ro : serviceInlineCopy.text_98588a95660f.en)}</span><h3>{(ro ? serviceInlineCopy.text_d4e8eacd4cc5.ro : serviceInlineCopy.text_d4e8eacd4cc5.en)}</h3><p>{(ro ? serviceInlineCopy.text_e17e78d8911e.ro : serviceInlineCopy.text_e17e78d8911e.en)}</p></div><div className="growth-commercial-note"><strong>{(ro ? serviceInlineCopy.text_9bd4555d60c0.ro : serviceInlineCopy.text_9bd4555d60c0.en)}</strong><span>{(ro ? serviceInlineCopy.text_d9e6b8bc2f02.ro : serviceInlineCopy.text_d9e6b8bc2f02.en)} {money(ADS_SETUP.priceCents)}</span></div></div>}
          <p className="growth-bundle">{ro ? `Contractezi SEO și Ads împreună? Primești ${GROWTH_BUNDLE_DISCOUNT_PERCENT}% reducere la cele două servicii, confirmată în oferta comună.` : `Contract SEO and Ads together? Receive a ${GROWTH_BUNDLE_DISCOUNT_PERCENT}% discount on the two services, confirmed in a combined proposal.`} <Link to={SUBSCRIPTION_PATH[lang] + `#abonamente-${kind === "seo-ai" ? "seo" : "ads"}`}>{(ro ? serviceInlineCopy.text_7b3aabf3dd44.ro : serviceInlineCopy.text_7b3aabf3dd44.en)}<ArrowRight size={15} aria-hidden /></Link></p>
          <p className="growth-os-note">{(ro ? serviceInlineCopy.text_0e2be7463ed2.ro : serviceInlineCopy.text_0e2be7463ed2.en)} <Link to={ro ? "/configurator" : "/en/configurator"}>{(ro ? serviceInlineCopy.text_6dd607696f3a.ro : serviceInlineCopy.text_6dd607696f3a.en)}<ArrowRight size={14} aria-hidden /></Link></p>
        </section>

        <aside className="growth-measurement"><div><span>06 / {(ro ? serviceInlineCopy.text_6087689ae2a9.ro : serviceInlineCopy.text_6087689ae2a9.en)}</span><h2>{c.measurementTitle}</h2></div><p>{c.measurement}</p></aside>

        <section className="growth-section growth-faq" aria-labelledby="growth-faq-title">
          <div className="growth-section-head"><span>07 / FAQ</span><div><h2 id="growth-faq-title">{(ro ? serviceInlineCopy.text_48a83c853f46.ro : serviceInlineCopy.text_48a83c853f46.en)}</h2></div></div>
          <div>{c.faq.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden>+</span></summary><p>{item.a}</p></details>)}</div>
        </section>

        <section className="growth-cta" aria-labelledby="growth-cta-title"><div><span>AVYRON / {(ro ? serviceInlineCopy.text_29c30f10c446.ro : serviceInlineCopy.text_29c30f10c446.en)}</span><h2 id="growth-cta-title">{c.ctaTitle}</h2><p>{c.ctaText}</p></div><a className="growth-button growth-button--primary" href={contactHref} onClick={() => trackEvent("contact_click", { method: "email", location: "growth_footer", product: kind })}><Mail size={17} aria-hidden />{c.ctaButton}<ExternalLink size={15} aria-hidden /></a></section>

        <nav className="growth-related" aria-label={ro ? "Alte servicii" : "Other services"}><Link to={other.path[lang]}><span>{(ro ? serviceInlineCopy.text_6c32d817605c.ro : serviceInlineCopy.text_6c32d817605c.en)}</span><strong>{other.copy[lang].name}</strong><ArrowRight size={20} aria-hidden /></Link><Link to={ro ? "/servicii" : "/en/services"}>{(ro ? serviceInlineCopy.text_58127860376b.ro : serviceInlineCopy.text_58127860376b.en)}<ArrowRight size={17} aria-hidden /></Link></nav>
      </div>
      <Footer />
    </main>
  );
};

export default function ManagedGrowthServicePage(props:{kind:GrowthServiceKey}){return <ServiceContentProvider><GrowthServicePage {...props}/></ServiceContentProvider>;}
