import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MessageCircle,
  Handshake,
  FileText,
  Download,
  Archive,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  collaboratorsApi as api,
  type CollaborationDetail,
  type CollaborationOptions,
} from "@/lib/collaboratorsApi";
import {
  COLLABORATOR_CATEGORIES as categories,
  COLLABORATOR_STATUSES as statuses,
  COLLABORATOR_LIMITS,
  blankCollaborator,
  collaboratorInput,
  collaboratorContactLinks,
  collaboratorWebsiteLink,
  type Collaborator,
  type CollaboratorInput,
} from "@/shared/collaborators";
const panel = "rounded-2xl border border-white/10 bg-white/[0.025] p-4";
const inputClass =
  "mt-1 min-h-10 w-full rounded-xl border border-white/15 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-70";
const errorText = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Operațiunea nu a putut fi finalizată. Reîncearcă.";
function ContactActions({
  item,
}: {
  item: Pick<CollaboratorInput, "phone" | "email" | "whatsapp">;
}) {
  const links = collaboratorContactLinks(item);
  return (
    <div className="flex flex-wrap gap-2" aria-label="Contact colaborator">
      {[
        [links.call, "Apel", Phone],
        [links.whatsapp, "WhatsApp", MessageCircle],
        [links.email, "E-mail", Mail],
      ].map(([href, label, Icon]) => {
        const I = Icon as typeof Phone;
        return href ? (
          <a
            key={String(label)}
            href={String(href)}
            {...(String(href).startsWith("https:")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs text-slate-200 hover:bg-white/5"
          >
            <I className="size-4" />
            {String(label)}
          </a>
        ) : (
          <span
            key={String(label)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-400"
            aria-disabled="true"
          >
            <I className="size-4" />
            {String(label)}
          </span>
        );
      })}
    </div>
  );
}
export default function CollaboratorsTab({
  portal = false,
}: {
  portal?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [archived, setArchived] = useState(false),
    [offset, setOffset] = useState(0),
    [data, setData] = useState<Collaborator[]>([]),
    [total, setTotal] = useState(0),
    [manage, setManage] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string | null | undefined>(undefined),
    [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .list(
          new URLSearchParams({
            q: query,
            category,
            status,
            archived: String(archived),
            offset: String(offset),
          }),
          portal,
          controller.signal,
        )
        .then((r) => {
          if (!controller.signal.aborted) {
            setData(r.data);
            setTotal(r.total ?? r.data.length);
            setManage(r.canManage === true);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorText(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, status, archived, offset, tick, portal]);
  const setFilter = (set: (v: string) => void, v: string) => {
    set(v);
    setOffset(0);
  };
  return (
    <div className="min-w-0 space-y-4 text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-violet-300">
            {portal ? "Contul meu" : "Principal · relații profesionale"}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Handshake className="size-6 text-violet-300" />
            {portal ? "Colaborările mele" : "Colaboratori/Parteneri"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {portal
              ? "Detaliile și documentele colaborărilor tale cu AVYRON."
              : "Fișe profesionale, contacte și documente, cu sau fără cont asociat."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Secțiune distinctă de abonamentele de produse AVY Partener.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            aria-label="Actualizează colaborările"
          >
            <RefreshCw className="size-4" />
          </Button>
          {manage && !portal && (
            <Button onClick={() => setSelected(null)}>
              <Plus className="mr-2 size-4" />
              Adaugă colaborator
            </Button>
          )}
        </div>
      </header>
      {!portal && (
        <section className={panel} aria-label="Filtre colaboratori">
          <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_180px_170px_auto]">
            <label className="text-xs text-slate-300">
              <span className="inline-flex gap-1">
                <Search className="size-3.5" />
                Caută colaborator
              </span>
              <input
                className={inputClass}
                type="search"
                placeholder="Nume, cod, contact sau specializare"
                value={query}
                onChange={(e) => setFilter(setQuery, e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-300">
              Domeniu
              <select
                className={inputClass}
                value={category}
                onChange={(e) => setFilter(setCategory, e.target.value)}
              >
                <option value="">Toate domeniile</option>
                {Object.entries(categories).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Stare
              <select
                className={inputClass}
                value={status}
                onChange={(e) => setFilter(setStatus, e.target.value)}
              >
                <option value="">Toate stările</option>
                {Object.entries(statuses).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-10 items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => {
                  setArchived(e.target.checked);
                  setOffset(0);
                }}
              />
              Arhivă
            </label>
          </div>
        </section>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 p-4 text-sm text-rose-100"
        >
          {error}
          <Button variant="outline" className="ml-3" onClick={refresh}>
            Reîncearcă
          </Button>
        </div>
      )}
      {loading ? (
        <p role="status" className={panel}>
          Se încarcă fișele…
        </p>
      ) : !error && !data.length ? (
        <div className={panel}>
          <p className="font-medium">
            {portal
              ? "Nu ai colaborări asociate contului."
              : "Nicio fișă pentru această selecție."}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {portal
              ? "Asocierea este făcută explicit de echipa AVYRON."
              : "Poți adăuga un contact informativ; contul și clientul sunt opționale."}
          </p>
        </div>
      ) : null}
      {!loading && !error && (
        <>
          <p className="text-xs text-slate-400">
            {total} {total === 1 ? "fișă" : "fișe"} · maximum 3 documente active
            × 5 MB pentru fiecare colaborare
          </p>
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.map((item) => (
              <article key={item.id} className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-violet-200">
                    {item.code}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-200">
                    {statuses[item.status]}
                  </span>
                </div>
                <h2 className="mt-3 break-words text-lg font-semibold">
                  {item.name}
                </h2>
                <p className="mt-1 text-xs text-violet-200">
                  {categories[item.category]} ·{" "}
                  {item.relationship === "partner"
                    ? "Parteneriat"
                    : "Colaborare"}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                  {item.specialization ||
                    item.summary ||
                    "Detaliile colaborării se completează în fișă."}
                </p>
                {item.contactName && (
                  <p className="mt-2 break-words text-xs text-slate-400">
                    Contact: {item.contactName}
                  </p>
                )}
                <div className="mt-3">
                  <ContactActions item={item} />
                </div>
                <Button
                  variant="outline"
                  className="mt-3 min-h-10 w-full whitespace-normal"
                  onClick={() => setSelected(item.id)}
                >
                  Deschide fișa colaboratorului
                </Button>
              </article>
            ))}
          </div>
          {!portal && total > 24 && (
            <nav
              className="flex items-center gap-3"
              aria-label="Paginare colaboratori"
            >
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset((n) => Math.max(0, n - 24))}
              >
                Înapoi
              </Button>
              <span className="text-xs">
                {offset + 1}–{Math.min(offset + 24, total)} din {total}
              </span>
              <Button
                variant="outline"
                disabled={offset + 24 >= total}
                onClick={() => setOffset((n) => n + 24)}
              >
                Mai multe
              </Button>
            </nav>
          )}
        </>
      )}
      {selected !== undefined && (
        <CollaboratorSheet
          key={selected || "new"}
          id={selected}
          onClose={() => setSelected(undefined)}
          onChanged={refresh}
          onCreated={(id) => {
            setSelected(id);
            refresh();
          }}
        />
      )}
    </div>
  );
}
const toInput = (c: Collaborator): CollaboratorInput =>
  ({
    ...blankCollaborator(),
    ...Object.fromEntries(
      Object.keys(blankCollaborator()).map((k) => [
        k,
        c[k as keyof Collaborator] ??
          blankCollaborator()[k as keyof CollaboratorInput],
      ]),
    ),
  }) as CollaboratorInput;
function CollaboratorSheet({
  id,
  onClose,
  onChanged,
  onCreated,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onCreated: (id: string) => void;
}) {
  const { refreshProfile } = useAuth();
  const [detail, setDetail] = useState<CollaborationDetail | null>(null),
    [draft, setDraft] = useState<CollaboratorInput>(blankCollaborator),
    [tab, setTab] = useState("identity"),
    [loading, setLoading] = useState(!!id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [archive, setArchive] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [lookup, setLookup] = useState(""),
    [options, setOptions] = useState<CollaborationOptions>({
      clients: [],
      accounts: [],
    }),
    [lookupError, setLookupError] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [visible, setVisible] = useState(false);
  const createKey = useRef(crypto.randomUUID()),
    fileKey = useRef(crypto.randomUUID()),
    pending = useRef(false),
    fileRef = useRef<HTMLInputElement>(null),
    mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await api.detail(id);
      if (mounted.current) {
        setDetail(r);
        setDraft(toInput(r.collaborator));
        setArchive(!!r.collaborator.archivedAt);
        setDirty(false);
        setConfirmed(false);
        setError("");
      }
    } catch (e) {
      if (mounted.current) setError(errorText(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const manage = id ? detail?.collaborator.canManage === true : true;
  useEffect(() => {
    if (!manage || lookup.trim().length < 3) {
      setOptions({ clients: [], accounts: [] });
      return;
    }
    const controller = new AbortController(),
      timer = setTimeout(() => {
        setLookupError("");
        void api
          .options(lookup.trim(), draft.clientId, controller.signal)
          .then((r) => {
            if (!controller.signal.aborted) setOptions(r);
          })
          .catch((e) => {
            if (!controller.signal.aborted) setLookupError(errorText(e));
          });
      }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [lookup, draft.clientId, manage]);
  const change = <K extends keyof CollaboratorInput>(
    key: K,
    value: CollaboratorInput[K],
  ) => {
    setDraft((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key === "accountUserId") setConfirmed(false);
  };
  const close = () => {
    if (busy) return;
    if (
      dirty &&
      !window.confirm("Închizi fișa și renunți la modificările nesalvate?")
    )
      return;
    onClose();
  };
  const action = async (
    fn: () => Promise<unknown>,
    after?: () => void | Promise<void>,
  ) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
      if (after) await after();
    } catch (e) {
      if (mounted.current) setError(errorText(e));
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const accountChanged =
    draft.accountUserId !== (detail?.collaborator.accountUserId ?? null);
  const save = () => {
    const parsed = collaboratorInput.safeParse(draft);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message || "Completează datele necesare.",
      );
      return;
    }
    void action(async () => {
      const r = await api.save(
        id,
        parsed.data,
        detail?.collaborator.revision,
        archive,
        confirmed,
        createKey.current,
      );
      await refreshProfile();
      onChanged();
      if (!id && r.id) onCreated(r.id);
      else await load();
      toast.success("Fișa colaboratorului a fost salvată.");
    });
  };
  const field = (
    key: keyof CollaboratorInput,
    label: string,
    opts: { multiline?: boolean; type?: string; hint?: string } = {},
  ) => (
    <label
      className={`block text-xs text-slate-300 ${opts.multiline ? "sm:col-span-2" : ""}`}
      key={key}
    >
      {label}
      {opts.multiline ? (
        <textarea
          aria-label={label}
          rows={key === "terms" ? 5 : 3}
          className={inputClass}
          disabled={!manage || busy}
          value={String(draft[key] ?? "")}
          onChange={(e) => change(key, e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          type={opts.type || "text"}
          className={inputClass}
          disabled={!manage || busy}
          value={String(draft[key] ?? "")}
          maxLength={
            key === "name" || key === "contactName"
              ? 180
              : key === "email"
                ? 254
                : key === "specialization"
                  ? 240
                  : 500
          }
          onChange={(e) => change(key, e.target.value)}
        />
      )}{" "}
      {opts.hint && (
        <span className="mt-1 block leading-relaxed text-slate-400">
          {opts.hint}
        </span>
      )}
    </label>
  );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent className="dark flex w-full flex-col overflow-hidden border-white/10 bg-[#080d1b] p-0 text-slate-100 sm:max-w-3xl">
        <SheetHeader className="border-b border-white/10 p-4 pr-12">
          <SheetTitle className="break-words text-white">
            {id
              ? detail?.collaborator.name || "Fișa colaboratorului"
              : "Adaugă colaborator"}
          </SheetTitle>
          <SheetDescription className="text-slate-300">
            {detail?.collaborator.code || "Codul intern este generat automat."}{" "}
            ·{" "}
            {id
              ? "Detalii și documente ale colaborării."
              : "Contul și fișa CRM sunt opționale."}
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <p role="status" className="p-4">
            Se încarcă fișa…
          </p>
        ) : (
          <>
            <nav
              className="flex flex-wrap gap-2 border-b border-white/10 p-3"
              aria-label="Zone fișă colaborator"
            >
              {[
                ["identity", "Fișă"],
                ["collaboration", "Colaborare"],
                ...(id
                  ? [
                      [
                        "documents",
                        `Documente (${detail?.collaborator.fileCount || 0}/3)`,
                      ],
                    ]
                  : []),
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => setTab(key)}
                  className={`min-h-10 rounded-xl px-3 text-sm ${tab === key ? "bg-violet-600 text-white" : "border border-white/15 text-slate-200 hover:bg-white/5"}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
              aria-busy={busy}
            >
              {busy && (
                <p role="status" className="text-sm text-violet-200">
                  Se procesează operațiunea…
                </p>
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/30 p-3 text-sm text-rose-100"
                >
                  {error}
                  {id && (
                    <Button
                      variant="outline"
                      className="mt-2"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !dirty ||
                          window.confirm(
                            "Reîncarci și renunți la modificările nesalvate?",
                          )
                        )
                          void load();
                      }}
                    >
                      Reîncarcă fișa
                    </Button>
                  )}
                </div>
              )}
              {tab === "identity" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {field("name", "Nume / denumire *")}
                    {field("contactName", "Persoană de contact")}
                    <label className="text-xs">
                      Domeniu
                      <select
                        className={inputClass}
                        disabled={!manage || busy}
                        aria-label="Domeniu"
                        value={draft.category}
                        onChange={(e) =>
                          change(
                            "category",
                            e.target.value as CollaboratorInput["category"],
                          )
                        }
                      >
                        {Object.entries(categories).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs">
                      Relație
                      <select
                        className={inputClass}
                        disabled={!manage || busy}
                        aria-label="Relație"
                        value={draft.relationship}
                        onChange={(e) =>
                          change(
                            "relationship",
                            e.target.value as CollaboratorInput["relationship"],
                          )
                        }
                      >
                        <option value="collaborator">Colaborare</option>
                        <option value="partner">Parteneriat</option>
                      </select>
                    </label>
                    {field("email", "E-mail", { type: "email" })}
                    {field("phone", "Telefon", { type: "tel" })}
                    {field("whatsapp", "WhatsApp", {
                      type: "tel",
                      hint: "Număr internațional cu + și prefix de țară, pentru deschiderea aplicației.",
                    })}
                    {field("website", "Website", { type: "url" })}
                    {field("specialization", "Specializare / competențe")}
                  </div>
                  <ContactActions item={draft} />
                  {collaboratorWebsiteLink(draft.website) && (
                    <a
                      href={collaboratorWebsiteLink(draft.website)!}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="inline-flex min-h-10 items-center gap-2 text-sm text-violet-200 underline"
                    >
                      Website
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                  {manage && (
                    <section className={panel}>
                      <h3 className="text-sm font-semibold">
                        Client și cont asociat
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        Asocierea nu acordă rang staff sau produse AVY Partener.
                        Pentru un client existent, contul trebuie să aibă deja
                        acces la fișa sa CRM.
                      </p>
                      <label className="mt-3 block text-xs">
                        Caută clientul sau contul
                        <input
                          className={inputClass}
                          value={lookup}
                          placeholder="Nume client sau e-mail exact al contului"
                          onChange={(e) => setLookup(e.target.value)}
                        />
                      </label>
                      {lookupError && (
                        <p role="alert" className="mt-2 text-xs text-rose-100">
                          {lookupError}
                        </p>
                      )}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs">
                          Client CRM (opțional)
                          <select
                            className={inputClass}
                            disabled={busy}
                            aria-label="Client CRM (opțional)"
                            value={draft.clientId || ""}
                            onChange={(e) => {
                              const client = options.clients.find(
                                (c) => c.id === e.target.value,
                              );
                              setDraft((v) => ({
                                ...v,
                                clientId: e.target.value || null,
                                accountUserId: null,
                                ...(client
                                  ? {
                                      name: v.name || client.name,
                                      contactName:
                                        v.contactName ||
                                        client.contactName ||
                                        "",
                                      email: v.email || client.email || "",
                                      phone: v.phone || client.phone || "",
                                    }
                                  : {}),
                              }));
                              setDirty(true);
                              setConfirmed(false);
                            }}
                          >
                            <option value="">Fără client asociat</option>
                            {draft.clientId &&
                              !options.clients.some(
                                (c) => c.id === draft.clientId,
                              ) && (
                                <option value={draft.clientId}>
                                  {detail?.collaborator.clientName ||
                                    "Client asociat"}
                                </option>
                              )}
                            {options.clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs">
                          Cont AVYRON (opțional)
                          <select
                            className={inputClass}
                            disabled={busy}
                            aria-label="Cont AVYRON (opțional)"
                            value={draft.accountUserId || ""}
                            onChange={(e) =>
                              change("accountUserId", e.target.value || null)
                            }
                          >
                            <option value="">Fără cont — informativ</option>
                            {draft.accountUserId &&
                              !options.accounts.some(
                                (c) => c.id === draft.accountUserId,
                              ) && (
                                <option value={draft.accountUserId}>
                                  {detail?.collaborator.accountEmail ||
                                    "Cont asociat"}
                                </option>
                              )}
                            {options.accounts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} · {c.email}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        Conturile noi se înregistrează prin fluxul existent
                        AVYRON, apoi sunt asociate explicit aici. La schimbarea
                        contului, documentele trebuie republicate individual.
                      </p>
                      {accountChanged && (
                        <label className="mt-3 flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            className="mt-1"
                          />
                          Confirm actualizarea accesului contului asociat la
                          detaliile acestei colaborări.
                        </label>
                      )}
                    </section>
                  )}
                </>
              )}
              {tab === "collaboration" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    Starea colaborării
                    <select
                      className={inputClass}
                      disabled={!manage || busy}
                      aria-label="Starea colaborării"
                      value={draft.status}
                      onChange={(e) =>
                        change(
                          "status",
                          e.target.value as CollaboratorInput["status"],
                        )
                      }
                    >
                      {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  {field("startsOn", "Data începerii", { type: "date" })}
                  {field("endsOn", "Data încheierii (opțional)", {
                    type: "date",
                  })}
                  {field(
                    "summary",
                    "Obiectul și caracteristicile colaborării",
                    { multiline: true },
                  )}
                  {field(
                    "terms",
                    "Responsabilități, condiții și beneficii agreate",
                    {
                      multiline: true,
                      hint: "Aceste detalii sunt vizibile contului asociat. Nu reprezintă un contract generat automat.",
                    },
                  )}
                  {manage &&
                    field("internalNotes", "Note interne AVYRON", {
                      multiline: true,
                      hint: "Nu sunt transmise colaboratorului.",
                    })}
                  {manage && id && (
                    <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={archive}
                        onChange={(e) => {
                          setArchive(e.target.checked);
                          setDirty(true);
                        }}
                      />
                      <Archive className="size-4" />
                      Arhivează fișa și revocă accesul din contul
                      colaboratorului
                    </label>
                  )}
                </div>
              )}
              {tab === "documents" && detail && (
                <>
                  {dirty && (
                    <p role="status" className="text-sm text-amber-100">
                      Salvează modificările fișei înainte de a gestiona
                      documentele.
                    </p>
                  )}
                  <p className="text-sm text-slate-300">
                    Maximum 3 documente active, fiecare de până la 5 MB. PDF,
                    DOCX, PNG sau JPG. Accesul este permis numai după
                    verificarea CLEAN.
                  </p>
                  {detail.uploadBlock && (
                    <p
                      role="status"
                      className="rounded-xl border border-amber-300/25 bg-amber-500/5 p-3 text-sm text-amber-100"
                    >
                      Încărcările sunt blocate până la configurarea și aprobarea
                      scanării antivirus pentru documente confidențiale.
                      Fișierele nu sunt trimise unui furnizor neaprobat.
                    </p>
                  )}
                  <div className="space-y-2">
                    {!detail.files.length && (
                      <p className={panel}>
                        Nu există documente disponibile în această fișă.
                      </p>
                    )}
                    {detail.files.map((f) => (
                      <article
                        className={`${panel} flex flex-wrap items-center justify-between gap-3`}
                        key={f.id}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-start gap-2 break-all text-sm font-medium">
                            <FileText className="size-4 shrink-0" />
                            {f.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {(f.size / 1_000_000).toFixed(2)} MB ·{" "}
                            {f.ready
                              ? "CLEAN înregistrat"
                              : "Încărcare în curs"}
                            {manage
                              ? ` · ${f.visible ? "Disponibil colaboratorului" : "Intern AVYRON"}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {f.ready && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy || dirty}
                              onClick={() =>
                                void action(() => api.download(id!, f))
                              }
                            >
                              <Download className="mr-1 size-4" />
                              Descarcă
                            </Button>
                          )}
                          {manage && f.ready && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy || dirty}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    f.visible
                                      ? "Retragi accesul colaboratorului la acest document?"
                                      : "Publici acest document pentru contul asociat colaborării?",
                                  )
                                )
                                  void action(
                                    () =>
                                      api.fileChange(
                                        id!,
                                        f.id,
                                        detail.collaborator.revision,
                                        { visible: !f.visible },
                                      ),
                                    async () => {
                                      await load();
                                      onChanged();
                                    },
                                  );
                              }}
                            >
                              {f.visible
                                ? "Retrage accesul"
                                : "Publică pentru colaborator"}
                            </Button>
                          )}
                          {f.canRemove && f.ready && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy || dirty}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Retragi documentul din fișă? Originalul și istoricul rămân în evidența centrală.",
                                  )
                                )
                                  void action(
                                    () =>
                                      api.fileChange(
                                        id!,
                                        f.id,
                                        detail.collaborator.revision,
                                        { remove: true },
                                      ),
                                    async () => {
                                      await load();
                                      onChanged();
                                    },
                                  );
                              }}
                            >
                              Retrage din fișă
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {detail.collaborator.canUpload && (
                    <section className={panel}>
                      <label className="block text-sm font-medium">
                        Adaugă document
                        <input
                          ref={fileRef}
                          aria-label="Adaugă document"
                          type="file"
                          accept=".pdf,.docx,.png,.jpg,.jpeg"
                          disabled={
                            busy ||
                            dirty ||
                            !!detail.uploadBlock ||
                            detail.collaborator.fileCount >= 3
                          }
                          className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-white"
                          onChange={(e) => {
                            setFile(e.target.files?.[0] || null);
                            fileKey.current = crypto.randomUUID();
                            setError("");
                          }}
                        />
                      </label>
                      {manage && (
                        <label className="mt-3 flex min-h-10 items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={(e) => {
                              setVisible(e.target.checked);
                              fileKey.current = crypto.randomUUID();
                            }}
                          />
                          Vizibil colaboratorului după CLEAN
                        </label>
                      )}
                      <Button
                        className="mt-3"
                        disabled={
                          busy ||
                          dirty ||
                          !file ||
                          !!detail.uploadBlock ||
                          detail.collaborator.fileCount >= 3
                        }
                        onClick={() => {
                          if (!file) return;
                          if (file.size > COLLABORATOR_LIMITS.fileBytes) {
                            setError("Maximum 5 MB per document.");
                            return;
                          }
                          void action(
                            () =>
                              api.upload(id!, file, visible, fileKey.current),
                            async () => {
                              setFile(null);
                              if (fileRef.current) fileRef.current.value = "";
                              fileKey.current = crypto.randomUUID();
                              await load();
                              onChanged();
                              toast.success("Document verificat și încărcat.");
                            },
                          );
                        }}
                      >
                        Încarcă documentul
                      </Button>
                      {detail.collaborator.fileCount >= 3 && (
                        <p className="mt-2 text-xs text-amber-100">
                          Cele 3 locuri ale fișei sunt ocupate. Retrage un
                          document sau solicită ajutorul AVYRON.
                        </p>
                      )}
                    </section>
                  )}
                </>
              )}
            </div>
            {manage && (
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#080d1b] p-4">
                <p className="text-xs text-slate-400">
                  {dirty
                    ? "Modificări nesalvate."
                    : "Datele sunt păstrate în infrastructura AVYRON."}
                </p>
                <Button
                  disabled={
                    busy || (!dirty && !!id) || (accountChanged && !confirmed)
                  }
                  onClick={save}
                >
                  {busy ? "Se salvează…" : "Salvează fișa"}
                </Button>
              </footer>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
