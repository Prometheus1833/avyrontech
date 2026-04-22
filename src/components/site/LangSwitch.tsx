import { useLang } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/translations";

const LangSwitch = ({ className = "" }: { className?: string }) => {
  const { lang, setLang } = useLang();
  const opts: Lang[] = ["ro", "en"];
  return (
    <div className={`inline-flex items-center rounded-full bg-muted/70 p-0.5 text-[11px] font-semibold ${className}`}>
      {opts.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-full uppercase transition-colors ${
            lang === l
              ? "bg-foreground text-background shadow-soft"
              : "text-foreground/60 hover:text-foreground"
          }`}
          aria-label={`Switch to ${l.toUpperCase()}`}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
};

export default LangSwitch;
