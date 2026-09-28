import { useMemo, useState } from "react";

/**
 * CsvJsonStudio — Avyron Products (avyron.ro/produse)
 * Import CSV → tabel → JSON și invers, 100% local. Detectează separatorul
 * (virgulă, punct și virgulă, tab), păstrează diacriticele și ghicește tipurile.
 */

export type Row = Record<string, string | number | boolean | null>;

const DELIMS = [",", ";", "\t", "|"];

export function detectDelimiter(sample: string): string {
  const line = sample.split(/\r?\n/).find((l) => l.trim().length) ?? "";
  let best = ",";
  let bestCount = 0;
  for (const d of DELIMS) {
    const count = line.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** Parser CSV cu ghilimele duble escapate (RFC 4180). */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): { headers: string[]; rows: Row[] } {
  const out: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    out.push(row);
  }
  const [head = [], ...body] = out.filter((r) => r.some((cell) => cell.trim().length));
  const headers = head.map((h, i) => h.trim() || `col_${i + 1}`);
  const cast = (value: string): Row[string] => {
    const v = value.trim();
    if (!v) return null;
    if (/^-?\d{1,15}([.,]\d+)?$/.test(v) && !/^0\d/.test(v)) return Number(v.replace(",", "."));
    if (/^(true|false|da|nu|yes|no)$/i.test(v)) return /^(true|da|yes)$/i.test(v);
    return v;
  };
  return {
    headers,
    rows: body.map((cells) => Object.fromEntries(headers.map((h, i) => [h, cast(cells[i] ?? "")])) as Row),
  };
}

export function toCsv(rows: Row[], delimiter = ","): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (value: unknown) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /["\n\r]|/.test(s) && (s.includes('"') || s.includes("\n") || s.includes(delimiter)) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(delimiter), ...rows.map((r) => headers.map((h) => esc(r[h])).join(delimiter))].join("\n");
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = { initialCsv?: string; labels?: Partial<Record<"drop" | "rows" | "json" | "csv" | "copy" | "copied", string>> };

export function CsvJsonStudio({ initialCsv = "", labels = {} }: Props) {
  const l = { drop: "Trage un CSV aici sau lipește text", rows: "rânduri", json: "Descarcă JSON", csv: "Descarcă CSV", copy: "Copiază JSON", copied: "Copiat", ...labels };
  const [text, setText] = useState(initialCsv);
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseCsv(text) : { headers: [], rows: [] }), [text]);

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) setText(await file.text());
  };

  return (
    <div style={{ display: "grid", gap: 10, color: "#fff", fontSize: 12.5 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        placeholder={l.drop}
        spellCheck={false}
        rows={4}
        style={{ width: "100%", resize: "vertical", borderRadius: 12, border: "1px dashed rgba(255,255,255,.2)", background: "rgba(255,255,255,.04)", color: "#fff", padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
      />
      {parsed.rows.length > 0 && (
        <>
          <div style={{ maxHeight: 150, overflow: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={h} style={{ position: "sticky", top: 0, background: "#141826", padding: "6px 8px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 40).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 ? "rgba(255,255,255,.02)" : "transparent" }}>
                    {parsed.headers.map((h) => (
                      <td key={h} style={{ padding: "5px 8px", whiteSpace: "nowrap", opacity: 0.75 }}>
                        {String(row[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ opacity: 0.6 }}>
              {parsed.rows.length} {l.rows} · {parsed.headers.length} col.
            </span>
            <button type="button" onClick={() => download("date.json", JSON.stringify(parsed.rows, null, 2), "application/json")} style={btn}>
              {l.json}
            </button>
            <button type="button" onClick={() => download("date.csv", toCsv(parsed.rows), "text/csv;charset=utf-8")} style={btn}>
              {l.csv}
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(JSON.stringify(parsed.rows, null, 2));
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
              style={btn}
            >
              {copied ? l.copied : l.copy}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.16)",
  background: "rgba(255,255,255,.05)",
  color: "#fff",
  padding: "5px 11px",
  fontSize: 11.5,
  cursor: "pointer",
};

export default CsvJsonStudio;
