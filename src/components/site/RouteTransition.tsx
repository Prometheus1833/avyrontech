import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

type RouteTransitionProps = {
  children: ReactNode;
};

/** Short CSS-only route reveal that never delays navigation. */
const RouteTransition = ({ children }: RouteTransitionProps) => {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="avy-route-transition">
      {children}
    </div>
  );
};

export default RouteTransition;
