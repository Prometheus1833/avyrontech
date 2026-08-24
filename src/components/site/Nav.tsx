import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, Newspaper, Briefcase, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import LangSwitch from "./LangSwitch";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import logo from "@/assets/avyron-logo.webp";

const Nav = () => {
  const [open, setOpen] = useState(false);
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const isRo = lang === "ro";
  const homePath = isRo ? "/" : "/en";
  const links = [
    { label: t.nav.news, to: lang === "en" ? "/en/blog" : "/blog", icon: Newspaper, isRoute: true },
    { label: isRo ? "Portofoliu" : "Portfolio", to: isRo ? "/despre-si-portofoliu#portofoliu" : "/en/about#portofoliu", icon: Briefcase, isRoute: true },
    { label: isRo ? "Vezi exemple" : "See examples", href: `${homePath}#exemple` },
    { label: isRo ? "Produse" : "Products", to: isRo ? "/costurisiproduse" : "/en/pricing", icon: ShoppingBag, isRoute: true },
    { label: t.nav.process, href: `${homePath}#proces` },
    { label: t.nav.faq, href: `${homePath}#faq` },
  ] as Array<{ label: string; href?: string; to?: string; icon?: typeof Newspaper; highlight?: boolean; isRoute?: boolean }>;

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-6xl px-4 mt-3">
        <nav className="glass shadow-soft rounded-full flex items-center justify-between pl-3 pr-2 py-2 gap-2">
          <div className="flex items-center gap-3">
            <Link to={homePath} className="flex items-center gap-2">
              <img src={logo} alt="Avyron" width={22} height={22} className="size-[1.4rem] rounded-md object-cover" />
              <span
                className="text-base md:text-lg font-bold uppercase tracking-[0.18em] bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                AVYRON
              </span>
            </Link>
            <div className="hidden md:inline-flex items-center gap-1.5">
              <LangSwitch />
              <ThemeToggle />
            </div>
          </div>
          <ul className="hidden md:flex items-center gap-4 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href ?? l.to}>
                {l.isRoute && l.to ? (
                  <Link
                    to={l.to}
                    title={l.label}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-foreground/80 transition-all duration-200 ease-out hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {l.icon && (
                      <l.icon
                        aria-hidden="true"
                        focusable="false"
                        className="size-4 text-foreground/60 transition-all duration-200 ease-out group-hover:text-brand group-hover:scale-110 group-focus-visible:text-brand"
                      />
                    )}
                    {l.label}
                  </Link>
                ) : (
                  <a
                    href={l.href}
                    className={
                      l.highlight
                        ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-brand-foreground hover:opacity-90 transition-opacity shadow-elev"
                        : "inline-flex items-center px-3 py-1.5 rounded-full text-foreground/70 transition-all duration-200 ease-out hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    }
                  >
                    {l.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden md:flex items-center gap-2">
            <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90">
              <a href={`${homePath}#cta`} title={t.nav.cta} className="transition-transform duration-200 ease-out hover:-translate-y-0.5">{t.nav.cta}</a>
            </Button>
            {!loading && (user ? (
              <UserMenu />
            ) : (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/auth" title={t.auth.login} className="group"><LogIn className="size-4 mr-1.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" focusable="false" />{t.auth.login}</Link>
              </Button>
            ))}
          </div>
          <div className="md:hidden flex items-center gap-1.5">
            <LangSwitch />
            <ThemeToggle />
            {!loading && user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setOpen(!open)}
                className="size-11 grid place-items-center rounded-full transition-all duration-200 ease-out hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={open ? `${t.nav.menu} — close` : t.nav.menu}
                aria-expanded={open}
                title={t.nav.menu}
              >
                {open ? <X className="size-5" aria-hidden="true" focusable="false" /> : <Menu className="size-5" aria-hidden="true" focusable="false" />}
              </button>
            )}
            {!loading && !user && open === false && (
              <></>
            )}
          </div>
        </nav>
        {open && !user && (
          <div className="md:hidden glass shadow-soft rounded-3xl mt-2 p-4 space-y-2">
            <Button asChild className="w-full rounded-full bg-brand text-brand-foreground hover:opacity-90">
              <Link to="/auth" onClick={() => setOpen(false)}>
                <LogIn className="size-4 mr-1.5" aria-hidden="true" focusable="false" />
                {t.auth.loginCta}
              </Link>
            </Button>
            {links.map((l) =>
              l.isRoute && l.to ? (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                >
                  {l.label}
                </Link>
              ) : (
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
              )
            )}
            <Button asChild className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
              <a href={`${homePath}#cta`} onClick={() => setOpen(false)}>{t.nav.cta}</a>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Nav;
