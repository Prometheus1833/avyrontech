import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectionsFor, type Access, type SectionId } from "@/lib/access";
import {
  DASHBOARD_GROUP_LABELS,
  DASHBOARD_SECTION_META,
} from "./dashboardNavigation";
export type OsNavigate = (
  section: SectionId,
  params?: Record<string, string>,
) => void;
const fold = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export default function OsWorkspaceDirectory({
  access,
  onNavigate,
}: {
  access: Access;
  onNavigate: OsNavigate;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("");
  const items = useMemo(
    () =>
      sectionsFor(access).filter(
        (s) =>
          ![
            "overview",
            "profile",
            "settings",
            "os-centers",
            "other-hub",
            "resources",
            "promotions",
          ].includes(s.id) && !(access.isStaff && s.id === "collection"),
      ),
    [access],
  );
  const filtered = items.filter(
    (s) =>
      (!group || s.group === group) &&
      fold(
        [
          DASHBOARD_SECTION_META[s.id].label,
          DASHBOARD_SECTION_META[s.id].hint,
          ...s.keywords,
        ].join(" "),
      ).includes(fold(query)),
  );
  return (
    <section className="space-y-4" aria-label="Fluxuri și destinații AVYRON OS">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_210px]">
        <label className="os-workspace-label">
          <span className="flex items-center gap-2">
            <Search className="size-3.5" />
            Caută un flux sau o secțiune
          </span>
          <input
            type="search"
            className="os-workspace-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Documente, clienți, facturare, surse…"
          />
        </label>
        <label className="os-workspace-label">
          Categorie
          <select
            className="os-workspace-input"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">Toate categoriile</option>
            {Array.from(new Set(items.map((s) => s.group))).map((g) => (
              <option key={g} value={g}>
                {DASHBOARD_GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="os-workspace-hint">
        {filtered.length} destinații disponibile. Fiecare acțiune deschide zona
        care gestionează datele și permisiunile respective.
      </p>
      <div className="os-workspace-list">
        {filtered.map((s) => {
          const meta = DASHBOARD_SECTION_META[s.id],
            Icon = meta.icon;
          return (
            <article className="os-workspace-row" key={s.id}>
              <div className="flex min-w-0 items-start gap-3">
                <Icon className="mt-1 size-4 shrink-0 text-violet-300" />
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <h3>{meta.label}</h3>
                  <p>{meta.hint}</p>
                </div>
              </div>
              <div className="os-workspace-controls min-w-0 max-w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-9 min-w-0 max-w-full whitespace-normal py-2 text-left"
                  onClick={() => onNavigate(s.id)}
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {s.id === "documents"
                      ? "Bibliotecă"
                      : `Deschide ${meta.label}`}
                  </span>
                  <ArrowUpRight className="ml-1 size-3" />
                </Button>
                {s.id === "documents" &&
                  (access.isSuperAdmin ||
                    access.capabilities.includes("documents.create")) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onNavigate("documents", { documentView: "generator" })
                      }
                    >
                      Generează document
                    </Button>
                  )}
                {s.id === "finance" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate("finance", { view: "receipts" })}
                  >
                    Încasări
                  </Button>
                )}
                {s.id === "avy-engine" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onNavigate("avy-engine", { engineView: "bindings" })
                    }
                  >
                    Fluxuri și legături
                  </Button>
                )}
              </div>
            </article>
          );
        })}
        {!filtered.length && (
          <p className="os-workspace-hint py-8 text-center">
            Nicio destinație pentru filtrele curente.
          </p>
        )}
      </div>
    </section>
  );
}
