import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("route transition", () => {
  it("is short, CSS-only and disabled for reduced motion", () => {
    const component = readFileSync(resolve(root, "src/components/site/RouteTransition.tsx"), "utf8");
    const css = readFileSync(resolve(root, "src/index.css"), "utf8");

    expect(component).toContain('className="avy-route-transition"');
    expect(css).toContain("animation: avy-route-reveal 340ms");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/\.avy-route-transition\s*\{[\s\S]*?animation:\s*none/);
  });
});
