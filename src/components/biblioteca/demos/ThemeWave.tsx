import { useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: { eyebrow: "Panou client", headline: "12 comenzi active", toggle: "Comută tema" },
  en: { eyebrow: "Client dashboard", headline: "12 active orders", toggle: "Switch theme" },
};

/**
 * APP-S4 — val de comutare temă.
 *
 * Tema nouă nu apare brusc: se deschide dintr-un cerc, exact din butonul
 * apăsat. Costă un `clip-path` animat și schimbă complet percepția asupra
 * comutatorului.
 */
export default function ThemeWave() {
  const { lang } = useLang();
  const t = COPY[lang];
  const [dark, setDark] = useState(true);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const host = hostRef.current;
    const overlay = overlayRef.current;
    const next = !dark;

    if (!host || !overlay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDark(next);
      return;
    }

    const hostRect = host.getBoundingClientRect();
    const x = event.clientX - hostRect.left;
    const y = event.clientY - hostRect.top;
    const radius = Math.hypot(Math.max(x, hostRect.width - x), Math.max(y, hostRect.height - y));

    overlay.dataset.dark = String(next);
    overlay.style.display = "block";
    const animation = overlay.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
      ],
      { duration: 620, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
    );
    animation.onfinish = () => {
      setDark(next);
      overlay.style.display = "none";
    };
  };

  const panel = (isDark: boolean) => (
    <div className={`flex h-full flex-col justify-between p-6 ${isDark ? "bg-[#0b0d14]" : "bg-[#f4f5f7]"}`}>
      <div>
        <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-white/45" : "text-black/45"}`}>
          {t.eyebrow}
        </p>
        <p className={`mt-2 text-2xl font-semibold ${isDark ? "text-white" : "text-[#0b0d14]"}`}>
          {t.headline}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-12 rounded ${isDark ? "bg-white/[0.07]" : "bg-black/[0.06]"}`} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div ref={hostRef} className="relative h-[220px] overflow-hidden rounded-xl border border-white/12">
        {panel(dark)}
        <div ref={overlayRef} className="absolute inset-0 hidden" style={{ display: "none" }}>
          {panel(!dark)}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={t.toggle}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/25 bg-black/40 p-2 text-white backdrop-blur transition-transform hover:scale-110"
        >
          {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
