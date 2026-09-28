import { useEffect, useRef, useState } from "react";

type Props = {
  /** Nuanța secțiunii de deasupra. */
  from: string;
  /** Nuanța secțiunii de dedesubt. */
  to: string;
};

/** Câteva fire de lumină care traversează cusătura dintre secțiuni. */
const MOTES = [
  { left: "12%", size: 2, delay: 0, duration: 11 },
  { left: "27%", size: 1.5, delay: 2.4, duration: 13 },
  { left: "41%", size: 2.5, delay: 5.1, duration: 10 },
  { left: "58%", size: 1.5, delay: 1.2, duration: 14 },
  { left: "72%", size: 2, delay: 3.8, duration: 12 },
  { left: "87%", size: 1.5, delay: 6.3, duration: 15 },
];

/**
 * Trecerea dintre două secțiuni, gândită ca o linie de orizont văzută din
 * spațiu: lumina secțiunii de sus se stinge într-un halou care preia nuanța
 * secțiunii următoare, iar orizontul se mișcă foarte puțin la derulare.
 */
const SectionBlend = ({ from, to }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0.5);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setMotion(true);

    const element = ref.current;
    if (!element) return;
    let frame = 0;
    let visible = false;

    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const span = window.innerHeight + rect.height;
      if (span <= 0) return;
      const value = 1 - (rect.top + rect.height) / span;
      setProgress(Math.min(1, Math.max(0, value)));
    };

    const onScroll = () => {
      if (frame || !visible) return;
      frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) update();
    }, { rootMargin: "120px 0px" });
    observer.observe(element);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Orizontul urcă ușor în timp ce secțiunea trece prin fereastră, iar haloul
  // este cel mai puternic exact când cusătura e în mijlocul ecranului.
  const drift = motion ? (progress - 0.5) * 26 : 0;
  const bloom = motion ? 0.55 + Math.sin(Math.PI * Math.min(1, Math.max(0, progress))) * 0.45 : 0.9;

  return (
    <div ref={ref} aria-hidden className="relative h-40 w-full overflow-hidden sm:h-56">
      {/* Predarea culorii de la secțiunea de sus către cea de jos */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            hsl(${from} / 0) 0%,
            hsl(${from} / 0.10) 26%,
            hsl(${to} / 0.05) 54%,
            hsl(${to} / 0.12) 78%,
            hsl(${to} / 0) 100%)`,
        }}
      />

      {/* Haloul de orizont: jumătatea din stânga păstrează nuanța veche, cea din dreapta o preia pe cea nouă */}
      <div
        className="absolute inset-x-0 top-1/2 h-48 -translate-y-1/2 will-change-transform"
        style={{
          transform: `translate3d(0, ${drift.toFixed(2)}px, 0)`,
          opacity: bloom,
          background: `
            radial-gradient(60% 100% at 28% 50%, hsl(${from} / 0.28), transparent 70%),
            radial-gradient(60% 100% at 72% 50%, hsl(${to} / 0.30), transparent 70%)
          `,
          filter: "blur(26px)",
        }}
      />

      {/* Linia de orizont */}
      <div
        className="absolute inset-x-0 top-1/2 h-px will-change-transform"
        style={{
          transform: `translate3d(0, ${(drift * 0.6).toFixed(2)}px, 0)`,
          opacity: 0.35 + bloom * 0.5,
          background: `linear-gradient(90deg, transparent, hsl(${from} / 0.55) 22%, hsl(${to} / 0.65) 78%, transparent)`,
        }}
      />
      <div
        className="absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 will-change-transform"
        style={{
          transform: `translate3d(0, ${(drift * 0.6).toFixed(2)}px, 0)`,
          opacity: bloom * 0.5,
          background: `linear-gradient(90deg, transparent, hsl(${to} / 0.22), transparent)`,
          filter: "blur(12px)",
        }}
      />

      {/* Fire de lumină care traversează cusătura */}
      {motion && MOTES.map((mote) => (
        <span
          key={mote.left}
          className="avyron-mote absolute bottom-0 rounded-full"
          style={{
            left: mote.left,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            background: `hsl(${to} / 0.8)`,
            boxShadow: `0 0 ${mote.size * 4}px hsl(${to} / 0.5)`,
            animationDelay: `${mote.delay}s`,
            animationDuration: `${mote.duration}s`,
          }}
        />
      ))}

      {/* Marginile laterale se sting, ca banda să nu aibă capete vizibile */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, hsl(var(--background) / 0.7), transparent 16%, transparent 84%, hsl(var(--background) / 0.7))",
        }}
      />
    </div>
  );
};

export default SectionBlend;
