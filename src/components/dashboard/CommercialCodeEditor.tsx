import { useEffect, useState } from "react";
import { BadgeCheck, CreditCard, FileCode2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { catalogCodesApi, type CommercialCode, type CommercialCodeDraft } from "@/lib/catalogCodesApi";

export type CommercialEditorItem = {
  entityType: "service" | "product";
  entityKey: string;
  displayName: string;
  category: string;
  sourcePriceMinor: number | null;
  sourceCurrency: string;
  detail?: string;
  config?: CommercialCode;
};

const initialDraft = (item: CommercialEditorItem): CommercialCodeDraft => ({
  displayName: item.config?.display_name ?? item.displayName,
  accountingCode: item.config?.accounting_code ?? null,
  sku: item.config?.sku ?? null,
  category: item.config?.category ?? item.category,
  basePriceMinor: item.entityType === "product" ? item.sourcePriceMinor : item.config?.base_price_minor ?? item.sourcePriceMinor,
  currency: item.entityType === "product" ? "RON" : item.config?.currency ?? item.sourceCurrency,
  vatBasisPoints: item.config?.vat_basis_points ?? 1900,
  paymentRoute: item.config?.payment_route ?? "unconfigured",
  preferredPaymentProvider: item.config?.preferred_payment_provider ?? null,
  invoiceProvider: item.config?.invoice_provider ?? null,
  paymentStatus: item.config?.payment_status ?? "needs_configuration",
  promotionCode: item.config?.promotion_code ?? null,
  active: item.config ? Boolean(item.config.active) : true,
  notes: item.config?.notes ?? "",
});

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#080d1c] px-3 text-sm text-slate-100";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block min-w-0 text-xs text-slate-400"><span>{label}</span>{children}</label>;

export default function CommercialCodeEditor({ item, onClose, onSaved }: { item: CommercialEditorItem | null; onClose: () => void; onSaved: () => Promise<void> | void }) {
  const [draft, setDraft] = useState<CommercialCodeDraft | null>(null);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!item) { setDraft(null); return; }
    const next = initialDraft(item);
    setDraft(next);
    setPrice(next.basePriceMinor === null ? "" : String(next.basePriceMinor / 100));
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
        <section aria-label="Identitate și preț" className="grid gap-3 sm:grid-cols-2"><Field label="Denumire internă"><Input className={fieldClass} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })}/></Field><Field label="Categorie"><Input className={fieldClass} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/></Field><Field label="SKU"><Input className={fieldClass} value={draft.sku || ""} onChange={e => setDraft({ ...draft, sku: e.target.value || null })}/></Field><Field label="Cod contabil"><Input className={fieldClass} value={draft.accountingCode || ""} onChange={e => setDraft({ ...draft, accountingCode: e.target.value || null })}/></Field><Field label="Preț de bază"><Input className={fieldClass} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="Preț de configurat"/></Field><Field label="Monedă"><select className={fieldClass} value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}><option value="RON">RON</option>{item.entityType === "service" && <><option value="EUR">EUR</option><option value="USD">USD</option></>}</select></Field></section>
        <section aria-label="Fiscalitate și plată" className="grid gap-3 sm:grid-cols-2"><Field label="TVA %"><Input className={fieldClass} type="number" min="0" max="100" step="0.01" value={draft.vatBasisPoints / 100} onChange={e => setDraft({ ...draft, vatBasisPoints: Math.round(Number(e.target.value) * 100) })}/></Field><Field label="Cod promoție"><Input className={fieldClass} value={draft.promotionCode || ""} onChange={e => setDraft({ ...draft, promotionCode: e.target.value || null })}/></Field><Field label="Traseu de plată"><select className={fieldClass} value={draft.paymentRoute} onChange={e => setDraft({ ...draft, paymentRoute: e.target.value as CommercialCodeDraft["paymentRoute"] })}><option value="unconfigured">Neconfigurat</option><option value="invoice">Factură</option><option value="payment_link">Link de plată</option><option value="stripe">Stripe</option><option value="bank_transfer">Transfer bancar</option><option value="manual">Manual</option></select></Field><Field label="Procesator preferat"><select className={fieldClass} value={draft.preferredPaymentProvider || ""} onChange={e => setDraft({ ...draft, preferredPaymentProvider: (e.target.value || null) as CommercialCodeDraft["preferredPaymentProvider"] })}><option value="">Neales</option><option value="stripe">Stripe</option><option value="revolut">Revolut</option><option value="netopia">Netopia</option></select></Field><Field label="Facturare"><select className={fieldClass} value={draft.invoiceProvider || ""} onChange={e => setDraft({ ...draft, invoiceProvider: (e.target.value || null) as CommercialCodeDraft["invoiceProvider"] })}><option value="">Nealeasă</option><option value="oblio">Oblio</option><option value="manual">Manual</option></select></Field><Field label="Starea plății"><select className={fieldClass} value={draft.paymentStatus} onChange={e => setDraft({ ...draft, paymentStatus: e.target.value as CommercialCodeDraft["paymentStatus"] })}><option value="needs_configuration">Necesită configurare</option><option value="test">Test</option><option value="active">Activă</option><option value="paused">Pauză</option></select></Field></section>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })}/>Ofertă activă</label>
        <Field label="Note interne"><textarea rows={3} maxLength={2000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} className={`${fieldClass} h-auto py-2`}/></Field>
        <p className="text-xs text-amber-200/80">Starea „activă” din registru nu conectează automat un procesator și nu publică o pagină nouă.</p>
        <div className="flex justify-end gap-2"><Button variant="ghost" disabled={saving} onClick={onClose}>Anulează</Button><Button disabled={saving || !draft.displayName.trim() || !draft.category.trim()} onClick={() => void save()}><Save className="size-4"/>{saving ? "Se salvează…" : "Salvează"}</Button></div>
      </div>}
    </DialogContent>
  </Dialog>;
}
