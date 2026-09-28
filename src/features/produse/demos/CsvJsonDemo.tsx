import CsvJsonStudio from "../source/CsvJsonStudio";
import type { DemoProps } from "./registry";

const SAMPLE_RO = `nume;pret;stoc;activ
Scaun ergonomic;1299,90;12;da
Birou reglabil;2499;4;da
Lampă LED;189,50;37;nu`;

const SAMPLE_EN = `name,price,stock,active
Ergonomic chair,259.90,12,yes
Standing desk,499,4,yes
LED lamp,38.50,37,no`;

export default function CsvJsonDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-auto p-4">
      <CsvJsonStudio
        initialCsv={ro ? SAMPLE_RO : SAMPLE_EN}
        labels={
          ro
            ? undefined
            : { drop: "Drop a CSV here or paste text", rows: "rows", json: "Download JSON", csv: "Download CSV", copy: "Copy JSON", copied: "Copied" }
        }
      />
    </div>
  );
}
