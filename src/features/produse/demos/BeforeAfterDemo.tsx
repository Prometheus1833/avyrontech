import BeforeAfter from "../source/BeforeAfter";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

/** Cele două „fotografii" sunt SVG-uri generate: demo-ul nu aduce imagini. */
const shot = (label: string, from: string, to: string, blocks: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="640" height="400" fill="url(%23g)"/>${Array.from(
      { length: blocks },
      (_, index) => `<rect x="${40 + (index % 3) * 190}" y="${60 + Math.floor(index / 3) * 110}" width="170" height="90" rx="12" fill="white" opacity="${0.12 + (index % 3) * 0.05}"/>`,
    ).join("")}<text x="40" y="40" font-family="system-ui" font-size="22" font-weight="700" fill="white">${label}</text></svg>`,
  )}`;

export default function BeforeAfterDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <BeforeAfter
          before={shot(ro ? "Înainte" : "Before", "#3f3f46", "#18181b", 3)}
          after={shot(ro ? "După" : "After", "#8b5cf6", "#0ea5e9", 6)}
          beforeAlt={ro ? "Site-ul înainte de refacere" : "The site before the rebuild"}
          afterAlt={ro ? "Site-ul după refacere" : "The site after the rebuild"}
        />
      </div>
    </Stage>
  );
}
