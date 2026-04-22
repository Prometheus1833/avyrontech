import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { label: "webcore.app", href: "#top", small: true },
  { label: "Proces", href: "#proces" },
  { label: "Exemple", href: "#exemple" },
  { label: "De ce ai nevoie de un site?", href: "#de-ce", highlight: true },
  { label: "FAQ", href: "#faq" },
];

const Nav = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-6xl px-4 mt-3">
        <nav className="glass shadow-soft rounded-full flex items-center justify-between pl-5 pr-2 py-2">
          <a href="#top" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="size-7 rounded-lg bg-brand grid place-items-center text-white text-sm">W</span>
            Webcore
          </a>
          <ul className="hidden md:flex items-center gap-5 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={
                    l.highlight
                      ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-brand-foreground hover:opacity-90 transition-opacity shadow-elev"
                      : l.small
                      ? "text-xs text-foreground/50 hover:text-foreground/80 transition-colors font-mono"
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
              <a href="#cta">Demo gratuit</a>
            </Button>
          </div>
          <button onClick={() => setOpen(!open)} className="md:hidden size-10 grid place-items-center rounded-full hover:bg-muted" aria-label="Meniu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
        {open && (
          <div className="md:hidden glass shadow-soft rounded-3xl mt-2 p-4 space-y-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                  l.highlight ? "bg-brand text-brand-foreground" : l.small ? "text-xs text-foreground/50 font-mono" : "hover:bg-muted"
                }`}
              >
                {l.label}
              </a>
            ))}
            <Button asChild className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
              <a href="#cta" onClick={() => setOpen(false)}>Demo gratuit</a>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Nav;
