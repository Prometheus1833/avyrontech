import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { getLangFromPath, ROUTE_ALTERNATES } from "@/i18n/routes";

/**
 * Syncs the LanguageContext with the URL for pages that have a language-prefixed variant.
 * If the user lands on /en/pricing, force lang=en. If they land on a bilingual RO path
 * (e.g. /costurisiproduse), force lang=ro. Other routes are left untouched so localStorage wins.
 */
const LangRouteSync = () => {
  const { lang, setLang } = useLang();
  const { pathname } = useLocation();

  useEffect(() => {
    const isBilingual = ROUTE_ALTERNATES.some(
      (r) => r.ro === pathname || r.en === pathname,
    );
    if (!isBilingual) return;
    const target = getLangFromPath(pathname);
    if (target !== lang) setLang(target);
  }, [pathname, lang, setLang]);

  return null;
};

export default LangRouteSync;
