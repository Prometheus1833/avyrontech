import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, LogIn, Mail, MessageCircle, Phone } from "lucide-react";
import { getLangFromPath } from "@/i18n/routes";
import { translations } from "@/i18n/translations";
import { useAuth } from "@/hooks/useAuth";
import { COOKIE_SETTINGS_EVENT } from "@/components/site/CookieBanner";
import { trackEvent } from "@/lib/analytics";
import { useCriticalStyles } from "@/lib/useCriticalStyles";
import logo from "@/assets/avyron-logo.webp";
import planet from "@/assets/footer-planet-bg.webp";
import { footerAction } from "./footerActions";
import "./footer.css";
import footerStyles from "./footer.css?inline";

export default function Footer() {
  useCriticalStyles("avyron-footer-critical", footerStyles);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const footer = useRef<HTMLElement>(null);
  const lang = getLangFromPath(pathname);
  const en = lang === "en";
  const t = translations[lang];
  const path = pathname.replace(/\/+$/, "") || "/";
  const home = path === "/" || path === "/en";
  const privacy = en ? "/en/privacy" : "/gdpr";
  const cta = footerAction(path, lang);
  const navigation = t.footer.navItems.flatMap(item => {
    if (item.h === privacy || item.h === cta?.to) return [];
    if (item.h !== path) return [item];
    // About is where visitors can discover the careers page; don't repeat the current page.
    return cta?.page === "about"
      ? [{ h: en ? "/en/careers" : "/cariere", l: en ? "Careers" : "Cariere" }]
      : [];
  });

  useEffect(() => {
    if (!footer.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) document.documentElement.toggleAttribute("data-footer-contact-visible", entry.isIntersecting);
    });
    observer.observe(footer.current);
    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute("data-footer-contact-visible");
    };
  }, []);

  const track = (channel: string) => trackEvent("cta_click", { location: "footer", page: home ? "home" : cta?.page ?? "contact", channel });
  const ctaContent = cta && <><span>{cta.label}<small>{cta.sub}</small></span><ArrowRight size={15} aria-hidden="true" /></>;

  return (
    <footer ref={footer} className="avy-footer">
      <img className="avy-footer-background" src={planet} alt="" loading="lazy" decoding="async" width={1920} height={768} />
      <div className="avy-footer-shell">
        <div className="avy-footer-primary" data-testid="footer-primary-row">
          <Link className="avy-footer-brand" to={en ? "/en" : "/"}>
            <img src={logo} width={32} height={32} alt="" loading="lazy" decoding="async" />
            <span><strong>AVYRON</strong><small>Innovate. <em>Develop.</em> Elevate.</small></span>
          </Link>
          <div data-testid="footer-contact-actions" className={`avy-footer-actions${cta ? " avy-footer-actions--context" : ""}`}>
            <a className="avy-footer-action avy-footer-whatsapp" href="https://wa.me/40734605055" target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")}>
              <MessageCircle size={15} aria-hidden="true" />WhatsApp
            </a>
            <a className="avy-footer-action avy-footer-phone" href="tel:+40734605055" onClick={() => track("phone")}>
              <Phone size={15} aria-hidden="true" />{en ? "Call us" : "Sună-ne"}
            </a>
            <a className="avy-footer-action avy-footer-email" href="mailto:contact@avyron.ro" aria-label={en ? "Email AVYRON" : "E-mail AVYRON"} onClick={() => track("email")}>
              <Mail size={17} aria-hidden="true" />
            </a>
            {cta && (cta.to.startsWith("#")
              ? <a className="avy-footer-action avy-footer-cta" href={cta.to} onClick={() => track("project")}>{ctaContent}</a>
              : <Link className="avy-footer-action avy-footer-cta" to={cta.to} onClick={() => track("project")}>{ctaContent}</Link>)}
          </div>
        </div>

        <nav className="avy-footer-navigation" aria-label={t.footer.nav}>
          <div className="avy-footer-pills">
            {navigation.map(({ h, l }) => <Link key={h} to={h}>{l}</Link>)}
          </div>
          <div data-testid="footer-legal-row" className="avy-footer-legal">
            <Link to={privacy}>{en ? "Privacy & GDPR" : "Confidențialitate & GDPR"}</Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>{en ? "Cookie settings" : "Setări cookie"}</button>
            <Link to={en ? "/en/terms" : "/termeni"}>{en ? "Terms of use" : "Termeni de utilizare"}</Link>
          </div>
        </nav>

        <div data-testid="footer-utility-row" className={`avy-footer-utility${user ? " avy-footer-utility--single" : ""}`}>
          <a className="avy-footer-sal" href="https://reclamatiisal.anpc.ro/" target="_blank" rel="noopener noreferrer" aria-label={en ? "ANPC alternative dispute resolution (SAL)" : "ANPC — Soluționarea Alternativă a Litigiilor (SAL)"}>
            <img src="/anpc-sal-pictograma.png" alt="ANPC SAL" width={201} height={50} loading="lazy" decoding="async" />
          </a>
          {!user && (
            <Link to="/auth" className="avy-footer-login">
              <LogIn size={16} aria-hidden="true" />{t.auth.loginCta}
            </Link>
          )}
        </div>

        <div className="avy-footer-copyright">
          <span>{t.footer.copy.replace("{y}", String(new Date().getFullYear()))}</span>
          <span>{t.footer.built}</span>
        </div>
      </div>
    </footer>
  );
}
