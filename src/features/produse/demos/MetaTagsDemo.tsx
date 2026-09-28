import MetaTagsStudio from "../source/MetaTagsStudio";
import type { DemoProps } from "./registry";

export default function MetaTagsDemo({ lang }: DemoProps) {
  return (
    <div className="h-full w-full overflow-auto p-4">
      <MetaTagsStudio
        initial={
          lang === "ro"
            ? undefined
            : {
                title: "Animated React components and 3D effects — Avyron",
                description: "Components, sections and 3D effects ready to copy into your project: React, Tailwind, GSAP and Three.js.",
                url: "https://avyron.ro/en/products",
              }
        }
      />
    </div>
  );
}
