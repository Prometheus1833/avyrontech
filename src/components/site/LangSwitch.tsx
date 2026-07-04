import { useLang } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/translations";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAlternateForPath } from "@/i18n/routes";

const LangSwitch = ({ className = "" }: { className?: string }) => {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opts: Lang[] = ["ro", "en"];
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleSelect = (l: Lang) => {
    setOpen(false);
    if (l === lang) return;
    const alt = getAlternateForPath(pathname, l);
    if (alt && alt !== pathname) {
      // URL owns the language for bilingual routes; navigate and let LangRouteSync update context.
      navigate(`${alt}${search}${hash}`);
    } else {
      setLang(l);
    }
  };

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-0.5 rounded-full bg-muted/70 text-[10px] font-bold uppercase text-foreground hover:bg-muted transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {lang}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 inline-flex flex-col rounded-lg bg-background shadow-soft border border-border p-0.5">
          {opts.map((l) => (
            <button
              key={l}
              onClick={() => handleSelect(l)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                lang === l ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LangSwitch;
