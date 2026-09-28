import type { ReactNode } from "react";

/** Cadrul comun al demo-urilor: centrează conținutul și ține fundalul neutru. */
export function Stage({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <div className={`grid h-full w-full place-items-center overflow-hidden ${pad ? "p-4" : ""} ${className}`}>{children}</div>
  );
}
