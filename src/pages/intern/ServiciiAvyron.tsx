import CommercialCodeEditor, {
  type CommercialEditorItem,
} from "@/components/dashboard/CommercialCodeEditor";
import ServicePageEditor from "@/components/dashboard/ServicePageEditor";
import { Button } from "@/components/ui/button";
import { SERVICE_COMMERCIAL_SOURCES } from "@/data/serviceCommercialSources";
import { useAuth } from "@/hooks/useAuth";
import {
  catalogCodesApi,
  type CommercialCode,
  type CommercialProviderRef,
} from "@/lib/catalogCodesApi";
import { flushServicePageEdits } from "@/lib/servicePageNavigation";
import {
  servicePagesApi,
  type ServicePageConfiguration,
} from "@/lib/servicePagesApi";
import manifest from "@/shared/serviceContentManifest.json";
import { SERVICE_PAGES } from "@/shared/servicePagePolicy";
import { ArrowUpRight, ChevronDown, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
const overviewKeys: Record<string, number> = {
  "premium-website": 0,
  "online-store": 1,
  apps: 2,
  "ai-agent": 3,
  "seo-ai": 4,
  "marketing-ads": 5,
  "logo-3d": 6,
  "blog-profesional": 7,
  "social-identity": 8,
  "qa-testing": 9,
};
export default function ServiciiAvyron({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { isSuperAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedKey = params.get("service");
  const selectedPage = SERVICE_PAGES.find((page) => page.key === selectedKey);
  const [miniOpen, setMiniOpen] = useState(false),
    [query, setQuery] = useState(""),
    [codes, setCodes] = useState<CommercialCode[]>([]),
    [references, setReferences] = useState<CommercialProviderRef[]>([]),
    [commercial, setCommercial] = useState<CommercialEditorItem | null>(null),
    [overview, setOverview] = useState<ServicePageConfiguration | null>(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await servicePagesApi.get("overview");
      setOverview(result);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Configurația paginii nu poate fi încărcată.",
      );
    }
    if (isSuperAdmin)
      try {
        const result = await catalogCodesApi.list();
        setCodes(result.data.filter((code) => code.entity_type === "service"));
        setReferences(result.references);
      } catch {
        setError(
          "Codurile comerciale nu pot fi încărcate. Configurarea paginilor rămâne disponibilă.",
        );
      }
  }, [isSuperAdmin]);
  useEffect(() => {
    void load();
  }, [load, selectedKey]);
  useEffect(() => {
    if (!embedded)
      void import("@/lib/seo").then(({ setPageMeta }) =>
        setPageMeta({
          title: "Servicii — AVYRON OS",
          description: "Configurarea paginilor și a ofertei de servicii.",
          path: "/intern/servicii",
          robots: "noindex, nofollow",
        }),
      );
  }, [embedded]);
  const navigate = async (key: string | null, group?: string) => {
    if (!(await flushServicePageEdits())) return;
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (key) next.set("service", key);
      else next.delete("service");
      if (group) next.set("serviceGroup", group);
      else next.delete("serviceGroup");
      return next;
    });
  };
  const close = () =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("service");
      next.delete("serviceGroup");
      return next;
    });
  const publicText = (key: string, field: string) => {
    const index = overviewKeys[key];
    const id = `services.${index}.${field}.ro`;
    return (
      overview?.values[id] ??
      (manifest.overview.values as Record<string, string>)[id] ??
      ""
    );
  };
  return (
    <div className="min-w-0 space-y-5 text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Servicii</h1>
          <p className="mt-2 text-sm text-slate-400">
            Prezentare comună, pagini individuale și configurare comercială.
          </p>
        </div>
        <a
          href="/servicii"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center px-3 text-xs text-violet-300"
        >
          Deschide serviciile
        </a>
        <Button
          variant="outline"
          aria-expanded={miniOpen}
          onClick={() => setMiniOpen((value) => !value)}
        >
          Alege pagina
          <ChevronDown className={`size-4 ${miniOpen ? "rotate-180" : ""}`} />
        </Button>
      </header>
      {miniOpen && (
        <nav
          aria-label="Paginile serviciilor"
          className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/[.02] p-3"
        >
          <button
            type="button"
            aria-current={!selectedPage ? "page" : undefined}
            onClick={() => void navigate(null)}
            className={`min-h-10 rounded-xl px-3 text-xs ${!selectedPage ? "bg-violet-500/20 text-violet-100" : "text-slate-400 hover:bg-white/5"}`}
          >
            Toate serviciile
          </button>
          {SERVICE_PAGES.filter((page) => page.key !== "overview").map(
            (page) => (
              <button
                key={page.key}
                type="button"
                aria-current={selectedKey === page.key ? "page" : undefined}
                onClick={() => void navigate(page.key)}
                className={`min-h-10 rounded-xl px-3 text-xs ${selectedKey === page.key ? "bg-violet-500/20 text-violet-100" : "text-slate-400 hover:bg-white/5"}`}
              >
                {page.name}
              </button>
            ),
          )}
        </nav>
      )}
      {selectedPage && selectedPage.key !== "overview" && isSuperAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const source = SERVICE_COMMERCIAL_SOURCES.find(
                (source) => source.entity_key === selectedPage.key,
              );
              if (source)
                setCommercial({
                  entityType: "service",
                  entityKey: source.entity_key,
                  displayName: source.display_name,
                  category: source.category,
                  sourcePriceMinor: source.base_price_minor,
                  sourceCurrency: "RON",
                  config: codes.find(
                    (code) => code.entity_key === source.entity_key,
                  ),
                  references: references.filter(
                    (ref) =>
                      ref.entity_type === "service" &&
                      ref.entity_key === source.entity_key,
                  ),
                });
            }}
          >
            Coduri și condiții comerciale
          </Button>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="/profil?tab=configurator"
            className="inline-flex min-h-9 items-center px-3 text-xs text-violet-300"
          >
            Deschide configuratorul existent
          </a>
        </div>
      )}
      {selectedPage ? (
        <ServicePageEditor
          key={selectedPage.key}
          pageKey={selectedPage.key}
          initialGroup={params.get("serviceGroup") || undefined}
          onClose={close}
        />
      ) : (
        <>
          <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Pagina Toate serviciile
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
                  Configurează titlurile, descrierile, beneficiile și textele
                  comune din /servicii. Mai jos, fiecare pagină are propria
                  configurare.
                </p>
              </div>
              <Button onClick={() => void navigate("overview")}>
                <Settings2 className="size-4" />
                Configurează pagina Toate serviciile
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Ciornele nu modifică site-ul. Previzualizează și publică explicit
              versiunea verificată.
            </p>
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-100"
            >
              {error}
            </p>
          )}
          <label className="block">
            <span className="sr-only">Caută serviciu</span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/10 bg-[#10162a] px-3 text-sm"
              placeholder="Caută un serviciu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="grid items-start gap-3 xl:grid-cols-2">
            {SERVICE_PAGES.filter(
              (page) =>
                page.key !== "overview" &&
                page.name
                  .toLocaleLowerCase("ro")
                  .includes(query.toLocaleLowerCase("ro")),
            ).map((page) => {
              const source = SERVICE_COMMERCIAL_SOURCES.find(
                  (service) => service.entity_key === page.key,
                ),
                code = codes.find((code) => code.entity_key === page.key);
              const index = overviewKeys[page.key];
              const features = Array.from({ length: 7 }, (_, i) =>
                publicText(page.key, `features.${i}.text`),
              ).filter(Boolean);
              return (
                <article
                  key={page.key}
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-violet-300">
                    {publicText(page.key, "badge") || "Evaluare și priorități"}
                  </p>
                  <h2 className="mt-1 text-base font-semibold">
                    {publicText(page.key, "title") || page.name}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {publicText(page.key, "desc") ||
                      "Auditul public se deschide în formularul de solicitare existent."}
                  </p>
                  {publicText(page.key, "tagline") && (
                    <p className="mt-2 text-[11px] text-cyan-200/80">
                      {publicText(page.key, "tagline")}
                    </p>
                  )}
                  {publicText(page.key, "time") && (
                    <p className="mt-3 text-xs text-slate-300">
                      {publicText(page.key, "time")}
                    </p>
                  )}
                  {features.length > 0 && (
                    <details className="mt-3 rounded-xl border border-white/5 p-3">
                      <summary className="cursor-pointer text-xs text-slate-300">
                        Beneficii și detalii din prezentarea publică
                      </summary>
                      <ul className="mt-3 space-y-2 text-xs text-slate-400">
                        {features.map((text, i) => (
                          <li key={i}>{text}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void navigate(page.key)}>
                      <Settings2 className="size-3.5" />
                      Configurează pagina
                    </Button>
                    {index !== undefined && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void navigate("overview", `services.${index}`)
                        }
                      >
                        Prezentarea din listă
                      </Button>
                    )}
                    <a
                      href={page.ro}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center gap-1 px-2 text-xs text-violet-300"
                    >
                      Pagina RO
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  </div>
                  {isSuperAdmin && source && (
                    <details className="mt-4 border-t border-white/5 pt-3">
                      <summary className="cursor-pointer text-xs text-slate-500">
                        Setări comerciale ·{" "}
                        {code?.sku || "codificare de verificat"}
                      </summary>
                      <p className="my-3 text-xs text-slate-500">
                        Coduri, fiscalitate și rute de plată în registrul
                        existent. Prețurile din achiziții și abonamente nu se
                        rescriu prin editarea textelor.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setCommercial({
                            entityType: "service",
                            entityKey: page.key,
                            displayName: source.display_name,
                            category: source.category,
                            sourcePriceMinor: source.base_price_minor,
                            sourceCurrency: "RON",
                            config: code,
                            references: references.filter(
                              (ref) =>
                                ref.entity_type === "service" &&
                                ref.entity_key === page.key,
                            ),
                          })
                        }
                      >
                        Coduri și condiții comerciale
                      </Button>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
      <CommercialCodeEditor
        item={commercial}
        onClose={() => setCommercial(null)}
        onSaved={load}
      />
    </div>
  );
}
