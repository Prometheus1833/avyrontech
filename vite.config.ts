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
    // Static hosting (Lovable) is the default output. Set AVYRON_WORKER=1 to
    // build the Cloudflare Worker (301s + hard 404/403/500/503 statuses).
    mode !== "development" &&
      (process.env.AVYRON_WORKER === "1"
        ? cloudflare({ configPath: "./wrangler.worker.jsonc" })
        : cloudflare()),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
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
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-router")) return "router";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("@supabase")) return "supabase";
          return "vendor";
        },
      },
    },
  },
}));

