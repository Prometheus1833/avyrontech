import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const PALETTES = [
  { id: "amber", from: "#2b1a06", to: "#e0a24a", ink: "#ffffff", accent: "#e0a24a" },
  { id: "teal", from: "#04211f", to: "#3fb7c4", ink: "#ffffff", accent: "#4fd4c4" },
  { id: "violet", from: "#1b0c2b", to: "#8b5cf6", ink: "#ffffff", accent: "#c4b5fd" },
];

const FORMATS = [
  { id: "story", w: 540, h: 960, label: { ro: "story 9:16", en: "story 9:16" } },
  { id: "feed", w: 720, h: 900, label: { ro: "feed 4:5", en: "feed 4:5" } },
  { id: "cover", w: 960, h: 540, label: { ro: "cover 16:9", en: "cover 16:9" } },
];

const COPY = {
  ro: {
    headline: "Reducere de toamnă",
    sub: "Doar în magazinul din centru",
    labelText: "Textul postării",
    labelPalette: "Paletă",
    labelFormat: "Format",
    download: "Descarcă PNG",
    note: "Schimbă textul, paleta și formatul: template-ul se redesenează la fiecare tastă. Pe site, aceleași reguli generează zeci de postări dintr-un singur brand kit.",
  },
  en: {
    headline: "Autumn sale",
    sub: "Only in the downtown store",
    labelText: "Post copy",
    labelPalette: "Palette",
    labelFormat: "Format",
    download: "Download PNG",
    note: "Change the copy, palette and format: the template redraws on every keystroke. On a live site the same rules generate dozens of posts from one brand kit.",
  },
};

/**
 * SOC-S3 — generator de postare.
 *
 * Template-ul e cod, nu fișier: paletă, format și text intră ca parametri, iar
 * canvasul redesenează totul. De aici vine diferența față de „îți trimitem un
 * PSD": clientul își face singur variantele, în identitatea lui.
 */
export default function PostGenerator() {
  const { lang } = useLang();
  const t = COPY[lang];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [palette, setPalette] = useState(PALETTES[0]);
  const [format, setFormat] = useState(FORMATS[1]);
  const [text, setText] = useState(t.headline);

  useEffect(() => setText(t.headline), [t.headline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = format;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gradient = ctx.createLinearGradient(0, h, w, 0);
    gradient.addColorStop(0, palette.from);
    gradient.addColorStop(1, palette.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Grilă fină, ca fundalul să nu fie un gradient gol.
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }

    // Formă de accent, poziționată după raportul formatului.
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.18, Math.min(w, h) * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Marca.
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `600 ${Math.round(w * 0.026)}px "Inter", system-ui, sans-serif`;
    ctx.letterSpacing = `${w * 0.01}px`;
    ctx.fillText("AVYRON", w * 0.08, h * 0.12);

    // Titlul, împărțit pe rânduri ca să încapă.
    const size = Math.round(w * (format.id === "cover" ? 0.075 : 0.095));
    ctx.font = `800 ${size}px "Inter", system-ui, sans-serif`;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = palette.ink;

    const words = (text || " ").split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > w * 0.84 && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);

    const blockHeight = lines.length * size * 1.08;
    let y = h * 0.78 - blockHeight;
    for (const entry of lines) {
      ctx.fillText(entry, w * 0.08, y);
      y += size * 1.08;
    }

    // Subtitlu și bară de accent.
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = `500 ${Math.round(w * 0.032)}px "Inter", system-ui, sans-serif`;
    ctx.fillText(t.sub, w * 0.08, h * 0.86);

    ctx.fillStyle = palette.accent;
    ctx.fillRect(w * 0.08, h * 0.9, w * 0.16, Math.max(3, h * 0.006));
  }, [palette, format, text, t.sub]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `avyron-${format.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_200px]">
      <div className="flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-h-[300px] w-auto rounded-lg border border-white/10"
          style={{ aspectRatio: `${format.w} / ${format.h}` }}
          aria-label={lang === "ro" ? "Previzualizare postare" : "Post preview"}
        />
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{t.labelText}</span>
          <input
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 42))}
            className="rounded-md border border-white/15 bg-white/[0.05] px-3 py-1.5 text-sm text-white focus:border-white/40 focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{t.labelPalette}</span>
          <div className="flex gap-2">
            {PALETTES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPalette(option)}
                aria-label={option.id}
                aria-pressed={palette.id === option.id}
                className={`size-7 rounded-full border-2 transition-transform ${
                  palette.id === option.id ? "scale-110 border-white" : "border-white/20"
                }`}
                style={{ background: `linear-gradient(135deg, ${option.from}, ${option.to})` }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{t.labelFormat}</span>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFormat(option)}
                aria-pressed={format.id === option.id}
                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  format.id === option.id ? "border-white bg-white text-black" : "border-white/20 text-white/55"
                }`}
              >
                {option.label[lang]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={download}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/85 transition-colors hover:border-white/60 hover:text-white"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {t.download}
        </button>

        <p className="text-xs leading-relaxed text-white/40">{t.note}</p>
      </div>
    </div>
  );
}
