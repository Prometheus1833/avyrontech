import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import LangSwitch from "./LangSwitch";
import logo from "@/assets/avyron-logo.jpg";

const Nav = () => {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const links = [
    { label: t.nav.whyNeed, href: "#de-ce", highlight: true },
    { label: t.nav.examples, href: "#exemple" },
    { label: t.nav.process, href: "#proces" },
    { label: t.nav.faq, href: "#faq" },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-6xl px-4 mt-3">
        <nav className="glass shadow-soft rounded-full flex items-center justify-between pl-4 pr-2 py-2">
          <div className="flex items-center gap-3">
            <a href="#top" className="flex items-center gap-2 font-display font-bold text-lg">
              <img src={logo} alt="Avyron" width={28} height={28} className="size-7 rounded-lg object-cover" />
              <span className="bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">Avyron</span>
            </a>
            <LangSwitch className="hidden md:inline-flex" />
          </div>
          <ul className="hidden md:flex items-center gap-5 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={
                    l.highlight
                      ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-brand-foreground hover:opacity-90 transition-opacity shadow-elev"
                      : "text-foreground/70 hover:text-foreground transition-colors"
                  }
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90">
              <a href="#cta">{t.nav.cta}</a>
            </Button>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <LangSwitch />
            <button onClick={() => setOpen(!open)} className="size-10 grid place-items-center rounded-full hover:bg-muted" aria-label={t.nav.menu}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
        {open && (
          <div className="md:hidden glass shadow-soft rounded-3xl mt-2 p-4 space-y-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                  l.highlight ? "bg-brand text-brand-foreground" : "hover:bg-muted"
                }`}
              >
                {l.label}
              </a>
            ))}
            <Button asChild className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
              <a href="#cta" onClick={() => setOpen(false)}>{t.nav.cta}</a>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Nav;
