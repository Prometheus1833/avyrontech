import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { internApi, type ProjectKind } from "@/lib/internApi";
import { clientWorkspaceApi as api } from "@/lib/clientWorkspaceApi";
import type { ClientFile } from "@/shared/clientWorkspace";
import { Confirm, Field } from "./ClientFields";
import { statusName } from "./clientPresentation";
import { useClientMutation } from "./useClientMutation";
export default function ClientProjects({
  file,
  onChanged,
}: {
  file: ClientFile;
  onChanged: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"none" | "new" | "existing">("none"),
    [name, setName] = useState(""),
    [kind, setKind] = useState<ProjectKind>("website_prezentare"),
    [description, setDescription] = useState(""),
    [url, setUrl] = useState(""),
    [ids, setIds] = useState<string[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [slug, setSlug] = useState(() => `proiect-${crypto.randomUUID()}`),
    [query, setQuery] = useState("");
  const { run, busy, error } = useClientMutation();
  const done = async () => {
    setMode("none");
    setName("");
    setDescription("");
    setUrl("");
    setIds([]);
    setSlug(`proiect-${crypto.randomUUID()}`);
    toast.success(
      "Proiectele sunt sincronizate cu fișa și portalul clientului.",
    );
    await onChanged();
    window.dispatchEvent(new Event("avyron:projects-changed"));
  };
  return (
    <div className="cw-stack">
      <div className="cw-section-title">
        <h2>Proiectele clientului · {file.projects.length}</h2>
        {file.permissions.manageProjects && (
          <div className="cw-actions">
            <Button
              onClick={() => {
                setMode("new");
                setConfirmed(false);
              }}
            >
              Adaugă proiect nou
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setMode("existing");
                setConfirmed(false);
              }}
            >
              Alocă proiecte existente
            </Button>
          </div>
        )}
      </div>
      <div className="cw-grid">
        {file.projects.map((p) => (
          <article className="cw-card" key={p.id}>
            <h3>{p.name}</h3>
            <div className="cw-meta">
              <span className="cw-pill">{statusName(p.status)}</span>
              <span>{p.kind}</span>
            </div>
            <Link
              className="mt-3 inline-flex min-h-10 items-center text-sm text-violet-300 underline"
              to={`/intern/projects/${encodeURIComponent(p.slug)}`}
            >
              Deschide proiectul
            </Link>
          </article>
        ))}
      </div>
      {!file.projects.length && (
        <p className="cw-empty">
          Adaugă primul proiect sau alocă un proiect disponibil.
        </p>
      )}
      {mode !== "none" && (
        <form
          className="cw-card cw-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirmed) return;
            if (mode === "new") {
              const body = {
                name,
                slug,
                kind,
                description,
                url,
                client_id: file.client.id,
                organization_id: file.organizationId || undefined,
              };
              void run(body, (k) => internApi.createProject(body, k), done);
            } else {
              const projects = file.availableProjects.filter((p) =>
                ids.includes(p.id),
              );
              void run(
                projects,
                (k) => api.projects(file.client.id, projects, k),
                done,
              );
            }
          }}
        >
          <h3>
            {mode === "new"
              ? "Proiect nou pentru acest client"
              : "Selectează proiectele"}
          </h3>
          {mode === "new" ? (
            <>
              <div className="cw-grid">
                <Field label="Nume proiect">
                  <input
                    required
                    maxLength={180}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Tip proiect">
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ProjectKind)}
                  >
                    <option value="website_prezentare">
                      Website de prezentare
                    </option>
                    <option value="magazin_online">Magazin online</option>
                    <option value="aplicatie">Aplicație web / mobilă</option>
                    <option value="retele_sociale">Social media</option>
                    <option value="identitate_completa">
                      Identitate completă
                    </option>
                    <option value="prezentare_premium">
                      Prezentare premium
                    </option>
                    <option value="external_asset">
                      Proiect / produs extern
                    </option>
                  </select>
                </Field>
                <Field label="URL proiect, dacă există">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </Field>
                <Field label="Descriere">
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
              </div>
              <p className="cw-hint">
                Beneficiar: {file.client.company_name}. Abonamentele și echipa
                pot fi configurate după creare.
              </p>
            </>
          ) : (
            <>
              <Field label="Caută proiect">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Field>
              <div className="cw-picker">
                {file.availableProjects
                  .filter(
                    (p) =>
                      p.client_id !== file.client.id &&
                      `${p.name} ${p.company_name}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        disabled={!p.canAssign}
                        checked={ids.includes(p.id)}
                        onChange={(e) => {
                          setConfirmed(false);
                          setIds((v) =>
                            e.target.checked
                              ? [...v, p.id]
                              : v.filter((id) => id !== p.id),
                          );
                        }}
                      />
                      <span>
                        <strong>{p.name}</strong>
                        <span className="block cw-muted">
                          {p.company_name} · {statusName(p.status)}
                        </span>
                        {!p.canAssign && (
                          <span className="block cw-hint">
                            {p.assignmentReason}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
              </div>
              <p className="cw-hint">
                Pot fi realocate doar proiecte fără proprietar, organizație sau
                istoric al altui beneficiar. Datele existente nu sunt
                transferate automat.
              </p>
            </>
          )}
          <Confirm checked={confirmed} onChange={setConfirmed}>
            Confirm beneficiarul și acord acces conturilor autorizate pentru{" "}
            {file.client.company_name}.
          </Confirm>
          {error && (
            <p role="alert" className="cw-error">
              {error}
            </p>
          )}
          <div className="cw-actions">
            <Button
              type="submit"
              disabled={
                busy || !confirmed || (mode === "existing" && !ids.length)
              }
            >
              {busy
                ? "Se salvează…"
                : mode === "new"
                  ? "Creează proiectul"
                  : `Alocă proiectele (${ids.length})`}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setMode("none")}
            >
              Renunță
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
