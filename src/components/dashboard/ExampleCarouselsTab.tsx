import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Check,
  Eye,
  History,
  Image,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cfAuth } from "@/lib/cfAuth";
import { useAuth } from "@/hooks/useAuth";
import { registerServicePageGuard } from "@/lib/servicePageNavigation";
import {
  CAROUSEL_PAGES,
  BUILTIN_EXAMPLE_IMAGES,
  EXAMPLE_STATES,
  carouselConfigSchema,
  exampleItemSchema,
  type CarouselConfig,
  type CarouselDetails,
  type ExampleItem,
  type ExampleState,
} from "@/shared/exampleCarousels";
import { ExampleCarouselView } from "@/components/site/PortfolioCarousel";
import { PORTFOLIO_IMAGES } from "@/data/portfolio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const root = "/api/admin/example-carousels";
const input =
  "w-full min-w-0 rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60";
const box = "rounded-2xl border border-white/10 bg-white/[0.025] p-4";
type Summary = {
  key: string;
  name: string;
  revision: number;
  review_state: ExampleState;
  published_revision: number | null;
  builtin: boolean;
};
const recoveries = new Map<
  string,
  { revision: number; config: CarouselConfig }
>();
type Action = "submit" | "approve" | "reject" | "publish";
const actions: Record<Action, string> = {
  submit: "Trimite la verificare",
  approve: "Aprobă versiunea",
  reject: "Respinge versiunea",
  publish: "Publică pe site",
};
const freshItem = (): ExampleItem => ({
  key: crypto.randomUUID(),
  name: "",
  href: "",
  image: "builtin:" + BUILTIN_EXAMPLE_IMAGES[0],
  tag: { ro: "", en: "" },
  desc: { ro: "", en: "" },
  alt: { ro: "", en: "" },
  visibility: "visible",
});

