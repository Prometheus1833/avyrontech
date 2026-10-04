import { Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PRODUCT_HUB_LOCALES, type ProductHubLocale } from "../data/productLocales";

export default function ProductLocaleSwitcher({
  active,
  label = "Language",
  compact = false,
}: {
  active: ProductHubLocale;
  label?: string;
  compact?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      className={`pa-locale-switcher pa-glass flex min-w-0 items-center rounded-full ${compact ? "gap-0.5 p-1" : "gap-1 p-1.5"}`}
    >
      <span className={`shrink-0 text-muted-foreground ${compact ? "px-1" : "px-1.5"}`} title={label}>
        <Globe2 className={compact ? "size-3.5" : "size-4"} aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
      <span className="pa-scroll-x flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {PRODUCT_HUB_LOCALES.map((locale) => (
          <Link
            key={locale.code}
            to={locale.path}
            lang={locale.htmlLang}
            hrefLang={locale.htmlLang}
            aria-current={active === locale.code ? "page" : undefined}
            title={locale.nativeName}
            className={`shrink-0 rounded-full font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${
              compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1.5 text-[10px]"
            } ${
              active === locale.code
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
            }`}
          >
            {locale.code}
          </Link>
        ))}
      </span>
    </nav>
  );
}
