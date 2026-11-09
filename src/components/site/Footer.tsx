import { useLang } from "@/i18n/LanguageContext";
import { Link, useLocation } from "react-router-dom";
import { Phone, MessageCircle, Mail, ArrowRight, Sparkles, ShieldCheck, MessagesSquare, Briefcase } from "lucide-react";
import { COOKIE_SETTINGS_EVENT } from "@/components/site/CookieBanner";
import { trackEvent } from "@/lib/analytics";
import logo from "@/assets/avyron-logo.webp";
import planetBg from "@/assets/footer-planet-bg.webp";
import "./footer.css";
import footerStyles from "./footer.css?inline";
import { useCriticalStyles } from "@/lib/useCriticalStyles";

type PageCta = {
  label: string;
  sub: string;
  to: string;
  external?: boolean;
  Icon: typeof ArrowRight;
  page: string;
};

/** Conversion-focused, page-specific primary CTA for the footer. */
const pageCta = (pathname: string, lang: "ro" | "en", fallback: { ctaLabel: string; ctaSub: string }): PageCta => {
  const en = lang === "en";
  const home = en ? "/en#cta" : "/#cta";
  const p = pathname.toLowerCase();
  if (p.includes("website-prin-abonament") || p.includes("website-subscription")) {
    return { page: "website-subscription", label: en ? "I want my website" : "Vreau website-ul meu", sub: en ? "Tell us about your business" : "Spune-ne despre afacerea ta", to: "#website-brief", Icon: ArrowRight };
  }
  if (p.startsWith("/servicii/") || p.startsWith("/en/services/")) {
    return { page: "service", label: en ? "Let's discuss your project" : "Discutăm despre proiectul tău", sub: en ? "A clear next step" : "Un prim pas simplu", to: home, Icon: Briefcase };
  }
  if (p === "/produse" || p.startsWith("/produse/") || p === "/en/products" || p.startsWith("/en/products/")) {
    return {
      page: "products",
      label: p === "/produse" || p === "/en/products" ? (en ? "How the products work" : "Cum funcționează produsele") : (en ? "Explore all products" : "Explorează toate produsele"),
      sub: en ? "AVYRON library" : "Biblioteca AVYRON",
      to: p === "/produse" || p === "/en/products" ? (en ? "/en/products/guide" : "/produse/ghid") : (en ? "/en/products" : "/produse"),
      Icon: Sparkles,
    };
  }
  if (p.includes("/blog")) {
    return {
      page: "blog",
      label: en ? "Free website audit" : "Audit gratuit al site-ului",
      sub: en ? "SEO · Speed · Security" : "SEO · Viteză · Securitate",
      to: en ? "/en?request=audit#cta" : "/?request=audit#cta",
      Icon: ShieldCheck,
    };
  }
  if (p.includes("/despre") || p.includes("/about")) {
    return {
      page: "about",
      label: en ? "Let's talk about your project" : "Hai să vorbim despre proiectul tău",
      sub: en ? "Free consultation" : "Consultanță gratuită",
      to: home,
      Icon: MessagesSquare,
    };
  }
  if (p.includes("/portofoliu") || p.includes("/portfolio")) {
    return {
      page: "portfolio",
      label: en ? "I want a similar project" : "Vreau un proiect similar",
      sub: en ? "Free estimate" : "Estimare gratuită",
      to: home,
      Icon: Sparkles,
    };
  }
  if (p === "/servicii" || p === "/en/services") {
    return {
      page: "services",
      label: en ? "Get a custom quote" : "Cere ofertă personalizată",
      sub: en ? "No obligation" : "Fără obligații",
      to: home,
      Icon: Briefcase,
    };
  }
  if (p === "/mentenanta-si-colaborari" || p === "/en/maintenance-and-partnerships") {
    return { page: "maintenance", label: en ? "Choose a care plan" : "Alege un abonament", sub: en ? "Compare your options" : "Compară opțiunile", to: "#comparatie", Icon: ShieldCheck };
  }
  if (p === "/cariere" || p === "/en/careers") {
    return { page: "careers", label: en ? "Explore collaboration" : "Descoperă colaborarea", sub: en ? "Open applications" : "Candidaturi deschise", to: "#candidatura", Icon: Briefcase };
  }
  if (p === "/configurator" || p === "/en/configurator") {
    return { page: "configurator", label: en ? "See the website service" : "Vezi serviciul website", sub: en ? "Scope and next steps" : "Detalii și pașii următori", to: en ? "/en/services/professional-presentation-website" : "/servicii/website-prezentare-profesional", Icon: Sparkles };
  }
  if (["/gdpr", "/en/privacy", "/termeni", "/en/terms", "/politica-cookies", "/en/cookie-policy"].includes(p)) {
    return { page: "legal", label: en ? "Need help?" : "Ai o întrebare?", sub: en ? "Talk to the team" : "Discută cu echipa", to: home, Icon: MessagesSquare };
  }
  return { page: "home", label: fallback.ctaLabel, sub: fallback.ctaSub, to: home, Icon: ArrowRight };
};

