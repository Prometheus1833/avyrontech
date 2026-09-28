import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

/**
 * FluidTabs — Avyron Products (avyron.ro/produse)
 * Tab-uri ARIA complete; indicatorul se întinde elastic spre ținta nouă.
 */

type Props = {
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  label: string;
};

export function FluidTabs({ tabs, value, onChange, label }: Props) {
  const list = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 0, width: 0 });
  const [stretch, setStretch] = useState(false);

  useLayoutEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-id="${value}"]`);
    if (!el) return;
    setStretch(true);
    setBox({ left: el.offsetLeft, width: el.offsetWidth });
    const timer = window.setTimeout(() => setStretch(false), 220);
    return () => window.clearTimeout(timer);
  }, [value]);

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === value);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].id);
    list.current?.querySelector<HTMLElement>(`[data-id="${tabs[next].id}"]`)?.focus();
  };

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      onKeyDown={onKey}
      style={{ position: "relative", display: "inline-flex", padding: 4, gap: 2, borderRadius: 999, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: box.left,
          width: box.width,
          borderRadius: 999,
          background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
          transform: stretch ? "scaleX(1.12) scaleY(.88)" : "scale(1)",
          transition: "left .38s cubic-bezier(.22,1,.36,1), width .38s cubic-bezier(.22,1,.36,1), transform .22s ease",
        }}
      />
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            data-id={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            style={{ position: "relative", border: 0, background: "none", color: active ? "#fff" : "rgba(255,255,255,.6)", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "color .2s" }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default FluidTabs;
