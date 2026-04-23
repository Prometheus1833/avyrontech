import { useLang } from "@/i18n/LanguageContext";
import logo from "@/assets/avyron-logo.jpg";

const Footer = () => {
  const { t } = useLang();
  return (
    <footer className="border-t border-border/60 py-12 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <img src={logo} alt="Avyron" width={28} height={28} className="size-7 rounded-lg object-cover" loading="lazy" />
            <span className="bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">Avyron</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            {t.footer.tagline}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-foreground/60 mb-3">{t.footer.contact}</div>
          <ul className="space-y-1.5 text-sm">
            <li><a className="hover:text-brand" href="mailto:avyrontech@gmail.com">avyrontech@gmail.com</a></li>
            <li><a className="hover:text-brand" href="tel:0734607077">0734 607 077</a></li>
            <li><span className="text-muted-foreground">WhatsApp: indisponibil momentan</span></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-foreground/60 mb-3">{t.footer.nav}</div>
          <ul className="space-y-1.5 text-sm">
            {t.footer.navItems.map((n) => (
              <li key={n.h}><a className="hover:text-brand" href={n.h}>{n.l}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 mt-10 pt-6 border-t border-border/60 text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
        <span>{t.footer.copy.replace("{y}", String(new Date().getFullYear()))}</span>
        <span>{t.footer.built}</span>
      </div>
    </footer>
  );
};

export default Footer;
