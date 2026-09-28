import GithubCard from "../source/GithubCard";
import { Stage } from "./_shell";
import { str } from "./_props";
import type { DemoProps } from "./registry";

export default function GithubCardDemo({ values, lang }: DemoProps) {
  return (
    <Stage>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <p className="pa-mono mb-2 text-[10px] uppercase tracking-[0.26em] text-white/50">
          {lang === "ro" ? "api.github.com · public" : "api.github.com · public"}
        </p>
        <GithubCard owner={str(values.owner, "facebook")} repo={str(values.repo, "react")} />
      </div>
    </Stage>
  );
}
