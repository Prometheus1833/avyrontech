/**
 * Bundle the tested site edge router as Cloudflare Pages' advanced-mode
 * worker. The static Vite/prerender output must already exist in dist/.
 *
 * Pages detects dist/_worker.js automatically. Lovable continues to use the
 * normal `npm run build`, so no Lovable AI run or credit is involved.
 */

import { build } from "vite";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const temp = resolve(root, "node_modules/.avyron-pages-worker");
const output = resolve(temp, "_worker.js");

if (!existsSync(resolve(dist, "index.html"))) {
  throw new Error("Pages worker build requires `npm run build` first");
}

await build({
  configFile: false,
  root,
  mode: "production",
  logLevel: "warn",
  resolve: { alias: { "@": resolve(root, "src") } },
  define: { "process.env.NODE_ENV": '"production"' },
  ssr: { noExternal: true, target: "webworker" },
  build: {
    ssr: resolve(root, "src/worker/index.ts"),
    outDir: temp,
    emptyOutDir: true,
    minify: true,
    target: "es2022",
    rollupOptions: {
      output: {
        format: "es",
        entryFileNames: "_worker.js",
        inlineDynamicImports: true,
      },
    },
  },
});

copyFileSync(output, resolve(dist, "_worker.js"));
console.log("pages: dist/_worker.js written");
