import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, Lang, Dict } from "./translations";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const LanguageContext = createContext<Ctx | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ro";
    // URL prefix wins on first paint so SSR-like crawlers see the right language.
    if (window.location.pathname === "/en" || window.location.pathname.startsWith("/en/")) {
      return "en";
    }
    const stored = localStorage.getItem("webcore-lang");
    return (stored === "en" || stored === "ro") ? stored : "ro";
  });

  useEffect(() => {
    localStorage.setItem("webcore-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = (): Ctx => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // HMR fallback: avoids blank screen if context identity is lost during Fast Refresh
    return { lang: "ro", setLang: () => {}, t: translations.ro };
  }
  return ctx;
};
