import SiteBuilderKnowledgePanel from "./SiteBuilderKnowledgePanel";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Layers,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Settings2,
  Smartphone,
  Sparkles,
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
import { skillsApi as api } from "@/lib/skillsApi";
import { cfAuth } from "@/lib/cfAuth";
import { leadsApi } from "@/lib/leadsApi";
import {
  blankBrief,
  briefSchema,
  RUN_STATES,
  SKILL_NAMES,
  type SkillSlug,
  type SkillRun,
  type SkillResource,
} from "@/shared/skills/model";
import { NICHE_PROFILES } from "@/shared/skills/catalog";
const panel = "rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5";
const field =
  "min-h-11 w-full rounded-xl border border-white/15 bg-[#0b1120] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60";
const errors: Record<string, string> = {
  ai_role_daily_limit_exceeded:
    "Bugetul configurat pentru acest model este epuizat astăzi. Modul fără AI rămâne disponibil.",
  ai_global_daily_limit_exceeded:
    "Bugetul AI configurat pentru astăzi este epuizat. Poți continua fără AI.",
  image_dimensions_mismatch:
    "Modelul nu a returnat dimensiunile cerute. Imaginea nu a fost eliberată ca master.",
  image_output_invalid:
    "Modelul nu a returnat o imagine validă. Rezultatul a fost blocat.",
  image_pricing_unverified:
    "Modelul de imagine necesită verificarea transportului și tarifului înainte de folosire.",
  access_revoked: "Accesul la context a fost retras.",
  agent_paused: "Agentul sau politica AI este în pauză.",
  paid_ai_disabled: "Modelul necesită facturare, care nu este autorizată.",
  ai_model_not_configured: "Modelul text nu este configurat.",
  ai_binding_unavailable: "Workers AI nu este conectat.",
  queue_unconfigured: "Coada Cloudflare nu este configurată.",
  execution_interrupted:
    "Execuția s-a întrerupt. Nu se reia automat un apel AI.",
  skill_paused: "Skillul este pus în pauză.",
  compliance_blocked:
    "Upload blocat până la verificarea DPA și a transferului datelor către Bouncer.",
  scanner_unconfigured: "Cheia Bouncer nu este configurată.",
  scanner_disabled: "Scannerul nu este activat.",
  storage_unverified: "Stocarea privată nu este confirmată.",
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Operațiunea nu a reușit. Reîncearcă.";
function Field({
  label,
  id,
  children,
  hint,
}: {
  label: string;
  id: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function AvySkillsTab({ slug }: { slug: SkillSlug }) {
  const client = useQueryClient(),
    [params, setParams] = useSearchParams();
  const [view, setView] = useState<
      "atelier" | "resources" | "instructions" | "monitor" | "knowledge"
    >("atelier"),
    [brief, setBrief] = useState(blankBrief),
    [mode, setMode] = useState<"template" | "ai" | "image">("template");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [mobilePreview, setMobilePreview] = useState(false),
    [showPrompt, setShowPrompt] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false),
    [resourceDraft, setResourceDraft] = useState({
      title: "",
      domain: "general",
      body: "",
      sourceUrl: "",
    }),
    [file, setFile] = useState<File | null>(null);
  const [configOpen, setConfigOpen] = useState(false),
    [config, setConfig] = useState({
      revision: 1,
      summary: "",
      instructions: "",
      paused: false,
    });
  const intent = useRef({ hash: "", key: "" });
  const [editingResource, setEditingResource] = useState<SkillResource | null>(
    null,
  );
  const [resourceOffset, setResourceOffset] = useState(0),
    [resourceSearch, setResourceSearch] = useState(""),
    [resourceQuery, setResourceQuery] = useState(""),
    [historyOffset, setHistoryOffset] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setResourceQuery(resourceSearch);
      setResourceOffset(0);
    }, 250);
    return () => clearTimeout(t);
  }, [resourceSearch]);
  const info = useQuery({
    queryKey: ["skills", slug, resourceOffset, resourceQuery],
    queryFn: ({ signal }) =>
      api.detail(slug, signal, resourceOffset, resourceQuery),
    placeholderData: (previous) => previous,
  });
  const history = useQuery({
    queryKey: ["skill-runs", slug, historyOffset],
    queryFn: ({ signal }) => api.runs(slug, signal, historyOffset),
    placeholderData: (previous) => previous,
    refetchInterval: (q) =>
      q.state.data?.data.some((r) => ["queued", "preparing"].includes(r.status))
        ? 10000
        : false,
  });
  const result = useQuery({
    queryKey: ["skill-run", slug, selected],
    queryFn: ({ signal }) => api.run(slug, selected!, signal),
    enabled: !!selected,
    refetchInterval: (q) =>
      q.state.data && ["queued", "preparing"].includes(q.state.data.run.status)
        ? 5000
        : false,
  });
  const projects = useQuery({
    queryKey: ["skill-projects"],
    queryFn: () =>
      cfAuth.request<{
        data: {
          id: string;
          name: string;
          client_name?: string;
          type?: string;
        }[];
      }>("/api/projects?scope=mine"),
    enabled: view === "atelier",
    retry: false,
  });
  const leadId = params.get("skillLead");
  const lead = useQuery({
    queryKey: ["skill-lead", leadId],
    queryFn: () => leadsApi.detail(leadId!),
    enabled: !!leadId,
    retry: false,
  });
  useEffect(() => {
    if (lead.data?.data) {
      const l = lead.data.data;
      setBrief((b) => ({
        ...b,
        business: l.business || l.name || "",
        activity: l.product || "",
        leadId: l.id,
        projectId: null,
      }));
    }
  }, [lead.data]);
  const data = info.data,
    r = result.data?.run;
  useEffect(() => {
    let active = true,
      url: string | null = null;
    setImageUrl(null);
    if (r?.generatedFile) {
      cfAuth
        .requestResponse(`${api.path(slug)}/runs/${r.id}/image`)
        .then((x) => x.blob())
        .then((blob) => {
          if (active) {
            url = URL.createObjectURL(blob);
            setImageUrl(url);
          }
        })
        .catch((e) => {
          if (active) toast.error(message(e));
        });
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [r?.id, r?.generatedFile, slug]);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["skills", slug] }),
      client.invalidateQueries({ queryKey: ["skill-runs", slug] }),
      client.invalidateQueries({ queryKey: ["skill-run", slug, selected] }),
    ]);
  };
  const action = async (fn: () => Promise<unknown>, success?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
      await refresh();
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    action(async () => {
      const parsed = briefSchema.safeParse(brief);
      if (!parsed.success)
        throw new Error(
          "Completează denumirea, activitatea și verifică datele opționale.",
        );
      const hash = JSON.stringify({ brief: parsed.data, mode });
      if (intent.current.hash !== hash)
        intent.current = { hash, key: crypto.randomUUID() };
      const next = await api.create(
        slug,
        parsed.data,
        mode,
        intent.current.key,
      );
      setSelected(next.id);
      setShowPrompt(false);
    });
  if (info.isPending)
    return (
      <div className={panel} role="status">
        <Loader2 className="mr-2 inline size-4 animate-spin" />
        Se încarcă Avy Skills…
      </div>
    );
  if (info.isError || !data)
    return (
      <div className={panel} role="alert">
        <h1 className="text-xl font-semibold">{SKILL_NAMES[slug]}</h1>
        <p className="my-3 text-sm text-slate-300">{message(info.error)}</p>
        <Button variant="outline" onClick={() => void info.refetch()}>
          Reîncearcă
        </Button>
      </div>
    );
  const resources = data.resources.filter((x) => x.status !== "archived");
  return (
    <div className="min-w-0 space-y-4 text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[.2em] text-violet-300">
            AVY SKILLS · REUTILIZEAZĂ. ADAPTEAZĂ. CONSTRUIEȘTE.
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            {data.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            {data.summary}
          </p>
        </div>
        <Button
          variant="outline"
          aria-label="Actualizează skillul"
          onClick={() => void refresh()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Versiune aprobată", `v${data.published_version}`],
          ["Resurse", data.resourceTotal ?? resources.length],
          ["Pregătiri", data.stats.total],
          ["În lucru", data.stats.queued],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/[.02] px-3 py-2"
          >
            <p className="text-[11px] text-slate-400">{label}</p>
            <p className="mt-0.5 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-b border-white/10 pb-2"
        aria-label="Zonele skillului"
      >
        {(
          [
            ["atelier", "Atelier", Sparkles],
            ...(slug === "site-builder" ? [["knowledge", "Cunoștințe și agenți", Layers] as const] : []),
            ["resources", "Resurse", Layers],
            ["instructions", "Instrucțiuni", FileText],
            ["monitor", "Monitorizare", Settings2],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-medium ${view === id ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
      {view === "atelier" && (
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <form
            className={panel + " space-y-4"}
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <h2 className="text-base font-semibold">
              Un brief scurt. O direcție clară.
            </h2>
            <p className="text-xs text-slate-400">
              Doar denumirea și activitatea sunt obligatorii. Datele nu intră
              automat în biblioteca comună.
            </p>
            {leadId && (
              <p className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-xs text-violet-200">
                {lead.isError
                  ? "Leadul nu poate fi citit. Selectează context independent pentru a continua."
                  : lead.isPending
                    ? "Se preia leadul autorizat…"
                    : "Brief asociat leadului existent."}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => {
                    setBrief((b) => ({ ...b, leadId: null }));
                    setParams((p) => {
                      const next = new URLSearchParams(p);
                      next.delete("skillLead");
                      return next;
                    });
                  }}
                >
                  Folosește independent
                </button>
              </p>
            )}
            <Field id="skill-project" label="Context">
              <select
                id="skill-project"
                className={field}
                value={brief.projectId || ""}
                onChange={(e) => {
                  setParams((p) => {
                    const next = new URLSearchParams(p);
                    next.delete("skillLead");
                    return next;
                  });
                  const p = projects.data?.data.find(
                    (x) => x.id === e.target.value,
                  );
                  setBrief((b) => ({
                    ...b,
                    projectId: p?.id || null,
                    leadId: null,
                    ...(p ? { business: p.client_name || p.name } : {}),
                  }));
                }}
              >
                <option value="">
                  {brief.leadId
                    ? "Lead existent"
                    : "Brief independent sau proiect viitor"}
                </option>
                {projects.data?.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.client_name ? ` · ${p.client_name}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="skill-business" label="Afacere / viitorul client">
              <input
                id="skill-business"
                required
                minLength={2}
                maxLength={160}
                className={field}
                placeholder="Denumirea afacerii"
                value={brief.business}
                onChange={(e) =>
                  setBrief({ ...brief, business: e.target.value })
                }
              />
            </Field>
            <Field id="skill-activity" label="Activitate">
              <input
                id="skill-activity"
                required
                minLength={2}
                maxLength={300}
                className={field}
                placeholder="Ex.: salon de beauty și wellness"
                value={brief.activity}
                onChange={(e) =>
                  setBrief({ ...brief, activity: e.target.value })
                }
              />
            </Field>
            <Field id="skill-domain" label="Punct de pornire">
              <select
                id="skill-domain"
                className={field}
                value={brief.domain}
                onChange={(e) => setBrief({ ...brief, domain: e.target.value })}
              >
                {(data.resourceDomains||[]).filter(d=>!NICHE_PROFILES.some(n=>n.id===d.domain)).map(d=><option key={d.domain} value={d.domain}>{d.domain} · profil personalizat</option>)}
                {NICHE_PROFILES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="skill-objective" label="Ce trebuie să obțină">
              <input
                id="skill-objective"
                maxLength={500}
                className={field}
                value={brief.objective}
                onChange={(e) =>
                  setBrief({ ...brief, objective: e.target.value })
                }
              />
            </Field>
            <details>
              <summary className="cursor-pointer py-2 text-xs font-medium text-violet-200">
                Preferințe, contacte și conturi sociale
              </summary>
              <div className="mt-2 space-y-3">
                <Field
                  id="skill-preferences"
                  label="Preferințe vizuale și cerințe"
                >
                  <textarea
                    id="skill-preferences"
                    maxLength={1200}
                    rows={3}
                    className={field}
                    value={brief.preferences}
                    onChange={(e) =>
                      setBrief({ ...brief, preferences: e.target.value })
                    }
                  />
                </Field>
                {(
                  [
                    ["phone", "Telefon"],
                    ["email", "Email"],
                    ["facebook", "Facebook · URL HTTPS"],
                    ["instagram", "Instagram · URL HTTPS"],
                    ["tiktok", "TikTok · URL HTTPS"],
                  ] as const
                ).map(([k, label]) => (
                  <Field key={k} id={`skill-${k}`} label={label}>
                    <input
                      id={`skill-${k}`}
                      className={field}
                      type={
                        k === "email" ? "email" : k === "phone" ? "tel" : "url"
                      }
                      value={brief[k]}
                      onChange={(e) =>
                        setBrief({ ...brief, [k]: e.target.value })
                      }
                    />
                  </Field>
                ))}
                <p className="text-xs text-slate-400">
                  În concept, contactele lipsă sunt înlocuite explicit cu
                  contactele AVYRON pentru discuția despre mockup. Linkurile
                  sociale lipsă rămân neconfigurate.
                </p>
              </div>
            </details>
            <Field id="skill-mode" label="Cum pregătim">
              <select
                id="skill-mode"
                className={field}
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "template" | "ai" | "image")
                }
              >
                <option value="template">
                  Reutilizare rapidă · fără apel AI
                </option>
                <option value="ai" disabled={!data.runtime.aiConfigured}>
                  Rafinare brief AI · în cotele existente
                </option>
                {slug === "media-generate" && (
                  <option
                    value="image"
                    disabled={data.runtime.imageStatus !== "configured"}
                  >
                    Generează imagine · master 1920px / cotă strictă
                  </option>
                )}
              </select>
            </Field>
            {slug === "media-generate" && mode === "image" && (
              <Field id="skill-image-format" label="Format master">
                <select
                  id="skill-image-format"
                  className={field}
                  value={brief.imageFormat}
                  onChange={(e) =>
                    setBrief({
                      ...brief,
                      imageFormat: e.target.value as typeof brief.imageFormat,
                    })
                  }
                >
                  <option value="wide">Hero · 1920 × 1088</option>
                  <option value="square">Pătrat · 1920 × 1920</option>
                  <option value="portrait">Portret · 1088 × 1920</option>
                </select>
                <p className="mt-2 text-xs text-slate-400">
                  O imagine per pregătire. Nu reducem calitatea când cota este
                  insuficientă: operațiunea rămâne blocată până la resetare.
                  Fără upgrade plătit.
                </p>
              </Field>
            )}
            {data.paused ? (
              <p role="status" className="text-sm text-amber-200">
                Skillul este pus în pauză.
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={
                busy ||
                !data.permissions.use ||
                !!data.paused ||
                (!!brief.leadId && lead.isPending)
              }
            >
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {mode === "image"
                ? "Generează imaginea"
                : slug === "site-builder"
                  ? "Pregătește mockupul"
                  : "Pregătește direcția"}
            </Button>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Rezultat privat, nepublicat. Nicio trimitere sau facturare
              automată. Generarea imaginilor este disponibilă explicit în Media
              Generate, în cota modelului aprobat. Celelalte moduri pregătesc
              concepte și briefuri.
            </p>
          </form>
          <section
            className={panel + " min-w-0"}
            aria-label="Rezultatul pregătirii"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">
                {showPrompt ? "Brief pentru Codex / AI" : "Concept vizual"}
              </h2>
              {r && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPrompt((x) => !x)}
                  >
                    {showPrompt ? "Previzualizare" : "Brief"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={
                      mobilePreview
                        ? "Previzualizare desktop"
                        : "Previzualizare mobilă"
                    }
                    onClick={() => setMobilePreview((x) => !x)}
                  >
                    {mobilePreview ? (
                      <Monitor className="size-4" />
                    ) : (
                      <Smartphone className="size-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
            {!selected && (
              <div className="grid min-h-64 place-content-center rounded-xl border border-dashed border-white/15 p-6 text-center">
                <Sparkles className="mx-auto mb-3 size-7 text-violet-300" />
                <p className="text-sm text-slate-300">
                  Completează brief-ul pentru prima direcție.
                </p>
                <p className="mt-2 max-w-sm text-xs text-slate-400">
                  Personalizare pe nișă, structură compactă și o bază coerentă
                  pentru implementare. Fără generarea repetată a aceleiași
                  structuri.
                </p>
              </div>
            )}
            {result.isError && (
              <p role="alert" className="text-sm text-amber-200">
                {message(result.error)}
              </p>
            )}
            {selected && result.isPending && (
              <p role="status" className="py-10 text-center text-sm">
                Se încarcă rezultatul…
              </p>
            )}
            {r && (
              <>
                <p className="mb-3 text-xs text-slate-400">
                  {RUN_STATES[r.status]} · v{r.skill_version} ·{" "}
                  {r.mode === "template"
                    ? "Fără apel AI"
                    : r.model || "AI în așteptare"}
                </p>
                {["queued", "preparing"].includes(r.status) ? (
                  <p
                    role="status"
                    className="rounded-xl bg-violet-500/10 p-4 text-sm"
                  >
                    Pregătirea rulează în Cloudflare. Poți închide această
                    pagină sau Mac-ul; rezultatul rămâne în Monitorizare.
                  </p>
                ) : r.error_code ? (
                  <div>
                    <p
                      role="alert"
                      className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200"
                    >
                      {errors[r.error_code] ||
                        `Pregătirea este blocată: ${r.error_code}.`}
                    </p>
                    {data.permissions.use && (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            const hash = `retry:${r.id}`;
                            if (intent.current.hash !== hash)
                              intent.current = {
                                hash,
                                key: crypto.randomUUID(),
                              };
                            const original = briefSchema.parse(
                              JSON.parse(r.brief_json),
                            );
                            const next = await api.create(
                              slug,
                              original,
                              r.mode,
                              intent.current.key,
                            );
                            setBrief(original);
                            setMode(r.mode);
                            setSelected(next.id);
                          })
                        }
                      >
                        Reîncearcă pregătirea
                      </Button>
                    )}
                  </div>
                ) : showPrompt ? (
                  <pre className="max-h-[650px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-4 text-xs leading-relaxed text-slate-200">
                    {r.output_md}
                  </pre>
                ) : imageUrl ? (
                  <figure>
                    <img
                      src={imageUrl}
                      alt={`Imagine generată pentru ${JSON.parse(r.brief_json).activity}`}
                      className="max-h-[620px] w-full rounded-xl object-contain"
                    />
                    <figcaption className="mt-2 text-xs text-slate-400">
                      Master generat, privat. Necesită verificare umană înainte
                      de utilizare.
                    </figcaption>
                  </figure>
                ) : r.preview_html ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <iframe
                      title={`Concept ${SKILL_NAMES[slug]}`}
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      referrerPolicy="no-referrer"
                      srcDoc={r.preview_html}
                      className={`mx-auto h-[620px] max-w-full border-0 bg-[#0d1120] ${mobilePreview ? "w-[390px]" : "w-full"}`}
                    />
                  </div>
                ) : null}
                {r.output_md && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void action(() =>
                          api.download(
                            `${api.path(slug)}/runs/${r.id}/skill.md`,
                            `avy-${slug}-v${r.skill_version}-SKILL.md`,
                          ),
                        )
                      }
                    >
                      <Download className="mr-2 size-3.5" />
                      Instrucțiunile folosite
                    </Button>
                    {r.generatedFile && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void action(() =>
                            api.download(
                              `${api.path(slug)}/runs/${r.id}/image`,
                              `avy-media-${r.id.slice(0, 8)}.png`,
                            ),
                          )
                        }
                      >
                        <Download className="mr-2 size-3.5" />
                        Master imagine
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void action(
                          () => navigator.clipboard.writeText(r.output_md!),
                          "Brief copiat",
                        )
                      }
                    >
                      <Copy className="mr-2 size-3.5" />
                      Copiază brief
                    </Button>
                    {(
                      [
                        ["md", "Brief Markdown"],
                        ["html", "Mockup HTML"],
                      ] as const
                    ).map(([format, label]) => (
                      <Button
                        key={format}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void action(() =>
                            api.download(
                              `${api.path(slug)}/runs/${r.id}/export?format=${format}`,
                              `avy-${slug}-${r.id.slice(0, 8)}.${format}`,
                            ),
                          )
                        }
                      >
                        <Download className="mr-2 size-3.5" />
                        {label}
                      </Button>
                    ))}
                    {r.status === "ready" && data.permissions.approve && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void action(
                            () => api.state(slug, r, "approved"),
                            "Aprobat intern, fără publicare",
                          )
                        }
                      >
                        <Check className="mr-2 size-3.5" />
                        Aprobă intern
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {view === "knowledge" && slug === "site-builder" && <SiteBuilderKnowledgePanel canManage={data.permissions.manage} onUse={domain=>{setBrief(b=>({...b,domain}));setView("atelier")}}/>}
      {view === "resources" && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2" aria-label="Domenii resurse"><button className="min-h-10 rounded-lg border border-white/10 px-3 text-xs" onClick={()=>setResourceSearch("")}>Toate domeniile</button>{(data.resourceDomains||[]).map(d=><button key={d.domain} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs" onClick={()=>setResourceSearch(d.domain)}>{d.domain} · {d.total}</button>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Bibliotecă reutilizabilă</h2>
              <p className="mt-1 text-xs text-slate-400">
                Tipare, componente și proveniență. În contextul agenților intră
                maximum trei resurse aprobate relevante.
              </p>
            </div>
            {data.permissions.manage && (
              <Button
                onClick={() => {
                  setEditingResource(null);
                  setResourceDraft({
                    title: "",
                    domain: "general",
                    body: "",
                    sourceUrl: "",
                  });
                  setFile(null);
                  setResourceOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Adaugă resursă
              </Button>
            )}
          </div>
          {data.uploadBlock && (
            <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100">
              {errors[data.uploadBlock] ||
                `Upload indisponibil: ${data.uploadBlock}.`}{" "}
              Notele și instrucțiunile pot fi salvate.
            </p>
          )}
          <Field id="skill-resource-search" label="Caută resurse">
            <input
              id="skill-resource-search"
              type="search"
              className={field}
              value={resourceSearch}
              maxLength={100}
              placeholder="Titlu, domeniu sau instrucțiune"
              onChange={(e) => setResourceSearch(e.target.value)}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            {resources.map((resource) => (
              <Resource
                key={resource.id}
                item={resource}
                canApprove={data.permissions.approve}
                canManage={data.permissions.manage}
                onEdit={() => {
                  setEditingResource(resource);
                  setResourceDraft({
                    title: resource.title,
                    domain: resource.domain,
                    body: resource.body,
                    sourceUrl: resource.source_url,
                  });
                  setFile(null);
                  setResourceOpen(true);
                }}
                busy={busy}
                onDownload={() =>
                  void action(() =>
                    api.download(
                      `${api.path(slug)}/resources/${resource.id}/file`,
                      resource.file_name || "resource",
                    ),
                  )
                }
                onState={(status) =>
                  void action(
                    () =>
                      api.resourceState(
                        slug,
                        resource.id,
                        resource.revision,
                        status,
                      ),
                    status === "approved"
                      ? "Resursă aprobată"
                      : "Resursă arhivată",
                  )
                }
              />
            ))}
          </div>
          {!resources.length && (
            <p className={panel + " text-sm text-slate-400"}>
              Nu există încă resurse. Adaugă o instrucțiune, un prompt, un
              exemplu sau o referință verificată.
            </p>
          )}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              {data.resourceTotal ?? resources.length} resurse · pagina{" "}
              {Math.floor(resourceOffset / 20) + 1}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!resourceOffset || info.isFetching}
                onClick={() => setResourceOffset((x) => Math.max(0, x - 20))}
              >
                Înapoi
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={data.resourceNextOffset == null || info.isFetching}
                onClick={() => setResourceOffset(data.resourceNextOffset!)}
              >
                Înainte
              </Button>
            </div>
          </div>
        </section>
      )}
      {view === "instructions" && (
        <section className={panel + " space-y-4"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Instrucțiuni versionate</h2>
              <p className="mt-1 text-xs text-slate-400">
                Versiune curentă {data.current_version || "—"} · aprobată{" "}
                {data.published_version}. Execuțiile existente își păstrează
                snapshotul.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void action(() =>
                    api.download(
                      api.path(slug) + "/skill.md",
                      `avy-${slug}-SKILL.md`,
                    ),
                  )
                }
              >
                <Download className="mr-2 size-4" />
                SKILL.md
              </Button>
              {data.permissions.manage && (
                <Button
                  size="sm"
                  onClick={() => {
                    setConfig({
                      revision: data.revision,
                      summary: data.summary,
                      instructions: data.instructions,
                      paused: !!data.paused,
                    });
                    setConfigOpen(true);
                  }}
                >
                  Editează versiunea
                </Button>
              )}
              {data.permissions.approve &&
                data.current_version !== data.published_version && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void action(
                        () => api.approve(slug, data.revision),
                        "Versiunea este aprobată pentru reutilizare",
                      )
                    }
                  >
                    Aprobă versiunea
                  </Button>
                )}
            </div>
          </div>
          <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
            {data.instructions}
          </pre>
        </section>
      )}
      {view === "monitor" && (
        <section className="space-y-3">
          <div className={panel}>
            <h2 className="font-semibold">Pipeline și execuție</h2>
            <p className="mt-2 text-sm text-slate-300">
              Brief → pregătire → verificare → aprobare internă. Publicarea și
              distribuirea rămân acțiuni separate.
            </p>
            <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
              <p>
                Coada Cloudflare:{" "}
                <span className="text-slate-200">
                  {data.runtime.queueConfigured ? "conectată" : "neconfigurată"}
                </span>
              </p>
              <p>
                Text:{" "}
                <span className="break-all text-slate-200">
                  {data.runtime.textModel || "neconfigurat"}
                </span>
              </p>
              <p>
                Model imagine:{" "}
                <span className="break-all text-slate-200">
                  {data.runtime.imageModel || "neconfigurat"} ·{" "}
                  {data.runtime.imageStatus}
                </span>
              </p>
              <p>
                Fără plafon nou de pregătiri. Se aplică bugetele AI Core
                configurate și cota furnizorului.
              </p>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Coada cloud poate continua fără Mac și fără dashboard deschis.
              Codex local, browserul și publicarea manuală cer operator
              disponibil. Nu se pornesc servere sau servicii plătite.
            </p>
            {slug === "logo-engine" && (
              <a
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-violet-200"
                href="/servicii/creare-logo-3d-dinamic-cinematic/creeaza"
              >
                Deschide produsul Logo Studio 3D{" "}
                <ArrowRight className="size-3.5" />
              </a>
            )}
          </div>
          <h3 className="text-sm font-semibold">
            Istoricul autorizat · pagina {Math.floor(historyOffset / 50) + 1}
          </h3>
          {history.isError && (
            <p role="alert" className="text-sm text-amber-200">
              {message(history.error)}
            </p>
          )}
          {history.data?.data.map((item) => {
            const b = JSON.parse(item.brief_json);
            return (
              <article
                key={item.id}
                className={
                  panel +
                  " flex flex-wrap items-center justify-between gap-3 !p-3"
                }
              >
                <div className="min-w-0 flex-1">
                  <h4 className="break-words text-sm font-medium">
                    {b.business}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {b.activity} ·{" "}
                    {new Date(item.created_at).toLocaleString("ro-RO")} · v
                    {item.skill_version}
                  </p>
                  <p className="mt-1 text-xs text-violet-200">
                    {RUN_STATES[item.status]} ·{" "}
                    {item.mode === "template"
                      ? "0 apeluri AI"
                      : item.model || "AI solicitat"}
                    {item.error_code
                      ? ` · ${errors[item.error_code] || item.error_code}`
                      : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Context brief + referințe: {item.input_characters} caractere
                    · ieșire: {item.output_characters} caractere
                    {item.completed_at && item.started_at
                      ? ` · ${((item.completed_at - item.started_at) / 1000).toFixed(1)} s`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelected(item.id);
                    setView("atelier");
                  }}
                >
                  Deschide
                </Button>
                {!["queued", "preparing", "archived"].includes(item.status) &&
                  data.permissions.use && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Arhivează pregătirea ${b.business}`}
                      onClick={() =>
                        void action(() => api.state(slug, item, "archived"))
                      }
                    >
                      <Archive className="size-4" />
                    </Button>
                  )}
              </article>
            );
          })}
          {history.data?.data.length === 0 && (
            <p className={panel + " text-sm text-slate-400"}>
              Nicio execuție încă. Creează prima direcție din Atelier.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!historyOffset || history.isFetching}
              onClick={() => setHistoryOffset((x) => Math.max(0, x - 50))}
            >
              Înapoi
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={history.data?.nextOffset == null || history.isFetching}
              onClick={() => setHistoryOffset(history.data!.nextOffset!)}
            >
              Înainte
            </Button>
          </div>
        </section>
      )}
      <Sheet
        open={resourceOpen}
        onOpenChange={(open) => {
          if (!busy) setResourceOpen(open);
        }}
      >
        <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#0a1020] text-slate-100 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Resursă reutilizabilă</SheetTitle>
            <SheetDescription>
              Salvează mecanisme și instrucțiuni, fără date private ale altui
              client sau active fără drept de reutilizare.
            </SheetDescription>
          </SheetHeader>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                let added: { id: string };
                if (editingResource) {
                  await api.reviseResource(
                    slug,
                    editingResource.id,
                    editingResource.revision,
                    resourceDraft,
                  );
                  added = { id: editingResource.id };
                } else added = await api.resource(slug, resourceDraft);
                if (file) {
                  try {
                    await api.upload(slug, added.id, file);
                  } catch (error) {
                    toast.error(
                      `Nota este salvată. Dacă verificarea este în curs, revino la Editează și retransmite același fișier. Fișierul nu este încă disponibil: ${message(error)}`,
                    );
                  }
                }
                setResourceOpen(false);
              }, "Resursa a fost salvată ca ciornă");
            }}
          >
            {(
              [
                ["title", "Titlu"],
                ["domain", "Domeniu / nișă"],
                ["sourceUrl", "Proveniență · URL HTTPS, opțional"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} id={`resource-${k}`} label={label}>
                <input
                  id={`resource-${k}`}
                  className={field}
                  required={k === "title"}
                  maxLength={
                    k === "sourceUrl" ? 1000 : k === "domain" ? 80 : 160
                  }
                  type={k === "sourceUrl" ? "url" : "text"}
                  value={resourceDraft[k]}
                  onChange={(e) =>
                    setResourceDraft({ ...resourceDraft, [k]: e.target.value })
                  }
                />
              </Field>
            ))}
            <Field id="resource-body" label="Instrucțiuni / informații utile">
              <textarea
                id="resource-body"
                required
                minLength={10}
                maxLength={6000}
                rows={9}
                className={field}
                value={resourceDraft.body}
                onChange={(e) =>
                  setResourceDraft({ ...resourceDraft, body: e.target.value })
                }
              />
            </Field>
            <Field
              id="resource-file"
              label="Document sau imagine · maximum 25 MB"
              hint={
                data.uploadBlock
                  ? errors[data.uploadBlock] || data.uploadBlock
                  : "PDF, DOCX, TXT/MD, PNG, JPG, WebP, GIF. Acces numai după CLEAN."
              }
            >
              <input
                id="resource-file"
                className={field}
                type="file"
                disabled={!!data.uploadBlock}
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(e) => {
                  const next = e.target.files?.[0] || null;
                  if (next && next.size > 25_000_000) {
                    toast.error("Fișierul depășește 25 MB.");
                    e.target.value = "";
                    return;
                  }
                  setFile(next);
                }}
              />
            </Field>
            {editingResource?.file_name && (
              <p className="text-xs text-slate-400">
                Fișierul existent se păstrează. Dacă scanarea este în curs, poți
                retransmite același fișier după verificare. Pentru alt fișier,
                adaugă o resursă nouă.
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Se salvează…" : "Salvează ciorna"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
      <Sheet
        open={configOpen}
        onOpenChange={(open) => {
          if (!busy) setConfigOpen(open);
        }}
      >
        <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#0a1020] text-slate-100 sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>O nouă versiune a skillului</SheetTitle>
            <SheetDescription>
              Salvarea nu schimbă versiunea aprobată sau pregătirile existente.
              Pauza oprește execuțiile noi.
            </SheetDescription>
          </SheetHeader>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                await api.version(slug, config);
                setConfigOpen(false);
              }, "Versiune salvată pentru aprobare");
            }}
          >
            <Field id="skill-summary" label="Descriere">
              <textarea
                id="skill-summary"
                className={field}
                required
                minLength={10}
                maxLength={500}
                rows={3}
                value={config.summary}
                onChange={(e) =>
                  setConfig({ ...config, summary: e.target.value })
                }
              />
            </Field>
            <Field id="skill-instructions" label="Instrucțiuni Markdown">
              <textarea
                id="skill-instructions"
                className={field + " font-mono text-xs"}
                required
                minLength={100}
                maxLength={14000}
                rows={20}
                value={config.instructions}
                onChange={(e) =>
                  setConfig({ ...config, instructions: e.target.value })
                }
              />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.paused}
                onChange={(e) =>
                  setConfig({ ...config, paused: e.target.checked })
                }
              />
              Pauză pentru pregătiri noi
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? "Se salvează…" : "Salvează versiunea"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
function Resource({
  item,
  canApprove,
  canManage,
  busy,
  onState,
  onDownload,
  onEdit,
}: {
  item: SkillResource;
  canApprove: boolean;
  canManage: boolean;
  busy: boolean;
  onState: (status: "approved" | "archived") => void;
  onDownload: () => void;
  onEdit: () => void;
}) {
  return (
    <article className={panel + " min-w-0 !p-4"}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-semibold">
          {item.title}
        </h3>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-violet-200">
          {item.status === "approved" ? "Aprobat" : "Ciornă"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {item.domain} · revizia {item.revision}
        {item.file_name
          ? ` · backup ${item.backup_protected ? "protejat" : "neconfirmat"}`
          : ""}
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer py-1 text-xs text-slate-300">
          Citește instrucțiunea
        </summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
          {item.body}
        </p>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block break-all text-xs text-violet-200"
          >
            Proveniență ↗
          </a>
        )}
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.file_name && (
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="mr-1.5 size-3.5" />
            <span className="max-w-36 truncate">{item.file_name}</span>
          </Button>
        )}
        {canApprove && item.status === "draft" && (
          <Button size="sm" disabled={busy} onClick={() => onState("approved")}>
            Aprobă
          </Button>
        )}
        {canManage && (
          <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}>
            Editează
          </Button>
        )}
        {canManage && (
          <Button
            size="sm"
            disabled={busy}
            variant="ghost"
            onClick={() => onState("archived")}
            aria-label={`Arhivează resursa ${item.title}`}
          >
            <Archive className="size-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}
