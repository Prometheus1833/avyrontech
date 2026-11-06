import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clientWorkspaceApi as api } from "@/lib/clientWorkspaceApi";
import type { ClientFile, ClientIdentity } from "@/shared/clientWorkspace";
import { IdentityFields, Field } from "./ClientFields";
import { identityOf, date, errorText, statusName } from "./clientPresentation";
import { useClientMutation } from "./useClientMutation";
const Accounts = lazy(() => import("./ClientAccounts"));
const Projects = lazy(() => import("./ClientProjects"));
const Payments = lazy(() => import("./ClientPayments"));
const Subscriptions = lazy(
  () => import("../subscriptions/ClientSubscriptionsPanel"),
);
const DocumentCenter = lazy(
  () => import("@/features/documents/DocumentCenter"),
);
const tabs = [
  ["overview", "Prezentare"],
  ["identity", "Date client"],
  ["accounts", "Conturi"],
  ["projects", "Proiecte"],
  ["subscriptions", "Abonamente"],
  ["payments", "Plăți"],
  ["documents", "Documentele clientului"],
] as const;
type Tab = (typeof tabs)[number][0];
export default function ClientFileDialog({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [documentSubscription, setDocumentSubscription] = useState("");
  const [file, setFile] = useState<ClientFile | null>(null),
    [tab, setTab] = useState<Tab>("overview"),
    [loadError, setLoadError] = useState(""),
    [identity, setIdentity] = useState<ClientIdentity | null>(null),
    [project, setProject] = useState(""),
    [loading, setLoading] = useState(true);
  const seq = useRef(0),
    alive = useRef(true),
    { busy, error, run } = useClientMutation();
  const load = useCallback(async () => {
    const version = ++seq.current;
    setLoading(true);
    try {
      const data = await api.get(id);
      if (alive.current && version === seq.current) {
        setFile(data);
        setIdentity(identityOf(data.client));
        setLoadError("");
      }
    } catch (e) {
      if (alive.current && version === seq.current) {
        setLoadError(errorText(e));
        setFile(null);
        setIdentity(null);
      }
    } finally {
      if (alive.current && version === seq.current) setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);
  const changed = useCallback(async () => {
    await load();
    onChanged();
  }, [load, onChanged]);
  const dirty =
    !!file &&
    !!identity &&
    JSON.stringify(identity) !== JSON.stringify(identityOf(file.client));
  const close = () => {
    if (busy) return;
    if (
      dirty &&
      !window.confirm(
        "Ai modificări nesalvate în datele clientului. Închizi fișa fără salvare?",
      )
    )
      return;
    onClose();
  };
  const switchTab = (value: Tab) => {
    if (
      dirty &&
      value !== "identity" &&
      !window.confirm("Continui fără să salvezi datele clientului?")
    )
      return;
    if (dirty && value !== "identity" && file)
      setIdentity(identityOf(file.client));
    if (value === "documents") setDocumentSubscription("");
    setTab(value);
  };
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent
        className="cw-dialog client-workspace"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          close();
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <header>
          <DialogHeader>
            <p className="cw-eyebrow">Fișa clientului</p>
            <DialogTitle className="break-words pr-2 text-xl">
              {file?.client.company_name || "Se încarcă clientul…"}
            </DialogTitle>
            <DialogDescription className="cw-hint">
              {file
                ? `${file.client.entity_type || "Tip necompletat"} · ${file.client.email} · ${statusName(file.client.status)}`
                : "Identitate, acces și activitate sincronizate în AVYRON OS."}
            </DialogDescription>
          </DialogHeader>
        </header>
        <nav className="cw-tabs" aria-label="Secțiunile fișei clientului">
          {tabs
            .filter(
              ([key]) =>
                !file || key !== "payments" || file.permissions.finance,
            )
            .filter(
              ([key]) =>
                !file || key !== "documents" || file.permissions.documents,
            )
            .map(([key, label]) => (
              <button
                key={key}
                aria-current={tab === key}
                type="button"
                onClick={() => switchTab(key)}
              >
                {label}
              </button>
            ))}
        </nav>
        <div className="cw-body">
          <div aria-live="polite">
            {loading && <p className="cw-hint">Se actualizează fișa…</p>}
            {loadError && (
              <div role="alert" className="cw-error">
                {loadError}
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Reîncearcă încărcarea
                </Button>
              </div>
            )}
          </div>
          {file && (
            <Suspense
              fallback={<p className="cw-hint">Se încarcă secțiunea…</p>}
            >
              {tab === "overview" && (
                <div className="cw-stack">
                  <div className="cw-metrics">
                    {[
                      ["Proiecte", file.projects.length],
                      [
                        "Abonamente active",
                        file.subscriptions.filter((s) => s.status === "active")
                          .length,
                      ],
                      ["Conturi asociate", file.accounts.length],
                    ].map(([label, count]) => (
                      <div className="cw-metric" key={label}>
                        <span>{label}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="cw-grid">
                    <section className="cw-card">
                      <h3>Identitate și contact</h3>
                      <p className="mt-2 text-sm">
                        {file.client.legal_name || file.client.company_name}
                      </p>
                      <p className="cw-hint">
                        {file.client.entity_type || "Tip necompletat"}{" "}
                        {file.client.tax_id && `· ${file.client.tax_id}`}
                        <br />
                        {file.client.contact_name ||
                          "Persoană de contact necompletată"}
                        <br />
                        {file.client.email}
                        {file.client.phone && ` · ${file.client.phone}`}
                        <br />
                        {file.client.address || "Adresă fiscală necompletată"}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setTab("identity")}
                      >
                        Datele clientului
                      </Button>
                    </section>
                    <section className="cw-card">
                      <h3>Activitate și acces</h3>
                      <p className="cw-hint">
                        Client din {date(file.client.created_at)}
                        <br />
                        Ultima actualizare: {date(file.client.updated_at)}
                        <br />
                        {
                          file.accounts.filter((a) => a.must_change_password)
                            .length
                        }{" "}
                        conturi cu schimbare de parolă obligatorie
                      </p>
                      <div className="cw-actions mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTab("projects")}
                        >
                          Vezi proiectele
                        </Button>
                        {file.permissions.documents && (
                          <Button size="sm" onClick={() => setTab("documents")}>
                            Documentele clientului
                          </Button>
                        )}
                      </div>
                    </section>
                  </div>
                  <section className="cw-card">
                    <h3>Abonamente și următoarele facturări</h3>
                    {file.subscriptions.slice(0, 5).map((s) => (
                      <div key={s.id} className="cw-account">
                        <span className="min-w-0">
                          <strong className="block text-sm">
                            {s.service_name}
                          </strong>
                          <span className="cw-muted">
                            {s.project_name} · {s.plan_sku || "Personalizat"}
                          </span>
                        </span>
                        <span className="cw-muted">
                          {statusName(s.status)} · {date(s.next_billing_date)}
                        </span>
                      </div>
                    ))}
                    {!file.subscriptions.length && (
                      <p className="cw-hint">Niciun abonament alocat încă.</p>
                    )}
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      onClick={() => setTab("subscriptions")}
                    >
                      Gestionează abonamentele
                    </Button>
                  </section>
                </div>
              )}
              {tab === "identity" && identity && (
                <form
                  className="cw-stack cw-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      { id, identity, revision: file.client.revision },
                      (k) => api.save(id, identity, file.client.revision, k),
                      async () => {
                        toast.success("Datele clientului au fost salvate.");
                        await changed();
                      },
                    );
                  }}
                >
                  <div className="cw-section-title">
                    <h2>Date comerciale și fiscale</h2>
                    <span className="cw-muted">
                      Versiunea {file.client.revision}
                    </span>
                  </div>
                  <IdentityFields
                    value={identity}
                    onChange={setIdentity}
                    disabled={!file.permissions.edit || busy}
                  />
                  <p className="cw-hint">
                    Aceleași date sunt folosite de generatorul de documente și
                    pot precompleta datele de facturare. Emailul de contact nu
                    schimbă emailul de autentificare.
                  </p>
                  {error && (
                    <div role="alert" className="cw-error">
                      {error}
                      <p>
                        La un conflict, verifică modificările recente înainte de
                        a încerca din nou.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Reîncarci datele curente și renunți la modificările nesalvate?",
                            )
                          )
                            void load();
                        }}
                      >
                        Reîncarcă datele
                      </Button>
                    </div>
                  )}
                  {file.permissions.edit && (
                    <Button
                      type="submit"
                      className="self-start"
                      disabled={busy || !dirty}
                    >
                      {busy ? "Se salvează…" : "Salvează datele clientului"}
                    </Button>
                  )}
                </form>
              )}
              {tab === "accounts" && (
                <Accounts
                  key={`${id}-${file.accounts.map((a) => `${a.id}:${a.must_change_password}`).join()}`}
                  file={file}
                  onChanged={changed}
                />
              )}
              {tab === "projects" && (
                <Projects file={file} onChanged={changed} />
              )}
              {tab === "subscriptions" &&
                (file.permissions.manageSubscriptions ? (
                  <Subscriptions
                    clientId={id}
                    onDocuments={(subscriptionId) => {
                      setDocumentSubscription(subscriptionId);
                      setProject("");
                      setTab("documents");
                    }}
                    onChanged={() => void changed()}
                  />
                ) : (
                  <section className="cw-card">
                    <h2>Abonamente</h2>
                    {file.subscriptions.map((s) => (
                      <div key={s.id} className="cw-account">
                        <strong>{s.service_name}</strong>
                        <span>
                          {statusName(s.status)} · {date(s.next_billing_date)}
                        </span>
                      </div>
                    ))}
                    {!file.subscriptions.length && (
                      <p className="cw-empty">Nu există abonamente alocate.</p>
                    )}
                  </section>
                ))}
              {tab === "payments" && <Payments file={file} />}
              {tab === "documents" && file.permissions.documents && (
                <section className="cw-documents cw-stack">
                  <div className="cw-section-title">
                    <div>
                      <h2>Documentele clientului</h2>
                      <p className="cw-hint">
                        Documentele asociate acestui beneficiar, cu acces
                        verificat la fiecare operațiune.
                      </p>
                    </div>
                    <Field label="Organizare pe proiect">
                      <select
                        value={project}
                        onChange={(e) => {
                          setProject(e.target.value);
                          setDocumentSubscription("");
                        }}
                      >
                        <option value="">
                          Toate proiectele și documentele independente
                        </option>
                        {file.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {documentSubscription && (
                    <div className="cw-actions">
                      <span className="cw-muted">
                        Documente abonament:{" "}
                        {file.subscriptions.find(
                          (s) => s.id === documentSubscription,
                        )?.service_name || documentSubscription}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDocumentSubscription("")}
                      >
                        Toate documentele clientului
                      </Button>
                    </div>
                  )}
                  <DocumentCenter
                    key={`${id}-${project}-${documentSubscription}`}
                    embedded
                    clientId={id}
                    projectId={project || undefined}
                    subscriptionId={documentSubscription || undefined}
                  />
                </section>
              )}
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
