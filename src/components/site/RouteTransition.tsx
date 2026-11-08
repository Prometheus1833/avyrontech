import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { clearChunkReloadFlag } from "@/lib/lazyWithRetry";

type RouteTransitionProps = {
  children: ReactNode;
};

/** Short CSS-only route reveal that never delays navigation. */
const RouteTransition = ({ children }: RouteTransitionProps) => {
  const { pathname } = useLocation();
  // This component is inside Suspense: a committed route has loaded its chunk.
  // Clearing in main.tsx would reset the retry guard before a failing import,
  // allowing the same missing chunk to reload the page indefinitely.
  useEffect(() => clearChunkReloadFlag(), [pathname]);

  return (
    <div key={pathname} className="avy-route-transition">
      {children}
    </div>
  );
};

export default RouteTransition;
