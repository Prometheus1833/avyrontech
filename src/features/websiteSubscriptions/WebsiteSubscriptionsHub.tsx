import { BillingFields } from "@/components/dashboard/subscriptions/SubscriptionFields";
import type { BillingDetails } from "@/shared/subscriptionOperations";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import {
  type WebsitePlan,
  type WebsiteSubscriptionProject,
} from "@/shared/websiteSubscriptions";
const account = "/api/website-subscriptions/account",
  internal = "/api/website-subscriptions/internal";
const api = <T,>(path: string, method = "GET", data?: unknown) =>
  cfAuth.request<T>(path, {
    method,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
type RequestRow = {
  id: string;
  lead_id: string;
  plan_id: string;
  project_id: string | null;
  name: string;
  email: string;
  brief_json: string;
  created_at: number;
};
type Options = {
  canManage: boolean;
  plans: WebsitePlan[];
  clients: { id: string; company_name: string; email: string }[];
  accounts: { id: string; email: string; display_name: string | null }[];
  staff: { id: string; name: string }[];
  requests: RequestRow[];
};
type Detail = {
  statistics: {
    period_start: number;
    period_end: number;
    visits: number | null;
    unique_visitors: number | null;
    uptime_percent: number | null;
    avg_response_ms: number | null;
    source: string;
    created_at: number;
  }[];
  data: WebsiteSubscriptionProject;
  changes: {
    id: string;
    title: string;
    description: string;
    status: string;
    kind: string;
    units: number;
    reviewed_by: string | null;
  }[];
  work: { id: string; title: string; status: string }[];
  links: { label: string; url: string; kind: string }[];
  activity: {
    id: string;
    title: string;
    description: string;
    created_at: number;
  }[];
};
const money = (p: WebsiteSubscriptionProject) =>
  p.plan.priceMinor === null
    ? "Tarif neconfigurat"
    : `${(p.plan.priceMinor / 100).toLocaleString("ro-RO")} ${p.plan.currency} / lună`;
const tile = "rounded-2xl border border-white/10 bg-white/[.025] p-4";
export default function WebsiteSubscriptionsHub({
  client = false,
}: {
  client?: boolean;
}) {
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState<WebsiteSubscriptionProject[]>([]),
    [options, setOptions] = useState<Options | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [truncated, setTruncated] = useState(false),
    [filter, setFilter] = useState(""),
    [tab, setTab] = useState("projects"),
    [allocate, setAllocate] = useState<RequestRow | null | false>(false),
    [selected, setSelected] = useState<WebsiteSubscriptionProject | null>(null),
    [generation, setGeneration] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (isSuperAdmin && !client)
      void api<Options>(internal + "/options")
        .then(setOptions)
        .catch(() => setOptions(null));
  }, [isSuperAdmin, client, generation]);
  const requestSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (filter) params.set("plan", filter);
      const data = await api<{
        data: WebsiteSubscriptionProject[];
        truncated?: boolean;
      }>(account + "/projects" + (params.size ? "?" + params : ""));
      if (sequence !== requestSequence.current) return;
      setItems(data.data);
      setTruncated(data.truncated === true);
    } catch (e) {
      if (sequence === requestSequence.current)
        setError(
          e instanceof Error ? e.message : "Datele nu pot fi încărcate.",
        );
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [query, filter]);
  useEffect(() => {
    void load();
  }, [load, generation]);
  const refresh = () => setGeneration((v) => v + 1);
  const visible = items.filter(
    (p) =>
      (!filter || p.plan_id === filter) &&
      `${p.name} ${p.company_name} ${p.domain || ""} ${p.plan.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const requests = options?.requests.filter((r) => !r.project_id) || [];
  if (client && !loading && !error && !search && !filter && items.length === 0)
    return null;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-lime-400">
            AVYRON / WEB
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            {client
              ? "Website-ul tău prin abonament"
              : "Site-uri prin abonament"}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {client
              ? "Proiectul, modificările și abonamentul tău, legate de același cont."
              : "Cerere → client și cont → proiect → abonare → dezvoltare → aprobare → lansare → mentenanță."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            aria-label="Reîncarcă site-urile prin abonament"
          >
            <RefreshCw className="size-4" />
          </Button>
          {isSuperAdmin && !client && (
            <>
              <Button size="sm" onClick={() => setAllocate(null)}>
                <Plus className="mr-1 size-4" />
                Creează proiect
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setTab(tab === "settings" ? "projects" : "settings")
                }
              >
                <Settings2 className="mr-1 size-4" />
                {tab === "settings" ? "Proiecte" : "Configurări"}
              </Button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/25 p-3 text-sm text-red-300"
        >
          {error}{" "}
          <button className="underline" onClick={refresh}>
            Reîncearcă
          </button>
        </p>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground" role="status">
          Se încarcă datele…
        </p>
      ) : tab === "settings" && options ? (
        <PlanSettings plans={options.plans} onSaved={refresh} />
      ) : (
        <>
          {!client && (
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
              {[
                ["Solicitări", String(requests.length)],
                [
                  "Proiecte în lucru",
                  String(
                    items.filter(
                      (p) => p.status === "lead" || p.status === "in_progress",
                    ).length,
                  ),
                ],
                [
                  "Site-uri lansate",
                  String(
                    items.filter(
                      (p) => p.status === "live" || p.status === "maintenance",
                    ).length,
                  ),
                ],
                [
                  "Recurent activ / RON",
                  String(
                    items
                      .filter((p) => p.subscription_status === "active")
                      .reduce(
                        (sum, p) =>
                          sum +
                          (p.plan.currency === "RON"
                            ? p.plan.priceMinor || 0
                            : 0),
                        0,
                      ) / 100,
                  ),
                ],
                [
                  "Tranziții solicitate",
                  String(items.filter((p) => p.transition_requested_at).length),
                ],
              ].map(([label, value]) => (
                <div className={tile} key={String(label)}>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <strong className="mt-1 block text-xl font-semibold">
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          )}
          {requests.length > 0 && (
            <details className={tile} open>
              <summary className="cursor-pointer text-sm font-semibold">
                Solicitări de evaluat{" "}
                <Badge className="ml-2">{requests.length}</Badge>
              </summary>
              <div className="mt-3 divide-y divide-white/10">
                {requests.map((r) => {
                  const brief = JSON.parse(r.brief_json || "{}") as {
                    company?: string;
                    industry?: string;
                    objectives?: string;
                  };
                  return (
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                      key={r.id}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {brief.company || r.name}{" "}
                          <span className="text-xs text-muted-foreground">
                            / Site {r.plan_id}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.name} · {r.email} · {brief.industry}
                        </p>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                          {brief.objectives}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            to={
                              "/profil?tab=leads&lead=" +
                              encodeURIComponent(r.lead_id)
                            }
                          >
                            Fișa leadului
                          </Link>
                        </Button>
                        <Button size="sm" onClick={() => setAllocate(r)}>
                          Evaluează și alocă
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                aria-label="Caută un website prin abonament"
                placeholder="Proiect, client, domeniu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-52">
              <SearchableSelect
                label="Filtrează după plan"
                value={filter}
                onChange={setFilter}
                emptyLabel="Toate planurile"
                options={["start", "business", "premium"].map((v) => ({
                  value: v,
                  label: "Site " + v,
                }))}
              />
            </div>
          </div>
          {truncated && (
            <p className="text-xs text-muted-foreground">
              Primele 200 de proiecte din selecție. Folosește căutarea sau
              planul pentru a restrânge rezultatele din registrul complet.
            </p>
          )}
          {visible.length === 0 ? (
            <div className={tile}>
              <Globe className="mb-3 size-6 text-lime-400" />
              <p className="text-sm">
                {client
                  ? "Nu ai încă un website prin abonament alocat."
                  : "Niciun proiect pentru filtrele selectate."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {client
                  ? "Alocarea este făcută de echipă în contul autorizat."
                  : "Creează dintr-o cerere sau asociază manual un client și un cont existent."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {visible.map((p) => (
                <article className={tile} key={p.project_id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {p.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.company_name} · {p.plan.name}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {p.banner_status === "testing"
                        ? "Testare"
                        : p.status === "lead"
                          ? "Propus"
                          : p.status === "in_progress"
                            ? "În dezvoltare"
                            : p.status === "live"
                              ? "Lansat"
                              : p.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <p>
                      <span className="text-muted-foreground">Abonament</span>
                      <br />
                      {money(p)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Perioade achitate
                      </span>
                      <br />
                      {p.paid_months} / 12
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Modificări consumate
                      </span>
                      <br />
                      {p.period
                        ? `${p.period.used} / ${p.period.change_limit}`
                        : "Fără perioadă achitată verificată"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Următoarea scadență
                      </span>
                      <br />
                      {p.period
                        ? new Date(p.period.ends_at).toLocaleDateString("ro-RO")
                        : "În așteptarea abonării"}
                    </p>
                  </div>
                  <p className="mt-3 truncate text-[11px] text-muted-foreground">
                    {p.domain || "Domeniu în pregătire"} ·{" "}
                    {p.subscription_status === "active"
                      ? "Abonament activ"
                      : p.subscription_status === "paused"
                        ? "Abonament neactivat / în pauză"
                        : p.subscription_status}
                  </p>
                  <Button
                    size="sm"
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={() => setSelected(p)}
                  >
                    Deschide fișa website-ului{" "}
                    <ArrowUpRight className="ml-2 size-3.5" />
                  </Button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {allocate !== false && options && (
        <Allocation
          options={options}
          request={allocate}
          onClose={() => setAllocate(false)}
          onSaved={() => {
            setAllocate(false);
            refresh();
          }}
        />
      )}
      {selected && (
        <ProjectSheet
          accounts={options?.accounts}
          id={selected.project_id}
          onClose={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}
function PlanSettings({
  plans,
  onSaved,
}: {
  plans: WebsitePlan[];
  onSaved: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className={tile}>
        <p className="text-sm font-semibold">
          Catalog, termeni și contul de încasare
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Tarifele provin din nomenclatorul comercial. Publicarea cere preț,
          fiscalitate verificată, termeni și anulare revizuite, plus verificarea
          contului Stripe AVYRON existent. Nicio taxă separată de dezvoltare nu
          este creată. Reviziile sunt păstrate; abonamentele acceptate nu sunt
          rescrise.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" asChild variant="outline">
            <Link to="/profil?tab=finance">
              Conturi și integrări financiare
            </Link>
          </Button>
          <Button size="sm" asChild variant="outline">
            <Link to="/profil?tab=commercial-codes">
              Coduri servicii și facturare
            </Link>
          </Button>
        </div>
      </div>
      {plans.map((p) => (
        <PlanEditor key={p.id + ":" + p.revision} plan={p} onSaved={onSaved} />
      ))}
    </div>
  );
}
function PlanEditor({
  plan,
  onSaved,
}: {
  plan: WebsitePlan;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(plan),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const field = (name: keyof WebsitePlan, value: unknown) =>
    setDraft((p) => ({ ...p, [name]: value }));
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const {
        revision,
        priceMinor,
        currency,
        vatBasisPoints,
        taxVerified,
        reviewed,
        terms,
        cancellation,
        emailPolicy,
        pages,
        changes,
        buttons,
        emails,
        tagline,
        features,
      } = draft;
      await api(internal + "/plans/" + plan.id, "PUT", {
        revision,
        priceMinor,
        currency,
        vatBasisPoints,
        taxVerified,
        reviewed,
        terms,
        cancellation,
        emailPolicy,
        pages,
        changes,
        buttons,
        emails,
        tagline,
        features,
      });
      toast.success("Revizia planului a fost salvată.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvarea nu a reușit.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className={tile}>
      <summary className="cursor-pointer text-sm font-semibold">
        {plan.name}{" "}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          Revizia {plan.revision} · {plan.sku} ·{" "}
          {plan.available
            ? "Publicabil pentru abonare"
            : "Necesită configurare"}
        </span>
      </summary>
      <form className="mt-5 space-y-4" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Label>
            Tarif lunar / RON
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.priceMinor === null ? "" : draft.priceMinor / 100}
              onChange={(e) =>
                field(
                  "priceMinor",
                  e.target.value === ""
                    ? null
                    : Math.round(Number(e.target.value) * 100),
                )
              }
            />
          </Label>
          <Label>
            TVA / procente
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={draft.vatBasisPoints / 100}
              onChange={(e) =>
                field(
                  "vatBasisPoints",
                  Math.round(Number(e.target.value) * 100),
                )
              }
            />
          </Label>
          <Label>
            Pagini
            <Input
              value={draft.pages}
              onChange={(e) => field("pages", e.target.value)}
              required
            />
          </Label>
          {(["changes", "buttons", "emails"] as const).map((key, i) => (
            <Label key={key}>
              {["Modificări lunare", "Butoane plutitoare", "Adrese e-mail"][i]}
              <Input
                type="number"
                min="0"
                max={key === "changes" ? 1000 : key === "emails" ? 50 : 20}
                value={draft[key]}
                onChange={(e) => field(key, Number(e.target.value))}
              />
            </Label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["ro", "en"] as const).map((l) => (
            <div key={l} className="space-y-3">
              <Label>
                Poziționare / {l.toUpperCase()}
                <Textarea
                  value={draft.tagline[l]}
                  onChange={(e) =>
                    field("tagline", { ...draft.tagline, [l]: e.target.value })
                  }
                  required
                />
              </Label>
              <Label>
                Beneficii / {l.toUpperCase()} · câte unul pe rând
                <Textarea
                  rows={6}
                  value={draft.features[l].join("\n")}
                  onChange={(e) =>
                    field("features", {
                      ...draft.features,
                      [l]: e.target.value.split("\n"),
                    })
                  }
                />
              </Label>
            </div>
          ))}
        </div>
        <Label>
          Condiții reale pentru e-mail
          <Textarea
            value={draft.emailPolicy}
            onChange={(e) => field("emailPolicy", e.target.value)}
            required
          />
        </Label>
        <Label>
          Termeni de abonare · redactați și revizuiți de persoana autorizată
          <Textarea
            rows={7}
            value={draft.terms}
            onChange={(e) => field("terms", e.target.value)}
            placeholder="Conținutul integral afișat înainte de acceptare: servicii, perioade, preț, facturare, drepturi, acces, continuitate și responsabilități. Fără penalități sau angajament minim presupus."
          />
        </Label>
        <Label>
          Anulare și continuare
          <Textarea
            rows={4}
            value={draft.cancellation}
            onChange={(e) => field("cancellation", e.target.value)}
            placeholder="Condiții explicite. Ciclul de 12 luni nu stabilește automat o durată minimă obligatorie."
          />
        </Label>
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={draft.taxVerified}
            onChange={(e) => field("taxVerified", e.target.checked)}
          />
          Confirm fiscalitatea aplicabilă acestei oferte.
        </label>
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={draft.reviewed}
            onChange={(e) => field("reviewed", e.target.checked)}
          />
          Confirm revizuirea comercială și juridică și solicit publicarea
          tarifului / termenilor. Contul Stripe este verificat prin
          infrastructura existentă.
        </label>
        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
        <Button disabled={busy} type="submit">
          {busy ? "Se salvează…" : "Salvează o revizie nouă"}
        </Button>
      </form>
    </details>
  );
}
function Allocation({
  options,
  request,
  onClose,
  onSaved,
}: {
  options: Options;
  request: RequestRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const brief = request
    ? (JSON.parse(request.brief_json || "{}") as {
        company?: string;
        name?: string;
        email?: string;
        phone?: string;
      })
    : {};
  const [key] = useState(() => crypto.randomUUID()),
    [name, setName] = useState(
      brief.company ? "Website — " + brief.company : "",
    ),
    [plan, setPlan] = useState(request?.plan_id || "start"),
    [client, setClient] = useState(""),
    [newClient, setNewClient] = useState(false),
    [company, setCompany] = useState(brief.company || ""),
    [email, setEmail] = useState(request?.email || ""),
    [contact, setContact] = useState(request?.name || ""),
    [phone, setPhone] = useState(brief.phone || ""),
    [accountId, setAccountId] = useState(""),
    [staff, setStaff] = useState<string[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(internal + "/allocate", "POST", {
        key,
        requestId: request?.id || null,
        name,
        planId: plan,
        clientId: newClient ? null : client || null,
        newClient: newClient
          ? { companyName: company, email, contactName: contact, phone }
          : null,
        accountId: accountId || null,
        staffIds: staff,
        confirmed,
      });
      toast.success(
        "Proiectul, clientul și abonamentul în așteptare sunt sincronizate.",
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Alocarea a eșuat.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creează și alocă un website prin abonament</DialogTitle>
          <DialogDescription>
            Se reutilizează clientul, contul, proiectele și abonamentele native.
            Crearea proiectului nu declanșează o plată.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Label>
            Denumire proiect
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
            />
          </Label>
          <SearchableSelect
            label="Plan website"
            value={plan}
            onChange={setPlan}
            options={options.plans.map((p) => ({
              value: p.id,
              label: p.name,
              description: p.available
                ? "Tarif și termeni confirmați"
                : "Configurare comercială necesară",
            }))}
          />
          <label className="flex gap-2 text-xs">
            <input
              type="checkbox"
              checked={newClient}
              onChange={(e) => setNewClient(e.target.checked)}
            />
            Client nou în CRM
          </label>
          {newClient ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                Firma / activitatea
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  minLength={2}
                />
              </Label>
              <Label>
                Persoană contact
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  minLength={2}
                />
              </Label>
              <Label>
                E-mail
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
              </Label>
              <Label>
                Telefon (opțional)
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Label>
            </div>
          ) : (
            <SearchableSelect
              label="Client existent"
              value={client}
              onChange={setClient}
              options={options.clients.map((c) => ({
                value: c.id,
                label: c.company_name,
                description: c.email,
              }))}
              required
            />
          )}
          <SearchableSelect
            label="Cont client autorizat"
            value={accountId}
            onChange={setAccountId}
            options={options.accounts.map((a) => ({
              value: a.id,
              label: a.display_name || a.email,
              description: a.email,
            }))}
            emptyLabel="Fără cont alocat încă"
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Contul ales primește acces la entitatea clientului și la proiect. Nu
            deducem autorizarea doar din e-mail. Pentru un cont nou, folosește{" "}
            <Link className="underline" to="/profil?tab=clients">
              Clienți → creare cont
            </Link>
            , apoi revino la alocare.
          </p>
          <fieldset className="rounded-xl border p-3">
            <legend className="px-1 text-xs">Echipa proiectului</legend>
            <div className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
              {options.staff.map((s) => (
                <label className="flex gap-2 text-xs" key={s.id}>
                  <input
                    type="checkbox"
                    checked={staff.includes(s.id)}
                    onChange={(e) =>
                      setStaff((v) =>
                        e.target.checked
                          ? [...v, s.id]
                          : v.filter((id) => id !== s.id),
                      )
                    }
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-xs leading-relaxed">
            <input
              required
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Confirm asocierea clientului, contului și echipei. Abonamentul
            rămâne în așteptare până la acceptarea termenilor și confirmarea
            plății.
          </label>
          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy || (!newClient && !client)} type="submit">
            {busy ? "Se creează…" : "Creează și sincronizează"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ProjectSheet({
  id,
  onClose,
  accounts,
}: {
  id: string;
  onClose: () => void;
  accounts?: Options["accounts"];
}) {
  const [detail, setDetail] = useState<Detail | null>(null),
    [tab, setTab] = useState("overview"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [kind, setKind] = useState("content"),
    [triage, setTriage] = useState<
      Record<string, { kind: string; units: number }>
    >({}),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [stage, setStage] = useState(""),
    [domain, setDomain] = useState(""),
    [update, setUpdate] = useState("");
  const load = useCallback(async () => {
    try {
      const v = await api<Detail>(
        account + "/projects/" + encodeURIComponent(id),
      );
      setDetail(v);
      setStage(v.data.banner_status === "testing" ? "testing" : v.data.status);
      setDomain(v.data.domain || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fișa nu poate fi încărcată.");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (path: string, method: string, data: unknown) => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ url?: string }>(path, method, data);
      if (result.url) {
        const url = new URL(result.url);
        if (
          url.protocol !== "https:" ||
          !(
            path === "/api/billing/portal"
              ? ["billing.stripe.com"]
              : ["checkout.stripe.com"]
          ).includes(url.hostname)
        )
          throw Error("Destinație de plată nevalidă.");
        window.location.assign(result.url);
      } else {
        await load();
        toast.success("Operațiunea a fost înregistrată.");
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operațiunea nu a reușit.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const [billing, setBilling] = useState<BillingDetails | null>(null),
    [billingLocked, setBillingLocked] = useState(false),
    [newAccount, setNewAccount] = useState("");
  useEffect(() => {
    if (!detail?.data.canSubscribe && !detail?.data.canManage) return;
    let active = true;
    api<{ data: BillingDetails; locked: boolean }>(
      account + "/projects/" + id + "/billing",
    )
      .then((r) => {
        if (active) {
          setBilling(r.data);
          setBillingLocked(r.locked);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [
    id,
    detail?.data.current_order_id,
    detail?.data.canSubscribe,
    detail?.data.canManage,
  ]);
  const p = detail?.data;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{p?.name || "Fișa website-ului"}</DialogTitle>
          <DialogDescription>
            {p
              ? `${p.company_name} · ${p.plan.name} · ${money(p)}`
              : "Se încarcă…"}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/25 p-3 text-xs text-red-300"
          >
            {error}
          </p>
        )}
        {p && detail && (
          <>
            <div className="flex flex-wrap gap-2">
              {[
                ["overview", "Proiect"],
                ["changes", "Modificări"],
                ["billing", "Abonament"],
                ["activity", "Monitorizare & activitate"],
              ].map(([id, label]) => (
                <Button
                  size="sm"
                  key={id}
                  variant={tab === id ? "default" : "outline"}
                  onClick={() => setTab(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={tile}>
                    <p className="text-xs text-muted-foreground">
                      Stare / acces client
                    </p>
                    <p className="mt-1 text-sm">
                      {p.banner_status === "testing" ? "Testare" : p.status} ·{" "}
                      {p.owner_user_id ? "Cont alocat" : "Cont nealocat"}
                    </p>
                  </div>
                  <div className={tile}>
                    <p className="text-xs text-muted-foreground">
                      Domeniu principal
                    </p>
                    <p className="mt-1 break-all text-sm">
                      {p.domain || "De completat · furnizat de client"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    [
                      "Proiect și etape",
                      "/intern/projects/" +
                        encodeURIComponent(
                          "website-" +
                            p.project_id.replace("wsp_", "").toLowerCase(),
                        ),
                    ],
                    [
                      "Documentele proiectului",
                      "/profil?tab=documents&documentView=client&project=" +
                        encodeURIComponent(p.project_id),
                    ],
                    [
                      "Conversația proiectului",
                      "/profil?tab=tickets&supportView=chat&project=" +
                        encodeURIComponent(p.project_id),
                    ],
                  ].map(([label, url]) => (
                    <Button
                      key={String(label)}
                      asChild
                      size="sm"
                      variant="outline"
                    >
                      <Link to={url}>
                        {label}
                        <ArrowUpRight className="ml-1 size-3.5" />
                      </Link>
                    </Button>
                  ))}
                </div>
                {p.canManage && !p.current_order_id && accounts && (
                  <div className={tile + " space-y-3"}>
                    <h3 className="text-sm font-semibold">
                      Alocă un cont client
                    </h3>
                    <SearchableSelect
                      label="Contul clientului pentru acest website"
                      value={newAccount || p.owner_user_id || ""}
                      onChange={setNewAccount}
                      emptyLabel="Selectează un cont autorizat"
                      options={accounts.map((a) => ({
                        value: a.id,
                        label: a.display_name || a.email,
                        description: a.email,
                      }))}
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Alocarea este explicită și acordă acces la entitatea
                      clientului. Retragerea accesurilor vechi se gestionează în
                      fișa clientului.
                    </p>
                    <Button
                      size="sm"
                      disabled={
                        busy || !newAccount || newAccount === p.owner_user_id
                      }
                      onClick={() =>
                        void act(
                          internal + "/projects/" + id + "/account",
                          "POST",
                          {
                            accountId: newAccount,
                            revision: p.revision,
                            confirmed: true,
                          },
                        )
                      }
                    >
                      Confirmă alocarea contului
                    </Button>
                  </div>
                )}
                <div className={tile}>
                  <h3 className="mb-3 text-sm font-semibold">
                    Etape standard și activități native
                  </h3>
                  {detail.work.map((w) => (
                    <p
                      className="flex items-center justify-between border-t py-2 text-xs"
                      key={w.id}
                    >
                      <span>{w.title}</span>
                      <Badge variant="outline">{w.status}</Badge>
                    </p>
                  ))}
                </div>
                {p.canWork && (
                  <form
                    className={tile + " space-y-3"}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act(internal + "/projects/" + id, "PATCH", {
                        revision: p.revision,
                        stage,
                        domain,
                        update,
                      });
                    }}
                  >
                    <h3 className="text-sm font-semibold">
                      Actualizează proiectul
                    </h3>
                    <SearchableSelect
                      label="Etapa website-ului"
                      value={stage}
                      onChange={setStage}
                      options={[
                        ["lead", "Propus"],
                        ["in_progress", "În dezvoltare"],
                        ["testing", "Testare"],
                        ["live", "Lansat"],
                        ["maintenance", "Mentenanță"],
                      ].map(([value, label]) => ({ value, label }))}
                    />
                    <Label>
                      Domeniu principal
                      <Input
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="afacerea.ro"
                      />
                    </Label>
                    <Label>
                      Actualizare vizibilă clientului
                      <Textarea
                        value={update}
                        onChange={(e) => setUpdate(e.target.value)}
                        maxLength={2000}
                      />
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Lansarea cere aprobarea clientului. Starea proiectului nu
                      publică automat fișiere sau DNS; se utilizează fluxul
                      autorizat AVYRON Studio / proiect.
                    </p>
                    <Button disabled={busy}>Salvează etapa</Button>
                  </form>
                )}
                {p.clientApproval && (
                  <div className={tile}>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Verifică preview-ul și livrabilele din proiect. Aprobarea
                      ta se înregistrează pentru revizia {p.content_revision};
                      publicarea este o acțiune separată a echipei.
                    </p>
                    <Button
                      className="mt-3"
                      disabled={
                        busy || p.approved_revision === p.content_revision
                      }
                      onClick={() =>
                        void act(
                          account + "/projects/" + id + "/approve",
                          "POST",
                          { revision: p.content_revision, confirmed: true },
                        )
                      }
                    >
                      {p.approved_revision === p.content_revision
                        ? "Revizie aprobată"
                        : "Aprob revizia pentru lansare"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {tab === "changes" && (
              <div className="space-y-3">
                <div className={tile}>
                  <p className="text-sm font-semibold">
                    {p.period
                      ? `${Math.max(0, p.period.change_limit - p.period.used)} modificări de conținut disponibile în perioada curentă`
                      : "Perioada de abonament nu este încă verificată"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Defectele și solicitările de securitate sunt urmărite
                    separat, fără consum de modificări. Echipa confirmă
                    clasificarea și unitățile înainte de execuție.
                  </p>
                </div>
                <form
                  className={tile + " space-y-3"}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await act(
                        account + "/projects/" + id + "/changes",
                        "POST",
                        { key, title, description: text, kind },
                      )
                    ) {
                      setTitle("");
                      setText("");
                      setKey(crypto.randomUUID());
                    }
                  }}
                >
                  <Label>
                    Subiect
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      minLength={3}
                      maxLength={180}
                      required
                    />
                  </Label>
                  <SearchableSelect
                    label="Tip solicitare"
                    value={kind}
                    onChange={setKind}
                    options={[
                      { value: "content", label: "Conținut / îmbunătățire" },
                      { value: "bug", label: "Defect / funcționare" },
                      { value: "security", label: "Securitate" },
                    ]}
                  />
                  <Label>
                    Ce trebuie schimbat?
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      minLength={5}
                      maxLength={3000}
                      required
                    />
                  </Label>
                  <Button disabled={busy}>Trimite solicitarea</Button>
                </form>
                {detail.changes.map((ch) => (
                  <div className={tile} key={ch.id}>
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-sm">{ch.title}</strong>
                      <Badge variant="outline">{ch.status}</Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {ch.description}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {ch.kind} · {ch.kind === "content" ? ch.units : 0} unități
                      ·{" "}
                      {ch.reviewed_by
                        ? "Clasificare verificată"
                        : "Așteaptă triere"}
                    </p>
                    {p.canWork && !["done", "rejected"].includes(ch.status) && (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <div className="w-full sm:w-56">
                          <SearchableSelect
                            label="Clasificare verificată"
                            value={triage[ch.id]?.kind || ch.kind}
                            options={[
                              {
                                value: "content",
                                label: "Conținut / îmbunătățire",
                              },
                              { value: "bug", label: "Defect · fără consum" },
                              {
                                value: "security",
                                label: "Securitate · fără consum",
                              },
                            ]}
                            onChange={(kind) =>
                              setTriage((v) => ({
                                ...v,
                                [ch.id]: {
                                  kind,
                                  units: v[ch.id]?.units || ch.units,
                                },
                              }))
                            }
                          />
                        </div>
                        {(triage[ch.id]?.kind || ch.kind) === "content" && (
                          <Label className="w-24 text-xs">
                            Unități
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={triage[ch.id]?.units || ch.units}
                              onChange={(e) =>
                                setTriage((v) => ({
                                  ...v,
                                  [ch.id]: {
                                    kind: v[ch.id]?.kind || ch.kind,
                                    units: Math.max(
                                      1,
                                      Math.min(20, Number(e.target.value) || 1),
                                    ),
                                  },
                                }))
                              }
                            />
                          </Label>
                        )}
                        {[
                          ["reviewed", "Confirmă tipul"],
                          ["in_progress", "În lucru"],
                          ["done", "Finalizează"],
                          ["rejected", "Respinge"],
                        ].map(([status, label]) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              void act(account + "/changes/" + ch.id, "PATCH", {
                                kind: triage[ch.id]?.kind || ch.kind,
                                units: triage[ch.id]?.units || ch.units,
                                status,
                              })
                            }
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tab === "billing" && (
              <div className="space-y-4">
                <div className={tile}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {p.plan.name} · {money(p)}
                    </h3>
                    <Badge variant="outline">{p.subscription_status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.paid_months} perioade lunare achitate ·{" "}
                    {p.period
                      ? `Perioada ${new Date(p.period.starts_at).toLocaleDateString("ro-RO")} — ${new Date(p.period.ends_at).toLocaleDateString("ro-RO")}`
                      : "Plata și perioada sunt confirmate prin procesator, nu prin butonul de abonare."}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Dezvoltare inclusă — 0 lei. Nicio schimbare automată după
                    luna 12 și nicio penalitate implicită.
                  </p>
                  <Button className="mt-3" variant="outline" size="sm" asChild>
                    <Link to="/profil?tab=payments">
                      Date de facturare, carduri și facturi
                    </Link>
                  </Button>
                </div>
                {p.canManage && !p.current_order_id && (
                  <div className={tile}>
                    <p className="text-xs text-muted-foreground">
                      Înainte de acceptare, poți prelua explicit cea mai nouă
                      revizie aprobată a aceluiași plan.
                    </p>
                    <Button
                      className="mt-3"
                      disabled={busy}
                      variant="outline"
                      onClick={() =>
                        void act(
                          internal + "/projects/" + id + "/plan",
                          "POST",
                          {
                            revision: p.revision,
                            planId: p.plan_id,
                            confirmed: true,
                          },
                        )
                      }
                    >
                      Actualizează planul înainte de acceptare
                    </Button>
                  </div>
                )}
                {billing && (
                  <form
                    className={tile + " space-y-3"}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (
                        await act(
                          account + "/projects/" + id + "/billing",
                          "PUT",
                          billing,
                        )
                      )
                        toast.success(
                          "Datele beneficiarului pentru acest abonament sunt salvate.",
                        );
                    }}
                  >
                    <p className="text-xs text-muted-foreground">
                      Beneficiarul facturii: {p.company_name}. Aceste date sunt
                      specifice proiectului; nu se preiau de la o altă firmă
                      reprezentată prin același cont.
                    </p>
                    <fieldset disabled={billingLocked}>
                      <BillingFields value={billing} onChange={setBilling} />
                    </fieldset>
                    {!billingLocked && (
                      <Button type="submit" disabled={busy}>
                        Salvează datele de facturare
                      </Button>
                    )}
                    {billingLocked && (
                      <p className="text-xs text-muted-foreground">
                        Identitatea acceptată se păstrează în istoricul
                        comenzii. Corecțiile ulterioare necesită verificare
                        financiară.
                      </p>
                    )}
                  </form>
                )}
                {p.canSubscribe && p.provider_subscription_id && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void act("/api/billing/portal", "POST", {})}
                  >
                    Gestionează abonamentul / anularea în Stripe
                  </Button>
                )}
                <div className={tile}>
                  <h3 className="text-sm font-semibold">
                    Termeni pentru această alocare · revizia {p.plan_revision}
                  </h3>
                  {p.plan.available ? (
                    <>
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">
                        {p.plan.terms}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">
                        {p.plan.cancellation}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {p.plan.emailPolicy}
                      </p>
                      {p.canSubscribe && !p.provider_subscription_id && (
                        <>
                          <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed">
                            <input
                              type="checkbox"
                              checked={accepted}
                              onChange={(e) => setAccepted(e.target.checked)}
                            />
                            Am citit și accept termenii și condițiile de
                            abonare, tariful și anularea pentru această revizie.
                            Confirm inițierea abonamentului lunar prin Stripe.
                          </label>
                          <Button
                            className="mt-3"
                            disabled={busy || !accepted}
                            onClick={() =>
                              void act(
                                account + "/projects/" + id + "/checkout",
                                "POST",
                                {
                                  revision: p.plan_revision,
                                  accepted: true,
                                  provider: "stripe",
                                },
                              )
                            }
                          >
                            Continuă la plata securizată
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-amber-300">
                      Tariful și condițiile necesită configurare și aprobare
                      înainte de abonare. Poți urmări proiectul și discuta cu
                      echipa.
                    </p>
                  )}
                </div>
                {p.paid_months >= 12 && (
                  <div className={tile}>
                    <h3 className="text-sm font-semibold">
                      Tranziție opțională la mentenanță standard
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Solicitarea este revizuită de echipă. Abonamentul și
                      plățile actuale nu se modifică automat.
                    </p>
                    {p.clientApproval && (
                      <Button
                        className="mt-3"
                        disabled={busy || !!p.transition_requested_at}
                        onClick={() =>
                          void act(
                            account + "/projects/" + id + "/transition",
                            "POST",
                            {},
                          )
                        }
                      >
                        {p.transition_requested_at
                          ? "Tranziție solicitată"
                          : "Solicită mentenanță standard"}
                      </Button>
                    )}
                    {p.canManage && (
                      <Button className="mt-3" asChild variant="outline">
                        <Link
                          to={
                            "/profil?tab=client-maintenance&project=" +
                            encodeURIComponent(id)
                          }
                        >
                          Pregătește oferta de mentenanță
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            {tab === "activity" && (
              <div className="space-y-3">
                <div className={tile}>
                  <div className="flex gap-2">
                    <ShieldCheck className="size-5 text-lime-400" />
                    <h3 className="text-sm font-semibold">
                      Monitorizare pe date verificate
                    </h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Disponibilitatea, SSL, DNS, backupul și performanța se
                    consultă din integrările și rapoartele native ale
                    proiectului. Lipsa unui raport nu este un rezultat
                    „funcțional”. Fără promisiuni de monitorizare 24/7 sau
                    intervenție instantanee.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to={
                          "/profil?tab=projects&project=" +
                          encodeURIComponent(id)
                        }
                      >
                        Rapoartele proiectului
                      </Link>
                    </Button>
                    {p.canManage && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/profil?tab=domains">Domenii și DNS</Link>
                      </Button>
                    )}
                  </div>
                </div>
                {(detail.statistics || []).map((stat, i) => (
                  <div
                    className={tile}
                    key={stat.period_start + ":" + stat.source + ":" + i}
                  >
                    <p className="text-xs font-semibold">
                      Raport ·{" "}
                      {new Date(stat.period_start).toLocaleDateString("ro-RO")}{" "}
                      — {new Date(stat.period_end).toLocaleDateString("ro-RO")}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      {[
                        ["Vizite", stat.visits],
                        ["Vizitatori unici", stat.unique_visitors],
                        [
                          "Disponibilitate",
                          stat.uptime_percent === null
                            ? null
                            : stat.uptime_percent + "%",
                        ],
                        [
                          "Răspuns mediu",
                          stat.avg_response_ms === null
                            ? null
                            : stat.avg_response_ms + " ms",
                        ],
                      ].map(([label, value]) => (
                        <p key={String(label)}>
                          <span className="block text-muted-foreground">
                            {label}
                          </span>
                          <strong>{value ?? "Necunoscut"}</strong>
                        </p>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Sursă: {stat.source} · Înregistrat{" "}
                      {new Date(stat.created_at).toLocaleString("ro-RO")}
                    </p>
                  </div>
                ))}
                {detail.links.map((l) => (
                  <a
                    className={
                      tile + " flex items-center justify-between text-xs"
                    }
                    key={l.kind + l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.label}
                    <ArrowUpRight className="size-4" />
                  </a>
                ))}
                {detail.activity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nicio actualizare înregistrată încă.
                  </p>
                ) : (
                  detail.activity.map((a) => (
                    <article className={tile} key={a.id}>
                      <small className="text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("ro-RO")}
                      </small>
                      <h3 className="mt-1 text-sm font-semibold">{a.title}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {a.description}
                      </p>
                    </article>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
