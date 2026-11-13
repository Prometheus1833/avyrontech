import IconHint from "@/components/ui/icon-hint";
import ActivityBadge from "@/components/dashboard/ActivityBadge";
import { Suspense, useEffect, useId, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import Link from "./WorkspaceLink";
import { ArrowUpRight, MessagesSquare, BookOpen, FolderKanban, Wrench, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, canOpenSection } from "@/lib/access";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import type { QuickPanel } from "./StaffQuickPanels";
import NavDate from "./NavDate";
import "./staffHeader.css";
const Panels = lazyWithRetry(() => import("./StaffQuickPanels"));
const ChatInbox = lazyWithRetry(() => import("@/components/dashboard/StaffChatTab").then(module => ({ default: module.StaffChatTab })));
export default function StaffWorkspaceActions({
  className = "",
  compact = false,
  counts = {},
}: {
  className?: string;
  compact?: boolean;
  counts?: Record<string,number>;
}) {
  const { roles, isSuperAdmin, capabilities } = useAuth(),
    access = buildAccess({ roles, superadmin: isSuperAdmin, capabilities }),
    location = useLocation();
  const focusRef = useRef<HTMLElement | null>(null);
  const [panel, setPanel] = useState<QuickPanel>(null);
  const chatTitle = useId();
  const currentTab = new URLSearchParams(location.search).get("tab");
  useEffect(() => setPanel(null), [location.pathname, currentTab]);
  const resources = ["documents", "resources", "library", "media"].some((id) =>
    canOpenSection(id, access),
  );
  useEffect(() => {
    if (!compact) return;
    const media = matchMedia("(min-width: 1024px)");
    const reset = () => setPanel(null);
    media.addEventListener("change", reset);
    return () => media.removeEventListener("change", reset);
  }, [compact]);
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
        <Popover modal={false} open={compact && panel === "chat"} onOpenChange={open => { if (compact) setPanel(current => open ? "chat" : current === "chat" ? null : current); }}>
        <IconHint label="Conversații cu echipa și clienții proiectelor"><PopoverTrigger asChild><button
          className="staff-header-action"
          aria-label={`Deschide mesaje${counts.intern ? `, ${counts.intern} necitite` : ""}`}
          title="Mesaje"
          aria-haspopup="dialog"
          aria-expanded={panel === "chat"}
          onClick={compact ? undefined : (e) => {
            focusRef.current = e.currentTarget;
            setPanel((p) => (p === "chat" ? null : "chat"));
          }}
        >
          <span data-staff-action-icon className="relative inline-flex"><MessagesSquare size={18} /><ActivityBadge count={counts.intern} label="mesaje necitite" /></span>
          <span>Chat</span>
        </button></PopoverTrigger></IconHint>
        {compact && <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={8} aria-labelledby={chatTitle} className="dark staff-chat-inbox">
          <header className="staff-inbox-header">
            <h2 id={chatTitle}>Mesaje</h2>
            <Link to="/profil?tab=intern" onNavigate={() => setPanel(null)} aria-label="Deschide centrul de mesaje" title="Deschide centrul de mesaje" className="staff-inbox-icon"><ArrowUpRight size={17} aria-hidden="true" /></Link>
            <button type="button" aria-label="Închide conversațiile" className="staff-inbox-icon" onClick={() => setPanel(null)}><X size={18} aria-hidden="true" /></button>
          </header>
          <Suspense fallback={<p className="staff-inbox-loading" role="status">Se încarcă conversațiile…</p>}>
            <ChatInbox compact inbox />
          </Suspense>
        </PopoverContent>}
        </Popover>
      )}
      {resources && (
        <IconHint label="Documente, resurse și template-uri autorizate"><button
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
        </button></IconHint>
      )}
      {canOpenSection("projects", access) && (
        <IconHint label="Proiectele în care ești implicat sau alocat"><button
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
        </button></IconHint>
      )}
      {canOpenSection("client-maintenance", access) && (
        <IconHint label="Mentenanța și activitățile recurente alocate"><Link
          className="staff-header-action"
          aria-label="Mentenanță Clienți"
          title="Mentenanță Clienți"
          to="/profil?tab=client-maintenance"
        >
          <Wrench size={18} />
          <span>Mentenanță</span>
        </Link></IconHint>
      )}
      {panel && !(compact && panel === "chat") && (
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
