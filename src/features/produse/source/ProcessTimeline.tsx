import { useEffect, useRef } from "react";

/**
 * ProcessTimeline — Avyron Products (avyron.ro/produse)
 * Procesul agenției ca linie verticală care se umple pe măsură ce derulezi.
 * Un singur IntersectionObserver pentru toate etapele; pe „mișcare redusă"
 * totul apare deodată, fără animație.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type Phase = { title: string; body: string; meta?: string };

export function ProcessTimeline({ phases, color = "#8b5cf6" }: { phases: Phase[]; color?: string }) {
  const root = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = root.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLLIElement>("li")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => (item.dataset.in = "1"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLLIElement).dataset.in = "1";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={root} style={{ listStyle: "none", margin: 0, padding: 0, position: "relative" }}>
      <style>{`.avy-phase{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s cubic-bezier(.22,1,.36,1)}.avy-phase[data-in="1"]{opacity:1;transform:none}`}</style>
      {phases.map((phase, index) => (
        <li key={phase.title} className="avy-phase" style={{ position: "relative", paddingLeft: 34, paddingBottom: index === phases.length - 1 ? 0 : 26, transitionDelay: `${index * 70}ms` }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 9,
              top: 22,
              bottom: index === phases.length - 1 ? "auto" : 0,
              height: index === phases.length - 1 ? 0 : "auto",
              width: 2,
              background: "linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.04))",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 3,
              width: 20,
              height: 20,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              background: `linear-gradient(135deg, ${color}, #22d3ee)`,
            }}
          >
            {index + 1}
          </span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{phase.title}</h3>
          {phase.meta && <p style={{ margin: "2px 0 0", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>{phase.meta}</p>}
          <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,.7)" }}>{phase.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default ProcessTimeline;
