import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Eye,
  History,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import manifest from "@/shared/serviceContentManifest.json";
import {
  servicePagesApi,
  type ServicePageConfiguration,
} from "@/lib/servicePagesApi";
import { notifyServiceContentChanged } from "@/hooks/useServicePageContent";
import {
  registerServicePageGuard,
  recoverServiceDraft,
  rememberServiceDraft,
  forgetServiceDraft,
} from "@/lib/servicePageNavigation";
import { useAuth } from "@/hooks/useAuth";
import {
  SERVICE_PAGES,
  type ServiceTextValues,
} from "@/shared/servicePagePolicy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const field =
  "w-full min-w-0 rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2 text-sm text-slate-100";
const own = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);
const groupNames: Record<string, string> = {
  meta: "SEO și distribuire",
  inline: "Texte de pagină",
  hero: "Prezentare principală",
  faq: "Întrebări frecvente",
  process: "Proces și etape",
  deliverables: "Livrabile",
  highlights: "Beneficii",
  intro: "Introducere",
  duration: "Durată",
  cta: "Îndemnuri la acțiune",
  blogBlogProHero: "Prezentare principală",
  blogStory: "Public și parcurs",
  blogProduct: "CMS și experiență",
  blogSeoSection: "SEO și arhitectură",
  blogGrowth: "Creștere și integrări",
  blogFoundations: "Dispozitive, calitate și livrare",
  blogClosing: "Servicii, întrebări și contact",
  audiences: "Public și utilizare",
  tech: "Tehnologii",
  advice: "Recomandări",
  coverage: "Domenii evaluate",
  qa: "Testare și pachete",
  growth: "Prezentarea serviciului",
  logo: "Identitate, pachete și livrare",
};
function groupFor(id: string) {
  if (id.startsWith("services.")) return id.split(".").slice(0, 2).join(".");
  if (id.startsWith("service.duration")) return "duration";
  if (id.startsWith("service.copy.")) {
    const part = id.split(".")[3];
    if (part.startsWith("meta")) return "meta";
    if (
      part.startsWith("hero") ||
      ["name", "kicker", "tagline", "subtitle"].includes(part)
    )
      return "hero";
    if (part.startsWith("cta") || part === "whatsapp") return "cta";
    return part;
  }
  if (id.startsWith("logo.")) return id.split(".").slice(0, 2).join(".");
  return id.split(".")[0];
}
const leafNames: Record<string, string> = {
  title: "Titlu",
  heroTitle: "Titlu principal",
  heroLead: "Descriere principală",
  lead: "Descriere",
  name: "Denumire",
  metaTitle: "Titlu SEO",
  metaDescription: "Descriere SEO",
  description: "Descriere",
  subtitle: "Subtitlu",
  tagline: "Mesaj scurt",
  q: "Întrebare",
  a: "Răspuns",
  text: "Text",
  desc: "Descriere",
  label: "Etichetă",
};
const describe = (id: string, source: string) => {
  const parts = id.split(".").filter((part) => !["ro", "en"].includes(part));
  const last = parts[parts.length - 1] || "";
  const indicator = id.match(/\.heroStats\.(\d+)\./);
  if (indicator)
    return `${last === "value" ? "Valoare" : "Etichetă"} · indicator ${Number(indicator[1]) + 1}`;
  return (
    leafNames[last] ||
    source.replace(/\s+/g, " ").slice(0, 75) + (source.length > 75 ? "…" : "")
  );
};
export default function ServicePageEditor({
  pageKey,
  initialGroup,
  onClose,
}: {
  pageKey: string;
  initialGroup?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const draftIdentity = `${user?.id || "anonymous"}:${pageKey}`;
  const page = SERVICE_PAGES.find((page) => page.key === pageKey)!;
  const defaults = (manifest as Record<string, { values: ServiceTextValues }>)[
    pageKey
  ].values;
  const [configuration, setConfiguration] =
      useState<ServicePageConfiguration | null>(null),
    [draft, setDraft] = useState<ServiceTextValues>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [locale, setLocale] = useState("ro"),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState(""),
    [preview, setPreview] = useState(false),
    [previewWidth, setPreviewWidth] = useState("desktop"),
    [publishOpen, setPublishOpen] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false);
  const alive = useRef(true),
    request = useRef(0),
    pending = useRef<{ serialized: string; key: string } | null>(null);
  const dirty =
    !!configuration &&
    JSON.stringify(draft) !== JSON.stringify(configuration.values);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    try {
      const result = await servicePagesApi.get(pageKey);
      if (alive.current && request.current === current) {
        setConfiguration(result);
        const recovered = recoverServiceDraft(draftIdentity);
        setDraft(
          recovered?.revision === result.revision
            ? recovered.values
            : result.values,
        );
        setError(
          recovered && recovered.revision !== result.revision
            ? "Există o ciornă locală pentru o versiune mai veche. Datele actuale au fost încărcate pentru a evita suprascrierea."
            : "",
        );
      }
    } catch (e) {
      if (alive.current && request.current === current)
        setError(
          e instanceof Error ? e.message : "Pagina nu poate fi încărcată.",
        );
    } finally {
      if (alive.current && request.current === current) setLoading(false);
    }
  }, [pageKey, draftIdentity]);
  useEffect(() => {
    alive.current = true;
    setConfiguration(null);
    setPreview(false);
    setGroup(initialGroup || "");
    setQuery("");
    void load();
    return () => {
      alive.current = false;
    };
  }, [load, initialGroup]);
  const save = useCallback(async (): Promise<boolean> => {
    if (!configuration || busy) return false;
    if (!dirty) return true;
    if (!configuration.canManage) return false;
    const invalid = Object.entries(draft).find(
      ([, value]) => !value.trim() || value.length > 6000,
    );
    if (invalid) {
      setError(
        `Completează textul: ${describe(invalid[0], defaults[invalid[0]] || invalid[0])}.`,
      );
      return false;
    }
    const normalized = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()]),
    );
    setBusy(true);
    const serialized = JSON.stringify({
      revision: configuration.revision,
      values: normalized,
    });
    if (pending.current?.serialized !== serialized)
      pending.current = { serialized, key: crypto.randomUUID() };
    try {
      const result = await servicePagesApi.save(
        pageKey,
        configuration.revision,
        normalized,
        pending.current.key,
      );
      if (!alive.current) return true;
      setConfiguration((current) =>
        current
          ? { ...current, revision: result.revision, values: normalized }
          : current,
      );
      setDraft(normalized);
      forgetServiceDraft(draftIdentity);
      pending.current = null;
      setError("");
      toast.success(
        "Ciorna a fost salvată. Pagina publică se schimbă numai după publicare.",
      );
      return true;
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "Salvarea a eșuat. Modificările rămân în editor.",
        );
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [configuration, busy, dirty, draft, pageKey, defaults, draftIdentity]);
  useEffect(() => {
    if (configuration) {
      if (dirty)
        rememberServiceDraft(draftIdentity, configuration.revision, draft);
      else forgetServiceDraft(draftIdentity);
    }
  }, [configuration, dirty, draft, draftIdentity]);
  useEffect(
    () => registerServicePageGuard(async () => (dirty ? save() : !busy)),
    [dirty, save, busy],
  );
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const setValue = (id: string, value: string) => {
    setDraft((current) => {
      const next = { ...current };
      if (value === defaults[id]) delete next[id];
      else next[id] = value;
      return next;
    });
  };
  const groups = useMemo(
    () => [...new Set(Object.keys(defaults).map(groupFor))],
    [defaults],
  );
  const preferred =
    pageKey === "overview"
      ? "inline"
      : pageKey === "blog-profesional"
        ? "blogBlogProHero"
        : pageKey === "logo-3d"
          ? "logo.LOGO3D_HERO"
          : groups.includes("hero")
            ? "hero"
            : groups[0];
  const activeGroup = groups.includes(group) ? group : preferred;
  const visible = Object.entries(defaults).filter(([id, value]) => {
    const language = id.match(/\.(ro|en)(?:\.|$)/)?.[1];
    return (
      (!language || language === locale) &&
      (!query
        ? groupFor(id) === activeGroup
        : `${value} ${draft[id] || ""} ${describe(id, value)}`
            .toLocaleLowerCase("ro")
            .includes(query.toLocaleLowerCase("ro")))
    );
  });
  const modified = Object.entries(draft).filter(
    ([id, value]) => value !== defaults[id],
  );
  const ready = !!configuration?.revision && !dirty;
  const previewPath = () => {
    const url = new URL(
      locale === "ro" ? page.ro : page.en,
      window.location.origin,
    );
    if (configuration?.revision) {
      url.searchParams.set("servicePreview", pageKey);
      url.searchParams.set("revision", String(configuration.revision));
    }
    return url.pathname + url.search + url.hash;
  };
  const publish = async () => {
    if (!configuration || !confirmed || busy || dirty) return;
    setBusy(true);
    try {
      await servicePagesApi.publish(pageKey, configuration.revision);
      notifyServiceContentChanged();
      setPublishOpen(false);
      await load();
      toast.success("Versiunea verificată a fost publicată.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Publicarea nu a fost confirmată.",
      );
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const labelFor = (value: string) =>
    value.startsWith("services.")
      ? defaults[`${value}.title.ro`] || "Serviciu"
      : value.startsWith("logo.")
        ? (
            {
              LOGO3D_META: "SEO și distribuire",
              LOGO3D_HERO: "Prezentare principală",
              LOGO3D_STATES: "Identitate și variante",
              LOGO3D_AUDIENCES: "Public și utilizare",
              LOGO3D_TIERS: "Pachete și livrabile",
              LOGO3D_PACKS_COPY: "Prezentarea pachetelor",
              LOGO3D_FORMATS: "Formate livrate",
              LOGO3D_TOOLS: "Instrumente",
              LOGO3D_GENESIS: "Proces creativ",
              LOGO3D_GALLERY: "Galerie",
              LOGO3D_NAME: "Previzualizarea numelui",
              LOGO3D_PROCESS: "Etapele proiectului",
              LOGO3D_FAQ: "Întrebări frecvente",
              LOGO3D_CTA: "Contact și acțiuni",
              LOGO3D_TRUST: "Condiții și încredere",
            } as Record<string, string>
          )[value.split(".")[1]] || "Detalii"
        : groupNames[value] || value;
  return (
    <section
      className="min-w-0 space-y-4"
      aria-label={`Configurare ${page.name}`}
    >
      <header className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[.18em] text-violet-300">
              Configurare pagină
            </p>
            <h2 className="mt-1 text-xl font-semibold">{page.name}</h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
              {pageKey === "overview"
                ? "Editezi prezentarea comună și cardurile din pagina Toate serviciile. Paginile detaliate se configurează separat."
                : pageKey === "audit"
                  ? "Auditul este o secțiune în pagina serviciilor, conectată la formularul existent."
                  : "Editezi pagina proprie a serviciului. Prezentarea sa din Toate serviciile are configurarea comună."}{" "}
              Textele RO și EN se salvează separat în aceeași versiune.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              if (!dirty || (await save())) onClose();
            }}
            disabled={busy || loading}
          >
            Înapoi la servicii
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 px-3 py-1.5">
            Ciornă v{configuration?.revision || 0}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">
            {configuration?.publishedRevision
              ? `Publicată v${configuration.publishedRevision}`
              : "Conținutul original al site-ului"}
          </span>
          {dirty && (
            <span
              role="status"
              className="rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-200"
            >
              Modificări nesalvate
            </span>
          )}
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-amber-500/5 p-3 text-sm text-amber-100"
        >
          <p>{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              if (
                !dirty ||
                window.confirm(
                  "Reîncarci datele și renunți la modificările nesalvate?",
                )
              )
                void load();
            }}
          >
            Reîncarcă datele
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={loading || busy || !dirty || !configuration?.canManage}
          onClick={() => void save()}
        >
          <Save className="size-4" />
          Salvează ciorna
        </Button>
        <Button
          variant="outline"
          disabled={loading || busy || !configuration}
          onClick={async () => {
            if (await save()) setPreview(true);
          }}
        >
          <Eye className="size-4" />
          Previzualizează
        </Button>
        {configuration?.canManage && (
          <Button
            variant="outline"
            disabled={
              !ready ||
              busy ||
              configuration.publishedRevision === configuration.revision
            }
            onClick={() => {
              setConfirmed(false);
              setPublishOpen(true);
            }}
          >
            <ShieldCheck className="size-4" />
            Verifică și publică
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!configuration}
          onClick={() => {
            void servicePagesApi
              .get(pageKey)
              .then((result) =>
                setConfiguration((current) =>
                  current ? { ...current, history: result.history } : result,
                ),
              )
              .catch(() => toast.error("Istoricul nu poate fi încărcat."));
            setHistoryOpen(true);
          }}
        >
          <History className="size-4" />
          Istoric
        </Button>
        <a
          href={locale === "ro" ? page.ro : page.en}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-300"
        >
          Pagina publică
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      {loading ? (
        <p
          role="status"
          className="rounded-xl border border-white/10 p-5 text-sm text-slate-400"
        >
          Se încarcă versiunea salvată…
        </p>
      ) : (
        configuration && (
          <>
            <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <nav
                aria-label="Secțiuni de configurare"
                className="hidden flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-3 lg:flex lg:flex-col"
              >
                {groups.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value === activeGroup && !query}
                    onClick={() => {
                      setGroup(value);
                      setQuery("");
                    }}
                    className={`min-h-10 rounded-xl px-3 py-2 text-left text-xs ${value === activeGroup && !query ? "bg-violet-500/20 text-violet-100" : "text-slate-400 hover:bg-white/5"}`}
                  >
                    {labelFor(value)}
                  </button>
                ))}
              </nav>
              <div className="min-w-0 space-y-4">
                <label className="grid gap-1 text-xs text-slate-400 lg:hidden">
                  Secțiune
                  <select
                    className={field}
                    value={activeGroup}
                    onChange={(e) => {
                      setGroup(e.target.value);
                      setQuery("");
                    }}
                  >
                    {groups.map((value) => (
                      <option key={value} value={value}>
                        {labelFor(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="grid gap-1 text-xs text-slate-400">
                    Limbă
                    <select
                      className={field}
                      value={locale}
                      onChange={(e) => setLocale(e.target.value)}
                    >
                      <option value="ro">Română</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label className="relative min-w-0 flex-1 self-end">
                    <span className="sr-only">Caută un text în pagină</span>
                    <Search className="absolute left-3 top-3 size-4 text-slate-500" />
                    <input
                      className={`${field} pl-9`}
                      placeholder="Caută în textele paginii…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Modifică doar informațiile confirmate. Salvarea creează o
                  versiune nouă; publicarea cere verificarea ta. La schimbarea
                  secțiunii, modificările sunt salvate în ciornă.
                </p>
                <div className="space-y-3">
                  {visible.map(([id, source]) => {
                    const value = own(draft, id) ? draft[id] : source;
                    const changed = value !== source;
                    const seoTitle = /metaTitle|meta\.\w+\.title/.test(id);
                    const seoDescription =
                      /metaDescription|meta\.\w+\.description/.test(id);
                    return (
                      <div
                        key={id}
                        className="rounded-xl border border-white/10 bg-white/[.02] p-3 sm:p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <label
                            htmlFor={`content-${id}`}
                            className="text-xs font-medium text-slate-300"
                          >
                            {describe(id, source)}
                          </label>
                          {changed && configuration.canManage && (
                            <button
                              type="button"
                              aria-label={`Revino la original: ${describe(id, source)}`}
                              onClick={() => setValue(id, source)}
                              className="inline-flex shrink-0 items-center gap-1 text-[10px] text-violet-300"
                            >
                              <RotateCcw className="size-3" />
                              Original
                            </button>
                          )}
                        </div>
                        <textarea
                          id={`content-${id}`}
                          value={value}
                          disabled={!configuration.canManage || busy}
                          rows={value.length > 180 ? 4 : 2}
                          maxLength={6000}
                          onChange={(e) => setValue(id, e.target.value)}
                          className={`${field} resize-y leading-relaxed`}
                        />
                        <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10px] text-slate-500">
                          <span>
                            {changed ? "Personalizat" : "Textul original"}
                            {seoTitle
                              ? " · titlu SEO"
                              : seoDescription
                                ? " · descriere SEO"
                                : ""}
                          </span>
                          <span>
                            {value.length} caractere
                            {seoTitle && value.length > 60
                              ? " · verifică afișarea în căutare"
                              : seoDescription && value.length > 160
                                ? " · verifică lungimea"
                                : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {!visible.length && (
                    <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                      Nu există texte pentru această selecție.
                    </p>
                  )}
                </div>
                <aside className="rounded-xl border border-cyan-400/15 bg-cyan-500/[.04] p-4 text-xs text-slate-400">
                  <p className="flex items-center gap-2 font-medium text-cyan-100">
                    <Sparkles className="size-4" />
                    Verifică înainte de publicare
                  </p>
                  <p className="mt-2">
                    Un titlu clar, beneficii concrete, condiții realiste și un
                    îndemn la acțiune potrivit. Folosește previzualizarea mobilă
                    și verifică ambele limbi. Prețurile, taxele, SKU-urile și
                    plățile se administrează prin configurarea comercială
                    existentă.
                  </p>
                </aside>
              </div>
            </div>
          </>
        )
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col p-3 sm:p-5">
          <DialogHeader>
            <DialogTitle>Previzualizare · {page.name}</DialogTitle>
            <DialogDescription>
              {configuration?.revision
                ? `Ciornă v${configuration.revision}. Acces autentificat; nu este un link public.`
                : "Conținutul original al paginii."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            {["desktop", "mobil"].map((value) => (
              <Button
                key={value}
                variant={previewWidth === value ? "default" : "outline"}
                onClick={() => setPreviewWidth(value)}
              >
                {value === "desktop" ? "Desktop" : "Mobil · 390 px"}
              </Button>
            ))}
          </div>
          {preview && !dirty && configuration && (
            <iframe
              key={`${pageKey}-${configuration.revision}-${locale}`}
              title={`Previzualizare pagină ${page.name}`}
              sandbox="allow-same-origin allow-scripts"
              src={previewPath()}
              className={`mx-auto min-h-0 flex-1 rounded-xl border border-white/10 bg-background ${previewWidth === "mobil" ? "w-[390px] max-w-full" : "w-full"}`}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publică versiunea verificată</DialogTitle>
            <DialogDescription>
              {page.name} · v{configuration?.revision}. Această acțiune
              actualizează textele publice ale paginii.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            {modified.length} texte personalizate față de conținutul original.
            Verifică previzualizarea și limbile înainte de confirmare.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            Am verificat această versiune și aprob publicarea paginii.
          </label>
          <Button
            disabled={!confirmed || busy || dirty}
            onClick={() => void publish()}
          >
            Confirmă publicarea
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Istoricul paginii</DialogTitle>
            <DialogDescription>
              Restaurarea pregătește o ciornă nouă; versiunea publicată se
              schimbă numai după confirmare.
            </DialogDescription>
          </DialogHeader>
          {configuration?.history.map((item) => (
            <div
              key={item.revision}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
            >
              <p className="text-sm">
                v{item.revision} ·{" "}
                {new Date(item.created_at).toLocaleString("ro-RO")}
                <span className="block text-xs text-muted-foreground">
                  {item.actor_name}
                </span>
              </p>
              {configuration.canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      dirty &&
                      !window.confirm(
                        "Înlocuiești modificările nesalvate cu versiunea aleasă?",
                      )
                    )
                      return;
                    try {
                      const restored = await servicePagesApi.version(
                        pageKey,
                        item.revision,
                      );
                      setDraft(restored.values);
                      setHistoryOpen(false);
                    } catch {
                      toast.error("Versiunea nu poate fi încărcată.");
                    }
                  }}
                >
                  Pregătește restaurarea
                </Button>
              )}
            </div>
          ))}
          {!configuration?.history.length && (
            <p className="text-sm text-muted-foreground">
              Nicio versiune salvată încă.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
