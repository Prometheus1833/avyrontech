import { useEffect } from "react";
import "@/components/dashboard/dashboardSurface.css";
/** Scope native controls and portalled dialogs to the dashboard; public pages retain their design. */
export function useDashboardSurface(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement,
      previous = root.getAttribute("data-avyron-os");
    root.setAttribute("data-avyron-os", "true");
    return () => {
      if (previous === null) root.removeAttribute("data-avyron-os");
      else root.setAttribute("data-avyron-os", previous);
    };
  }, [enabled]);
}
