import { useMemo, useState } from "react";

/**
 * PaletteStudio — Avyron Products (avyron.ro/produse)
 * Construiește o paletă din culoarea de brand și verifică pe loc contrastul
 * fiecărei trepte cu textul alb și cu cel negru (WCAG 2.1). Scoate variabilele
 * CSS gata de lipit, ca paleta să ajungă în proiect, nu într-un screenshot.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

const toRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join("") : clean;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
};

const toHex = (rgb: number[]) => `#${rgb.map((value) => clamp(value).toString(16).padStart(2, "0")).join("")}`;

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a: number[], b: number[]) => {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
};

/** Treptele paletei, de la cea mai deschisă la cea mai închisă. */
const STEPS = [95, 85, 72, 60, 48, 38, 28, 18];

export function PaletteStudio({ brand = "#8b5cf6" }: { brand?: string }) {
  const [color, setColor] = useState(brand);

  const scale = useMemo(() => {
    const base = toRgb(color);
    return STEPS.map((level) => {
      const mix = level / 100;
      const rgb = base.map((channel) => (mix > 0.5 ? channel + (255 - channel) * ((mix - 0.5) * 2) : channel * (mix * 2)));
      return { level, hex: toHex(rgb), white: ratio(rgb, [255, 255, 255]), black: ratio(rgb, [0, 0, 0]) };
    });
  }, [color]);

  const css = useMemo(() => scale.map((entry) => `  --brand-${entry.level}: ${entry.hex};`).join("\n"), [scale]);

  return (
    <div style={{ display: "grid", gap: 10, color: "#fff", width: "100%" }}>
      <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 8 }}>
        Culoarea de brand
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Culoarea de brand" />
        <code style={{ fontSize: 12 }}>{color}</code>
      </label>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
        {scale.map((entry) => (
          <li key={entry.level} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
            <span style={{ width: 48, height: 20, borderRadius: 6, background: entry.hex, border: "1px solid rgba(255,255,255,.14)" }} />
            <code style={{ width: 64 }}>{entry.hex}</code>
            {/* Verde = trece pragul 4.5:1 pentru text normal. */}
            <span style={{ color: entry.white >= 4.5 ? "#a3e635" : "rgba(255,255,255,.45)" }}>alb {entry.white.toFixed(1)}</span>
            <span style={{ color: entry.black >= 4.5 ? "#a3e635" : "rgba(255,255,255,.45)" }}>negru {entry.black.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      <pre style={{ margin: 0, padding: ".6rem .7rem", borderRadius: 12, background: "rgba(0,0,0,.4)", fontSize: 11, overflowX: "auto" }}>{`:root {\n${css}\n}`}</pre>
    </div>
  );
}

export default PaletteStudio;
