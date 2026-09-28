import ProcessTimeline from "../source/ProcessTimeline";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function ProcessTimelineDemo({ values, lang }: DemoProps) {
  const ro = lang === "ro";
  const phases = ro
    ? [
        { title: "Descoperire", meta: "2 zile", body: "Stabilim obiectivul, publicul și ce înseamnă „reușit” pentru site." },
        { title: "Design", meta: "1 săptămână", body: "Machete pe mobil și desktop, cu textele reale, nu lorem ipsum." },
        { title: "Dezvoltare", meta: "2 săptămâni", body: "Construim, testăm pe dispozitive reale și măsurăm performanța." },
        { title: "Lansare", meta: "1 zi", body: "Mutăm domeniul, verificăm indexarea și predăm ghidul de administrare." },
      ]
    : [
        { title: "Discovery", meta: "2 days", body: "We agree on the goal, the audience and what a successful site means." },
        { title: "Design", meta: "1 week", body: "Mobile and desktop mockups with the real copy, not lorem ipsum." },
        { title: "Build", meta: "2 weeks", body: "We build, test on real devices and measure performance." },
        { title: "Launch", meta: "1 day", body: "Domain move, indexing checks and the admin handover guide." },
      ];
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 360, maxHeight: "100%", overflowY: "auto" }}>
        <ProcessTimeline phases={phases} color={str(values.color, "#8b5cf6")} />
      </div>
    </Stage>
  );
}
