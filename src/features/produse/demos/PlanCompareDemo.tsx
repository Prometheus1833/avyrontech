import PlanCompare from "../source/PlanCompare";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

export default function PlanCompareDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 380, maxHeight: "100%", overflowY: "auto" }}>
        <PlanCompare
          plans={[
            { id: "start", name: "Start", price: "490 lei" },
            { id: "plus", name: "Plus", price: "990 lei", note: ro ? "cel mai luat" : "most chosen", highlight: true },
            { id: "pro", name: "Pro", price: "1490 lei" },
          ]}
          rows={[
            { label: ro ? "Pagini incluse" : "Pages included", values: { start: "3", plus: "7", pro: "12" } },
            { label: ro ? "Texte scrise de noi" : "Copy written by us", values: { start: false, plus: true, pro: true } },
            { label: ro ? "Optimizare SEO" : "SEO optimisation", values: { start: ro ? "de bază" : "basic", plus: ro ? "completă" : "full", pro: ro ? "completă + conținut" : "full + content" } },
            { label: ro ? "Mentenanță inclusă" : "Maintenance included", values: { start: false, plus: ro ? "3 luni" : "3 months", pro: ro ? "12 luni" : "12 months" } },
          ]}
        />
      </div>
    </Stage>
  );
}
