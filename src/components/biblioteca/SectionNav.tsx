import { LIBRARY_SECTIONS } from "@/data/bibliotecaCatalog";
import type { Lang } from "@/i18n/translations";
import { cn } from "@/lib/utils";

type Props = {
  activeId: string;
  lang: Lang;
  onJump: (id: string) => void;
};

/**
 * Indicatorul lateral de secțiuni.
 *
 * Discret cât timp derulezi, explicit la hover. Pe ecrane mici dispare — acolo
 * spațiul de jos e al coșului de brief.
 */
export default function SectionNav({ activeId, lang, onJump }: Props) {
  return (
    <nav
      aria-label={lang === "ro" ? "Secțiunile bibliotecii" : "Library sections"}
      className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1 lg:flex"
    >
      {LIBRARY_SECTIONS.map((section) => {
        const active = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onJump(section.id)}
            className="group pointer-events-auto flex items-center justify-end gap-2 py-1"
          >
            <span
              className={cn(
                "max-w-0 overflow-hidden whitespace-nowrap rounded-full bg-[#0b0d14]/85 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 backdrop-blur transition-all duration-300 group-hover:max-w-[220px] group-hover:px-2 group-hover:py-1",
                active && "max-w-[220px] px-2 py-1 text-white",
              )}
            >
              {section.name[lang]}
            </span>
            <span
              className={cn(
                "h-px transition-all duration-300",
                active ? "w-8 bg-white" : "w-4 bg-white/30 group-hover:w-6 group-hover:bg-white/60",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
