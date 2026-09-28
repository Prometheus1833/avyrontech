import { useMemo, useRef, useState } from "react";

/**
 * MetaTagsStudio — Avyron Products (avyron.ro/produse)
 * Titlu și descriere măsurate în pixeli (cum face Google), previzualizare SERP
 * și generarea completă de meta + Open Graph + Twitter Card.
 */

const LIMITS = { titlePx: 580, descPx: 990 };

function measure(text: string, font: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return Math.round(ctx.measureText(text).width);
}

export function MetaTagsStudio({ initial }: { initial?: { title?: string; description?: string; url?: string } }) {
  const [title, setTitle] = useState(initial?.title ?? "Componente React animate și efecte 3D — Avyron");
  const [description, setDescription] = useState(
    initial?.description ?? "Componente, secțiuni și efecte 3D gata de copiat în proiectul tău: React, Tailwind, GSAP și Three.js.",
  );
  const [url, setUrl] = useState(initial?.url ?? "https://avyron.ro/produse");
  const [copied, setCopied] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);

  const titlePx = useMemo(() => measure(title, "400 20px Arial"), [title]);
  const descPx = useMemo(() => measure(description, "400 14px Arial"), [description]);

  const code = `<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${url.replace(/\/$/, "")}/og.jpg" />
<meta name="twitter:card" content="summary_large_image" />`;

  const bar = (value: number, limit: number) => (
    <span style={{ display: "inline-block", width: 70, height: 4, borderRadius: 4, background: "rgba(255,255,255,.12)", overflow: "hidden", verticalAlign: "middle" }}>
      <span style={{ display: "block", height: "100%", width: `${Math.min(100, (value / limit) * 100)}%`, background: value > limit ? "#f87171" : "#34d399" }} />
    </span>
  );

  const field: React.CSSProperties = { width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "7px 10px", fontSize: 12.5 };

  return (
    <div style={{ display: "grid", gap: 10, color: "#fff", fontSize: 12 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={field} aria-label="Titlu" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...field, resize: "vertical" }} aria-label="Descriere" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} style={field} aria-label="URL" />
      <p ref={liveRef} aria-live="polite" style={{ margin: 0, display: "flex", gap: 14, opacity: 0.65 }}>
        <span>
          Titlu {titlePx}/{LIMITS.titlePx}px {bar(titlePx, LIMITS.titlePx)}
        </span>
        <span>
          Descriere {descPx}/{LIMITS.descPx}px {bar(descPx, LIMITS.descPx)}
        </span>
      </p>
      <div style={{ borderRadius: 14, background: "#fff", padding: 12, color: "#202124", fontFamily: "Arial, sans-serif" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#4d5156" }}>{url.replace(/^https?:\/\//, "")}</p>
        <p style={{ margin: "2px 0 0", fontSize: 18, color: "#1a0dab", lineHeight: 1.3 }}>{title.slice(0, 70)}</p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#4d5156", lineHeight: 1.45 }}>{description.slice(0, 170)}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }}
        style={{ justifySelf: "start", borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "5px 12px", fontSize: 11.5, cursor: "pointer" }}
      >
        {copied ? "Copiat" : "Copiază codul"}
      </button>
    </div>
  );
}

export default MetaTagsStudio;
