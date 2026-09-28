import { useEffect, useRef } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPY = {
  ro: { title: "Brand kit", sub: "Paletă · tipografie · template-uri animate" },
  en: { title: "Brand kit", sub: "Palette · typography · animated templates" },
};

/**
 * SOC-S2 — card de brand cu folie holografică.
 *
 * Iridescența e un gradient conic care se rotește după cursor, peste o mască
 * de zgomot fin. Când nu atinge nimeni cardul, se plimbă singur încet, ca să
 * fie evident despre ce e vorba și fără interacțiune.
 */
export default function HoloCard() {
  const { lang } = useLang();
  const t = COPY[lang];
  const cardRef = useRef<HTMLDivElement | null>(null);
  const foilRef = useRef<HTMLDivElement | null>(null);
  const idle = useRef(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let frame = 0;
    const loop = (time: number) => {
      if (idle.current && foilRef.current) {
        const x = 50 + Math.sin(time / 2600) * 34;
        const y = 50 + Math.cos(time / 3400) * 26;
        foilRef.current.style.setProperty("--x", `${x}%`);
        foilRef.current.style.setProperty("--y", `${y}%`);
        foilRef.current.style.setProperty("--a", `${x * 3.6}deg`);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    idle.current = false;
    const card = cardRef.current;
    const foil = foilRef.current;
    if (!card || !foil) return;
    const rect = card.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 100;
    const py = ((event.clientY - rect.top) / rect.height) * 100;
    foil.style.setProperty("--x", `${px}%`);
    foil.style.setProperty("--y", `${py}%`);
    foil.style.setProperty("--a", `${px * 3.6}deg`);
    card.style.transform = `perspective(800px) rotateX(${(50 - py) / 7}deg) rotateY(${(px - 50) / 6}deg)`;
  };

  const reset = () => {
    idle.current = true;
    if (cardRef.current) cardRef.current.style.transform = "perspective(800px) rotateX(0) rotateY(0)";
  };

  return (
    <div className="flex min-h-[240px] items-center justify-center p-6">
      <div
        ref={cardRef}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className="relative aspect-[1.6/1] w-full max-w-sm overflow-hidden rounded-xl border border-white/15 bg-[#0d0f18] transition-transform duration-300 ease-out will-change-transform motion-reduce:!transform-none"
      >
        <div
          ref={foilRef}
          className="pointer-events-none absolute inset-0 opacity-[0.72]"
          style={{
            background:
              "conic-gradient(from var(--a, 180deg) at var(--x, 50%) var(--y, 50%), #ff5f9e, #ffd166, #4ade80, #38bdf8, #a78bfa, #ff5f9e)",
            maskImage:
              "radial-gradient(360px circle at var(--x, 50%) var(--y, 50%), #000 0%, rgba(0,0,0,0.55) 42%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(360px circle at var(--x, 50%) var(--y, 50%), #000 0%, rgba(0,0,0,0.55) 42%, transparent 78%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/70">Avyron</span>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-white">{t.title}</p>
            <p className="mt-1 text-xs text-white/55">{t.sub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
