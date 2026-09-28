import { useMemo, useState } from "react";

/**
 * FaviconStudio — Avyron Products (avyron.ro/produse)
 * Generator de favicon din inițiale: alegi literele, culorile și forma, apoi
 * descarci PNG-urile de 32, 180 și 512 px. Totul se desenează în browser, deci
 * nu pleacă nimic spre niciun server.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

const SIZES = [32, 180, 512];

export function FaviconStudio({ initial = "AV" }: { initial?: string }) {
  const [text, setText] = useState(initial);
  const [from, setFrom] = useState("#8b5cf6");
  const [to, setTo] = useState("#22d3ee");
  const [round, setRound] = useState(28);

  const draw = (size: number) => {
    const element = document.createElement("canvas");
    element.width = size;
    element.height = size;
    const context = element.getContext("2d");
    if (!context) return element;
    const radius = (round / 100) * size * 0.5;
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    context.beginPath();
    // `roundRect` lipsește în browsere vechi: acolo desenăm un pătrat simplu.
    if (typeof context.roundRect === "function") context.roundRect(0, 0, size, size, radius);
    else context.rect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fill();
    context.fillStyle = "#fff";
    context.font = `700 ${size * (text.length > 2 ? 0.34 : 0.46)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text.slice(0, 3).toUpperCase() || "A", size / 2, size / 2 + size * 0.03);
    return element;
  };

  const preview = useMemo(() => {
    if (typeof document === "undefined") return "";
    return draw(256).toDataURL("image/png");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, from, to, round]);

  const download = (size: number) => {
    const link = document.createElement("a");
    link.href = draw(size).toDataURL("image/png");
    link.download = `favicon-${size}.png`;
    link.click();
  };

  return (
    <div style={{ display: "grid", gap: 12, color: "#fff", width: "100%" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {preview && <img src={preview} alt="Previzualizare favicon" width={64} height={64} style={{ borderRadius: 14 }} />}
        <div style={{ display: "grid", gap: 6, flex: 1 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>
            Inițiale
            <input
              value={text}
              maxLength={3}
              onChange={(event) => setText(event.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: ".35rem .6rem",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.05)",
                color: "#fff",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Culoare de start" />
            <input type="color" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Culoare de final" />
            <label style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,.6)" }}>
              Rotunjire
              <input type="range" min={0} max={50} value={round} onChange={(event) => setRound(Number(event.target.value))} style={{ width: "100%" }} />
            </label>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => download(size)}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.16)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              padding: ".3rem .75rem",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            PNG {size}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FaviconStudio;
