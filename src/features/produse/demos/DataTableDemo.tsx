import DataTable from "../source/DataTable";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

type Row = { proiect: string; luna: string; ore: number; valoare: number };

const ROWS: Row[] = [
  { proiect: "Pensiunea Cerbul", luna: "Mai", ore: 42, valoare: 8400 },
  { proiect: "Magazin Lumina", luna: "Iunie", ore: 76, valoare: 15200 },
  { proiect: "Clinica Nord", luna: "Iulie", ore: 31, valoare: 6100 },
  { proiect: "Agenția Vertu", luna: "August", ore: 58, valoare: 11600 },
];

export default function DataTableDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <DataTable<Row>
          rows={ROWS}
          filterLabel={ro ? "Caută proiect sau lună" : "Search project or month"}
          columns={[
            { key: "proiect", label: ro ? "Proiect" : "Project" },
            { key: "luna", label: ro ? "Luna" : "Month" },
            { key: "ore", label: ro ? "Ore" : "Hours", align: "right" },
            { key: "valoare", label: ro ? "Valoare" : "Value", align: "right", render: (row) => `${row.valoare.toLocaleString("ro-RO")} lei` },
          ]}
        />
      </div>
    </Stage>
  );
}
