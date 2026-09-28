import { useRef } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: {
    eyebrow: "Serviciu",
    title: "Website de prezentare",
    body: "Structură pe intenția clientului, Core Web Vitals măsurate, livrare în 2–5 zile.",
    tags: ["SEO tehnic", "GDPR"],
  },
  en: {
    eyebrow: "Service",
    title: "Presentation website",
    body: "Structured around customer intent, measured Core Web Vitals, delivered in 2–5 days.",
    tags: ["Technical SEO", "GDPR"],
  },
};

/**
 * PRZ-F3 — card cu înclinare și lumină speculară.
 *
 * Tehnica e clasică: transformăm poziția cursorului în două unghiuri de
 * rotație și mutăm un gradient radial ca reflexie. Totul pe compositor
 * (transform + opacity), deci nu declanșează layout la fiecare cadru.
 */
export default function TiltCard() {
  const { lang } = useLang();
  const t = COPY[lang];
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 14}deg) rotateY(${(px - 0.5) * 18}deg) scale(1.02)`;
    if (glow) {
      glow.style.opacity = "1";
      glow.style.background = `radial-gradient(320px circle at ${px * 100}% ${py * 100}%, hsla(48,100%,72%,0.28), transparent 65%)`;
    }
  };

  const reset = () => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (card) card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
    if (glow) glow.style.opacity = "0";
  };

  return (
    <div className="flex min-h-[240px] items-center justify-center p-6">
      <div
        ref={cardRef}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/12 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-6 transition-transform duration-300 ease-out will-change-transform motion-reduce:!transform-none"
      >
        <div ref={glowRef} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300" />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">{t.eyebrow}</p>
        <h4 className="mt-3 text-xl font-semibold text-white">{t.title}</h4>
        <p className="mt-2 text-sm text-white/60">{t.body}</p>
        <div className="mt-5 flex items-center gap-2 text-xs text-white/50">
          {t.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/15 px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
