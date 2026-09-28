import { useEffect, useState } from "react";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

/** Trei recomandări pe un carusel 3D: cardul din față e citibil, restul se retrag. */
const QUOTES = [
  { ro: "Am primit site-ul în două săptămâni și cererile s-au dublat în prima lună.", en: "We had the site in two weeks and enquiries doubled in the first month.", who: "Pensiunea Cerbul" },
  { ro: "Ne-au rescris textele și acum clienții înțeleg din prima ce vindem.", en: "They rewrote our copy and customers finally get what we sell.", who: "Magazin Lumina" },
  { ro: "Mentenanța e liniște: raport lunar, fără surprize, fără reclame.", en: "Maintenance is peace of mind: a monthly report, no surprises.", who: "Clinica Nord" },
];

export default function Testimonials3dDemo({ lang, active }: DemoProps) {
  const [index, setIndex] = useState(0);
  const ro = lang === "ro";

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % QUOTES.length), 3200);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <Stage>
      <div className="relative h-[190px] w-full max-w-[340px]" style={{ perspective: "900px" }}>
        {QUOTES.map((quote, position) => {
          const offset = (position - index + QUOTES.length) % QUOTES.length;
          const front = offset === 0;
          return (
            <figure
              key={quote.who}
              className="absolute inset-x-0 top-2 mx-auto w-[300px] rounded-2xl border border-white/12 bg-[#0d1020]/90 p-5 transition-all duration-700"
              style={{
                transform: `translateY(${offset * 10}px) translateZ(${-offset * 90}px) rotateX(${offset * 4}deg)`,
                opacity: offset > 2 ? 0 : 1 - offset * 0.35,
                zIndex: QUOTES.length - offset,
                filter: front ? "none" : "blur(1.5px)",
              }}
            >
              <blockquote className="text-[13px] leading-relaxed text-white/85">„{ro ? quote.ro : quote.en}"</blockquote>
              <figcaption className="pa-mono mt-3 text-[10px] uppercase tracking-[0.26em] text-white/45">{quote.who}</figcaption>
            </figure>
          );
        })}
      </div>
    </Stage>
  );
}
