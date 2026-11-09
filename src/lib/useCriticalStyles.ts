import { useLayoutEffect } from "react";

/** Only component-scoped, trusted styles belong here. Captured in prerendered
 * head output so a public page is styled before its lazy route is interactive.
 * Retaining one tag per ID matches Vite's normal SPA stylesheet lifetime. */
export function useCriticalStyles(id: string, css: string) {
  useLayoutEffect(() => {
    const existing = document.getElementById(id);
    if (existing && existing.tagName !== "STYLE") return;
    const style = existing || document.createElement("style");
    style.id = id;
    if (style.textContent !== css) style.textContent = css;
    if (!style.isConnected) document.head.appendChild(style);
  }, [id, css]);
}
