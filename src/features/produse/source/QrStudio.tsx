import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";

/**
 * QrStudio — Avyron Products (avyron.ro/produse)
 * Cod QR generat local (fără servicii externe, fără urmărire) pentru link,
 * Wi-Fi, vCard sau text, cu culori de brand și export PNG/SVG.
 */

export type QrKind = "link" | "wifi" | "vcard" | "text";

/** Construiește conținutul codului din câmpurile formularului. */
export function qrPayload(kind: QrKind, data: Record<string, string>): string {
  const escape = (value: string) => value.replace(/([;,:"])/g, "\\$1");
  if (kind === "wifi") return `WIFI:T:${data.security || "WPA"};S:${escape(data.ssid ?? "")};P:${escape(data.password ?? "")};;`;
  if (kind === "vcard")
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${data.lastName ?? ""};${data.firstName ?? ""}`,
      `FN:${[data.firstName, data.lastName].filter(Boolean).join(" ")}`,
      data.org ? `ORG:${data.org}` : "",
      data.phone ? `TEL;TYPE=CELL:${data.phone}` : "",
      data.email ? `EMAIL:${data.email}` : "",
      data.url ? `URL:${data.url}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
  return data.value ?? "";
}

/** Matricea codului, ca array de rânduri booleene. */
export function qrMatrix(payload: string, correction: "L" | "M" | "Q" | "H" = "M"): boolean[][] {
  const qr = qrcode(0, correction);
  qr.addData(payload);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => qr.isDark(row, col)));
}

const FIELDS: Record<QrKind, Array<{ key: string; label: string }>> = {
  link: [{ key: "value", label: "Adresă (https://…)" }],
  text: [{ key: "value", label: "Text" }],
  wifi: [
    { key: "ssid", label: "Nume rețea" },
    { key: "password", label: "Parolă" },
  ],
  vcard: [
    { key: "firstName", label: "Prenume" },
    { key: "lastName", label: "Nume" },
    { key: "org", label: "Firmă" },
    { key: "phone", label: "Telefon" },
    { key: "email", label: "E-mail" },
  ],
};

export function QrStudio({ accent = "#0b0d16", background = "#ffffff" }: { accent?: string; background?: string }) {
  const [kind, setKind] = useState<QrKind>("link");
  const [data, setData] = useState<Record<string, string>>({ value: "https://avyron.ro" });
  const [fg, setFg] = useState(accent);
  const [bg, setBg] = useState(background);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const payload = useMemo(() => qrPayload(kind, data), [kind, data]);
  const matrix = useMemo(() => (payload ? qrMatrix(payload) : []), [payload]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || matrix.length === 0) return;
    const scale = 6;
    const quiet = 4;
    const size = (matrix.length + quiet * 2) * scale;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    matrix.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }),
    );
  }, [matrix, fg, bg]);

  const svg = useMemo(() => {
    if (matrix.length === 0) return "";
    const quiet = 4;
    const size = matrix.length + quiet * 2;
    const paths = matrix
      .map((row, y) => row.map((dark, x) => (dark ? `M${x + quiet} ${y + quiet}h1v1h-1z` : "")).join(""))
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${bg}"/><path d="${paths}" fill="${fg}"/></svg>`;
  }, [matrix, fg, bg]);

  const save = (type: "png" | "svg") => {
    if (type === "png") {
      const url = canvasRef.current?.toDataURL("image/png");
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = "cod-qr.png";
      a.click();
      return;
    }
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cod-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const field: React.CSSProperties = { width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", padding: "6px 9px", fontSize: 12 };
  const btn: React.CSSProperties = { borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "5px 11px", fontSize: 11.5, cursor: "pointer" };

  return (
    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "start", color: "#fff", fontSize: 12 }}>
      <div style={{ display: "grid", gap: 7 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(Object.keys(FIELDS) as QrKind[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={kind === option}
              onClick={() => {
                setKind(option);
                setData(option === "link" ? { value: "https://avyron.ro" } : option === "text" ? { value: "Avyron" } : {});
              }}
              style={{ ...btn, background: kind === option ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : btn.background, border: kind === option ? 0 : btn.border }}
            >
              {option}
            </button>
          ))}
        </div>
        {FIELDS[kind].map((f) => (
          <input key={f.key} aria-label={f.label} placeholder={f.label} value={data[f.key] ?? ""} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} style={field} />
        ))}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} aria-label="Culoare cod" style={{ width: 28, height: 24, border: 0, background: "none" }} />
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} aria-label="Culoare fundal" style={{ width: 28, height: 24, border: 0, background: "none" }} />
          <button type="button" onClick={() => save("png")} style={btn}>
            PNG
          </button>
          <button type="button" onClick={() => save("svg")} style={btn}>
            SVG
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} aria-label="Cod QR generat" style={{ width: 120, height: 120, borderRadius: 12, background: bg }} />
    </div>
  );
}

export default QrStudio;
