import { Suspense, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import Link from "./WorkspaceLink";
import { MessagesSquare, BookOpen, FolderKanban, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, canOpenSection } from "@/lib/access";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import type { QuickPanel } from "./StaffQuickPanels";
import NavDate from "./NavDate";
import "./staffHeader.css";
const Panels = lazyWithRetry(() => import("./StaffQuickPanels"));
export default function StaffWorkspaceActions({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { roles, isSuperAdmin, capabilities } = useAuth(),
    access = buildAccess({ roles, superadmin: isSuperAdmin, capabilities }),
    location = useLocation();
  const focusRef = useRef<HTMLElement | null>(null);
  const [panel, setPanel] = useState<QuickPanel>(null);
  const currentTab = new URLSearchParams(location.search).get("tab");
  useEffect(() => setPanel(null), [location.pathname, currentTab]);
  const resources = ["documents", "resources", "library", "media"].some((id) =>
    canOpenSection(id, access),
  );
  return (
    <div
      className={
        "staff-header-actions " +
        (compact ? "staff-header-actions--compact " : "") +
        className
      }
    >
      <NavDate />
      {canOpenSection("intern", access) && (
        <button
          className="staff-header-action"
          aria-label="Deschide mesaje"
          title="Mesaje"
          aria-haspopup="dialog"
          aria-expanded={panel === "chat"}
          onClick={(e) => {
            focusRef.current = e.currentTarget;
            setPanel((p) => (p === "chat" ? null : "chat"));
          }}
        >
          <MessagesSquare size={18} />
          <span>Chat</span>
        </button>
      )}
      {resources && (
        <button
          className="staff-header-action"
          aria-label="Resurse și template-uri"
          title="Resurse și template-uri"
          aria-haspopup="dialog"
          aria-expanded={panel === "resources"}
          onClick={(e) => {
            focusRef.current = e.currentTarget;
            setPanel((p) => (p === "resources" ? null : "resources"));
          }}
        >
          <BookOpen size={18} />
          <span>Resurse</span>
        </button>
      )}
      {canOpenSection("projects", access) && (
        <button
          className="staff-header-action"
          aria-label="Proiectele mele"
          title="Proiectele mele"
          aria-haspopup="dialog"
          aria-expanded={panel === "projects"}
          onClick={(e) => {
            focusRef.current = e.currentTarget;
            setPanel((p) => (p === "projects" ? null : "projects"));
          }}
        >
          <FolderKanban size={18} />
          <span>Proiectele mele</span>
        </button>
      )}
      {canOpenSection("maintenance", access) && (
        <Link
          className="staff-header-action"
          aria-label="Mentenanță · AVY Core"
          title="Mentenanță · AVY Core"
          to="/profil?tab=maintenance"
        >
          <Wrench size={18} />
          <span>Mentenanță</span>
        </Link>
      )}
      {panel && (
        <Suspense
          fallback={
            <p role="status" className="staff-panel-loading">
              Se deschide…
            </p>
          }
        >
          <Panels
            panel={panel}
            onClose={() => setPanel(null)}
            returnFocus={() => {
              if (focusRef.current?.isConnected) focusRef.current.focus();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
