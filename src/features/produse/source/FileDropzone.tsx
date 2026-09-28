import { useRef, useState } from "react";

/**
 * FileDropzone — Avyron Products (avyron.ro/produse)
 * Zonă de încărcare care acceptă și tragerea fișierelor, și butonul clasic —
 * pentru că nu toată lumea trage fișiere. Verifică tipul și mărimea înainte
 * să anunțe fișierele, iar starea „se trage peste" nu depinde de hover.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export function FileDropzone({
  accept = "image/*",
  maxMb = 8,
  label = "Trage fișierele aici sau alege de pe disc",
  onFiles,
}: {
  accept?: string;
  maxMb?: number;
  label?: string;
  onFiles?: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [items, setItems] = useState<Array<{ name: string; size: string; ok: boolean }>>([]);

  const accepts = (file: File) => {
    if (accept === "*") return true;
    return accept
      .split(",")
      .map((entry) => entry.trim())
      .some((rule) => (rule.endsWith("/*") ? file.type.startsWith(rule.slice(0, -1)) : file.type === rule || file.name.toLowerCase().endsWith(rule)));
  };

  const take = (list: FileList | null) => {
    if (!list) return;
    const files = [...list];
    setItems(
      files.map((file) => ({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        ok: accepts(file) && file.size <= maxMb * 1024 * 1024,
      })),
    );
    onFiles?.(files.filter((file) => accepts(file) && file.size <= maxMb * 1024 * 1024));
  };

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
        style={{
          width: "100%",
          padding: "1.4rem 1rem",
          borderRadius: 16,
          border: `1.5px dashed ${over ? "#22d3ee" : "rgba(255,255,255,.22)"}`,
          background: over ? "rgba(34,211,238,.08)" : "rgba(255,255,255,.03)",
          color: "rgba(255,255,255,.75)",
          fontSize: 13,
          cursor: "pointer",
          transition: "border-color .2s ease, background .2s ease",
        }}
      >
        {label}
        <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
          {accept} · maximum {maxMb} MB
        </span>
      </button>
      <input ref={input} type="file" accept={accept} multiple hidden onChange={(event) => take(event.target.files)} />
      {items.length > 0 && (
        <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 6 }}>
          {items.map((item) => (
            <li
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 12,
                padding: ".4rem .6rem",
                borderRadius: 10,
                background: item.ok ? "rgba(255,255,255,.05)" : "rgba(248,113,113,.12)",
                color: item.ok ? "rgba(255,255,255,.85)" : "#fca5a5",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              <span>{item.ok ? item.size : "respins"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FileDropzone;
