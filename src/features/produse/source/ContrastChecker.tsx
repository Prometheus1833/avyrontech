import { useMemo, useState } from "react";

/**
 * ContrastChecker — Avyron Products (avyron.ro/produse)
 * Raportul de contrast WCAG 2.2 și cea mai apropiată nuanță care trece AA.
 */

const toRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrast = (a: string, b: string) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Apropie culoarea de text de alb sau negru până trece pragul cerut. */
export function fix(fg: string, bg: string, target = 4.5): string {
  const [r, g, b] = toRgb(fg);
  const towardsWhite = luminance(bg) < 0.5;
  for (let step = 0; step <= 100; step += 2) {
    const t = step / 100;
    const mix = (value: number) => Math.round(towardsWhite ? value + (255 - value) * t : value * (1 - t));
    const candidate = `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    if (contrast(candidate, bg) >= target) return candidate;
  }
  return towardsWhite ? "#ffffff" : "#000000";
}

export function ContrastChecker({ initial = { fg: "#857e98", bg: "#0d1016" } }: { initial?: { fg: string; bg: string } }) {
  const [fg, setFg] = useState(initial.fg);
  const [bg, setBg] = useState(initial.bg);
  const ratio = useMemo(() => contrast(fg, bg), [fg, bg]);
  const suggestion = useMemo(() => (ratio < 4.5 ? fix(fg, bg) : null), [fg, bg, ratio]);
  const badge = (label: string, pass: boolean) => (
    <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 10.5, fontWeight: 700, background: pass ? "#34d39926" : "#f8717126", color: pass ? "#34d399" : "#f87171" }}>
      {label} {pass ? "trece" : "cade"}
    </span>
  );

  return (
    <div style={{ display: "grid", gap: 10, color: "#fff", fontSize: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Text <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} style={{ width: 34, height: 26, background: "none", border: 0 }} />
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Fundal <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: 34, height: 26, background: "none", border: 0 }} />
        </label>
        <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{ratio.toFixed(2)}:1</span>
      </div>
      <div style={{ borderRadius: 14, background: bg, color: fg, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 13 }}>Text normal, 14px — verifică lizibilitatea.</p>
        <p style={{ margin: "6px 0 0", fontSize: 21, fontWeight: 700 }}>Text mare, 21px</p>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {badge("AA text", ratio >= 4.5)}
        {badge("AA mare", ratio >= 3)}
        {badge("AAA text", ratio >= 7)}
      </div>
      {suggestion && (
        <button type="button" onClick={() => setFg(suggestion)} style={{ justifySelf: "start", borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "5px 11px", fontSize: 11.5, cursor: "pointer" }}>
          Corectează la {suggestion} (AA)
        </button>
      )}
    </div>
  );
}

export default ContrastChecker;
