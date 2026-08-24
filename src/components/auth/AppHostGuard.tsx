import { type ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isPlatformHostname } from "@/lib/appHost";

const PLATFORM_PATHS = [
  "/auth",
  "/autentificare",
  "/forgot-password",
  "/reset-password",
  "/profil",
  "/intern",
  "/403",
  "/500",
  "/offline",
  "/unsubscribe",
];

function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Keeps app.avyron.ro dedicated to authenticated/product journeys. */
export default function AppHostGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const platformHost = isPlatformHostname();

  useEffect(() => {
    if (!platformHost) return;
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, [platformHost, location.pathname]);

  if (platformHost && !isPlatformPath(location.pathname)) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
