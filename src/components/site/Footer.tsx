import { useLang } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { Mail, Phone, MessageCircle, ArrowRight } from "lucide-react";
import logo from "@/assets/avyron-logo.jpg";
import planetBg from "@/assets/footer-planet-bg.jpg";

const Footer = () => {
  const { t } = useLang();
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

      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-6">
        {/* Brand row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Avyron"
              width={40}
              height={40}
              className="size-10 rounded-lg object-cover ring-1 ring-white/20"
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl tracking-[0.15em] sm:tracking-[0.18em] bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
                AVYRON
              </div>
              <div className="font-display text-[9px] sm:text-[10px] md:text-xs tracking-[0.22em] sm:tracking-[0.3em] uppercase text-white/70">
                Innovate. <span className="text-purple-300">Develop.</span> Elevate.
              </div>
            </div>
          </div>

          {/* Standalone CTA + WhatsApp */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              to="/#cta"
              className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)] transition-all"
            >
              <span className="flex flex-col leading-tight items-center text-center">
                <span className="font-display font-semibold text-sm md:text-base">{t.footer.ctaLabel}</span>
                <span className="text-[10px] uppercase tracking-widest text-white/80">{t.footer.ctaSub}</span>
              </span>
              <span className="size-8 rounded-full bg-white/15 grid place-items-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="size-4" />
              </span>
            </Link>
            <a
              href="https://wa.me/40734605055"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_10px_30px_-10px_rgba(37,211,102,0.6)] hover:scale-[1.02] transition-transform ring-1 ring-white/10"
            >
              <MessageCircle className="size-5 md:size-6 text-white" />
              <span className="font-display font-semibold text-sm md:text-base text-white">WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Compact contact icons row: phone + email */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <a
            href="tel:+40734605055"
            aria-label={t.footer.phoneLabel}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] hover:border-purple-300/50 px-3 sm:px-4 py-2 transition-all"
          >
            <span className="size-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 grid place-items-center">
              <Phone className="size-3.5 text-white" />
            </span>
            <span className="text-xs sm:text-sm text-white/90 font-medium">+40 734 605 055</span>
          </a>
          <a
            href="mailto:avyrontech@gmail.com"
            aria-label={t.footer.emailLabel}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] hover:border-purple-300/50 px-3 sm:px-4 py-2 transition-all"
          >
            <span className="size-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 grid place-items-center">
              <Mail className="size-3.5 text-white" />
            </span>
            <span className="text-xs sm:text-sm text-white/90 font-medium truncate max-w-[160px] sm:max-w-none">avyrontech@gmail.com</span>
          </a>
        </div>

        {/* Nav inline */}
        <nav className="mt-7 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {t.footer.navItems.map((n) => {
            const isGdpr = n.h === "/gdpr";
            const baseClass =
              "rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] hover:border-purple-300/50 font-display font-semibold text-white/90 hover:text-white transition-all";
            const sizeClass = isGdpr
              ? "px-2.5 py-1.5 md:px-4 md:py-2 text-[11px] md:text-sm"
              : "px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base";
            // Anchor link → route to home with hash so it works from any page
            const to = n.h.startsWith("#") ? `/${n.h}` : n.h;
            return (
              <Link key={n.h} to={to} className={`${baseClass} ${sizeClass}`}>
                {n.l}
              </Link>
            );
          })}
        </nav>

        {/* ANPC badge */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            aria-label="ANPC — Autoritatea Națională pentru Protecția Consumatorilor"
            className="inline-flex items-center gap-3 rounded-lg border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] px-4 py-2 transition-colors"
          >
            <span className="size-9 rounded-md bg-white grid place-items-center shrink-0">
              <span className="font-display font-extrabold text-[11px] tracking-tight text-[#0a0612]">ANPC</span>
            </span>
            <span className="flex flex-col text-left leading-tight">
              <span className="text-[10px] uppercase tracking-widest text-white/60">Protecția consumatorilor</span>
              <span className="text-xs sm:text-sm text-white font-medium">anpc.ro — SOL / SAL</span>
            </span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/55 flex flex-wrap justify-between gap-2">
          <span>{t.footer.copy.replace("{y}", String(new Date().getFullYear()))}</span>
          <span>{t.footer.built}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
