import { useLang } from "@/i18n/LanguageContext";
import { Link, useLocation } from "react-router-dom";
import { Mail, Phone, MessageCircle, ArrowRight, Sparkles, Wrench, ShieldCheck, MessagesSquare, Briefcase } from "lucide-react";
import { COOKIE_SETTINGS_EVENT } from "@/components/site/CookieBanner";
import { trackEvent } from "@/lib/analytics";
import AvyronLogo from "./AvyronLogo";
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
  if (p.includes("/produse/") || p.includes("/products/")) {
    return {
      page: "product",
      label: en ? "Get a quote for this service" : "Cere ofertă pentru acest serviciu",
      sub: en ? "Free · reply in 24h" : "Gratuit · răspuns în 24h",
      to: `https://wa.me/40734605055?text=${encodeURIComponent(
        en ? `Hello! I want a quote for: ${p}` : `Bună! Vreau o ofertă pentru: ${p}`,
      )}`,
      external: true,
      Icon: Briefcase,
    };
  }
  if (p.includes("mentenanta") || p.includes("care-plans")) {
    return {
      page: "care",
      label: en ? "Activate maintenance" : "Activează mentenanța",
      sub: en ? "Priority support included" : "Suport prioritar inclus",
      to: `https://wa.me/40734605055?text=${encodeURIComponent(
        en ? "Hello! I want to activate a maintenance plan." : "Bună! Vreau să activez un pachet de mentenanță.",
      )}`,
      external: true,
      Icon: Wrench,
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
  if (p.includes("/costuri") || p.includes("/pricing")) {
    return {
      page: "pricing",
      label: en ? "Get a custom quote" : "Cere ofertă personalizată",
      sub: en ? "No obligation" : "Fără obligații",
      to: home,
      Icon: Briefcase,
    };
  }
  return { page: "home", label: fallback.ctaLabel, sub: fallback.ctaSub, to: home, Icon: ArrowRight };
};

const Footer = () => {
  const { t, lang } = useLang();
  const { pathname } = useLocation();
  const cta = pageCta(pathname, lang, { ctaLabel: t.footer.ctaLabel, ctaSub: t.footer.ctaSub });
  const ctaClass =
    "group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-3 py-1.5 shadow-[0_6px_16px_-6px_rgba(168,85,247,0.5)] transition-all";
  const ctaInner = (
    <>
      <span className="flex flex-col items-center font-display leading-none text-white">
        <span className="text-xs font-semibold">{cta.label}</span>
        <span className="mt-0.5 text-[8px] font-normal text-white/75">{cta.sub}</span>
      </span>
      <cta.Icon className="size-3 text-white group-hover:translate-x-0.5 transition-transform" aria-hidden />
    </>
  );
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0a0612] text-white">
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
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Brand */}
          <a href={lang === "en" ? "/en#hero" : "/#hero"} className="flex shrink-0 items-center gap-2" aria-label={lang === "en" ? "Avyron — go to hero" : "Avyron — mergi la hero"}>
            <AvyronLogo size={32} showTagline tone="onDark" />
          </a>

          {/* CTA + WhatsApp + Phone + Email — compact pill cluster */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 flex-1">
            {cta.external ? (
              <a
                href={cta.to}
                target="_blank"
                rel="noopener noreferrer"
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
              href="https://wa.me/40734605055"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page, channel: "whatsapp" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] px-3 py-1.5 shadow-[0_6px_16px_-6px_rgba(37,211,102,0.5)] hover:scale-[1.03] transition-transform"
            >
              <MessageCircle className="size-3 text-white" />
              <span className="font-display font-semibold text-xs text-white">WhatsApp</span>
            </a>
            <a
              href="tel:+40734605055"
              aria-label={t.footer.phoneLabel}
              onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page, channel: "phone" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-gradient-to-br from-cyan-500/15 to-sky-600/15 hover:from-cyan-500/25 hover:to-sky-600/25 hover:border-cyan-300/60 px-3 py-1.5 transition-all"
            >
              <Phone className="size-3 text-cyan-300" />
              <span className="text-xs text-white/90 font-medium hidden sm:inline">{lang === "en" ? "Call us" : "Sună-ne"}</span>
            </a>
            <a
              href="mailto:contact@avyron.ro"
              aria-label={t.footer.emailLabel}
              onClick={() => trackEvent("cta_click", { location: "footer", page: cta.page, channel: "email" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-pink-300/30 bg-gradient-to-br from-pink-500/15 to-rose-600/15 hover:from-pink-500/25 hover:to-rose-600/25 hover:border-pink-300/60 px-3 py-1.5 transition-all"
            >
              <Mail className="size-3 text-pink-300" />
              <span className="text-xs text-white/90 font-medium hidden sm:inline">E-mail</span>
            </a>

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
            return (
              <>
                <div className="mx-auto grid max-w-lg grid-cols-3 gap-1.5">
                  {primary.map((n) => {
                    const to = n.h.startsWith("#") ? `/${n.h}` : n.h;
                    return (
                      <Link
                        key={n.h}
                        to={to}
                        className={`${baseClass} px-2 py-1.5 text-[11px] sm:text-xs`}
                      >
                        {n.l}
                      </Link>
                    );
                  })}
                </div>
                {legal.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                    {legal.map((n) => (
                      <Link
                        key={n.h}
                        to={n.h}
                        className={`${baseClass} px-3 py-1 text-[10px]`}
                      >
                        {n.l}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
                      className={`${baseClass} px-3 py-1 text-[10px]`}
                    >
                      {lang === "en" ? "Cookie settings" : "Setări cookie"}
                    </button>
                    <Link
                      to={lang === "en" ? "/en/terms" : "/termeni"}
                      className={`${baseClass} px-3 py-1 text-[10px]`}
                    >
                      {lang === "en" ? "Terms of use" : "Termeni de utilizare"}
                    </Link>
                  </div>
                )}
              </>
            );
          })()}
        </nav>

        <div className="mt-2 flex justify-center">
          <a
            href="https://anpc.ro/ce-este-sal/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ANPC — Soluționarea alternativă și online a litigiilor"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-2.5 py-1.5 transition-colors hover:border-cyan-200/35 hover:bg-white/[0.12]"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded bg-white font-display text-[9px] font-extrabold tracking-tight text-[#0a0612]">ANPC</span>
            <span className="text-[10px] font-semibold tracking-wide text-white/70">SOL · SAL</span>
          </a>
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