export default function ExampleCarouselsTab() {
  const { user } = useAuth(),
    [params, setParams] = useSearchParams();
  const requested = params.get("carousel") || "";
  const key = CAROUSEL_PAGES.some((p) => p.key === requested) ? requested : "";
  const page = CAROUSEL_PAGES.find((p) => p.key === key);
  const [list, setList] = useState<Summary[]>([]),
    [details, setDetails] = useState<CarouselDetails | null>(null),
    [config, setConfig] = useState<CarouselConfig | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("examples"),
    [lang, setLang] = useState<"ro" | "en">("ro"),
    [editing, setEditing] = useState<ExampleItem | null>(null),
    [removing, setRemoving] = useState<ExampleItem | null>(null),
    [confirm, setConfirm] = useState<Action | null>(null),
    [accepted, setAccepted] = useState(false),
    [preview, setPreview] = useState(false),
    [discard, setDiscard] = useState(false);
  const pendingAction = useRef<{
    body: string;
    path: string;
    id: string;
  } | null>(null);
  const pendingSave = useRef<{ body: string; id: string } | null>(null),
    inFlight = useRef(false);
  const identity = `${user?.id}:${key}`,
    dirty =
      !!config &&
      !!details &&
      JSON.stringify(config) !== JSON.stringify(details.config);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        if (!key) {
          const result = await cfAuth.request<{ data: Summary[] }>(root, {
            signal,
          });
          if (!signal?.aborted) {
            setList(result.data);
            setDetails(null);
            setConfig(null);
          }
        } else {
          const result = await cfAuth.request<CarouselDetails>(
            `${root}/${key}`,
            { signal },
          );
          if (!signal?.aborted) {
            setDetails(result);
            const recovery = recoveries.get(identity);
            setConfig(
              recovery?.revision === result.revision
                ? recovery.config
                : result.config,
            );
            if (recovery && recovery.revision !== result.revision)
              setError(
                "Există modificări locale dintr-o versiune mai veche. Descarcă-le înainte de a le înlocui.",
              );
          }
        }
      } catch {
        if (!signal?.aborted)
          setError(
            "Caruselele nu s-au încărcat. Poți reîncerca fără să pierzi modificările.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [key, identity],
  );
  useEffect(() => {
    const c = new AbortController();
    setDetails(null);
    setConfig(null);
    setTab("examples");
    void load(c.signal);
    return () => c.abort();
  }, [load]);
  useEffect(() => {
    if (dirty && config && details) {
      recoveries.set(identity, { revision: details.revision, config });
      if (recoveries.size > 10)
        recoveries.delete(recoveries.keys().next().value!);
    }
  }, [dirty, config, details, identity]);
  const save = useCallback(async () => {
    if (!details || !config || !details.permissions.edit) return !dirty;
    if (!dirty && details.revision > 0) return true;
    if (inFlight.current) return false;
    const valid = carouselConfigSchema.safeParse(config);
    if (!valid.success) {
      toast.error(
        "Verifică linkurile publice, imaginile și câmpurile exemplelor.",
      );
      return false;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    const body = JSON.stringify({
      revision: details.revision,
      config: valid.data,
    });
    if (pendingSave.current?.body !== body)
      pendingSave.current = { body, id: crypto.randomUUID() };
    try {
      const result = await cfAuth.request<{ revision: number }>(
        `${root}/${key}`,
        {
          method: "PUT",
          headers: { "Idempotency-Key": pendingSave.current.id },
          body,
        },
      );
      setDetails({
        ...details,
        revision: result.revision,
        config: valid.data,
        state: "draft",
        history: [
          {
            revision: result.revision,
            created_at: Date.now(),
            actor_name: user?.display_name || "Membrul curent",
          },
          ...details.history,
        ].slice(0, 30),
      });
      setConfig(valid.data);
      recoveries.delete(identity);
      pendingSave.current = null;
      toast.success(
        "Ciorna a fost salvată. Site-ul păstrează versiunea publicată.",
      );
      return true;
    } catch {
      setError(
        "Salvarea nu a fost confirmată. Modificările tale sunt păstrate; reîncearcă sau reîncarcă versiunea salvată.",
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [details, config, dirty, key, identity, user?.display_name]);
  useEffect(
    () =>
      registerServicePageGuard(async () => {
        if (editing) {
          toast.error(
            "Aplică sau închide modificările exemplului înainte de navigare.",
          );
          return false;
        }
        if (!dirty) return true;
        const ok = await save();
        if (!ok) toast.error("Salvează ciorna înainte de navigare.");
        return ok;
      }),
    [dirty, save, editing],
  );
  useEffect(() => {
    if (!dirty && !editing) return;
    const protect = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, editing]);
  const select = async (value: string) => {
    if (dirty && !(await save())) return;
    setQuery("");
    const next = new URLSearchParams(params);
    if (value) next.set("carousel", value);
    else next.delete("carousel");
    setParams(next);
  };
  const run = async () => {
    if (!confirm || !details || !accepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({
          revision: details.revision,
          confirmed: true,
        }),
        path = `${root}/${key}/${confirm}`;
      if (
        pendingAction.current?.body !== body ||
        pendingAction.current.path !== path
      )
        pendingAction.current = { body, path, id: crypto.randomUUID() };
      await cfAuth.request(path, {
        method: "POST",
        headers: { "Idempotency-Key": pendingAction.current.id },
        body,
      });
      pendingAction.current = null;
      setConfirm(null);
      await load();
      toast.success(
        confirm === "publish"
          ? "Versiunea aprobată este publicată pe site."
          : "Starea versiunii a fost actualizată.",
      );
    } catch {
      setError(
        "Operațiunea nu a fost confirmată. Reîncarcă starea și reîncearcă; nu presupunem publicarea reușită.",
      );
    } finally {
      setBusy(false);
    }
  };
  const startAction = async (action: Action) => {
    if (dirty || details?.revision === 0) {
      if (!(await save())) return;
      toast.info(
        "Ciorna este salvată. Verifică noua versiune înainte de următorul pas.",
      );
      return;
    }
    setAccepted(false);
    setConfirm(action);
  };
  const change = (patch: Partial<CarouselConfig>) => {
    if (config) setConfig({ ...config, ...patch });
  };
  const reorder = (index: number, delta: number) => {
    if (!config) return;
    const items = [...config.items],
      at = index + delta;
    if (at < 0 || at >= items.length) return;
    [items[index], items[at]] = [items[at], items[index]];
    change({ items });
  };
  const downloadRecovery = () => {
    const recovery = recoveries.get(identity);
    if (!recovery) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(recovery, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `carousel-draft-${key}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const currentItems = (config?.items || []).filter((i) =>
    `${i.name} ${i.tag.ro} ${i.desc.ro}`
      .toLocaleLowerCase("ro")
      .includes(query.toLocaleLowerCase("ro")),
  );
  return (
    <div className="space-y-4" data-testid="example-carousels-admin">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[.18em] text-violet-300">
            Platformă · Conținut public
          </p>
          <h1 className="mt-1 text-xl font-semibold text-white">
            Carusele Exemple
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Exemple, ordine și afișare pe paginile serviciilor. Modificările
            ajung pe site după verificare, aprobare și publicare.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {key && (
            <Button
              variant="outline"
              onClick={() => void select("")}
              disabled={busy}
            >
              <ArrowLeft className="mr-2 size-4" />
              Toate caruselele
            </Button>
          )}
          <Button
            variant="outline"
            aria-label="Reîncarcă caruselele"
            onClick={() => (dirty ? setDiscard(true) : void load())}
            disabled={busy || loading}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100"
        >
          {error}
          <div className="mt-2 flex gap-2">
            <button
              className="underline"
              onClick={() => (dirty ? setDiscard(true) : void load())}
            >
              Reîncearcă încărcarea
            </button>
            {recoveries.has(identity) && (
              <>
                <button className="underline" onClick={downloadRecovery}>
                  Descarcă ciorna locală
                </button>
                <button className="underline" onClick={() => setDiscard(true)}>
                  Folosește versiunea salvată
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {loading && (
        <p role="status" className={box}>
          Se încarcă…
        </p>
      )}
      {!loading && !key && (
        <>
          <div className="flex flex-wrap gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <input
                className={input + " pl-9"}
                aria-label="Caută carusele"
                placeholder="Caută serviciul sau pagina"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Stare carusele"
              className={input + " sm:w-48"}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Toate stările</option>
              <option value="in_review">De verificat</option>
              <option value="approved">De publicat</option>
              <option value="published">Publicate</option>
              <option value="draft">Ciorne</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {list
              .filter(
                (p) =>
                  p.name.toLowerCase().includes(query.toLowerCase()) &&
                  (filter === "all" || p.review_state === filter),
              )
              .map((p) => (
                <article
                  key={p.key}
                  className={box + " flex items-start justify-between gap-3"}
                >
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-100">{p.name}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {p.revision
                        ? EXAMPLE_STATES[p.review_state]
                        : p.builtin
                          ? "Exemplele existente de pe site"
                          : "Pregătit pentru configurare"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {p.published_revision
                        ? `Versiune publică ${p.published_revision}`
                        : p.builtin
                          ? "18 exemple inițiale"
                          : "Niciun exemplu public"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void select(p.key)}
                  >
                    Configurează
                  </Button>
                </article>
              ))}
          </div>
        </>
      )}
      {!loading && details && config && (
        <>
          <section className={box}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{page?.name}</h2>
                <span className="mt-2 inline-flex rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">
                  {EXAMPLE_STATES[details.state]}
                </span>
                <p className="mt-1 text-xs text-slate-400">
                  Ciornă v{details.revision} ·{" "}
                  {details.publishedRevision
                    ? `Publicat v${details.publishedRevision}`
                    : details.published
                      ? "Versiune inițială pe site"
                      : "Nepublicat"}
                  {dirty ? " · Modificări nesalvate" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setPreview(true)}>
                  <Eye className="mr-2 size-4" />
                  Previzualizare
                </Button>
                {details.permissions.edit && (
                  <Button
                    disabled={busy || (!dirty && details.revision > 0)}
                    onClick={() => void save()}
                  >
                    <Save className="mr-2 size-4" />
                    Salvează ciorna
                  </Button>
                )}
              </div>
            </div>
            <ol
              aria-label="Pipeline carusel"
              className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"
            >
              {(["draft", "in_review", "approved", "published"] as const).map(
                (state, i) => (
                  <li
                    key={state}
                    aria-current={
                      details.state === state ||
                      (details.state === "rejected" && state === "draft")
                        ? "step"
                        : undefined
                    }
                    className={`rounded-lg border px-3 py-2 ${details.state === state ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 text-slate-400"}`}
                  >
                    {i + 1}. {EXAMPLE_STATES[state]}
                  </li>
                ),
              )}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              {details.permissions.edit &&
                ["draft", "rejected"].includes(details.state) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void startAction("submit")}
                  >
                    Trimite la verificare
                  </Button>
                )}
              {details.permissions.approve && details.state === "in_review" && (
                <>
                  <Button
                    disabled={busy || dirty}
                    onClick={() => void startAction("approve")}
                  >
                    <Check className="mr-2 size-4" />
                    Aprobă
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || dirty}
                    onClick={() => void startAction("reject")}
                  >
                    Respinge
                  </Button>
                </>
              )}
              {details.permissions.publish && details.state === "approved" && (
                <Button
                  disabled={busy || dirty}
                  onClick={() => void startAction("publish")}
                >
                  Publică pe site
                </Button>
              )}
              <span className="self-center text-xs text-slate-500">
                {config.items.filter((i) => i.visibility === "visible").length}{" "}
                incluse în ciornă · {details.published?.items.length || 0} pe
                site
              </span>
            </div>
          </section>
          <nav
            aria-label="Configurare carusel"
            className="flex flex-wrap gap-2"
          >
            {[
              ["examples", "Exemple", Image],
              ["settings", "Setări carusel", Settings2],
              ["history", "Istoric", History],
            ].map(([id, label, Icon]) => (
              <Button
                key={String(id)}
                variant={tab === id ? "default" : "outline"}
                onClick={() => setTab(String(id))}
              >
                {typeof Icon !== "string" && <Icon className="mr-2 size-4" />}
                {String(label)}
              </Button>
            ))}
          </nav>
          {tab === "examples" && (
            <>
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Caută exemple"
                  className={input + " flex-1"}
                  placeholder="Caută în exemplele caruselului"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {details.permissions.edit && (
                  <Button
                    onClick={() => setEditing(freshItem())}
                    disabled={busy || config.items.length >= 80}
                  >
                    <Plus className="mr-2 size-4" />
                    Adaugă exemplu
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {!currentItems.length && (
                  <p className={box}>
                    Nu există exemple pentru filtrul curent. Adaugă primul
                    exemplu sau modifică căutarea.
                  </p>
                )}
                {currentItems.map((item) => {
                  const index = config.items.findIndex(
                    (i) => i.key === item.key,
                  );
                  return (
                    <article
                      key={item.key}
                      className={box + " flex flex-wrap items-center gap-3"}
                    >
                      <img
                        src={
                          item.image.startsWith("builtin:")
                            ? PORTFOLIO_IMAGES[item.image.slice(8)]
                            : item.image
                        }
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-14 w-20 shrink-0 rounded-lg object-cover object-top"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium">{item.name}</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.visibility === "visible"
                            ? "Inclus la următoarea publicare"
                            : item.visibility === "hidden"
                              ? "Ascuns în ciornă"
                              : "Arhivat în ciornă"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.href}
                        </p>
                      </div>
                      {details.permissions.edit && (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Mută ${item.name} mai sus`}
                            disabled={busy || index === 0}
                            onClick={() => reorder(index, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Mută ${item.name} mai jos`}
                            disabled={busy || index === config.items.length - 1}
                            onClick={() => reorder(index, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Editează ${item.name}`}
                            disabled={busy}
                            onClick={() => setEditing(structuredClone(item))}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              change({
                                items: config.items.map((i) =>
                                  i.key === item.key
                                    ? {
                                        ...i,
                                        visibility:
                                          i.visibility === "visible"
                                            ? "hidden"
                                            : "visible",
                                      }
                                    : i,
                                ),
                              })
                            }
                          >
                            {item.visibility === "visible"
                              ? "Ascunde"
                              : "Afișează"}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Șterge ${item.name}`}
                            disabled={busy}
                            onClick={() => setRemoving(item)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {tab === "settings" && (
            <fieldset
              disabled={!details.permissions.edit || busy}
              className={box + " grid min-w-0 gap-4 sm:grid-cols-2"}
            >
              <legend className="sr-only">Setări carusel</legend>
              {(
                [
                  ["enabled", "Carusel activ"],
                  ["autoplay", "Derulare automată"],
                  ["arrows", "Săgeți de navigare"],
                ] as const
              ).map(([name, label]) => (
                <label
                  key={name}
                  className="flex min-h-10 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={config[name]}
                    onChange={(e) => change({ [name]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
              {(
                [
                  ["speed", "Viteză (pixeli/secundă)", 10, 80],
                  ["cardWidth", "Lățime card (pixeli)", 250, 360],
                  ["gap", "Spațiu între carduri (pixeli)", 8, 32],
                ] as const
              ).map(([name, label, min, max]) => (
                <label key={name} className="space-y-2 text-sm">
                  {label}
                  <input
                    className={input}
                    type="number"
                    min={min}
                    max={max}
                    value={config[name]}
                    onChange={(e) => change({ [name]: Number(e.target.value) })}
                  />
                </label>
              ))}
              <label className="space-y-2 text-sm">
                Încadrare imagine
                <select
                  className={input}
                  value={config.imageFit}
                  onChange={(e) =>
                    change({ imageFit: e.target.value as "cover" | "contain" })
                  }
                >
                  <option value="cover">Umple cadrul</option>
                  <option value="contain">Imagine completă</option>
                </select>
              </label>
              <div className="sm:col-span-2">
                <p className="mb-3 text-xs text-slate-400">
                  Textele goale păstrează titlul și descrierea din pagina
                  serviciului. Mișcarea redusă și pauza la interacțiune se
                  respectă automat.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["ro", "en"] as const).map((locale) => (
                    <div key={locale} className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase">
                        {locale === "ro" ? "Română" : "English"}
                      </h3>
                      {(
                        [
                          ["eyebrow", "Etichetă"],
                          ["title", "Titlu"],
                          ["description", "Descriere"],
                        ] as const
                      ).map(([name, label]) => (
                        <label key={name} className="block space-y-1 text-sm">
                          {label}
                          <input
                            maxLength={180}
                            className={input}
                            value={config.heading[name][locale]}
                            onChange={(e) =>
                              change({
                                heading: {
                                  ...config.heading,
                                  [name]: {
                                    ...config.heading[name],
                                    [locale]: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>
          )}
          {tab === "history" && (
            <section className={box + " space-y-3"}>
              <h3 className="font-medium">Versiuni păstrate</h3>
              <p className="text-xs text-slate-400">
                Restaurarea pregătește o ciornă nouă. Nu rescrie istoricul și nu
                publică automat.
              </p>
              {!details.history.length && (
                <p className="text-sm text-slate-400">
                  Nu există încă versiuni salvate.
                </p>
              )}
              {details.history.map((v) => (
                <div
                  key={v.revision}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3"
                >
                  <div className="text-sm">
                    Versiunea {v.revision}
                    <span className="ml-2 text-xs text-slate-400">
                      {v.actor_name} ·{" "}
                      {new Date(v.created_at).toLocaleString("ro-RO")}
                    </span>
                  </div>
                  {details.permissions.edit && (
                    <Button
                      variant="outline"
                      disabled={busy || dirty}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const old = await cfAuth.request<{
                            config: CarouselConfig;
                          }>(`${root}/${key}/versions/${v.revision}`);
                          setConfig(old.config);
                          setTab("examples");
                          toast.info(
                            "Versiunea istorică este pregătită pentru salvare ca o ciornă nouă.",
                          );
                        } catch {
                          toast.error("Versiunea nu s-a încărcat.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Pregătește restaurarea
                    </Button>
                  )}
                </div>
              ))}
              <h3 className="pt-3 font-medium">Decizii și publicări</h3>
              {(details.events || []).map((event, index) => (
                <p
                  key={`${event.created_at}:${index}`}
                  className="border-t border-white/10 pt-2 text-xs text-slate-400"
                >
                  {(
                    {
                      "examples.draft_saved": "Ciornă salvată",
                      "examples.submit": "Trimis la verificare",
                      "examples.approve": "Aprobat",
                      "examples.reject": "Respins",
                      "examples.publish": "Publicat",
                    } as Record<string, string>
                  )[event.action] || event.action}{" "}
                  · v{event.revision} · {event.actor_name} ·{" "}
                  {new Date(event.created_at).toLocaleString("ro-RO")}
                </p>
              ))}
            </section>
          )}
        </>
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="dark max-h-[90dvh] overflow-y-auto border-white/10 bg-[#0b1120] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {config?.items.some((i) => i.key === editing?.key)
                ? "Editează exemplul"
                : "Adaugă exemplu"}
            </DialogTitle>
            <DialogDescription>
              Conținutul este pregătit pentru ciornă. Publicarea se confirmă
              separat.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const item = {
                  ...editing,
                  alt: {
                    ro: editing.alt.ro || `Captură ${editing.name}`,
                    en: editing.alt.en || `${editing.name} screenshot`,
                  },
                };
                const valid = exampleItemSchema.safeParse(item);
                if (!valid.success) {
                  toast.error(
                    "Completează denumirea și un link public HTTPS. Verifică imaginea și textele alternative.",
                  );
                  return;
                }
                change({
                  items: config!.items.some((i) => i.key === item.key)
                    ? config!.items.map((i) =>
                        i.key === item.key ? valid.data : i,
                      )
                    : [...config!.items, valid.data],
                });
                setEditing(null);
              }}
            >
              <label className="block space-y-1 text-sm">
                Denumire
                <input
                  required
                  maxLength={180}
                  className={input}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label className="block space-y-1 text-sm">
                Link public
                <input
                  required
                  className={input}
                  value={editing.href}
                  onChange={(e) =>
                    setEditing({ ...editing, href: e.target.value })
                  }
                  placeholder="https://website.ro sau /examples/..."
                />
              </label>
              <label className="block space-y-1 text-sm">
                Imagine
                <select
                  className={input}
                  value={
                    editing.image.startsWith("builtin:")
                      ? editing.image
                      : "custom"
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      image:
                        e.target.value === "custom"
                          ? "https://"
                          : e.target.value,
                    })
                  }
                >
                  {BUILTIN_EXAMPLE_IMAGES.map((image) => (
                    <option key={image} value={`builtin:${image}`}>
                      {image}
                    </option>
                  ))}
                  <option value="custom">Imagine publică (URL)</option>
                </select>
              </label>
              {!editing.image.startsWith("builtin:") && (
                <label className="block space-y-1 text-sm">
                  URL imagine publică
                  <input
                    required
                    className={input}
                    value={editing.image}
                    onChange={(e) =>
                      setEditing({ ...editing, image: e.target.value })
                    }
                  />
                </label>
              )}
              <p className="text-xs text-slate-400">
                Folosește o imagine publică pentru care ai drept de afișare.
                Fișierele private din Media nu sunt publicate automat.
              </p>
              <label className="block space-y-1 text-sm">
                Afișare
                <select
                  className={input}
                  value={editing.visibility}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      visibility: e.target.value as ExampleItem["visibility"],
                    })
                  }
                >
                  <option value="visible">Inclus la publicare</option>
                  <option value="hidden">Ascuns</option>
                  <option value="archived">Arhivat</option>
                </select>
              </label>
              <div
                className="flex gap-2"
                role="group"
                aria-label="Limba exemplului"
              >
                {(["ro", "en"] as const).map((l) => (
                  <Button
                    key={l}
                    type="button"
                    variant={lang === l ? "default" : "outline"}
                    onClick={() => setLang(l)}
                  >
                    {l === "ro" ? "Română" : "English"}
                  </Button>
                ))}
              </div>
              {(
                [
                  ["tag", "Etichetă"],
                  ["desc", "Descriere"],
                  ["alt", "Text alternativ imagine"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block space-y-1 text-sm">
                  {label}
                  <textarea
                    className={input}
                    maxLength={field === "desc" ? 650 : 180}
                    value={editing[field][lang]}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [field]: { ...editing[field], [lang]: e.target.value },
                      })
                    }
                  />
                </label>
              ))}
              <Button type="submit">Aplică în ciornă</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <DialogContent className="dark border-white/10 bg-[#0b1120] text-slate-100">
          <DialogHeader>
            <DialogTitle>Ștergi exemplul din ciornă?</DialogTitle>
            <DialogDescription>
              {removing?.name}. Istoricul rămâne păstrat, iar site-ul se
              actualizează la publicarea noii versiuni.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              change({
                items: config!.items.filter((i) => i.key !== removing?.key),
              });
              setRemoving(null);
            }}
          >
            Șterge din ciornă
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <DialogContent className="dark border-white/10 bg-[#0b1120] text-slate-100">
          <DialogHeader>
            <DialogTitle>{confirm && actions[confirm]}</DialogTitle>
            <DialogDescription>
              {page?.name} · versiunea {details?.revision}.{" "}
              {confirm === "publish"
                ? "Exemplele incluse devin publice; cele ascunse și șterse dispar din carusel."
                : "Decizia se aplică exact acestei versiuni."}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            {confirm === "publish"
              ? "Confirm conținutul și dreptul de afișare publică a imaginilor și exemplelor."
              : "Confirm decizia pentru versiunea afișată."}
          </label>
          <Button disabled={!accepted || busy} onClick={() => void run()}>
            {busy ? "Se procesează…" : confirm && actions[confirm]}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Previzualizare carusel</DialogTitle>
            <DialogDescription>
              Ciorna curentă; această acțiune nu publică exemplele.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            {(["ro", "en"] as const).map((l) => (
              <Button
                key={l}
                variant={lang === l ? "default" : "outline"}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
          <ExampleCarouselView
            config={config}
            carouselKey={key}
            lang={lang}
            preview
          />
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent className="dark border-white/10 bg-[#0b1120] text-slate-100">
          <DialogHeader>
            <DialogTitle>Reîncarci versiunea salvată?</DialogTitle>
            <DialogDescription>
              Modificările nesalvate vor fi înlocuite. Poți descărca mai întâi
              ciorna locală.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              recoveries.delete(identity);
              setDiscard(false);
              void load();
            }}
          >
            Reîncarcă versiunea salvată
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
