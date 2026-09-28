import { useMemo, useState, type ReactNode } from "react";

/**
 * DataTable — Avyron Products (avyron.ro/produse)
 * Tabel cu sortare pe coloană și filtrare într-un singur câmp, fără nicio
 * dependență. Sortarea se anunță prin `aria-sort`, iar butonul din antet e
 * ceea ce apasă și tastatura, nu celula întreagă.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type Column<Row> = { key: keyof Row & string; label: string; align?: "left" | "right"; render?: (row: Row) => ReactNode };

export function DataTable<Row extends Record<string, string | number>>({
  rows,
  columns,
  filterLabel = "Caută",
  color = "#8b5cf6",
}: {
  rows: Row[];
  columns: Array<Column<Row>>;
  filterLabel?: string;
  color?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(needle)))
      : rows;
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === "number" && typeof right === "number") return (left - right) * sort.dir;
      return String(left).localeCompare(String(right), "ro") * sort.dir;
    });
  }, [rows, query, sort]);

  const toggle = (key: string) => setSort((current) => (current?.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  return (
    <div style={{ width: "100%" }}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={filterLabel}
        aria-label={filterLabel}
        style={{
          width: "100%",
          marginBottom: 10,
          padding: ".55rem .8rem",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.14)",
          background: "rgba(255,255,255,.04)",
          color: "#fff",
          outline: "none",
        }}
      />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#fff" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort?.key === column.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                style={{ textAlign: column.align ?? "left", padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.12)" }}
              >
                <button
                  type="button"
                  onClick={() => toggle(column.key)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                    color: sort?.key === column.key ? color : "rgba(255,255,255,.6)",
                  }}
                >
                  {column.label}
                  {sort?.key === column.key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => (
            <tr key={index} style={{ background: index % 2 ? "rgba(255,255,255,.03)" : "transparent" }}>
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align ?? "left", padding: "7px 8px" }}>
                  {column.render ? column.render(row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: "14px 8px", color: "rgba(255,255,255,.5)" }}>
                Nimic care să se potrivească.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
