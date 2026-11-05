import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Upload,
  Archive,
  RefreshCw,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { visualAssetsApi as api } from "@/lib/visualAssetsApi";
import {
  VISUAL_CATEGORIES,
  type VisualAsset,
  type VisualOptions,
  type VisualAssetInput,
} from "@/shared/visualAssets";
import { Field, Confirm } from "../clients/ClientFields";
import { useClientMutation } from "../clients/useClientMutation";
import "../clients/clientWorkspace.css";
const bytes = (n: number) =>
  n < 1024 * 1024
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / (1024 * 1024)).toFixed(1)} MB`;
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Operațiunea nu a reușit.";
const blank = () => ({
  title: "",
  category: "logo" as VisualAssetInput["category"],
  description: "",
  tags: [] as string[],
});
export default function MediaWorkspace() {
  const [scope, setScope] = useState<"agency" | "client">("agency"),
    [client, setClient] = useState(""),
    [project, setProject] = useState(""),
    [category, setCategory] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [offset, setOffset] = useState(0),
    [list, setList] = useState<Awaited<ReturnType<typeof api.list>> | null>(
      null,
    ),
    [options, setOptions] = useState<VisualOptions | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false),
    [selected, setSelected] = useState<VisualAsset | null>(null);
  const seq = useRef(0),
    alive = useRef(false);
  const load = useCallback(async () => {
    const request = ++seq.current;
    setLoading(true);
    try {
      const [data, context] = await Promise.all([
        api.list(
          new URLSearchParams({
            scope,
            client,
            project,
            category,
            q: search,
            archived: archived ? "1" : "0",
            offset: String(offset),
          }),
        ),
        api.options(),
      ]);
      if (alive.current && request === seq.current) {
        setList(data);
        setOptions(context);
        setError("");
      }
    } catch (e) {
      if (alive.current && request === seq.current) {
        setError(message(e));
        setList(null);
      }
    } finally {
      if (alive.current && request === seq.current) setLoading(false);
    }
  }, [scope, client, project, category, search, archived, offset]);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const clear = () => {
    setOffset(0);
    setList(null);
  };
  return (
    <div className="client-workspace space-y-4">
      <header className="os-workspace-header">
        <div>
          <p className="cw-eyebrow">Resurse vizuale esențiale</p>
          <h1>Media</h1>
          <p className="os-workspace-hint">
            Logouri, identitate și materiale importante pentru AVYRON și
            clienți.
          </p>
        </div>
        <div className="cw-actions">
          <Button
            variant="outline"
            disabled={loading}
            aria-label="Actualizează Media"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            disabled={
              !options?.storageReady ||
              (scope === "agency" && !options.canManageAgency)
            }
            onClick={() => setUploading(true)}
          >
            <Upload className="mr-2 size-4" />
            Încarcă resursă
          </Button>
        </div>
      </header>
      <nav className="cw-actions" aria-label="Biblioteci Media">
        <Button
          variant={scope === "agency" ? "default" : "outline"}
          aria-current={scope === "agency"}
          onClick={() => {
            setScope("agency");
            setClient("");
            setProject("");
            clear();
          }}
        >
          Resurse AVYRON
        </Button>
        <Button
          variant={scope === "client" ? "default" : "outline"}
          aria-current={scope === "client"}
          onClick={() => {
            setScope("client");
            clear();
          }}
        >
          Resurse clienți
        </Button>
      </nav>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Caută în Media">
          <input
            type="search"
            placeholder="Nume, fișier sau etichetă…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Categorie resursă">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">Toate categoriile</option>
            {Object.entries(VISUAL_CATEGORIES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {scope === "client" && (
          <>
            <Field label="Client Media">
              <select
                value={client}
                onChange={(e) => {
                  setClient(e.target.value);
                  setProject("");
                  clear();
                }}
              >
                <option value="">Toți clienții autorizați</option>
                {options?.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Proiect Media">
              <select
                value={project}
                onChange={(e) => {
                  setProject(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">Toate proiectele și resursele generale</option>
                {options?.projects
                  .filter((p) => !client || p.client_id === client)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
          </>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <p className="cw-muted">
          {list
            ? `${list.total} resurse ${archived ? "arhivate" : "în bibliotecă"}`
            : "Se încarcă…"}
        </p>
        <label className="cw-muted flex items-center gap-2">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => {
              setArchived(e.target.checked);
              clear();
            }}
          />
          Arhivă
        </label>
      </div>
      {options && !options.storageReady && (
        <p className="cw-error" role="status">
          Stocarea privată necesită verificare înainte de încărcare sau
          descărcare.
        </p>
      )}
      <details className="cw-card">
        <summary className="text-sm cursor-pointer flex items-center gap-2">
          <ShieldCheck className="size-4 text-violet-300" />
          Acces și protecția fișierelor
        </summary>
        <p className="cw-hint">
          Fișiere private, acces verificat la fiecare deschidere. Încărcările
          noi rămân în carantină: scannerul antimalware nu este configurat.
          Inspecția și descărcarea pentru revizuire sunt disponibile numai
          persoanelor autorizate. Resursele nu sunt publicate automat și nu sunt
          folosite de AI.
        </p>
      </details>
      {error && (
        <p className="cw-error" role="alert">
          {error}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reîncearcă
          </Button>
        </p>
      )}
      <section
        className="os-workspace-list"
        aria-label="Resurse vizuale"
        aria-busy={loading}
      >
        {list?.data.map((a) => (
          <article className="os-workspace-row" key={a.id}>
            <div className="flex items-start gap-3 min-w-0">
              <span className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
                <ImageIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white break-words">
                  {a.title}
                </h2>
                <p className="cw-muted break-all">
                  {a.file_name} · {bytes(a.size_bytes)} ·{" "}
                  {VISUAL_CATEGORIES[a.category]}
                </p>
                <p className="cw-meta">
                  {a.client_name || "AVYRON"}
                  {a.project_name && ` · ${a.project_name}`}
                </p>
                <div className="cw-meta">
                  <span className="cw-pill">
                    {a.scan_status === "quarantined"
                      ? "În carantină"
                      : a.scan_status === "clean"
                        ? "Scanat"
                        : "Respins"}
                  </span>
                  {a.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
              <FolderOpen className="mr-1 size-3.5" />
              Deschide resursa
            </Button>
          </article>
        ))}
        {loading && !list && <p className="cw-empty">Se încarcă resursele…</p>}
        {!loading && list && !list.total && (
          <p className="cw-empty">
            Nicio resursă pentru filtrele curente. Încarcă un logo sau un
            material esențial pentru biblioteca selectată.
          </p>
        )}
      </section>
      {list && (
        <div className="cw-pagination">
          <span>
            {list.total
              ? `${offset + 1}–${Math.min(offset + 36, list.total)} din ${list.total}`
              : "0 resurse"}
          </span>
          <div className="cw-actions">
            <Button
              size="sm"
              variant="outline"
              disabled={!offset || loading}
              onClick={() => setOffset((v) => Math.max(0, v - 36))}
            >
              Înapoi
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={offset + 36 >= list.total || loading}
              onClick={() => setOffset((v) => v + 36)}
            >
              Înainte
            </Button>
          </div>
        </div>
      )}
      <p className="cw-hint">
        Atașamentele existente rămân în proiectele lor.{" "}
        <Link className="text-violet-300 underline" to="/profil?tab=projects">
          Deschide proiectele și materialele existente
        </Link>
      </p>
      {uploading && options && (
        <UploadAsset
          options={options}
          scope={scope}
          clientId={client}
          projectId={project}
          onClose={() => setUploading(false)}
          onDone={() => {
            setUploading(false);
            setQuery("");
            setOffset(0);
            setArchived(false);
            void load();
          }}
        />
      )}
      {selected && (
        <AssetDetail
          key={selected.id}
          asset={selected}
          options={options}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
function AssetFields({
  value,
  onChange,
}: {
  value: ReturnType<typeof blank>;
  onChange: (v: ReturnType<typeof blank>) => void;
}) {
  const [tagText, setTagText] = useState(() => value.tags.join(", "));
  return (
    <>
      <Field label="Nume resursă">
        <input
          required
          maxLength={180}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>
      <Field label="Tip resursă">
        <select
          value={value.category}
          onChange={(e) =>
            onChange({
              ...value,
              category: e.target.value as VisualAssetInput["category"],
            })
          }
        >
          {Object.entries(VISUAL_CATEGORIES).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descriere">
        <textarea
          maxLength={2000}
          rows={3}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </Field>
      <Field label="Etichete, separate prin virgulă">
        <input
          value={tagText}
          onChange={(e) => {
            setTagText(e.target.value);
            onChange({
              ...value,
              tags: Array.from(
                new Set(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                ),
              ),
            });
          }}
        />
      </Field>
    </>
  );
}
function UploadAsset({
  options,
  scope,
  clientId,
  projectId,
  onClose,
  onDone,
}: {
  options: VisualOptions;
  scope: "agency" | "client";
  clientId: string;
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(blank),
    [client, setClient] = useState(clientId),
    [project, setProject] = useState(projectId),
    [file, setFile] = useState<File | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [projectWrite, setProjectWrite] = useState(false),
    [fingerprint, setFingerprint] = useState("");
  const { busy, error, run } = useClientMutation();
  useEffect(() => {
    let active = true;
    setProjectWrite(false);
    if (project && !options.canManageAgency)
      api
        .context(project)
        .then((p) => {
          if (active) setProjectWrite(p.write);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [project, options.canManageAgency]);
  const allowed =
    options.canManageAgency ||
    (scope === "client" && !!project && projectWrite);
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="client-workspace max-h-[92dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Încarcă resursă vizuală</DialogTitle>
          <DialogDescription>
            {scope === "agency"
              ? "Biblioteca AVYRON"
              : "Biblioteca unui client"}{" "}
            · PNG, JPG, WEBP, GIF, SVG sau PDF, maximum 15 MB. SVG: maximum 2
            MB. Fișierul rămâne în carantină.
          </DialogDescription>
        </DialogHeader>
        <form
          className="cw-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file || !allowed || !confirmed) return;
            if (file.size > 15 * 1024 * 1024) {
              toast.error("Fișierul depășește 15 MB.");
              return;
            }
            const value = {
              ...draft,
              scope,
              clientId: scope === "client" ? client : null,
              projectId: scope === "client" ? project || null : null,
            };
            void run(
              { value, fingerprint },
              (key) => api.upload(file, value, key),
              () => {
                toast.success("Resursa a fost încărcată privat, în carantină.");
                onDone();
              },
            );
          }}
        >
          {scope === "client" && (
            <div className="cw-grid">
              <Field label="Beneficiar resursă">
                <select
                  required
                  value={client}
                  onChange={(e) => {
                    setClient(e.target.value);
                    setProject("");
                    setConfirmed(false);
                  }}
                >
                  <option value="">Selectează clientul…</option>
                  {options.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Proiect asociat">
                <select
                  value={project}
                  onChange={(e) => {
                    setProject(e.target.value);
                    setConfirmed(false);
                  }}
                >
                  <option value="">Resursă generală a clientului</option>
                  {options.projects
                    .filter((p) => p.client_id === client)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
          )}
          <AssetFields
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setConfirmed(false);
            }}
          />
          <Field label="Fișier vizual">
            <input
              required
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setFingerprint(crypto.randomUUID());
                setConfirmed(false);
                if (f && !draft.title)
                  setDraft({ ...draft, title: f.name.replace(/\.[^.]+$/, "") });
              }}
            />
          </Field>
          {!allowed && (
            <p className="cw-hint">
              Pentru încărcare este necesar dreptul de editare asupra
              proiectului sau accesul administrativ al bibliotecii.
            </p>
          )}
          <Confirm checked={confirmed} onChange={setConfirmed}>
            Am verificat biblioteca, beneficiarul și drepturile de utilizare ale
            resursei. Înțeleg că încărcarea nu reprezintă scanare antimalware
            sau publicare.
          </Confirm>
          {error && (
            <p role="alert" className="cw-error">
              {error}
            </p>
          )}
          <div className="cw-actions">
            <Button
              type="submit"
              disabled={busy || !file || !confirmed || !allowed}
            >
              {busy ? "Se încarcă…" : "Încarcă în biblioteca privată"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Renunță
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function AssetDetail({
  asset,
  options,
  onClose,
  onChanged,
}: {
  asset: VisualAsset;
  options: VisualOptions | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState({
      ...blank(),
      title: asset.title,
      category: asset.category,
      description: asset.description,
      tags: asset.tags,
    }),
    [preview, setPreview] = useState(""),
    [backups, setBackups] = useState<Awaited<
      ReturnType<typeof api.backups>
    > | null>(null),
    [backupError, setBackupError] = useState("");
  const { busy, error, run } = useClientMutation(),
    urlRef = useRef(""),
    seq = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);
  const doPreview = async () => {
    const version = ++seq.current;
    try {
      const url = await api.content(asset, true);
      if (!mounted.current || version !== seq.current) {
        URL.revokeObjectURL(url);
        return;
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setPreview(url);
    } catch (e) {
      toast.error(message(e));
    }
  };
  const loadBackups = async () => {
    try {
      setBackups(await api.backups(asset.id));
      setBackupError("");
    } catch (e) {
      setBackupError(message(e));
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="client-workspace max-h-[92dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{asset.title}</DialogTitle>
          <DialogDescription>
            {asset.client_name || "AVYRON"} ·{" "}
            {asset.project_name || "Resursă generală"} ·{" "}
            {bytes(asset.size_bytes)}
          </DialogDescription>
        </DialogHeader>
        <div className="cw-stack">
          <p className="cw-hint">
            {asset.scan_status === "quarantined"
              ? "Fișier în carantină. Inspecția este limitată la încărcător și administratorii autorizați. Scanarea antimalware nu este configurată."
              : asset.scan_status === "clean"
                ? "Scanare înregistrată în sistem."
                : "Fișier respins."}
          </p>
          <div className="cw-actions">
            {(asset.scan_status === "clean" || asset.canInspect) && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      asset.scan_status !== "clean" &&
                      !window.confirm(
                        "Descarci un fișier în carantină pentru revizuire. Nu îl distribui înainte de verificare. Continui?",
                      )
                    )
                      return;
                    void run(
                      { download: asset.id },
                      () => api.download(asset),
                      () => {},
                    );
                  }}
                >
                  <Download className="mr-1 size-4" />
                  Descarcă pentru revizuire
                </Button>
                {/^image\/(png|jpeg|webp|gif)$/.test(asset.content_type) && (
                  <Button variant="outline" onClick={() => void doPreview()}>
                    Previzualizează imaginea
                  </Button>
                )}
              </>
            )}
            {asset.canEdit && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    { archive: !asset.archived_at },
                    () =>
                      api.save(asset, {
                        ...draft,
                        archived: !asset.archived_at,
                      }),
                    onChanged,
                  )
                }
              >
                <Archive className="mr-1 size-4" />
                {asset.archived_at
                  ? "Restaurează în bibliotecă"
                  : "Arhivează resursa"}
              </Button>
            )}
          </div>
          {preview && (
            <img
              src={preview}
              alt={asset.title}
              className="max-h-72 w-full rounded-xl border border-white/10 bg-white/5 object-contain p-4"
            />
          )}
          <form
            className="cw-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                draft,
                () =>
                  api.save(asset, { ...draft, archived: !!asset.archived_at }),
                () => {
                  toast.success("Detaliile resursei au fost actualizate.");
                  onChanged();
                },
              );
            }}
          >
            <fieldset disabled={!asset.canEdit || busy} className="cw-grid">
              <AssetFields value={draft} onChange={setDraft} />
            </fieldset>
            <p className="cw-hint break-all">
              Fișier: {asset.file_name}
              <br />
              SHA-256: {asset.sha256}
              <br />
              Versiune metadate: {asset.revision}. Fișierul original și
              beneficiarul rămân neschimbate.
            </p>
            {asset.canEdit && (
              <Button className="self-start" type="submit" disabled={busy}>
                Salvează detaliile resursei
              </Button>
            )}
          </form>
          {error && (
            <p className="cw-error" role="alert">
              {error}
            </p>
          )}
          {options?.canManageAgency && (
            <details
              className="cw-card"
              onToggle={(e) => {
                if (e.currentTarget.open) void loadBackups();
              }}
            >
              <summary className="cursor-pointer text-sm font-semibold">
                Backup și restaurare
              </summary>
              <p className="cw-hint">
                Copie privată separată, verificată prin checksum, creată la
                cerere. Restaurarea păstrează beneficiarul, accesul și starea de
                carantină.
              </p>
              <Button
                variant="outline"
                className="mt-2"
                disabled={busy || !backups?.configured}
                onClick={() =>
                  void run(
                    { backup: asset.id },
                    () => api.backup(asset.id),
                    async () => {
                      toast.success("Copia a fost verificată.");
                      await loadBackups();
                    },
                  )
                }
              >
                Creează backup verificat
              </Button>
              {backups && !backups.configured && (
                <p className="cw-hint">
                  Destinațiile private de backup necesită configurare și
                  verificare.
                </p>
              )}
              {backupError && (
                <p role="alert" className="cw-error">
                  {backupError}
                </p>
              )}
              {backups?.data.map((b) => (
                <div className="cw-account" key={b.id}>
                  <span className="cw-muted">
                    {new Date(b.created_at).toLocaleString("ro-RO")} ·{" "}
                    {bytes(b.size_bytes)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Restaurezi exact fișierul original din această copie verificată?",
                        )
                      )
                        void run(
                          { restore: b.id },
                          () => api.restore(asset.id, b.id),
                          () => {
                            toast.success(
                              "Fișier restaurat cu checksum verificat.",
                            );
                          },
                        );
                    }}
                  >
                    Restaurează fișierul
                  </Button>
                </div>
              ))}
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
