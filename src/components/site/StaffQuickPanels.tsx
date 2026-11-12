import {projectBudget,projectKindLabel,projectPeriod,projectStageLabel,type ProjectSummary} from "@/shared/projectSummary";
import { useEffect, useState } from "react";
import Link from "./WorkspaceLink";
import {
  ArrowUpRight,
  BookOpen,
  FolderKanban,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, canOpenSection } from "@/lib/access";
import { cfAuth } from "@/lib/cfAuth";
import { Button } from "@/components/ui/button";
import { StaffChatTab } from "@/components/dashboard/StaffChatTab";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export type QuickPanel = "chat" | "resources" | "projects" | null;
export default function StaffQuickPanels({
  panel,
  onClose,
  returnFocus,
}: {
  panel: QuickPanel;
  onClose: () => void;
  returnFocus?: () => void;
}) {
  const { roles, isSuperAdmin, capabilities, isStaff } = useAuth(),
    access = buildAccess({ roles, superadmin: isSuperAdmin, capabilities });
  if (!panel) return null;
  const permitted =
    panel === "chat"
      ? canOpenSection("intern", access)
      : panel === "projects"
        ? canOpenSection("projects", access)
        : ["documents", "resources", "library", "media"].some((id) =>
            canOpenSection(id, access),
          );
  return (
    <Dialog
      open={!!panel}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(e) => {
          if (returnFocus) {
            e.preventDefault();
            returnFocus();
          }
        }}
        className={
          "dark staff-quick-dialog " +
          (panel === "chat" ? "staff-quick-dialog--chat" : "")
        }
      >
        <DialogHeader>
          <DialogTitle>
            {panel === "chat"
              ? "Mesaje"
              : panel === "projects"
                ? "Proiectele mele"
                : "Resurse și template-uri"}
          </DialogTitle>
          <DialogDescription>
            {panel === "chat"
              ? "Conversațiile echipei și ale proiectelor la care ai acces."
              : panel === "projects"
                ? "Proiectele în care ești alocat, proprietar sau membru autorizat."
                : "Documente, modele și materiale disponibile pentru rolul tău."}
          </DialogDescription>
        </DialogHeader>
        {!permitted ? (
          <p role="alert">
            Accesul la această secțiune nu mai este disponibil.
          </p>
        ) : panel === "chat" ? (
          <>
            <StaffChatTab compact />
            <Link
              className="staff-panel-footer"
              onNavigate={onClose}
              to={"/profil?tab=intern" + (!isStaff ? "&chatMode=projects" : "")}
            >
              Deschide centrul de mesaje <ArrowUpRight size={14} />
            </Link>
          </>
        ) : panel === "projects" ? (
          <MyProjects onNavigate={onClose} />
        ) : (
          <div className="staff-resource-links">
            {[
              {
                id: "documents",
                label: "Bibliotecă Agenție",
                detail: "Documente centrale și fișiere autorizate",
                to: "/profil?tab=documents",
              },
              {
                id: "documents",
                label: "Tipizate",
                detail: "Modele reutilizabile pentru activitatea agenției",
                to: "/profil?tab=documents&documentView=templates",
              },
              {
                id: "documents",
                label: "Documente STAFF",
                detail: "Ghiduri și materiale pentru echipă",
                to: "/profil?tab=documents&documentView=staff",
              },
              {
                id: "library",
                label: "Biblioteca Artefacte",
                detail: "Referințe, efecte și integrări",
                to: "/profil?tab=library",
              },
              {
                id: "media",
                label: "Media",
                detail: "Identitate vizuală AVYRON și resursele clienților",
                to: "/profil?tab=media",
              },
            ]
              .filter((r) => canOpenSection(r.id, access))
              .map((r) => (
                <Link key={r.to} to={r.to} onNavigate={onClose}>
                  <BookOpen size={18} />
                  <span>
                    <strong>{r.label}</strong>
                    <small>{r.detail}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
type Project = ProjectSummary;
function MyProjects({ onNavigate }: { onNavigate: () => void }) {
  const [rows, setRows] = useState<Project[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    void cfAuth
      .request<{ data: Project[] }>("/api/projects?scope=mine", {
        signal: controller.signal,
      })
      .then((r) => {
        if (active) {
          setRows(r.data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setRows([]);
          setError((e as Error).message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [refresh]);
  const visible = rows.filter((r) =>
    r.name.toLocaleLowerCase("ro").includes(query.toLocaleLowerCase("ro")),
  );
  return (
    <div className="staff-project-panel">
      <label className="staff-project-search">
        <Search size={17} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Caută în proiectele mele"
          placeholder="Caută proiectul…"
        />
      </label>
      {loading && <p role="status">Se încarcă proiectele…</p>}
      {error && (
        <div role="alert">
          {error}
          <Button variant="outline" onClick={() => setRefresh((v) => v + 1)}>
            Reîncearcă
          </Button>
        </div>
      )}
      {!loading && !error && !visible.length && (
        <p className="staff-panel-empty">
          Nu există proiecte alocate pentru această căutare.
        </p>
      )}
      <div className="staff-resource-links">
        {visible.map((r) => (
          <Link
            key={r.id}
            to={"/intern/projects/" + encodeURIComponent(r.slug)}
            onNavigate={onNavigate}
          >
            <FolderKanban size={18} />
            <span>
              <strong>{r.name}</strong>
              <small>
                {projectKindLabel(r.kind)} · {projectStageLabel(r)} · <Users size={12} /> {r.member_count??0} membri staff
              </small>
              <small className="break-words">{r.client_name||"Fără client alocat"} · {projectBudget(r)}</small>
              <small>{projectPeriod(r)}</small><small className="break-words">{r.url||"Site necompletat"}{r.service_names?` · ${r.service_names}`:""}</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </div>
      <Link
        className="staff-panel-footer"
        to="/profil?tab=projects&scope=mine"
        onNavigate={onNavigate}
      >
        Deschide proiectele mele și pipeline-ul <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
