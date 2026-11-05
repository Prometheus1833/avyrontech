import type { AdminSubscription } from "@/lib/adminOperationsApi";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { subscriptionOperationsApi as api } from "@/lib/subscriptionOperationsApi";
import {
  subscriptionDate,
  subscriptionTimestamp,
  type AllocationInput,
  type ClientSubscription,
} from "@/shared/subscriptionOperations";
import { BillingFields, Field } from "./SubscriptionFields";
import {
  blankBilling,
  cycleNames,
  date,
  inputClass,
  money,
  panelClass,
  statusNames,
} from "./subscriptionPresentation";
import { useSubscriptionData } from "./useSubscriptionData";
const blank = () => ({
  clientMode: "existing",
  clientId: "",
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  accountId: "",
  projectId: "",
  planSku: "",
  name: "",
  price: "",
  specifications: [{ key: "Servicii incluse", value: "" }],
  targetLabel: "",
  externalUrl: "",
  productSlug: "",
  billingDate: "",
  billing: blankBilling(),
});
const readSpecs = (raw: string) => {
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v)
      ? Object.entries(v).filter(
          (r): r is [string, string] => typeof r[1] === "string",
        )
      : [];
  } catch {
    return [];
  }
};
export default function ClientSubscriptionsPanel({
  onConfigureSubscription,
}: {
  onConfigureSubscription: (value: AdminSubscription) => void;
}) {
  const { data, error, loading, refresh } = useSubscriptionData(api.clients),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("active"),
    [open, setOpen] = useState(false),
    [draft, setDraft] = useState(blank),
    [review, setReview] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [selected, setSelected] = useState<ClientSubscription | null>(null),
    [edit, setEdit] = useState({
      billing: blankBilling(),
      date: "",
      status: "active" as "active" | "paused" | "cancelled",
    }),
    [prepare, setPrepare] = useState<ClientSubscription | null>(null),
    [prepareConfirmed, setPrepareConfirmed] = useState(false);
  const retry = useRef({ payload: "", key: crypto.randomUUID() });
  const keyFor = (value: unknown) => {
    const payload = JSON.stringify(value);
    if (payload !== retry.current.payload)
      retry.current = { payload, key: crypto.randomUUID() };
    return retry.current.key;
  };
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ro");
    return (data?.data || []).filter(
      (s) =>
        (filter === "all" ||
          (filter === "active" && s.status === "active") ||
          (filter === "due" &&
            s.status === "active" &&
            s.next_billing_date < Date.now()) ||
          (filter === "pending" && !s.account_count)) &&
        (!q ||
          [
            s.company_name,
            s.project_name,
            s.service_name,
            s.plan_sku,
            s.target_label,
          ].some((v) =>
            String(v || "")
              .toLocaleLowerCase("ro")
              .includes(q),
          )),
    );
  }, [data, query, filter]);
  const plan = data?.plans.find((p) => p.sku === draft.planSku),
    client = data?.clients.find((c) => c.id === draft.clientId),
    account = data?.accounts.find((a) => a.id === draft.accountId);
  const start = (sku = "") => {
    const p = data?.plans.find((x) => x.sku === sku);
    setDraft({
      ...blank(),
      planSku: sku,
      name: p?.name || "",
      price: p ? String(p.priceMinor / 100) : "",
      specifications: p
        ? Object.entries(p.specifications).map(([key, value]) => ({
            key,
            value,
          }))
        : [{ key: "Servicii incluse", value: "" }],
    });
    setReview(false);
    setConfirmed(false);
    setFormError("");
    setOpen(true);
  };
  const selectPlan = (sku: string) => {
    const p = data?.plans.find((x) => x.sku === sku);
    setDraft((v) => ({
      ...v,
      planSku: sku,
      name: p?.name || v.name,
      price: p ? String(p.priceMinor / 100) : v.price,
      specifications: p
        ? Object.entries(p.specifications).map(([key, value]) => ({
            key,
            value,
          }))
        : v.specifications,
    }));
  };
  const selectClient = (id: string) => {
    const c = data?.clients.find((v) => v.id === id);
    setDraft((v) => ({
      ...v,
      clientId: id,
      projectId: "",
      accountId:
        data?.accounts.find(
          (a) => a.email.toLowerCase() === c?.email.toLowerCase(),
        )?.id || "",
      billing: {
        ...blankBilling(),
        legalName: c?.company_name || "",
        invoiceEmail: c?.email || "",
      },
    }));
  };
  const payload = (): AllocationInput => ({
    clientId: draft.clientMode === "existing" ? draft.clientId : null,
    newClient:
      draft.clientMode === "new"
        ? {
            companyName: draft.companyName,
            contactName: draft.contactName,
            email: draft.email,
            phone: draft.phone,
          }
        : null,
    accountId: draft.accountId || null,
    projectId: draft.projectId || null,
    planSku: draft.planSku || null,
    name: draft.name,
    priceMinor: Math.round(Number(draft.price) * 100),
    specifications: Object.fromEntries(
      draft.specifications.map((s) => [s.key.trim(), s.value.trim()]),
    ),
    targetLabel: draft.targetLabel,
    externalUrl: draft.externalUrl || null,
    productSlug: draft.productSlug || null,
    nextBillingDate: subscriptionTimestamp(draft.billingDate),
    billing: draft.billing,
    confirmed: true,
  });
  const changed = async () => {
    await refresh();
    window.dispatchEvent(new Event("avyron:subscriptions-changed"));
  };
  const allocate = async () => {
    if (!confirmed) return;
    setBusy(true);
    setFormError("");
    try {
      const value = payload();
      await api.allocate(value, keyFor(value));
      setOpen(false);
      toast.success(
        "Abonamentul a fost alocat. Calendarul lunar este pregătit.",
      );
      await changed();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Alocarea nu a reușit.");
    } finally {
      setBusy(false);
    }
  };
  const validate = (e: FormEvent) => {
    e.preventDefault();
    const specs = draft.specifications;
    if (
      specs.some((s) => !s.key.trim() || !s.value.trim()) ||
      new Set(specs.map((s) => s.key.trim())).size !== specs.length
    ) {
      setFormError(
        "Completează fiecare specificație și folosește denumiri distincte.",
      );
      return;
    }
    if (!draft.clientId && draft.clientMode === "existing") {
      setFormError("Selectează clientul.");
      return;
    }
    setFormError("");
    setReview(true);
  };
  const configure = (s: ClientSubscription) => {
    setSelected(s);
    setEdit({
      billing: s.billing || {
        ...blankBilling(),
        legalName: s.company_name,
        invoiceEmail:
          data?.clients.find((c) => c.id === s.client_id)?.email || "",
      },
      date: subscriptionDate(s.next_billing_date),
      status: s.status,
    });
    setFormError("");
  };
  const saveBilling = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const value = {
        revision: selected.revision,
        billing: edit.billing,
        nextBillingDate: subscriptionTimestamp(edit.date),
        status: edit.status,
      };
      await api.billing(
        selected.id,
        value,
        keyFor({ id: selected.id, ...value }),
      );
      setSelected(null);
      toast.success("Datele de facturare au fost salvate.");
      await changed();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Salvarea nu a reușit.");
    } finally {
      setBusy(false);
    }
  };
  const prepareInvoice = async () => {
    if (!prepare || !prepareConfirmed) return;
    setBusy(true);
    try {
      const value = {
        id: prepare.id,
        revision: prepare.revision,
        billingDate: prepare.next_billing_date,
      };
      await api.prepare(
        value.id,
        value.revision,
        value.billingDate,
        keyFor(value),
      );
      setPrepare(null);
      toast.success(
        "Ciorna a fost pregătită în Financiar; nu a fost emisă sau transmisă.",
      );
      await changed();
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Ciorna nu a putut fi pregătită.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-w-0 space-y-4 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Abonamente Clienți
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Alocări, specificații și calendar de facturare, în același loc.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void refresh()}
            aria-label="Reîmprospătează abonamentele"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button disabled={!data} onClick={() => start()}>
            <Plus className="mr-2 size-4" />
            Alocă client
          </Button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 p-3 text-sm text-red-200"
        >
          {error}{" "}
          <button className="underline" onClick={() => void refresh()}>
            Reîncearcă
          </button>
        </p>
      )}
      {loading && !data && (
        <p role="status" className="text-sm text-slate-400">
          Se încarcă abonamentele…
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-white/10 px-4 py-3 text-sm">
            <span>
              <strong>
                {data.data.filter((s) => s.status === "active").length}
              </strong>{" "}
              active
            </span>
            <span>
              <strong>
                {
                  data.data.filter(
                    (s) =>
                      s.status === "active" && s.next_billing_date < Date.now(),
                  ).length
                }
              </strong>{" "}
              de facturat
            </span>
            <span>
              <strong>
                {data.data.filter((s) => !s.account_count).length}
              </strong>{" "}
              fără cont asociat
            </span>
          </div>
          <section
            aria-label="Monitorizare abonamente clienți"
            className={panelClass}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Monitorizare lunară</h2>
              <div className="flex min-w-0 flex-wrap gap-2">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Caută abonament</span>
                  <Search className="absolute left-2 top-3 size-4 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`${inputClass} mt-0 pl-8`}
                    placeholder="Client, proiect, plan…"
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrează abonamentele</span>
                  <select
                    className={`${inputClass} mt-0`}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="due">De facturat</option>
                    <option value="pending">Fără cont</option>
                    <option value="all">Toate stările</option>
                  </select>
                </label>
              </div>
            </div>
            {!rows.length && (
              <p className="py-5 text-center text-sm text-slate-400">
                Nu există abonamente pentru filtrul curent.
              </p>
            )}
            <div className="divide-y divide-white/10">
              {rows.map((s) => (
                <details key={s.id} className="group py-3">
                  <summary className="grid cursor-pointer list-none gap-2 rounded-lg outline-offset-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {s.company_name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {s.service_name} · {s.project_name}
                      </p>
                    </div>
                    <div className="text-xs text-slate-300">
                      <p>
                        {money(Math.round(s.price * 100))} ·{" "}
                        {cycleNames[s.billing_cycle] || s.billing_cycle}
                      </p>
                      <p
                        className={`mt-1 ${s.status === "active" && s.next_billing_date < Date.now() ? "text-amber-200" : "text-slate-400"}`}
                      >
                        Facturare: {date(s.next_billing_date)}
                      </p>
                    </div>
                    <span className="text-xs text-violet-200">
                      {statusNames[s.status] || s.status} · Detalii
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3 rounded-xl bg-black/15 p-3 text-xs">
                    <p className="text-slate-400">
                      {s.account_count
                        ? `${s.account_count} conturi autorizate · disponibil în contul clientului`
                        : "În așteptarea unui cont verificat · folosește asocierea din fișa clientului pentru conturi cu alt e-mail."}
                    </p>
                    <p>
                      {s.billingClientMatches
                        ? "Datele de facturare sunt completate."
                        : "Datele de facturare necesită completare sau reverificarea beneficiarului."}{" "}
                      {s.billing
                        ? `Termen: ${s.billing.paymentTermsDays} zile.`
                        : ""}
                    </p>
                    {s.target_label && <p>Obiect: {s.target_label}</p>}
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {readSpecs(s.specifications_json).map(([key, value]) => (
                        <div key={key}>
                          <dt className="font-medium text-slate-300">{key}</dt>
                          <dd className="whitespace-pre-wrap break-words text-slate-400">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {s.billing_cycle === "monthly" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => configure(s)}
                        >
                          Date de facturare
                        </Button>
                      )}
                      {s.maintenance_enabled === 1 ? (
                        <Link
                          className="inline-flex min-h-9 items-center underline"
                          to={`/profil?tab=maintenance&project=${encodeURIComponent(s.project_id)}`}
                        >
                          Plan și echipă · AVY Core
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onConfigureSubscription(s)}
                        >
                          Configurează serviciul
                        </Button>
                      )}
                      <Link
                        className="inline-flex min-h-9 items-center underline"
                        to={`/profil?tab=documents&subscription=${encodeURIComponent(s.id)}`}
                      >
                        Documente
                      </Link>
                      {s.status === "active" &&
                        s.billing_cycle === "monthly" && (
                          <Button
                            size="sm"
                            disabled={
                              !s.billingClientMatches ||
                              !data.canPrepareInvoices
                            }
                            onClick={() => {
                              setPrepare(s);
                              setPrepareConfirmed(false);
                              setFormError("");
                            }}
                          >
                            Pregătește factura
                          </Button>
                        )}
                    </div>
                    {!data.canPrepareInvoices && (
                      <p className="text-slate-500">
                        Pregătirea ciornelor financiare necesită drept financiar
                        și MFA. Alocarea nu activează debitarea automată.
                      </p>
                    )}
                    {s.periods.length > 0 && (
                      <div className="space-y-2 border-t border-white/10 pt-3">
                        <h3 className="font-semibold">Perioade pregătite</h3>
                        {s.periods.map((p) => (
                          <div
                            key={p.billing_date}
                            className="flex flex-wrap justify-between gap-2"
                          >
                            <span>
                              {date(p.billing_date)} · scadență{" "}
                              {date(p.due_date)}
                            </span>
                            <span>
                              {statusNames[p.status] || p.status}
                              {p.invoice_number
                                ? ` · ${p.invoice_number}`
                                : ""}{" "}
                              ·{" "}
                              <Link
                                className="underline"
                                to="/profil?tab=finance"
                              >
                                Financiar
                              </Link>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
          <details className={panelClass}>
            <summary className="cursor-pointer text-sm font-semibold">
              Planuri disponibile · {data.plans.length}
            </summary>
            <p className="mt-2 text-xs text-slate-400">
              Selectează un plan pentru completarea specificațiilor. Ajustările
              alocării nu schimbă prețul general din catalog.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {data.plans.map((p) => (
                <article
                  key={p.sku}
                  className="rounded-xl border border-white/10 p-3"
                >
                  <p className="text-xs text-slate-500">{p.category}</p>
                  <h3 className="mt-1 text-sm font-semibold">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {money(p.priceMinor)} / lună
                  </p>
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="outline"
                    onClick={() => start(p.sku)}
                  >
                    Alocă client · {p.name}
                  </Button>
                </article>
              ))}
            </div>
          </details>
          {!!data.providerSubscriptions.length && (
            <details className={panelClass}>
              <summary className="cursor-pointer text-sm font-semibold">
                Abonamente prin procesator · {data.providerSubscriptions.length}
              </summary>
              <div className="mt-3 divide-y divide-white/10">
                {data.providerSubscriptions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap justify-between gap-2 py-2 text-xs"
                  >
                    <span className="break-all">
                      {s.email} · {s.sku} · {s.provider}
                    </span>
                    <span>
                      {money(s.amount_minor, s.currency)} ·{" "}
                      {statusNames[s.status] || s.status} ·{" "}
                      {date(s.current_period_end)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Stările provin din registrul procesatorului. O alocare manuală
                nu creează o plată sau o licență.
              </p>
            </details>
          )}
        </>
      )}
      <Dialog
        open={open && !!data}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent className="dark max-h-[90dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Alocă un abonament unui client</DialogTitle>
            <DialogDescription>
              Client existent sau viitor, plan și condiții lunare. Conturile și
              proiectele folosesc înregistrările AVYRON OS.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-red-200">
              {formError}
            </p>
          )}
          {!review ? (
            <form onSubmit={validate} className="space-y-4">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <Field label="Beneficiar">
                  <select
                    className={inputClass}
                    value={draft.clientMode}
                    onChange={(e) =>
                      setDraft((v) => ({
                        ...v,
                        clientMode: e.target.value,
                        billing: blankBilling(),
                        clientId: "",
                        projectId: "",
                        accountId: "",
                      }))
                    }
                  >
                    <option value="existing">Client existent</option>
                    <option value="new">
                      Client viitor · fișă nouă în CRM
                    </option>
                  </select>
                </Field>
                {draft.clientMode === "existing" ? (
                  <Field label="Selectează clientul">
                    <select
                      required
                      className={inputClass}
                      value={draft.clientId}
                      onChange={(e) => selectClient(e.target.value)}
                    >
                      <option value="">Alege clientul…</option>
                      {data?.clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name} · {c.email}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <>
                    <Field label="Nume client / societate">
                      <input
                        required
                        className={inputClass}
                        value={draft.companyName}
                        onChange={(e) =>
                          setDraft((v) => ({
                            ...v,
                            companyName: e.target.value,
                            billing: {
                              ...v.billing,
                              legalName: e.target.value,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Persoană de contact">
                      <input
                        className={inputClass}
                        value={draft.contactName}
                        onChange={(e) =>
                          setDraft((v) => ({
                            ...v,
                            contactName: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="E-mail client">
                      <input
                        required
                        type="email"
                        className={inputClass}
                        value={draft.email}
                        onChange={(e) =>
                          setDraft((v) => ({
                            ...v,
                            email: e.target.value,
                            accountId:
                              data?.accounts.find(
                                (a) =>
                                  a.email.toLowerCase() ===
                                  e.target.value.trim().toLowerCase(),
                              )?.id || "",
                            billing: {
                              ...v.billing,
                              invoiceEmail: e.target.value,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Telefon · opțional">
                      <input
                        type="tel"
                        className={inputClass}
                        value={draft.phone}
                        onChange={(e) =>
                          setDraft((v) => ({ ...v, phone: e.target.value }))
                        }
                      />
                    </Field>
                  </>
                )}
                <Field label="Cont client autorizat">
                  <select
                    className={inputClass}
                    value={draft.accountId}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, accountId: e.target.value }))
                    }
                  >
                    <option value="">Fără asociere nouă de cont</option>
                    {data?.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.email}
                        {a.client_ids.includes(draft.clientId)
                          ? " · deja autorizat"
                          : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Proiect">
                  <select
                    className={inputClass}
                    value={draft.projectId}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, projectId: e.target.value }))
                    }
                  >
                    <option value="">
                      Proiect dedicat nou pentru acest abonament
                    </option>
                    {data?.projects
                      .filter((p) => p.client_id === draft.clientId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Tip abonament">
                  <select
                    className={inputClass}
                    value={draft.planSku}
                    onChange={(e) => selectPlan(e.target.value)}
                  >
                    <option value="">Personalizat</option>
                    {data?.plans.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.category} · {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Denumire abonament">
                  <input
                    required
                    className={inputClass}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, name: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Tarif lunar RON">
                  <input
                    required
                    min="0"
                    max="1000000"
                    step="0.01"
                    type="number"
                    className={inputClass}
                    value={draft.price}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, price: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Prima dată de facturare">
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={draft.billingDate}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, billingDate: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Obiect · domeniu, conturi sau activitate" wide>
                  <input
                    className={inputClass}
                    value={draft.targetLabel}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, targetLabel: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Produs AVYRON · opțional">
                  <select
                    className={inputClass}
                    value={draft.productSlug}
                    disabled={!!draft.externalUrl}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, productSlug: e.target.value }))
                    }
                  >
                    <option value="">Fără produs</option>
                    {data?.products.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Adresă produs / website extern · opțional">
                  <input
                    type="url"
                    className={inputClass}
                    disabled={!!draft.productSlug}
                    value={draft.externalUrl}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, externalUrl: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <fieldset className="space-y-2 rounded-xl border border-white/10 p-3">
                <legend className="px-1 text-sm font-semibold">
                  Specificațiile abonamentului
                </legend>
                {draft.specifications.map((s, i) => (
                  <div
                    key={i}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
                  >
                    <Field label={`Specificație ${i + 1}`}>
                      <input
                        required
                        className={inputClass}
                        value={s.key}
                        onChange={(e) =>
                          setDraft((v) => ({
                            ...v,
                            specifications: v.specifications.map((r, n) =>
                              n === i ? { ...r, key: e.target.value } : r,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label={`Valoare ${i + 1}`}>
                      <textarea
                        required
                        rows={2}
                        className={inputClass}
                        value={s.value}
                        onChange={(e) =>
                          setDraft((v) => ({
                            ...v,
                            specifications: v.specifications.map((r, n) =>
                              n === i ? { ...r, value: e.target.value } : r,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="self-end"
                      disabled={draft.specifications.length === 1}
                      onClick={() =>
                        setDraft((v) => ({
                          ...v,
                          specifications: v.specifications.filter(
                            (_, n) => n !== i,
                          ),
                        }))
                      }
                    >
                      Elimină
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draft.specifications.length >= 30}
                  onClick={() =>
                    setDraft((v) => ({
                      ...v,
                      specifications: [
                        ...v.specifications,
                        { key: "", value: "" },
                      ],
                    }))
                  }
                >
                  Adaugă specificație
                </Button>
              </fieldset>
              <BillingFields
                value={draft.billing}
                onChange={(billing) => setDraft((v) => ({ ...v, billing }))}
              />
              <p className="text-xs text-slate-500">
                Fără cont, fișa rămâne în așteptare. Un cont cu e-mail verificat
                poate primi acces prin fluxul existent. Nu trimitem invitații
                sau facturi automat.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Anulează
                </Button>
                <Button type="submit">Verifică alocarea</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-xl border border-white/10 p-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Beneficiar</dt>
                  <dd>{client?.company_name || draft.companyName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Plan</dt>
                  <dd>
                    {plan?.name || draft.name} ·{" "}
                    {money(Math.round(Number(draft.price) * 100))}/lună
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Acces</dt>
                  <dd>
                    {account?.email ||
                      (draft.clientId
                        ? "Se păstrează autorizările existente"
                        : "În așteptarea contului")}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Facturare</dt>
                  <dd>
                    {draft.billingDate} · termen{" "}
                    {draft.billing.paymentTermsDays} zile
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-slate-400">
                {draft.projectId
                  ? "Proiectul existent va primi abonamentul."
                  : "Se va crea un proiect dedicat în sistemul existent."}{" "}
                Drepturile de utilizare AVY Studio și debitarea automată se
                activează separat, prin fluxurile autorizate.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1"
                />
                Confirm beneficiarul, contul autorizat și condițiile lunare.
                Asocierea contului acordă acces la fișa acestui client conform
                politicilor existente.
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setReview(false);
                    setConfirmed(false);
                  }}
                >
                  Înapoi
                </Button>
                <Button
                  disabled={!confirmed || busy}
                  onClick={() => void allocate()}
                >
                  {busy ? "Se alocă…" : "Confirmă alocarea"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected && !!data}
        onOpenChange={(v) => {
          if (!v && !busy) setSelected(null);
        }}
      >
        <DialogContent className="dark max-h-[90dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Date de facturare · {selected?.company_name}
            </DialogTitle>
            <DialogDescription>
              {selected?.service_name}. Istoricul pregătit rămâne neschimbat.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void saveBilling(e)} className="space-y-3">
            <BillingFields
              value={edit.billing}
              onChange={(billing) => setEdit((v) => ({ ...v, billing }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Următoarea facturare">
                <input
                  required
                  type="date"
                  className={inputClass}
                  value={edit.date}
                  onChange={(e) =>
                    setEdit((v) => ({ ...v, date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Stare abonament">
                <select
                  className={inputClass}
                  value={edit.status}
                  onChange={(e) =>
                    setEdit((v) => ({
                      ...v,
                      status: e.target.value as typeof edit.status,
                    }))
                  }
                >
                  <option value="active">Activ</option>
                  <option value="paused">În pauză</option>
                  <option value="cancelled">Anulat</option>
                </select>
              </Field>
            </div>
            {formError && (
              <p role="alert" className="text-sm text-red-200">
                {formError}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Se salvează…" : "Salvează datele de facturare"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!prepare && !!data}
        onOpenChange={(v) => {
          if (!v && !busy) setPrepare(null);
        }}
      >
        <DialogContent className="dark border-white/10 bg-[#10162a] text-slate-100">
          <DialogHeader>
            <DialogTitle>Pregătește ciorna lunară</DialogTitle>
            <DialogDescription>
              {prepare?.company_name} · {prepare?.service_name}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            {money(prepare ? Math.round(prepare.price * 100) : 0)} ·{" "}
            {date(prepare?.next_billing_date)}. Calendarul avansează la luna
            următoare după pregătirea ciornei.
          </p>
          <p className="text-xs text-slate-400">
            Ciorna apare în Financiar pentru verificarea TVA și aprobare. Nu
            emite factura, nu o trimite și nu debitează clientul.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={prepareConfirmed}
              onChange={(e) => setPrepareConfirmed(e.target.checked)}
            />
            Confirm perioada, valoarea și beneficiarul.
          </label>
          {formError && (
            <p role="alert" className="text-red-200">
              {formError}
            </p>
          )}
          <Button
            disabled={!prepareConfirmed || busy}
            onClick={() => void prepareInvoice()}
          >
            {busy ? "Se pregătește…" : "Confirmă pregătirea ciornei"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
