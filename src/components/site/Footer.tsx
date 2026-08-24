import { useLang } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { Mail, Phone, MessageCircle, ArrowRight } from "lucide-react";
import { COOKIE_SETTINGS_EVENT } from "@/components/site/CookieBanner";
import logo from "@/assets/avyron-logo.webp";
import planetBg from "@/assets/footer-planet-bg.webp";
import { SOCIAL_PROFILES } from "@/config/socialProfiles";

const Footer = () => {
  const { t, lang } = useLang();
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
          <div className="flex items-center gap-2 shrink-0">
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
          </div>

          {/* CTA + WhatsApp + Phone + Email — compact pill cluster */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 flex-1">
            <Link
              to={lang === "en" ? "/en#cta" : "/#cta"}
              className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-3 py-1.5 shadow-[0_6px_16px_-6px_rgba(168,85,247,0.5)] transition-all"
            >
              <span className="font-display font-semibold text-xs text-white">{t.footer.ctaLabel}</span>
              <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="https://wa.me/40734605055"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] px-3 py-1.5 shadow-[0_6px_16px_-6px_rgba(37,211,102,0.5)] hover:scale-[1.03] transition-transform"
            >
              <MessageCircle className="size-3 text-white" />
              <span className="font-display font-semibold text-xs text-white">WhatsApp</span>
            </a>
            <a
              href="tel:+40734605055"
              aria-label={t.footer.phoneLabel}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-gradient-to-br from-cyan-500/15 to-sky-600/15 hover:from-cyan-500/25 hover:to-sky-600/25 hover:border-cyan-300/60 px-3 py-1.5 transition-all"
            >
              <Phone className="size-3 text-cyan-300" />
              <span className="text-xs text-white/90 font-medium hidden sm:inline">{lang === "en" ? "Call us" : "Sună-ne"}</span>
            </a>
            <a
              href="mailto:contact@avyron.ro"
              aria-label={t.footer.emailLabel}
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
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 max-w-3xl mx-auto">
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
                  </div>
                )}
              </>
            );
          })()}
        </nav>

        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1" aria-label={lang === "en" ? "Avyron social profiles" : "Profiluri sociale Avyron"}>
          {SOCIAL_PROFILES.map((profile) => (
            <a
              key={profile.id}
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-white/55 transition-colors hover:text-purple-200"
            >
              {profile.name}
            </a>
          ))}
        </div>

        {/* ANPC + copyright — single compact row */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            type="button"
            aria-label="ANPC — Autoritatea Națională pentru Protecția Consumatorilor"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] px-2.5 py-1 transition-colors"
          >
            <span className="size-6 rounded bg-white grid place-items-center shrink-0">
              <span className="font-display font-extrabold text-[9px] tracking-tight text-[#0a0612]">ANPC</span>
            </span>
            <span className="text-[10px] text-white/60 leading-tight">
              anpc.ro — SOL / SAL
            </span>
          </button>
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
