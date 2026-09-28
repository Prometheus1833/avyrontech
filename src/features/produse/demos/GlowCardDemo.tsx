import GlowCardGrid from "../source/GlowCardGrid";
import { Stage } from "./_shell";
import { num, str } from "./_props";
import type { DemoProps } from "./registry";

export default function GlowCardDemo({ values, lang }: DemoProps) {
  const items =
    lang === "ro"
      ? [
          { title: "Performanță", text: "Lighthouse 95+ pe mobil." },
          { title: "SEO", text: "Date structurate incluse." },
          { title: "Securitate", text: "Headere și backup." },
          { title: "Suport", text: "Răspuns în 24 de ore." },
        ]
      : [
          { title: "Performance", text: "Lighthouse 95+ on mobile." },
          { title: "SEO", text: "Structured data included." },
          { title: "Security", text: "Headers and backups." },
          { title: "Support", text: "Answer within 24 hours." },
        ];
  return (
    <Stage>
      <div className="w-full max-w-md">
        <GlowCardGrid items={items} color={str(values.color, "#38bdf8")} size={num(values.size, 260)} radius={num(values.radius, 20)} />
      </div>
    </Stage>
  );
}
