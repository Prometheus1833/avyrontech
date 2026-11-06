import { useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
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
  type InternalSubscription,
  type InternalSubscriptionInput,
} from "@/shared/subscriptionOperations";
import { Field } from "./SubscriptionFields";
import {
  cycleNames,
  date,
  inputClass,
  money,
  panelClass,
  statusNames,
} from "./subscriptionPresentation";
import { useSubscriptionData } from "./useSubscriptionData";
const blank = () => ({
  vendorId: "",
  vendorName: "",
  serviceName: "",
  accountLabel: "",
  accountEmail: "",
  workspaceLabel: "",
  responsibleUserId: "",
  status: "needs_configuration" as InternalSubscriptionInput["status"],
  billingType: "recurring" as InternalSubscriptionInput["billingType"],
  billingCycle: "monthly" as NonNullable<
    InternalSubscriptionInput["billingCycle"]
  >,
  amount: "",
  currency: "RON" as InternalSubscriptionInput["currency"],
  billingDate: "",
  autoRenewal: false,
  notes: "",
});
const presets = [
  { label: "Lovable", vendor: "Lovable", service: "Lovable" },
  { label: "Codex", vendor: "OpenAI", service: "Codex" },
  { label: "Cloudflare", vendor: "Cloudflare", service: "Cloudflare" },
  { label: "GitHub", vendor: "GitHub", service: "GitHub" },
];
export default function InternalSubscriptionsTab() {
  const { data, error, loading, refresh } = useSubscriptionData(api.internal),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<InternalSubscription | null>(null),
    [draft, setDraft] = useState(blank),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  const retry = useRef({ payload: "", key: crypto.randomUUID() });
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ro");
    return (data?.data || []).filter(
      (s) =>
        (filter === "all" ||
          (filter === "active" &&
            ["active", "free", "trial"].includes(s.status)) ||
          (filter === "due" &&
            s.next_billing_date != null &&
            s.next_billing_date <= Date.now() + 7 * 86400000 &&
            !["cancelled", "paused", "expired"].includes(s.status)) ||
          (filter === "incomplete" &&
            (!s.account_label || s.status === "needs_configuration"))) &&
        (!q ||
          [
            s.vendor_name,
            s.service_name,
            s.account_label,
            s.workspace_label,
            s.responsible_name,
          ].some((v) =>
            String(v || "")
              .toLocaleLowerCase("ro")
              .includes(q),
          )),
    );
  }, [data, query, filter]);
  const start = (
    s?: InternalSubscription,
    preset?: (typeof presets)[number],
  ) => {
    setEditing(s || null);
    setFormError("");
    const v = blank();
    if (s)
      Object.assign(v, {
        vendorId: s.vendor_id,
        vendorName: s.vendor_name,
        serviceName: s.service_name,
        accountLabel: s.account_label,
        accountEmail: s.account_email || "",
        workspaceLabel: s.workspace_label,
        responsibleUserId: s.responsible_user_id || "",
        status: s.status,
        billingType: s.billing_type,
        billingCycle: s.billing_cycle || "monthly",
        amount:
          s.gross_amount_minor == null
            ? ""
            : String(s.gross_amount_minor / 100),
        currency: s.currency || "RON",
        billingDate: subscriptionDate(s.next_billing_date),
        autoRenewal: s.auto_renewal === 1,
        notes: s.notes || "",
      });
    else if (preset)
      Object.assign(v, {
        vendorId:
          data?.vendors.find(
            (x) => x.name.toLowerCase() === preset.vendor.toLowerCase(),
          )?.id || "",
        vendorName: preset.vendor,
        serviceName: preset.service,
      });
    setDraft(v);
    setOpen(true);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    const value: InternalSubscriptionInput = {
      vendorId: draft.vendorId || null,
      vendorName: draft.vendorName,
      serviceName: draft.serviceName,
      accountLabel: draft.accountLabel,
      accountEmail: draft.accountEmail,
      workspaceLabel: draft.workspaceLabel,
      responsibleUserId: draft.responsibleUserId || null,
      status: draft.status,
      billingType: draft.billingType,
      billingCycle: draft.billingType === "free" ? null : draft.billingCycle,
      amountMinor:
        draft.amount === "" ? null : Math.round(Number(draft.amount) * 100),
      currency: draft.currency,
      nextBillingDate: draft.billingDate
        ? subscriptionTimestamp(draft.billingDate)
        : null,
      autoRenewal: draft.autoRenewal,
      notes: draft.notes,
      ...(editing ? { revision: editing.subscription_revision } : {}),
    };
    const payload = JSON.stringify({ id: editing?.id, value });
    if (payload !== retry.current.payload)
      retry.current = { payload, key: crypto.randomUUID() };
    try {
      await api.saveInternal(value, retry.current.key, editing?.id);
      setOpen(false);
      toast.success("Evidența abonamentului a fost salvată.");
      await refresh();
      window.dispatchEvent(new Event("avyron:subscriptions-changed"));
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Abonamentul nu poate fi salvat.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-w-0 space-y-4 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Abonamente AVYRON</h1>
          <p className="mt-1 text-sm text-slate-400">
            Conturi, planuri și reînnoiri pentru instrumentele echipei.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            aria-label="Reîmprospătează evidența"
            onClick={() => void refresh()}
          >
            <RefreshCw className="size-4" />
          </Button>
          {data?.canManage && (
            <Button onClick={() => start()}>
              <Plus className="mr-2 size-4" />
              Adaugă cont / abonament
            </Button>
          )}
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 p-3 text-sm text-red-200"
        >
          {error}{" "}
          <button onClick={() => void refresh()} className="underline">
            Reîncearcă
          </button>
        </p>
      )}
      {loading && !data && (
        <p role="status" className="text-sm text-slate-400">
          Se încarcă evidența…
        </p>
      )}
      {data && (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-white/10 px-4 py-3 text-sm">
            <span>
              <strong>{data.data.length}</strong> înregistrări
            </span>
            <span>
              <strong>
                {
                  data.data.filter(
                    (s) => s.status === "active" || s.status === "free",
                  ).length
                }
              </strong>{" "}
              active / gratuite
            </span>
            <span>
              <strong>
                {
                  data.data.filter(
                    (s) =>
                      !s.account_label || s.status === "needs_configuration",
                  ).length
                }
              </strong>{" "}
              de completat
            </span>
          </div>
          {data.canManage && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Adaugă rapid:</span>
              {presets.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  onClick={() => start(undefined, p)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Evidență manuală sincronizată cu Financiar. Datele nu confirmă o
            integrare sau o plată la furnizor. Păstrează aici doar identificarea
            contului, fără parole, chei sau tokenuri.
          </p>
          <section
            aria-label="Evidență abonamente interne"
            className={panelClass}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Caută cont intern</span>
                <input
                  className={`${inputClass} mt-0`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Furnizor, cont, plan, responsabil…"
                />
              </label>
              <label>
                <span className="sr-only">Filtrează conturile interne</span>
                <select
                  className={`${inputClass} mt-0`}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Toate</option>
                  <option value="active">Active / gratuite / test</option>
                  <option value="due">Reînnoire în 7 zile</option>
                  <option value="incomplete">De completat</option>
                </select>
              </label>
            </div>
            {!rows.length && (
              <p className="py-5 text-center text-sm text-slate-400">
                Nu există înregistrări pentru filtrul curent.
              </p>
            )}
            <div className="divide-y divide-white/10">
              {rows.map((s) => (
                <details key={s.id} className="py-3">
                  <summary className="grid cursor-pointer list-none gap-2 text-sm sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {s.vendor_name} · {s.service_name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {s.account_label || "Identificarea contului lipsește"}
                        {s.workspace_label ? ` · ${s.workspace_label}` : ""}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      <p>Reînnoire: {date(s.next_billing_date)}</p>
                      <p className="mt-1">
                        {s.responsible_name || "Responsabil de completat"}
                      </p>
                    </div>
                    <div className="text-xs">
                      <p>{statusNames[s.status] || s.status}</p>
                      {data.canSeeCosts && (
                        <p className="mt-1 text-violet-200">
                          {money(s.gross_amount_minor, s.currency)}
                          {s.billing_cycle
                            ? ` · ${cycleNames[s.billing_cycle] || s.billing_cycle}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2 rounded-xl bg-black/15 p-3 text-xs text-slate-400">
                    <p>
                      Cont: {s.account_label || "De completat"} · Spațiu de
                      lucru: {s.workspace_label || "De completat"}
                    </p>
                    <p>
                      Responsabil: {s.responsible_name || "De completat"} ·
                      Ciclu:{" "}
                      {s.billing_cycle
                        ? cycleNames[s.billing_cycle] || s.billing_cycle
                        : "Fără ciclu fix"}
                    </p>
                    {data.canSeeCosts && (
                      <>
                        <p>
                          E-mail cont: {s.account_email || "De completat"} ·
                          Reînnoire automată în evidență:{" "}
                          {s.auto_renewal ? "Da" : "Nu"}
                        </p>
                        {s.notes && (
                          <p className="whitespace-pre-wrap break-words">
                            {s.notes}
                          </p>
                        )}
                      </>
                    )}
                    {data.canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => start(s)}
                      >
                        Editează evidența
                      </Button>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
          {!data.canSeeCosts && (
            <p className="text-xs text-slate-500">
              Echipa vede detaliile operaționale. Costurile și informațiile
              financiare au acces separat.
            </p>
          )}
        </>
      )}
      <Dialog
        open={open && !!data?.canManage}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent className="dark max-h-[90dvh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Editează abonamentul intern"
                : "Adaugă un cont intern"}
            </DialogTitle>
            <DialogDescription>
              O înregistrare pentru fiecare cont sau spațiu de lucru. Salvarea
              în Financiar necesită MFA și nu activează servicii plătite.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void save(e)} className="space-y-3">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Field label="Furnizor">
                <select
                  className={inputClass}
                  value={draft.vendorId}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      vendorId: e.target.value,
                      vendorName:
                        data?.vendors.find((x) => x.id === e.target.value)
                          ?.name || "",
                    }))
                  }
                >
                  <option value="">Furnizor nou</option>
                  {data?.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!draft.vendorId && (
                <Field label="Nume furnizor">
                  <input
                    required
                    className={inputClass}
                    value={draft.vendorName}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, vendorName: e.target.value }))
                    }
                  />
                </Field>
              )}
              <Field label="Plan / produs">
                <input
                  required
                  className={inputClass}
                  value={draft.serviceName}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, serviceName: e.target.value }))
                  }
                />
              </Field>
              <Field label="Etichetă cont">
                <input
                  required
                  className={inputClass}
                  placeholder="Ex.: echipa AVYRON"
                  value={draft.accountLabel}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, accountLabel: e.target.value }))
                  }
                />
              </Field>
              <Field label="E-mail cont · opțional">
                <input
                  type="email"
                  className={inputClass}
                  value={draft.accountEmail}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, accountEmail: e.target.value }))
                  }
                />
              </Field>
              <Field label="Organizație / spațiu de lucru">
                <input
                  className={inputClass}
                  value={draft.workspaceLabel}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, workspaceLabel: e.target.value }))
                  }
                />
              </Field>
              <Field label="Responsabil">
                <select
                  className={inputClass}
                  value={draft.responsibleUserId}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      responsibleUserId: e.target.value,
                    }))
                  }
                >
                  <option value="">De alocat</option>
                  {data?.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stare">
                <select
                  className={inputClass}
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      status: e.target.value as typeof v.status,
                      ...(e.target.value === "free"
                        ? { amount: "0", billingType: "free" as const }
                        : {}),
                    }))
                  }
                >
                  {[
                    "needs_configuration",
                    "active",
                    "free",
                    "trial",
                    "paused",
                    "cancelled",
                    "expired",
                    "payment_due",
                    "overdue",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {statusNames[v]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tip tarifare">
                <select
                  className={inputClass}
                  value={draft.billingType}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      billingType: e.target.value as typeof v.billingType,
                    }))
                  }
                >
                  <option value="recurring">Recurent</option>
                  <option value="usage_based">În funcție de consum</option>
                  <option value="variable">Variabil</option>
                  <option value="free">Gratuit</option>
                  <option value="trial">Perioadă de test</option>
                </select>
              </Field>
              <Field label="Ciclu">
                <select
                  className={inputClass}
                  value={draft.billingCycle}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      billingCycle: e.target.value as typeof v.billingCycle,
                    }))
                  }
                >
                  <option value="monthly">Lunar</option>
                  <option value="quarterly">Trimestrial</option>
                  <option value="yearly">Anual</option>
                </select>
              </Field>
              <Field label="Cost perioadă · opțional">
                <input
                  min="0"
                  max="1000000"
                  step="0.01"
                  type="number"
                  className={inputClass}
                  value={draft.amount}
                  placeholder="Necunoscut"
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, amount: e.target.value }))
                  }
                />
              </Field>
              <Field label="Monedă">
                <select
                  className={inputClass}
                  value={draft.currency}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      currency: e.target.value as typeof v.currency,
                    }))
                  }
                >
                  <option>RON</option>
                  <option>EUR</option>
                  <option>USD</option>
                </select>
              </Field>
              <Field label="Data următoarei reînnoiri">
                <input
                  type="date"
                  required={draft.status === "active"}
                  className={inputClass}
                  value={draft.billingDate}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, billingDate: e.target.value }))
                  }
                />
              </Field>
              <Field label="Note / limite incluse" wide>
                <textarea
                  rows={3}
                  maxLength={1500}
                  className={inputClass}
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((v) => ({ ...v, notes: e.target.value }))
                  }
                />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.autoRenewal}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, autoRenewal: e.target.checked }))
                }
              />
              Reînnoire automată activă la furnizor · doar evidență
            </label>
            {formError && (
              <p role="alert" className="text-sm text-red-200">
                {formError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Se salvează…" : "Salvează evidența"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
