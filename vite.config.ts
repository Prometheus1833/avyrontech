import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Lovable and Cloudflare Pages use the plain static Vite build. The
    // Cloudflare plugin is enabled only for the optional standalone site
    // Worker build; otherwise it emits an unrelated generated Worker config
    // into dist/ and can make Pages deploy the wrong runtime.
    mode !== "development" &&
      process.env.AVYRON_WORKER === "1" &&
      cloudflare({ configPath: "./wrangler.worker.jsonc" }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // A previous Worker build writes dist/client and dist/avyron_site. Always
    // remove those artifacts before a static Lovable/Pages build so the wrong
    // Wrangler configuration cannot leak into a later deployment.
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // React core + its runtime deps MUST live in the same chunk,
          // otherwise `scheduler` / `use-sync-external-store` load before
          // React and `React.createContext` becomes undefined in prod.
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/use-sync-external-store/")
          ) {
            return "react";
          }
          if (id.includes("framer-motion")) return "framer";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("react-router")) return "router";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("@supabase")) return "supabase";
          // Let Rollup keep the remaining packages beside the route that
          // actually uses them. Broad `vendor`, Radix and icon chunks forced
          // dashboard/editor code into the public homepage preload graph.
          return;
        },
      },
    },
  },
}));
