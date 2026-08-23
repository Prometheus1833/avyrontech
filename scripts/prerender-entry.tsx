/**
 * Entry used only by scripts/prerender.mjs — mounts the real <App /> into a
 * JSDOM container so the build can capture fully rendered HTML per route.
 * Never shipped to the browser bundle.
 */
import { createRoot } from "react-dom/client";
import App from "@/App";

export function mount(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<App />);
  return root;
}

export { PRERENDER_ROUTES, STATUS_PAGES } from "@/seo/publicRoutes";
