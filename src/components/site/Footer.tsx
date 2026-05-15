import { useLang } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { Mail, Phone, MessageCircle, ArrowUpRight, ArrowRight } from "lucide-react";
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

          {/* Standalone CTA */}
          <Link
            to="/#cta"
            className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)] transition-all self-start md:self-auto"
          >
            <span className="flex flex-col leading-tight text-left">
              <span className="font-display font-semibold text-sm md:text-base">{t.footer.ctaLabel}</span>
              <span className="text-[10px] uppercase tracking-widest text-white/80">{t.footer.ctaSub}</span>
            </span>
            <span className="size-8 rounded-full bg-white/15 grid place-items-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>

        {/* Contact + Nav */}
        <div className="mt-8 grid md:grid-cols-3 gap-3">
          {/* WhatsApp first - highlighted */}
          <a
            href="https://wa.me/40734605055"
            target="_blank"
            rel="noopener noreferrer"
            className="group md:col-span-1 flex items-center gap-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 hover:bg-[#25D366]/20 px-4 py-3 transition-all backdrop-blur-sm"
          >
            <span className="size-9 rounded-lg bg-[#25D366] grid place-items-center shrink-0">
              <MessageCircle className="size-4 text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] uppercase tracking-widest text-white/60">WhatsApp</span>
              <span className="block text-sm text-white font-medium">+40 734 605 055</span>
            </span>
            <ArrowUpRight className="size-4 text-white/50 group-hover:text-[#25D366] transition-colors" />
          </a>

          <a
            href="tel:+40734605055"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-purple-400/40 px-4 py-3 transition-all backdrop-blur-sm"
          >
            <span className="size-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 grid place-items-center shrink-0">
              <Phone className="size-4 text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] uppercase tracking-widest text-white/60">{t.footer.phoneLabel}</span>
              <span className="block text-sm text-white">+40 734 605 055</span>
            </span>
            <ArrowUpRight className="size-4 text-white/50 group-hover:text-purple-300 transition-colors" />
          </a>

          <a
            href="mailto:avyrontech@gmail.com"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-purple-400/40 px-4 py-3 transition-all backdrop-blur-sm"
          >
            <span className="size-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 grid place-items-center shrink-0">
              <Mail className="size-4 text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] uppercase tracking-widest text-white/60">{t.footer.emailLabel}</span>
              <span className="block text-sm text-white truncate">avyrontech@gmail.com</span>
            </span>
            <ArrowUpRight className="size-4 text-white/50 group-hover:text-purple-300 transition-colors" />
          </a>
        </div>

        {/* Nav inline */}
        <nav className="mt-7 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {t.footer.navItems.map((n) => {
            const className =
              "px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] hover:border-purple-300/50 text-sm md:text-base font-display font-semibold text-white/90 hover:text-white transition-all";
            // Anchor link → route to home with hash so it works from any page
            const to = n.h.startsWith("#") ? `/${n.h}` : n.h;
            return (
              <Link key={n.h} to={to} className={className}>
                {n.l}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/55 flex flex-wrap justify-between gap-2">
          <span>{t.footer.copy.replace("{y}", String(new Date().getFullYear()))}</span>
          <span>{t.footer.built}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
