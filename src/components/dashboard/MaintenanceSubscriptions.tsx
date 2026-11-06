import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { maintenanceApi } from "@/lib/maintenanceApi";
import type {
  MaintenanceConfig,
  MaintenanceInput,
  MaintenanceSubscription,
} from "@/shared/maintenance";
import { ProjectWorkItems } from "@/components/intern/ProjectWorkItems";
import { MediaAttachments } from "@/components/intern/MediaAttachments";
import { internApi } from "@/lib/internApi";
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
const panel =
  "min-w-0 rounded-2xl border border-white/10 bg-[#10162a]/90 p-4 sm:p-5";
const money = (value: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(
    value,
  );
const day = (timestamp: number) =>
  new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
const nextMonth = () => {
  const d = new Date(),
    target = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(
    Math.min(target, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
  );
  return day(d.getTime());
};
const specifications = (raw: string): [string, string][] => {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value).filter(
          (row): row is [string, string] => typeof row[1] === "string",
        )
      : [];
  } catch {
    return [];
  }
};
const blank = () => ({
  projectId: "",
  clientId: "",
  externalName: "",
  mode: "project",
  planSku: "",
  name: "",
  price: "",
  specifications: [{ key: "Servicii incluse", value: "" }],
  target: "project",
  productSlug: "",
  externalUrl: "",
  targetLabel: "",
  staffIds: [] as string[],
  date: nextMonth(),
  status: "active" as MaintenanceInput["status"],
});
export default function MaintenanceSubscriptions() {
  const [params, setParams] = useSearchParams();
  const [config, setConfig] = useState<MaintenanceConfig | null>(null),
    [rows, setRows] = useState<MaintenanceSubscription[]>([]),
    [selectedProject, setSelectedProject] = useState(
      params.get("project") || "",
    ),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<MaintenanceSubscription | null>(null),
    [draft, setDraft] = useState(blank),
    [review, setReview] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  const seq = useRef(0),
    alive = useRef(true),
    key = useRef(crypto.randomUUID());
  const load = useCallback(async () => {
    const current = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const result = await maintenanceApi.list();
      if (alive.current && seq.current === current) {
        setRows(result.data);
        if (!result.canManage) {
          setConfig(previous => previous ? { ...previous, canManage: false, clients: [], staff: [], products: [], plans: [] } : previous);
          setOpen(false);
        }
      }
    } catch (e) {
      if (alive.current && seq.current === current)
        setError(
          e instanceof Error ? e.message : "Abonamentele nu pot fi încărcate.",
        );
    } finally {
      if (alive.current && seq.current === current) setLoading(false);
    }
  }, []);
  const refreshConfig = useCallback(async () => {
    try {
      const result = await maintenanceApi.config();
      if (alive.current) setConfig(result);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Configurarea nu este disponibilă.",
        );
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void load();
    void refreshConfig();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("avyron:maintenance-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("avyron:maintenance-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load, refreshConfig]);
  const requested = params.get("project");
  useEffect(() => {
    if (requested) setSelectedProject(requested);
  }, [requested]);
  const selectProject = (id: string) => {
    setSelectedProject(id);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (id) next.set("project", id);
        else next.delete("project");
        return next;
      },
      { replace: true },
    );
  };
  const configure = (row?: MaintenanceSubscription, external = false) => {
    key.current = crypto.randomUUID();
    setEditing(row || null);
    setConfirmed(false);
    setReview(false);
    const initial = blank();
    if (row) {
      initial.projectId = row.project_id;
      initial.name = row.service_name;
      initial.price = String(row.price);
      initial.planSku = row.plan_sku || "";
      initial.specifications = specifications(row.specifications_json).map(
        ([key, value]) => ({ key, value }),
      );
      if (!initial.specifications.length)
        initial.specifications = [{ key: "Servicii incluse", value: "" }];
      initial.target = row.product_slug
        ? "product"
        : row.external_url
          ? "external"
          : "project";
      initial.productSlug = row.product_slug || "";
      initial.externalUrl = row.external_url || "";
      initial.targetLabel = row.target_label;
      initial.staffIds = row.staff.map((s) => s.id);
      initial.date = day(row.next_billing_date);
      initial.status = row.status;
    } else {
      initial.projectId = selectedProject;
      initial.mode = external ? "external" : "project";
      if (external) initial.target = "external";
    }
    setDraft(initial);
    setOpen(true);
  };
  const body = (): MaintenanceInput => {
    if (draft.mode === "project" && !draft.projectId)
      throw Error("Selectează proiectul.");
    if (
      draft.mode === "external" &&
      (!draft.clientId || !draft.externalName.trim())
    )
      throw Error(
        "Selectează clientul și denumirea proiectului sau produsului extern.",
      );
    if (!draft.name.trim() || !/^\d+(?:[.,]\d{1,2})?$/.test(draft.price))
      throw Error("Completează denumirea și un tarif lunar valid.");
    const specs = draft.specifications.map(
      (s) => [s.key.trim(), s.value.trim()] as const,
    );
    if (
      !specs.length ||
      specs.some(([k, v]) => !k || !v) ||
      new Set(specs.map(([k]) => k)).size !== specs.length
    )
      throw Error(
        "Completează specificațiile și folosește denumiri distincte.",
      );
    if (draft.target === "product" && !draft.productSlug)
      throw Error("Selectează produsul din catalog.");
    const date = new Date(draft.date + "T12:00:00").getTime();
    if (!Number.isFinite(date))
      throw Error("Selectează data următoarei perioade.");
    return {
      ...(draft.mode === "external"
        ? {
            externalProject: {
              clientId: draft.clientId,
              name: draft.externalName.trim(),
            },
          }
        : { projectId: draft.projectId }),
      ...(editing ? { revision: editing.revision } : {}),
      planSku: draft.planSku || null,
      name: draft.name.trim(),
      priceMinor: Math.round(Number(draft.price.replace(",", ".")) * 100),
      specifications: Object.fromEntries(specs),
      productSlug: draft.target === "product" ? draft.productSlug : null,
      externalUrl:
        draft.target === "external" && draft.externalUrl
          ? draft.externalUrl
          : null,
      targetLabel: draft.targetLabel || draft.externalName,
      staffIds: draft.staffIds,
      nextBillingDate: date,
      status: draft.status,
    };
  };
  const save = async () => {
    if (busy || !confirmed) return;
    setBusy(true);
    try {
      const result = await maintenanceApi.save(
        body(),
        key.current,
        editing?.id,
      );
      setOpen(false);
      selectProject(result.projectId);
      await Promise.all([load(), refreshConfig()]);
      window.dispatchEvent(new Event("avyron:maintenance-changed"));
      toast.success("Abonamentul, planul și alocările au fost sincronizate.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Abonamentul nu a fost salvat.",
      );
      await load();
    } finally {
      setBusy(false);
    }
  };
  const visible = selectedProject
    ? rows.filter((row) => row.project_id === selectedProject)
    : rows;
  const currentProject = config?.projects.find((p) => p.id === selectedProject);
  return (
    <section className="space-y-4" aria-labelledby="core-maintenance-title">
      <header className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="core-maintenance-title"
              className="font-display text-xl font-semibold"
            >
              Mentenanță și abonamente lunare
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Selectează proiectul pentru a accesa materialele și activitățile
              sale. Planul, serviciile incluse și echipa alocată sunt comune cu
              abonamentele clientului.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              void load();
              void refreshConfig();
            }}
          >
            <RefreshCw
              className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
            />
            Actualizează
          </Button>
        </div>
        <label className="mt-4 block max-w-xl text-xs text-slate-300">
          Proiect
          <select
            aria-label="Proiect mentenanță"
            className={field + " mt-1"}
            value={selectedProject}
            onChange={(e) => selectProject(e.target.value)}
          >
            <option value="">Toate proiectele autorizate</option>
            {config?.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        {config?.canManage && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => configure()}>
              <Plus className="mr-1 size-4" />
              Configurează abonament lunar
            </Button>
            <Button
              variant="outline"
              onClick={() => configure(undefined, true)}
            >
              Proiect sau produs extern
            </Button>
          </div>
        )}
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300/20 p-3 text-sm text-amber-200"
        >
          {error}
        </p>
      )}
      {loading && !rows.length && !error && (
        <p role="status">Se citesc abonamentele autorizate…</p>
      )}
      {!loading && !visible.length && !error && (
        <p className={panel + " text-sm text-slate-400"}>
          Nu există abonamente pentru selecția curentă.
          {config?.canManage
            ? " Poți configura un plan pentru un proiect în dezvoltare, în mentenanță sau un produs extern."
            : ""}
        </p>
      )}
      <div className="grid gap-3 xl:grid-cols-2">
        {visible.map((row) => (
          <article key={row.id} className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words font-semibold">
                  {row.service_name}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {row.company_name} · {row.project_name}
                </p>
              </div>
              <span className="rounded-full bg-white/5 px-2 py-1 text-xs">
                {row.status === "active"
                  ? "Activ"
                  : row.status === "paused"
                    ? "Suspendat"
                    : "Anulat"}
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-cyan-200">
              {money(row.price)}
              <span className="ml-1 text-xs font-normal text-slate-400">
                /{" "}
                {row.billing_cycle === "yearly"
                  ? "an"
                  : row.billing_cycle === "one_time"
                    ? "plată unică"
                    : "lună"}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Următoarea perioadă:{" "}
              {new Date(row.next_billing_date).toLocaleDateString("ro-RO")}
            </p>
            {row.target_label && (
              <p className="mt-2 break-words text-sm">
                Asociere: {row.target_label}
              </p>
            )}
            <details className="mt-3 rounded-xl border border-white/10 p-3">
              <summary className="cursor-pointer text-sm">
                Plan și specificații {row.plan_sku ? "· " + row.plan_sku : ""}
              </summary>
              <dl className="mt-2 space-y-2">
                {specifications(row.specifications_json).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold text-slate-300">
                      {k}
                    </dt>
                    <dd className="whitespace-pre-wrap break-words text-xs text-slate-400">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
              {!row.maintenance_enabled && (
                <p className="mt-2 text-xs text-amber-200">
                  Abonament existent. Specificațiile AVY Core nu au fost
                  configurate încă.
                </p>
              )}
            </details>
            <p className="mt-3 flex items-start gap-2 text-xs text-slate-400">
              <Users className="size-4 shrink-0" />
              {row.staff.length
                ? row.staff.map((s) => s.name).join(", ")
                : "Echipa de mentenanță nu a fost alocată."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectProject(row.project_id)}
              >
                Vezi activitățile
              </Button>
              {config?.canManage && row.project_status !== "archived" && (
                <Button size="sm" onClick={() => configure(row)}>
                  {row.maintenance_enabled
                    ? "Editează abonamentul"
                    : "Configurează în AVY Core"}
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {selectedProject && (
        <div className="space-y-4">
          <ProjectWorkItems
            key={selectedProject}
            projectId={selectedProject}
            onlyKind="maintenance"
          />
          {currentProject?.slug && (
            <ProjectMaterials
              key={"media-" + selectedProject}
              slug={currentProject.slug}
              projectId={selectedProject}
            />
          )}
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Configurare abonament existent"
                : "Abonament lunar nou"}
            </DialogTitle>
            <DialogDescription>
              Configurarea păstrează serviciul și abonamentul în același
              registru. Plățile și contractele se confirmă prin fluxurile
              existente.
            </DialogDescription>
          </DialogHeader>
          {!review ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  body();
                  setReview(true);
                  setConfirmed(false);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              {draft.mode === "external" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    Client
                    <select
                      required
                      className={field + " mt-1"}
                      value={draft.clientId}
                      onChange={(e) =>
                        setDraft({ ...draft, clientId: e.target.value })
                      }
                    >
                      <option value="">Selectează clientul existent</option>
                      {config?.clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Denumire proiect sau produs extern
                    <input
                      required
                      maxLength={180}
                      className={field + " mt-1"}
                      value={draft.externalName}
                      onChange={(e) =>
                        setDraft({ ...draft, externalName: e.target.value })
                      }
                    />
                  </label>
                </div>
              ) : (
                <label className="block text-xs">
                  Proiect asociat
                  <select
                    required
                    disabled={!!editing}
                    className={field + " mt-1"}
                    value={draft.projectId}
                    onChange={(e) =>
                      setDraft({ ...draft, projectId: e.target.value })
                    }
                  >
                    <option value="">Selectează proiectul</option>
                    {config?.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-xs">
                Plan din catalog
                <select
                  className={field + " mt-1"}
                  value={draft.planSku}
                  onChange={(e) => {
                    const plan = config?.plans.find(
                      (p) => p.sku === e.target.value,
                    );
                    setDraft({
                      ...draft,
                      planSku: e.target.value,
                      ...(plan
                        ? {
                            name: plan.name,
                            price: String(plan.priceMinor / 100),
                            specifications: Object.entries(
                              plan.specifications,
                            ).map(([key, value]) => ({ key, value })),
                          }
                        : {}),
                    });
                  }}
                >
                  <option value="">Plan personalizat</option>
                  {config?.plans.map((plan) => (
                    <option key={plan.sku} value={plan.sku}>
                      {plan.category} · {plan.name} ·{" "}
                      {money(plan.priceMinor / 100)}/lună
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  Denumire abonament
                  <input
                    required
                    maxLength={180}
                    className={field + " mt-1"}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs">
                  Tarif lunar RON
                  <input
                    required
                    inputMode="decimal"
                    className={field + " mt-1"}
                    value={draft.price}
                    onChange={(e) =>
                      setDraft({ ...draft, price: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs">
                  Următoarea perioadă
                  <input
                    required
                    type="date"
                    className={field + " mt-1"}
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs">
                  Starea abonamentului
                  <select
                    className={field + " mt-1"}
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        status: e.target.value as MaintenanceInput["status"],
                      })
                    }
                  >
                    <option value="active">Activ</option>
                    <option value="paused">Suspendat</option>
                    <option value="cancelled">Anulat</option>
                  </select>
                </label>
              </div>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-semibold">
                  Specifică serviciile, limitele și nivelul de suport
                </legend>
                {draft.specifications.map((spec, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-white/10 p-2 sm:grid-cols-[1fr_2fr_auto]"
                  >
                    <input
                      aria-label={`Denumire specificație ${index + 1}`}
                      required
                      maxLength={100}
                      className={field}
                      value={spec.key}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          specifications: draft.specifications.map((s, i) =>
                            i === index ? { ...s, key: e.target.value } : s,
                          ),
                        })
                      }
                    />
                    <textarea
                      aria-label={`Valoare specificație ${index + 1}`}
                      required
                      maxLength={1500}
                      className={field}
                      value={spec.value}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          specifications: draft.specifications.map((s, i) =>
                            i === index ? { ...s, value: e.target.value } : s,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="px-2 text-xs text-rose-200"
                      aria-label={`Elimină specificația ${index + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          specifications: draft.specifications.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      Elimină
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draft.specifications.length >= 30}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      specifications: [
                        ...draft.specifications,
                        { key: "", value: "" },
                      ],
                    })
                  }
                >
                  Adaugă specificație
                </Button>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  Asociere
                  <select
                    className={field + " mt-1"}
                    value={draft.target}
                    onChange={(e) =>
                      setDraft({ ...draft, target: e.target.value })
                    }
                  >
                    <option value="project">Întregul proiect</option>
                    <option value="product">Produs din catalog</option>
                    <option value="external">Produs / serviciu extern</option>
                  </select>
                </label>
                <label className="text-xs">
                  Denumire asociere
                  <input
                    className={field + " mt-1"}
                    maxLength={180}
                    value={draft.targetLabel}
                    onChange={(e) =>
                      setDraft({ ...draft, targetLabel: e.target.value })
                    }
                  />
                </label>
                {draft.target === "product" && (
                  <label className="text-xs">
                    Produs
                    <select
                      required
                      className={field + " mt-1"}
                      value={draft.productSlug}
                      onChange={(e) =>
                        setDraft({ ...draft, productSlug: e.target.value })
                      }
                    >
                      <option value="">Selectează produsul</option>
                      {config?.products.map((product) => (
                        <option key={product.slug} value={product.slug}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {draft.target === "external" && (
                  <label className="text-xs">
                    Adresă produs extern (opțional)
                    <input
                      type="url"
                      className={field + " mt-1"}
                      value={draft.externalUrl}
                      onChange={(e) =>
                        setDraft({ ...draft, externalUrl: e.target.value })
                      }
                    />
                  </label>
                )}
              </div>
              <fieldset className="rounded-xl border border-white/10 p-3">
                <legend className="px-1 text-sm font-semibold">
                  Staff alocat mentenanței
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {config?.staff.map((staff) => (
                    <label
                      key={staff.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={draft.staffIds.includes(staff.id)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            staffIds: e.target.checked
                              ? [...draft.staffIds, staff.id]
                              : draft.staffIds.filter((id) => id !== staff.id),
                          })
                        }
                      />
                      {staff.name}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Alocarea oferă acces la activitățile de mentenanță.
                  Materialele proiectului păstrează permisiunile proiectului.
                </p>
              </fieldset>
              <Button type="submit">Verifică abonamentul</Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-300/20 p-4">
                <h3 className="font-semibold">{draft.name}</h3>
                <p className="mt-1 text-sm text-slate-300">
                  {draft.mode === "external"
                    ? draft.externalName
                    : config?.projects.find((p) => p.id === draft.projectId)
                        ?.name}{" "}
                  · {money(Number(draft.price.replace(",", ".")))}/lună
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Data următoarei perioade: {draft.date} ·{" "}
                  {draft.status === "active"
                    ? "Activ"
                    : draft.status === "paused"
                      ? "Suspendat"
                      : "Anulat"}
                </p>
                <dl className="mt-3 space-y-2">
                  {draft.specifications.map((spec) => (
                    <div key={spec.key}>
                      <dt className="text-sm font-medium">{spec.key}</dt>
                      <dd className="whitespace-pre-wrap break-words text-sm text-slate-400">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-slate-400">
                  Staff:{" "}
                  {config?.staff
                    .filter((s) => draft.staffIds.includes(s.id))
                    .map((s) => s.name)
                    .join(", ") || "Nealocat"}
                </p>
              </div>
              <p className="text-sm text-slate-400">
                Abonamentul activ va fi afișat clientului autorizat. Proiectul
                asociat trece în mentenanță când planul acoperă întregul
                proiect. Această configurare nu inițiază o debitare.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Confirm planul, specificațiile, tariful și alocările prezentate.
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setReview(false)}
                >
                  Înapoi la editare
                </Button>
                <Button
                  disabled={!confirmed || busy}
                  onClick={() => void save()}
                >
                  {busy ? "Se salvează…" : "Confirmă și salvează abonamentul"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
function ProjectMaterials({
  slug,
  projectId,
}: {
  slug: string;
  projectId: string;
}) {
  const [permission, setPermission] = useState<{
    read: boolean;
    write: boolean;
  } | null>(null);
  useEffect(() => {
    let active = true;
    setPermission(null);
    void internApi
      .getProject(slug)
      .then((result) => {
        if (active) setPermission(result.permission);
      })
      .catch(() => {
        if (active) setPermission({ read: false, write: false });
      });
    return () => {
      active = false;
    };
  }, [slug]);
  if (!permission?.read) return null;
  return <MediaAttachments projectId={projectId} canWrite={permission.write} />;
}
