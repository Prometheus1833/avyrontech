import { useLang } from "@/i18n/LanguageContext";
import { Mail, Phone, MessageCircle, ArrowUpRight, Globe2, Smartphone, Code2, Rocket } from "lucide-react";
import logo from "@/assets/avyron-logo.jpg";
import brandBg from "@/assets/avyron-brand-bg.jpg";

const tagIcons = [Globe2, Smartphone, Code2, Rocket];

const Footer = () => {
  const { t } = useLang();
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-[#0a0612] text-white">
      {/* Brand background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${brandBg})` }}
        aria-hidden
      />
      {/* Readability overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0612]/70 via-[#0a0612]/80 to-[#0a0612]/95" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),transparent_60%)]" aria-hidden />

      <div className="relative">
        {/* Brand hero strip */}
        <div className="mx-auto max-w-6xl px-4 pt-12 md:pt-16 pb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src={logo} alt="Avyron" width={36} height={36} className="size-9 rounded-lg object-cover ring-1 ring-white/20" loading="lazy" />
            <span className="font-display font-extrabold text-3xl md:text-4xl tracking-[0.2em] bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              AVYRON
            </span>
          </div>
          <div className="font-display text-sm md:text-base tracking-[0.3em] uppercase text-white/80">
            Innovate. <span className="text-purple-300">Develop.</span> Elevate.
          </div>
          <p className="mt-3 text-sm md:text-base text-white/70 max-w-xl mx-auto">
            {t.footer.brandLine}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {t.footer.brandTags.map((label, i) => {
              const Icon = tagIcons[i] ?? Globe2;
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur px-3 py-1 text-xs text-white/85"
                >
                  <Icon className="size-3.5 text-purple-300" />
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Contact + Nav grid */}
        <div className="mx-auto max-w-6xl px-4 pb-10 grid md:grid-cols-2 gap-6">
          {/* Contact card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 md:p-7 shadow-elev">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-purple-300 mb-2">
              {t.footer.contact}
            </div>
            <h3 className="font-display font-semibold text-lg md:text-xl text-white">
              {t.footer.contactLead}
            </h3>
            <ul className="mt-5 space-y-2.5">
              <li>
                <a
                  href="mailto:avyrontech@gmail.com"
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-purple-400/40 px-4 py-3 transition-all"
                >
                  <span className="size-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 grid place-items-center shrink-0">
                    <Mail className="size-4 text-white" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] uppercase tracking-widest text-white/50">{t.footer.emailLabel}</span>
                    <span className="block text-sm text-white truncate">avyrontech@gmail.com</span>
                  </span>
                  <ArrowUpRight className="size-4 text-white/40 group-hover:text-purple-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </li>
              <li>
                <a
                  href="tel:+40734605055"
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-purple-400/40 px-4 py-3 transition-all"
                >
                  <span className="size-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 grid place-items-center shrink-0">
                    <Phone className="size-4 text-white" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] uppercase tracking-widest text-white/50">{t.footer.phoneLabel}</span>
                    <span className="block text-sm text-white">+40 734 605 055</span>
                  </span>
                  <ArrowUpRight className="size-4 text-white/40 group-hover:text-purple-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/40734605055"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#25D366]/50 px-4 py-3 transition-all"
                >
                  <span className="size-9 rounded-lg bg-[#25D366] grid place-items-center shrink-0">
                    <MessageCircle className="size-4 text-white" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] uppercase tracking-widest text-white/50">{t.footer.whatsappLabel}</span>
                    <span className="block text-sm text-white">{t.footer.whatsappValue}</span>
                  </span>
                  <ArrowUpRight className="size-4 text-white/40 group-hover:text-[#25D366] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </li>
            </ul>
          </div>

          {/* Nav card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 md:p-7 shadow-elev">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-purple-300 mb-2">
              {t.footer.nav}
            </div>
            <h3 className="font-display font-semibold text-lg md:text-xl text-white">
              {t.footer.tagline}
            </h3>
            <ul className="mt-5 grid grid-cols-2 gap-2">
              {t.footer.navItems.map((n) => (
                <li key={n.h}>
                  <a
                    href={n.h}
                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-purple-400/40 px-3.5 py-2.5 text-sm text-white/85 hover:text-white transition-all"
                  >
                    <span>{n.l}</span>
                    <ArrowUpRight className="size-3.5 text-white/40 group-hover:text-purple-300 transition-colors" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 border-t border-white/10 text-xs text-white/60 flex flex-wrap justify-between gap-2">
          <span>{t.footer.copy.replace("{y}", String(new Date().getFullYear()))}</span>
          <span>{t.footer.built}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
