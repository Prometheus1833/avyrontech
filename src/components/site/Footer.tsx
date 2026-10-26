import { useLang } from "@/i18n/LanguageContext";
import { Link, useLocation } from "react-router-dom";
import { Phone, MessageCircle, Mail, LogIn, ArrowRight, Sparkles, ShieldCheck, MessagesSquare, Briefcase } from "lucide-react";
import { COOKIE_SETTINGS_EVENT } from "@/components/site/CookieBanner";
import { trackEvent } from "@/lib/analytics";
import logo from "@/assets/avyron-logo.webp";
import planetBg from "@/assets/footer-planet-bg.webp";

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
  if (p.startsWith("/servicii/") || p.startsWith("/en/services/")) {
    return {
      page: "service",
      label: en ? "Get a quote for this service" : "Cere ofertă pentru acest serviciu",
      sub: en ? "Tell us what you need" : "Spune-ne ce ai nevoie",
      to: `https://wa.me/40734605055?text=${encodeURIComponent(
        en ? `Hello! I want a quote for: ${p}` : `Bună! Vreau o ofertă pentru: ${p}`,
      )}`,
      external: true,
      Icon: Briefcase,
    };
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

const pageSecondary = (pathname: string, lang: "ro" | "en") => {
  const en = lang === "en";
  const p = pathname.toLowerCase();
  if (p.startsWith("/servicii/") || p.startsWith("/en/services/")) return { label: en ? "Other services" : "Alte servicii", to: en ? "/en/services" : "/servicii" };
  if (p === "/servicii" || p === "/en/services") return { label: en ? "Configure a website" : "Configurează un website", to: en ? "/en/configurator" : "/configurator" };
  if (p === "/despre-noi" || p === "/en/about") return { label: en ? "See the portfolio" : "Vezi portofoliul", to: en ? "/en/services/professional-presentation-website#portofoliu" : "/servicii/website-prezentare-profesional#portofoliu" };
  if (p === "/cariere" || p === "/en/careers") return { label: en ? "About AVYRON" : "Despre AVYRON", to: en ? "/en/about" : "/despre-noi" };
  if (p === "/produse" || p.startsWith("/produse/") || p === "/en/products" || p.startsWith("/en/products/")) return { label: en ? "Product questions" : "Întrebări despre produse", to: en ? "/en/products/faq" : "/produse/intrebari-frecvente" };
  if (p.includes("/blog")) return { label: en ? "Read more articles" : "Alte articole", to: en ? "/en/blog" : "/blog" };
  if (p === "/mentenanta-si-colaborari" || p === "/en/maintenance-and-partnerships") return { label: en ? "See services" : "Vezi serviciile", to: en ? "/en/services" : "/servicii" };
  if (p === "/configurator" || p === "/en/configurator") return { label: en ? "Other services" : "Alte servicii", to: en ? "/en/services" : "/servicii" };
  return { label: en ? "Explore services" : "Explorează serviciile", to: en ? "/en/services" : "/servicii" };
};

const Footer = () => {
  const { t, lang } = useLang();
  const { pathname } = useLocation();
  const cta = pageCta(pathname, lang, { ctaLabel: t.footer.ctaLabel, ctaSub: t.footer.ctaSub });
  const isLanding = pathname === "/" || pathname === "/en" || pathname === "/en/";
  const secondary = pageSecondary(pathname, lang);
  const ctaClass =
    "group inline-flex min-h-10 min-w-0 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-2.5 py-1.5 shadow-[0_6px_16px_-6px_rgba(168,85,247,0.5)] transition-all";
  const ctaInner = (
    <>
      <span className="flex flex-col items-center font-display leading-none text-white">
        <span className="text-center text-[11px] font-semibold leading-tight sm:text-xs">{cta.label}</span>
        <span className="mt-0.5 text-[8px] font-normal text-white/75">{cta.sub}</span>
      </span>
      <cta.Icon className="size-3 shrink-0 text-white group-hover:translate-x-0.5 transition-transform" aria-hidden />
    </>
  );
  return (
    <footer className="relative z-50 overflow-hidden border-t border-white/10 bg-[#0a0612] text-white">
      {/* Planet background */}
      <img
        src={planetBg}
        alt=""
        aria-hidden
        loading="lazy"
        width={1920}
        height={768}
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      />
      {/* Readability overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0612] via-[#0a0612]/85 to-[#0a0612]/40" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0612] via-transparent to-[#0a0612]/60" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-4">
        {/* Top row: brand + CTA + WhatsApp + contact — single compact bar */}
        <div
          data-testid="footer-primary-row"
          className="mx-auto grid w-full max-w-5xl gap-3 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)] lg:items-center"
        >
          {/* Brand */}
          <a href={lang === "en" ? "/en#hero" : "/#hero"} className="flex shrink-0 items-center gap-2">
            <img
              src={logo}
              alt="Avyron"
              width={32}
              height={32}
              className="size-8 rounded-lg object-cover ring-1 ring-white/20"
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="font-display font-extrabold text-lg md:text-xl tracking-[0.15em] bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent leading-none">
                AVYRON
              </div>
              <div className="font-display text-[9px] tracking-[0.22em] uppercase text-white/60 leading-tight mt-0.5">
                Innovate. <span className="text-purple-300">Develop.</span> Elevate.
              </div>
            </div>
          </a>

          {/* Only this contact row changes with the page; the rows below stay shared. */}
          <div data-testid="footer-contact-actions" className={isLanding
            ? "grid min-w-0 w-full grid-cols-[auto_minmax(0,1fr)_auto_36px] items-stretch gap-1 sm:grid-cols-[auto_minmax(0,1fr)_auto_38px] sm:gap-1.5 lg:justify-self-end"
            : "grid min-w-0 w-full grid-cols-2 items-stretch gap-1.5 sm:grid-cols-4 lg:justify-self-end"}>
            <a
              href="https://wa.me/40734605055"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page, channel: "whatsapp" })}
              className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] px-2 py-1.5 shadow-[0_6px_16px_-6px_rgba(37,211,102,0.5)] transition-transform hover:scale-[1.03] sm:px-2.5"
            >
              <MessageCircle className="size-3 shrink-0 text-white" aria-hidden />
              <span className={isLanding ? "hidden font-display text-xs font-semibold text-white min-[370px]:inline" : "font-display text-xs font-semibold text-white"}>WhatsApp</span>
            </a>
            {cta.external || cta.to.startsWith("#") ? (
              <a
                href={cta.to}
                target={cta.external ? "_blank" : undefined}
                rel={cta.external ? "noopener noreferrer" : undefined}
                onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page })}
                className={ctaClass}
              >
                {ctaInner}
              </a>
            ) : (
              <Link
                to={cta.to}
                onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page })}
                className={ctaClass}
              >
                {ctaInner}
              </Link>
            )}
            <a
              href="tel:+40734605055"
              aria-label={lang === "en" ? "Call us" : "Sună-ne"}
              onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page, channel: "phone" })}
              className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-full border border-cyan-300/30 bg-gradient-to-br from-cyan-500/15 to-sky-600/15 px-2 py-1.5 transition-all hover:border-cyan-300/60 hover:from-cyan-500/25 hover:to-sky-600/25 sm:px-2.5"
            >
              <Phone className="size-3 shrink-0 text-cyan-300" aria-hidden />
              <span className={isLanding ? "hidden text-xs font-medium text-white/90 min-[370px]:inline" : "text-xs font-medium text-white/90"}>{lang === "en" ? "Call us" : "Sună-ne"}</span>
            </a>
            {isLanding ? (
              <a
                href="mailto:contact@avyron.ro"
                aria-label={lang === "en" ? "Email AVYRON" : "E-mail AVYRON"}
                onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page, channel: "email" })}
                className="inline-flex size-9 min-w-0 self-center items-center justify-center rounded-full bg-gradient-to-r from-[#df4055] to-[#aa193c] text-white shadow-[0_4px_12px_-5px_rgba(223,64,85,.55)] transition-all hover:from-[#eb5266] hover:to-[#bc2448] sm:size-[38px]"
              >
                <Mail className="size-4 shrink-0" aria-hidden />
              </a>
            ) : (
              <Link to={secondary.to} className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-full border border-white/20 bg-white/[.07] px-2 py-1.5 text-center font-display text-[11px] font-semibold leading-tight text-white/85 transition-colors hover:border-purple-300/50 hover:bg-white/[.14] hover:text-white">
                {secondary.label}<ArrowRight className="size-3 shrink-0" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {/* Nav — compact pill row */}
        <nav className="mt-3" aria-label={t.footer.nav}>
          {(() => {
            const items = t.footer.navItems;
            const isLegal = (href: string) => href === "/gdpr" || href === "/en/privacy";
            const primary = items.filter((n) => !isLegal(n.h));
            const legal = items.filter((n) => isLegal(n.h));
            const baseClass =
              "inline-flex items-center justify-center text-center rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] hover:border-purple-300/50 font-display font-medium text-white/85 hover:text-white transition-all leading-none";
            const legalClass = `${baseClass} h-8 min-w-0 w-full px-1.5 text-[9px] sm:text-[10px]`;
            return (
              <>
                <div className="mx-auto grid max-w-3xl grid-cols-3 gap-1.5 px-1">
                  {primary.map((n) => {
                    const to = n.h.startsWith("#") ? `/${n.h}` : n.h;
                    return (
                      <Link
                        key={n.h}
                        to={to}
                        className={`${baseClass} min-w-0 w-full px-2 py-1.5 text-[10px] sm:text-xs`}
                      >
                        {n.l}
                      </Link>
                    );
                  })}
                </div>
                {legal.length > 0 && (
                  <div data-testid="footer-legal-row" className="mx-auto mt-1.5 grid w-full max-w-[510px] grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-1.5">
                    {legal.map((n) => (
                      <Link
                        key={n.h}
                        to={n.h}
                        className={legalClass}
                      >
                        <span className="leading-[1.15]">{n.l}</span>
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
                      className={legalClass}
                    >
                      <span className="leading-[1.15]">{lang === "en" ? "Cookie settings" : "Setări cookie"}</span>
                    </button>
                    <Link
                      to={lang === "en" ? "/en/terms" : "/termeni"}
                      className={legalClass}
                    >
                      <span className="leading-[1.15]">{lang === "en" ? "Terms of use" : "Termeni de utilizare"}</span>
                    </Link>
                  </div>
                )}
              </>
            );
          })()}
        </nav>

        <div data-testid="footer-utility-row" className="mx-auto mt-2 grid w-full max-w-[510px] grid-cols-2 gap-2">
          <a
            href="https://reclamatiisal.anpc.ro/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={lang === "en" ? "ANPC alternative dispute resolution (SAL)" : "ANPC — Soluționarea Alternativă a Litigiilor (SAL)"}
            className="flex h-[50px] min-w-0 items-center justify-center overflow-hidden rounded-lg bg-white transition-opacity hover:opacity-90"
          >
            <img src="/anpc-sal-pictograma.png" alt="ANPC SAL" width={201} height={50} className="h-full max-w-full object-contain" />
          </a>
          <Link to="/auth" className="inline-flex h-[50px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-violet-300/25 bg-gradient-to-r from-violet-700/35 to-indigo-700/35 px-2 text-center font-display text-[10px] font-semibold leading-tight text-white transition-colors hover:border-violet-300/60 hover:from-violet-700/55 hover:to-indigo-700/55 sm:text-xs">
            <LogIn className="size-4 shrink-0 text-violet-200" aria-hidden />
            <span>{t.auth.loginCta}</span>
          </Link>
        </div>

        {/* Copyright — single compact row */}
        <div className="mt-3 flex items-center justify-center border-t border-white/10 pt-2.5">
          <div className="text-[10px] text-white/50 flex flex-wrap justify-center gap-x-3 gap-y-0.5">
            <span>{t.footer.copy.replace("{y}", String(new Date().getFullYear()))}</span>
            <span>{t.footer.built}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