const Footer = () => {
  useCriticalStyles("avyron-footer-critical", footerStyles);
  const { t, lang } = useLang();
  const { pathname } = useLocation();
  const en = lang === "en";
  const cta = pageCta(pathname, lang, { ctaLabel: t.footer.ctaLabel, ctaSub: t.footer.ctaSub });
  const navigation = t.footer.navItems.filter(item => item.h !== "/gdpr" && item.h !== "/en/privacy");
  const track = (channel: string) => trackEvent("cta_click", { location: "footer", page: cta.page, channel });
  const ctaContent = <><span>{cta.label}<small>{cta.sub}</small></span><ArrowRight size={18} aria-hidden="true" /></>;
  return (
    <footer className="avy-footer">
      <img className="avy-footer-background" src={planetBg} alt="" aria-hidden="true" loading="lazy" width={1920} height={768} />
      <div className="avy-footer-shell">
        <div className="avy-footer-primary" data-testid="footer-primary-row">
          <Link className="avy-footer-brand" to={en ? "/en" : "/"}>
            <img src={logo} width={36} height={36} alt="" loading="lazy" />
            <span><strong>AVYRON</strong><small>Innovate. Develop. Elevate.</small></span>
          </Link>
          <div className="avy-footer-actions" data-testid="footer-contact-actions">
            {cta.to.startsWith("#") ? <a className="avy-footer-cta" href={cta.to} onClick={() => track("project")}>{ctaContent}</a> : <Link className="avy-footer-cta" to={cta.to} onClick={() => track("project")}>{ctaContent}</Link>}
            <div className="avy-footer-contact">
              <a href="https://wa.me/40734605055" target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")}><MessageCircle size={15} aria-hidden="true" />WhatsApp</a>
              <a href="tel:+40734605055" onClick={() => track("phone")}><Phone size={15} aria-hidden="true" />0734 605 055</a>
              <a href="mailto:contact@avyron.ro" onClick={() => track("email")}><Mail size={15} aria-hidden="true" />contact@avyron.ro</a>
            </div>
          </div>
        </div>
        <nav className="avy-footer-navigation" aria-label={t.footer.nav}>
          {navigation.map(item => <Link key={item.h} to={item.h}>{item.l}</Link>)}
        </nav>
        <div className="avy-footer-bottom">
          <nav data-testid="footer-legal-row" className="avy-footer-legal" aria-label={en ? "Legal information" : "Informații legale"}>
            <Link to={en ? "/en/privacy" : "/gdpr"}>{en ? "Privacy & GDPR" : "Confidențialitate & GDPR"}</Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>{en ? "Cookie settings" : "Setări cookie"}</button>
            <Link to={en ? "/en/terms" : "/termeni"}>{en ? "Terms of use" : "Termeni de utilizare"}</Link>
          </nav>
          <div data-testid="footer-utility-row" className="avy-footer-sal">
            <a href="https://reclamatiisal.anpc.ro/" target="_blank" rel="noopener noreferrer" aria-label={en ? "ANPC alternative dispute resolution (SAL)" : "ANPC — Soluționarea Alternativă a Litigiilor (SAL)"}>
              <img src="/anpc-sal-pictograma.png" alt="ANPC SAL" width={201} height={50} loading="lazy" />
            </a>
          </div>
        </div>
        <div className="avy-footer-copyright"><span>{t.footer.copy.replace("{y}", String(new Date().getFullYear()))}</span><span>{t.footer.built}</span></div>
      </div>
    </footer>
  );
};
export default Footer;
