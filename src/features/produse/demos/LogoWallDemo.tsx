import { useMemo } from "react";
import LogoWall from "../source/LogoWall";
import { Stage } from "./_shell";
import type { DemoProps } from "./registry";

/** Logourile demo sunt SVG-uri generate aici, ca să nu depindem de fișiere. */
const mark = (label: string, hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40"><rect width="160" height="40" rx="8" fill="hsl(${hue} 70% 55% / .16)"/><circle cx="22" cy="20" r="9" fill="hsl(${hue} 80% 65%)"/><text x="40" y="25" font-family="system-ui" font-size="13" font-weight="700" fill="white">${label}</text></svg>`,
  )}`;

export default function LogoWallDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  const clients = useMemo(
    () => [
      { name: "Nordis", src: mark("NORDIS", 265) },
      { name: "Lumina", src: mark("LUMINA", 200) },
      { name: "Cerbul", src: mark("CERBUL", 330) },
      { name: "Vertu", src: mark("VERTU", 150) },
      { name: "Atria", src: mark("ATRIA", 45) },
    ],
    [],
  );
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <LogoWall clients={clients} title={ro ? "Au lucrat cu noi" : "Trusted by"} />
      </div>
    </Stage>
  );
}
