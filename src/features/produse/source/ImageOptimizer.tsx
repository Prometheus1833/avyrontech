import { useState } from "react";

/**
 * ImageOptimizer — Avyron Products (avyron.ro/produse)
 * Redimensionează și convertește imaginile în WebP direct în browser, cu
 * canvas. Util înainte de a urca poze de client pe site: arată câți kilobiți
 * s-au dus și descarcă rezultatul. Fișierele nu pleacă nicăieri.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

type Result = { name: string; before: number; after: number; url: string; width: number; height: number };

const kb = (bytes: number) => `${Math.round(bytes / 102.4) / 10} kB`;

export function ImageOptimizer({ maxWidth = 1600, quality = 0.82 }: { maxWidth?: number; quality?: number }) {
  const [items, setItems] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);

  const convert = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    bitmap.close();
    if (!blob) return null;
    return { name: file.name.replace(/\.[^.]+$/, ".webp"), before: file.size, after: blob.size, url: URL.createObjectURL(blob), width, height };
  };

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const done: Result[] = [];
    for (const file of [...files].slice(0, 8)) {
      if (!file.type.startsWith("image/")) continue;
      const result = await convert(file).catch(() => null);
      if (result) done.push(result);
    }
    setItems(done);
    setBusy(false);
  };

  const saved = items.reduce((sum, item) => sum + (item.before - item.after), 0);

  return (
    <div style={{ display: "grid", gap: 10, color: "#fff", width: "100%" }}>
      <label
        style={{
          display: "grid",
          placeItems: "center",
          padding: "1rem",
          borderRadius: 14,
          border: "1.5px dashed rgba(255,255,255,.2)",
          background: "rgba(255,255,255,.03)",
          fontSize: 12.5,
          cursor: "pointer",
        }}
      >
        {busy ? "Se convertește…" : `Alege imagini — maximum ${maxWidth}px, WebP ${Math.round(quality * 100)}%`}
        <input type="file" accept="image/*" multiple hidden onChange={(event) => void handle(event.target.files)} />
      </label>

      {items.length > 0 && (
        <>
          <p style={{ margin: 0, fontSize: 12, color: "#a3e635" }}>
            {items.length} imagini · economisit {kb(saved)}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {items.map((item) => (
              <li key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, background: "rgba(255,255,255,.05)", borderRadius: 10, padding: ".4rem .6rem" }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                <span style={{ color: "rgba(255,255,255,.5)" }}>
                  {item.width}×{item.height}
                </span>
                <span>
                  {kb(item.before)} → {kb(item.after)}
                </span>
                <a href={item.url} download={item.name} style={{ color: "#22d3ee" }}>
                  descarcă
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default ImageOptimizer;
