import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply theme as early as possible to avoid FOUC
(() => {
  try {
    const saved = localStorage.getItem("theme") || "system";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    const resolved =
      saved === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : saved;
    root.classList.add(resolved);

    if (saved === "system" && window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          if ((localStorage.getItem("theme") || "system") !== "system") return;
          root.classList.remove("light", "dark");
          root.classList.add(e.matches ? "dark" : "light");
        });
    }
  } catch {}
})();

createRoot(document.getElementById("root")!).render(<App />);
