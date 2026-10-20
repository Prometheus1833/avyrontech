import { useEffect, useState } from "react";
import { BadgeCheck, CreditCard, FileCode2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { catalogCodesApi, type CommercialCode, type CommercialCodeDraft, type CommercialProviderRef } from "@/lib/catalogCodesApi";

export type CommercialEditorItem = {
  entityType: "service" | "product";
  entityKey: string;
  displayName: string;
  category: string;
  sourcePriceMinor: number | null;
  sourceCurrency: string;
  detail?: string;
  config?: CommercialCode;
  references?: CommercialProviderRef[];
};

const initialDraft = (item: CommercialEditorItem): CommercialCodeDraft => ({
  displayName: item.config?.display_name ?? item.displayName,
  accountingCode: item.config?.accounting_code ?? null,
  sku: item.config?.sku ?? null,
  category: item.config?.category ?? item.category,
  basePriceMinor: item.entityType === "product" ? item.sourcePriceMinor : item.config?.base_price_minor ?? item.sourcePriceMinor,
  currency: item.entityType === "product" ? "RON" : item.config?.currency ?? item.sourceCurrency,
  vatBasisPoints: item.config?.vat_basis_points ?? 0,
  paymentRoute: item.config?.payment_route ?? "unconfigured",
  preferredPaymentProvider: item.config?.preferred_payment_provider ?? null,
  invoiceProvider: item.config?.invoice_provider ?? null,
  paymentStatus: item.config?.payment_status ?? "needs_configuration",
  promotionCode: item.config?.promotion_code ?? null,
  active: item.config ? Boolean(item.config.active) : true,
  notes: item.config?.notes ?? "",
  unitLabel: item.config?.unit_label ?? (item.entityType === "service" ? "serviciu" : "unitate"),
  priceModel: item.config?.price_model ?? (item.entityType === "service" ? item.sourcePriceMinor === null ? "quote" : "starting_at" : item.sourcePriceMinor === null ? "unreviewed" : "fixed"),
  billingCycle: item.config?.billing_cycle ?? "unreviewed",
  taxStatus: item.config?.tax_status ?? "unverified",
});

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#080d1c] px-3 text-sm text-slate-100";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block min-w-0 text-xs text-slate-400"><span>{label}</span>{children}</label>;

export default function CommercialCodeEditor({ item, onClose, onSaved }: { item: CommercialEditorItem | null; onClose: () => void; onSaved: () => Promise<void> | void }) {
  const [draft, setDraft] = useState<CommercialCodeDraft | null>(null);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [references, setReferences] = useState<CommercialProviderRef[]>([]);
  const [referenceKind, setReferenceKind] = useState("stripe:test:product");
  const [externalId, setExternalId] = useState("");
  const [savingReference, setSavingReference] = useState(false);
  useEffect(() => {
    if (!item) { setDraft(null); setReferences([]); return; }
    const next = initialDraft(item);
    setDraft(next);
    setPrice(next.basePriceMinor === null ? "" : String(next.basePriceMinor / 100));
    setReferences(item.references ?? []);
    setExternalId("");
  }, [item]);

  const save = async () => {
    if (!item || !draft) return;
    const parsed = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) { toast.error("Prețul trebuie să fie un număr pozitiv."); return; }
    const body = { ...draft, basePriceMinor: parsed === null ? null : Math.round(parsed * 100) };
    setSaving(true);
    try {
      await catalogCodesApi.save(item.entityType, item.entityKey, body);
      await onSaved();
      toast.success("Configurarea comercială a fost salvată.");
      onClose();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Configurarea nu a putut fi salvată."); }
    finally { setSaving(false); }
  };
  const saveReference = async () => {
    if (!item || !item.config || !externalId.trim()) return;
    const [provider, environment, referenceType] = referenceKind.split(":") as [CommercialProviderRef["provider"], CommercialProviderRef["environment"], CommercialProviderRef["reference_type"]];
    setSavingReference(true);
    try {
      await catalogCodesApi.saveReference(item.entityType, item.entityKey, provider, environment, referenceType, externalId.trim());
      const refreshed = await catalogCodesApi.list();
      setReferences(refreshed.references.filter(ref => ref.entity_type === item.entityType && ref.entity_key === item.entityKey));
      await onSaved();
      setExternalId("");
      toast.success("Referința externă a fost salvată; conexiunea nu este activată.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Referința nu a putut fi salvată."); }
    finally { setSavingReference(false); }
  };
  const removeReference = async (ref: CommercialProviderRef) => {
    if (!item) return;
    setSavingReference(true);
    try {
      await catalogCodesApi.removeReference(item.entityType, item.entityKey, ref.provider, ref.environment, ref.reference_type);
      setReferences(current => current.filter(row => row.id !== ref.id));
      await onSaved();
      toast.success("Referința a fost eliminată; istoricul rămâne auditat.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Referința nu a putut fi eliminată."); }
    finally { setSavingReference(false); }
  };

  return <Dialog open={Boolean(item)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#0c1425] text-slate-100 sm:max-w-3xl">
      <DialogHeader><DialogTitle className="pr-6 text-xl text-white">{item?.displayName}</DialogTitle><DialogDescription className="text-slate-400">Mini-dashboard comercial · {item?.entityType === "service" ? "serviciu" : "produs"} · {item?.entityKey}</DialogDescription></DialogHeader>
      {draft && item && <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><FileCode2 className="size-4 text-violet-300"/><p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Identitate</p><p className="text-sm font-semibold">{draft.sku || "SKU neconfigurat"}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><CreditCard className="size-4 text-cyan-300"/><p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Încasare</p><p className="text-sm font-semibold">{draft.paymentRoute === "unconfigured" ? "Neconfigurată" : draft.paymentRoute}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><BadgeCheck className="size-4 text-emerald-300"/><p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Stare</p><p className="text-sm font-semibold">{draft.active ? "Activ" : "Retras"}</p></div>
        </div>
        {item.detail && <p className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-slate-400">{item.detail}</p>}
        <section aria-label="Identitate și preț" className="grid gap-3 sm:grid-cols-2"><Field label="Denumire internă"><Input className={fieldClass} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })}/></Field><Field label="Categorie"><Input className={fieldClass} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/></Field><Field label="SKU intern stabil"><Input className={fieldClass} value={draft.sku || ""} onChange={e => setDraft({ ...draft, sku: e.target.value || null })}/></Field><Field label="Cod articol contabil"><Input className={fieldClass} value={draft.accountingCode || ""} onChange={e => setDraft({ ...draft, accountingCode: e.target.value || null })}/></Field><Field label="Preț de bază"><Input className={fieldClass} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="Preț de configurat"/></Field><Field label="Monedă"><select className={fieldClass} value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}><option value="RON">RON</option>{item.entityType === "service" && <><option value="EUR">EUR</option><option value="USD">USD</option></>}</select></Field><Field label="Model preț"><select className={fieldClass} value={draft.priceModel} onChange={e => setDraft({ ...draft, priceModel: e.target.value as CommercialCodeDraft["priceModel"] })}><option value="unreviewed">De revizuit</option><option value="fixed">Fix</option><option value="starting_at">De la</option><option value="quote">La ofertă</option></select></Field><Field label="Unitate facturabilă"><Input className={fieldClass} maxLength={32} value={draft.unitLabel} onChange={e => setDraft({ ...draft, unitLabel: e.target.value })}/></Field><Field label="Periodicitate"><select className={fieldClass} value={draft.billingCycle} onChange={e => setDraft({ ...draft, billingCycle: e.target.value as CommercialCodeDraft["billingCycle"] })}><option value="unreviewed">De revizuit</option><option value="one_time">Unică</option><option value="monthly">Lunară</option><option value="annual">Anuală</option><option value="custom">Personalizată</option></select></Field></section>
        <section aria-label="Fiscalitate și plată" className="grid gap-3 sm:grid-cols-2"><Field label="TVA %"><Input className={fieldClass} type="number" min="0" max="100" step="0.01" value={draft.vatBasisPoints / 100} onChange={e => setDraft({ ...draft, vatBasisPoints: Math.round(Number(e.target.value) * 100) })}/></Field><Field label="Verificare fiscală"><select className={fieldClass} value={draft.taxStatus} onChange={e => setDraft({ ...draft, taxStatus: e.target.value as CommercialCodeDraft["taxStatus"] })}><option value="unverified">Neverificat</option><option value="verified">Verificat de echipă</option></select></Field><Field label="Cod promoție"><Input className={fieldClass} value={draft.promotionCode || ""} onChange={e => setDraft({ ...draft, promotionCode: e.target.value || null })}/></Field><Field label="Traseu de plată"><select className={fieldClass} value={draft.paymentRoute} onChange={e => setDraft({ ...draft, paymentRoute: e.target.value as CommercialCodeDraft["paymentRoute"] })}><option value="unconfigured">Neconfigurat</option><option value="invoice">Factură</option><option value="payment_link">Link de plată</option><option value="stripe">Stripe</option><option value="bank_transfer">Transfer bancar</option><option value="manual">Manual</option></select></Field><Field label="Procesator preferat"><select className={fieldClass} value={draft.preferredPaymentProvider || ""} onChange={e => setDraft({ ...draft, preferredPaymentProvider: (e.target.value || null) as CommercialCodeDraft["preferredPaymentProvider"] })}><option value="">Neales</option><option value="stripe">Stripe</option><option value="revolut">Revolut</option><option value="netopia">Netopia</option></select></Field><Field label="Facturare"><select className={fieldClass} value={draft.invoiceProvider || ""} onChange={e => setDraft({ ...draft, invoiceProvider: (e.target.value || null) as CommercialCodeDraft["invoiceProvider"] })}><option value="">Nealeasă</option><option value="oblio">Oblio</option><option value="manual">Manual</option></select></Field><Field label="Starea plății"><select className={fieldClass} value={draft.paymentStatus} onChange={e => setDraft({ ...draft, paymentStatus: e.target.value as CommercialCodeDraft["paymentStatus"] })}><option value="needs_configuration">Necesită configurare</option><option value="test">Test</option><option value="active" disabled={item.config?.payment_status !== "active"}>Activă doar după verificarea integrării</option><option value="paused">Pauză</option></select></Field></section>
        <p className="text-xs text-amber-200/80">Cota TVA existentă nu este considerată confirmată până când marchezi explicit verificarea fiscală. Verifică regimul real cu contabilul înainte de facturare.</p>
        <section aria-label="Referințe procesatori" className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><div><h3 className="text-sm font-semibold text-white">Referințe Stripe · Revolut · Oblio</h3><p className="mt-1 text-xs text-slate-400">Doar ID-uri de produs/preț/articol, separat pentru test și live. Nu introduce chei API sau secrete.</p></div><div className="space-y-2">{references.map(ref => <div key={ref.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs"><span className="font-mono text-slate-300">{ref.provider} · {ref.environment} · {ref.reference_type} · {ref.external_id}</span><Button size="sm" variant="ghost" className="text-rose-300" disabled={savingReference} onClick={() => void removeReference(ref)} aria-label={`Elimină referința ${ref.provider} ${ref.environment} ${ref.reference_type}`}><Trash2 className="size-3.5"/></Button></div>)}{!references.length && <p className="text-xs text-slate-500">Nicio referință externă salvată.</p>}</div><div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]"><select aria-label="Tip referință" className={fieldClass} value={referenceKind} onChange={e => setReferenceKind(e.target.value)}><option value="stripe:test:product">Stripe test · produs</option><option value="stripe:test:price">Stripe test · preț</option><option value="stripe:live:product">Stripe live · produs</option><option value="stripe:live:price">Stripe live · preț</option><option value="revolut:test:product">Revolut test · produs</option><option value="revolut:live:product">Revolut live · produs</option><option value="oblio:test:article">Oblio test · articol</option><option value="oblio:live:article">Oblio live · articol</option></select><Input aria-label="ID extern" className={fieldClass} value={externalId} maxLength={160} onChange={e => setExternalId(e.target.value)} placeholder="ID extern, fără secrete"/><Button size="sm" variant="outline" disabled={!item.config || savingReference || externalId.trim().length < 2} onClick={() => void saveReference()}>Salvează ID</Button></div>{!item.config && <p className="text-xs text-amber-200/80">Salvează mai întâi configurația comercială; apoi redeschide pentru referințe.</p>}</section>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })}/>Ofertă activă</label>
        <Field label="Note interne"><textarea rows={3} maxLength={2000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} className={`${fieldClass} h-auto py-2`}/></Field>
        <p className="text-xs text-amber-200/80">Starea „activă” din registru nu conectează automat un procesator și nu publică o pagină nouă.</p>
        <div className="flex justify-end gap-2"><Button variant="ghost" disabled={saving} onClick={onClose}>Anulează</Button><Button disabled={saving || !draft.displayName.trim() || !draft.category.trim()} onClick={() => void save()}><Save className="size-4"/>{saving ? "Se salvează…" : "Salvează"}</Button></div>
      </div>}
    </DialogContent>
  </Dialog>;
}
