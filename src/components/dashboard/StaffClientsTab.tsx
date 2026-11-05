import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { clientWorkspaceApi as api } from "@/lib/clientWorkspaceApi";
import { CLIENT_ENTITY_TYPES } from "@/shared/clientWorkspace";
import { Field } from "./clients/ClientFields";
import { errorText, statusName } from "./clients/clientPresentation";
import "./clients/clientWorkspace.css";
const CreateClient = lazy(() => import("./clients/CreateClientDialog"));
const ClientFile = lazy(() => import("./clients/ClientFileDialog"));
export function StaffClientsTab() {
  const { isSuperAdmin, capabilities } = useAuth(),
    canRead = isSuperAdmin || capabilities.includes("clients.read"),
    canWrite = isSuperAdmin || capabilities.includes("clients.write");
  const [data, setData] = useState<Awaited<ReturnType<typeof api.list>> | null>(
      null,
    ),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [offset, setOffset] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const seq = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  const load = useCallback(async () => {
    if (!canRead) return;
    const version = ++seq.current;
    setLoading(true);
    try {
      const result = await api.list(
        new URLSearchParams({
          q: search,
          status,
          type,
          offset: String(offset),
        }),
      );
      if (alive.current && version === seq.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (alive.current && version === seq.current) {
        setError(errorText(e));
        setData(null);
      }
    } finally {
      if (alive.current && version === seq.current) setLoading(false);
    }
  }, [search, status, type, offset, canRead]);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);
  const changed = useCallback(() => {
    void load();
  }, [load]);
  if (!canRead)
    return (
      <p className="cw-empty">
        Nu ai permisiunea de a consulta registrul de clienți.
      </p>
    );
  return (
    <div className="client-workspace">
      <header className="cw-header">
        <div>
          <p className="cw-eyebrow">AVYRON OS · Relații comerciale</p>
          <h1>Clienți</h1>
          <p className="cw-hint">
            De la primul contact la proiecte, abonamente și documente.
          </p>
        </div>
        <div className="cw-actions">
          <Button
            variant="outline"
            aria-label="Reîmprospătează clienții"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" />
          </Button>
          {canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 size-4" />
              Adaugă client
            </Button>
          )}
        </div>
      </header>
      <div className="cw-metrics">
        {[
          ["Clienți", data?.metrics.clients],
          ["Proiecte", data?.metrics.projects],
          ["Abonamente active", data?.metrics.subscriptions],
        ].map(([label, count]) => (
          <div className="cw-metric" key={label}>
            <span>{label}</span>
            <strong>{count ?? "—"}</strong>
          </div>
        ))}
      </div>
      <div className="cw-filters">
        <Field label="Caută client">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nume, email, telefon sau cod fiscal…"
          />
        </Field>
        <Field label="Stare client">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">Toate stările</option>
            <option value="active">Activ</option>
            <option value="paused">În pauză</option>
            <option value="archived">Arhivat</option>
          </select>
        </Field>
        <Field label="Tip client">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">Toate tipurile</option>
            {CLIENT_ENTITY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && (
        <p role="alert" className="cw-error">
          {error}{" "}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reîncearcă
          </Button>
        </p>
      )}
      <section
        className="cw-list"
        aria-label="Registrul de clienți"
        aria-busy={loading}
      >
        {loading && !data && <p className="cw-empty">Se încarcă registrul…</p>}
        {data?.data.map((c) => (
          <article key={c.id} className="cw-row">
            <div>
              <h2>{c.company_name}</h2>
              <div className="cw-meta">
                <span className="cw-pill">
                  {c.entity_type || "Tip necompletat"}
                </span>
                <span>{statusName(c.status)}</span>
                {c.tax_id && <span>{c.tax_id}</span>}
              </div>
            </div>
            <div>
              <p className="cw-muted">
                {c.contact_name || "Contact necompletat"} · {c.email}
              </p>
              <div className="cw-meta">
                <span>{c.project_count} proiecte</span>
                <span>{c.active_subscription_count} abonamente active</span>
                <span>{c.account_count} conturi</span>
              </div>
            </div>
            <div className="cw-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(c.id)}
              >
                Deschide fișa clientului
                <span className="sr-only"> · {c.company_name}</span>
              </Button>
            </div>
          </article>
        ))}
        {!loading && data && !data.total && (
          <p className="cw-empty">
            Niciun client pentru filtrele curente. Ajustează căutarea sau adaugă
            un client.
          </p>
        )}
      </section>
      {data && (
        <div className="cw-pagination">
          <span>
            {data.total
              ? `${offset + 1}–${Math.min(offset + data.limit, data.total)} din ${data.total}`
              : "0 clienți"}
          </span>
          <div className="cw-actions">
            <Button
              size="sm"
              variant="outline"
              disabled={!offset || loading}
              onClick={() => setOffset((v) => Math.max(0, v - 50))}
            >
              Înapoi
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={offset + data.limit >= data.total || loading}
              onClick={() => setOffset((v) => v + 50)}
            >
              Înainte
            </Button>
          </div>
        </div>
      )}
      <Suspense fallback={<p className="cw-hint">Se deschide fișa…</p>}>
        {creating && (
          <CreateClient
            onClose={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false);
              setSelected(id);
              void load();
            }}
          />
        )}
        {selected && (
          <ClientFile
            key={selected}
            id={selected}
            onClose={() => setSelected(null)}
            onChanged={changed}
          />
        )}
      </Suspense>
    </div>
  );
}
