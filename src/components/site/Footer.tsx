import { getLangFromPath } from "@/i18n/routes";
import { translations } from "@/i18n/translations";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Phone, MessageCircle, Mail, ArrowRight } from "lucide-react";
import { COOKIE_SETTINGS_EVENT } from "@/components/site/CookieBanner";
import { trackEvent } from "@/lib/analytics";
import logo from "@/assets/avyron-logo.webp";
import planetBg from "@/assets/footer-planet-bg.webp";
import { footerAction } from "./footerActions";
import "./footer.css";
import footerStyles from "./footer.css?inline";
import { useCriticalStyles } from "@/lib/useCriticalStyles";

const Footer = () => {
  useCriticalStyles("avyron-footer-critical", footerStyles);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      document.documentElement.toggleAttribute("data-footer-contact-visible", entry.isIntersecting);
    });
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute("data-footer-contact-visible");
    };
  }, []);
  const { pathname } = useLocation();
  // A previous English visit must not change a Romanian page's footer links.
  const lang = getLangFromPath(pathname);
  const t = translations[lang];
  const en = lang === "en";
  const cta = footerAction(pathname, lang, { ctaLabel: t.footer.ctaLabel, ctaSub: t.footer.ctaSub });
  const navigation = t.footer.navItems.filter(item => item.h !== "/gdpr" && item.h !== "/en/privacy");
  const track = (channel: string) => trackEvent("cta_click", { location: "footer", page: cta?.page ?? "contact", channel });
  const ctaContent = cta && <><span>{cta.label}<small>{cta.sub}</small></span><ArrowRight size={15} aria-hidden="true" /></>;
  return (
    <footer ref={ref} className="avy-footer">
      <img className="avy-footer-background" src={planetBg} alt="" aria-hidden="true" loading="lazy" width={1920} height={768} />
      <div className="avy-footer-shell">
        <div className="avy-footer-primary" data-testid="footer-primary-row">
          <Link className="avy-footer-brand" to={en ? "/en" : "/"}>
            <img src={logo} width={36} height={36} alt="" loading="lazy" />
            <span><strong>AVYRON</strong><small>Innovate. Develop. Elevate.</small></span>
          </Link>
          <div className={`avy-footer-actions${cta ? "" : " avy-footer-actions--contact"}`} data-testid="footer-contact-actions">
            {cta && (cta.to.startsWith("#")
              ? <a className="avy-footer-action avy-footer-cta" href={cta.to} onClick={() => track("project")}>{ctaContent}</a>
              : <Link className="avy-footer-action avy-footer-cta" to={cta.to} onClick={() => track("project")}>{ctaContent}</Link>)}
            <a className="avy-footer-action avy-footer-whatsapp" href="https://wa.me/40734605055" target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")}><MessageCircle size={16} aria-hidden="true" />WhatsApp</a>
            <a className="avy-footer-action avy-footer-phone" href="tel:+40734605055" onClick={() => track("phone")}><Phone size={16} aria-hidden="true" />{en ? "Call us" : "Sună-ne"}</a>
            <a className="avy-footer-action avy-footer-email" href="mailto:contact@avyron.ro" aria-label={en ? "Email AVYRON" : "E-mail AVYRON"} onClick={() => track("email")}><Mail size={17} aria-hidden="true" /></a>
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
