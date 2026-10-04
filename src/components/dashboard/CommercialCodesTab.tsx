import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileCode2, RefreshCw, Save, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SERVICES } from "@/data/services";
import { catalogCodesApi, type CommercialCode, type CommercialCodeDraft, type ProductCatalogSource } from "@/lib/catalogCodesApi";

type Row = {
  entityType: "service" | "product";
  entityKey: string;
  displayName: string;
  category: string;
  sourcePriceMinor: number | null;
  sourceCurrency: string;
  config?: CommercialCode;
};

const blank = (row: Row): CommercialCodeDraft => ({
  displayName: row.displayName,
  accountingCode: row.config?.accounting_code ?? null,
  sku: row.config?.sku ?? null,
  category: row.config?.category ?? row.category,
  basePriceMinor: row.config?.base_price_minor ?? row.sourcePriceMinor,
  currency: row.config?.currency ?? row.sourceCurrency,
  vatBasisPoints: row.config?.vat_basis_points ?? 1900,
  paymentRoute: row.config?.payment_route ?? "unconfigured",
  paymentStatus: row.config?.payment_status ?? "needs_configuration",
  promotionCode: row.config?.promotion_code ?? null,
  active: row.config ? Boolean(row.config.active) : true,
  notes: row.config?.notes ?? "",
});

const money = (value: number | null, currency: string) => value === null ? "De configurat" : new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value / 100);

export default function CommercialCodesTab() {
  const [configured, setConfigured] = useState<CommercialCode[]>([]);
  const [products, setProducts] = useState<ProductCatalogSource[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [draft, setDraft] = useState<CommercialCodeDraft | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "service" | "product" | "missing">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await catalogCodesApi.list();
      setConfigured(result.data); setProducts(result.products);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nomenclatorul nu poate fi încărcat.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo<Row[]>(() => {
    const config = new Map(configured.map((row) => [`${row.entity_type}:${row.entity_key}`, row]));
    const serviceRows = SERVICES.map((service) => ({
      entityType: "service" as const,
      entityKey: service.key,
      displayName: service.copy.ro.name,
      category: service.category,
      sourcePriceMinor: service.priceEur * 100,
      sourceCurrency: "EUR",
      config: config.get(`service:${service.key}`),
    }));
    const productRows = products.map((product) => ({
      entityType: "product" as const,
      entityKey: product.entity_key,
      displayName: product.display_name,
      category: product.category,
      sourcePriceMinor: product.base_price_minor,
      sourceCurrency: "RON",
      config: config.get(`product:${product.entity_key}`),
    }));
    return [...serviceRows, ...productRows];
  }, [configured, products]);

  const visible = useMemo(() => rows.filter((row) => {
    if (filter === "missing" && row.config?.accounting_code && row.config?.sku) return false;
    if ((filter === "service" || filter === "product") && row.entityType !== filter) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${row.displayName} ${row.entityKey} ${row.config?.accounting_code || ""} ${row.config?.sku || ""}`.toLowerCase().includes(needle);
  }), [rows, filter, query]);

  const open = (row: Row) => { setSelected(row); setDraft(blank(row)); };
  const save = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    try {
      await catalogCodesApi.save(selected.entityType, selected.entityKey, draft);
      toast.success("Codul comercial și traseul de plată au fost salvate.");
      setSelected(null); setDraft(null); await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Configurarea nu a putut fi salvată."); }
    finally { setSaving(false); }
  };

  const configuredCount = rows.filter((row) => row.config?.accounting_code && row.config?.sku).length;
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300"><FileCode2 className="size-3.5" /> AVYRON OS · nomenclator comercial</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">Coduri servicii și produse</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">Un singur registru pentru cod contabil, SKU, preț de bază, TVA, promoție și traseu de plată. Nu procesează bani; configurarea activă este folosită ca evidență și bază pentru integrări.</p>
      </header>
      {error && <div className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{error}</div>}
      <section className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Elemente", value: rows.length }, { label: "Codificate complet", value: configuredCount }, { label: "Necesită configurare", value: Math.max(0, rows.length - configuredCount) }].map((item) => <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-semibold text-white">{item.value}</p></div>)}
      </section>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="border-white/[0.08] bg-white/[0.025] pl-9" placeholder="Caută nume, cod sau SKU…" /></div>
        <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-white/[0.08] bg-[#0e1527] px-3 text-xs text-slate-300"><option value="all">Toate</option><option value="service">Servicii</option><option value="product">Produse</option><option value="missing">Necesită configurare</option></select>
        <Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" /> Actualizează</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-white/[0.035] text-slate-500"><tr>{["Element", "Tip", "Cod contabil", "SKU", "Preț", "TVA", "Plată", ""].map((label) => <th key={label} className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
          <tbody>{visible.map((row) => <tr key={`${row.entityType}:${row.entityKey}`} className="border-t border-white/[0.06] text-slate-300"><td className="px-3 py-3"><p className="font-medium text-slate-200">{row.displayName}</p><p className="text-[10px] text-slate-600">{row.entityKey}</p></td><td className="px-3 py-3">{row.entityType === "service" ? "Serviciu" : "Produs"}</td><td className="px-3 py-3 font-mono">{row.config?.accounting_code || "—"}</td><td className="px-3 py-3 font-mono">{row.config?.sku || "—"}</td><td className="px-3 py-3">{money(row.config?.base_price_minor ?? row.sourcePriceMinor, row.config?.currency ?? row.sourceCurrency)}</td><td className="px-3 py-3">{((row.config?.vat_basis_points ?? 1900) / 100).toLocaleString("ro-RO")}%</td><td className="px-3 py-3">{row.config?.payment_route || "neconfigurat"}</td><td className="px-3 py-3"><Button size="sm" variant="ghost" onClick={() => open(row)}><Settings2 className="size-3.5" /> Configurează</Button></td></tr>)}</tbody>
        </table>
        {!loading && visible.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Niciun element pentru filtrul selectat.</p>}
      </div>
      {selected && draft && <section className="rounded-2xl border border-violet-400/20 bg-[#0d1425] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-white">Configurează · {selected.displayName}</h2><p className="text-xs text-slate-500">{selected.entityType} · {selected.entityKey}</p></div><Button variant="ghost" onClick={() => { setSelected(null); setDraft(null); }}>Închide</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cod contabil"><Input value={draft.accountingCode || ""} onChange={(e) => setDraft({ ...draft, accountingCode: e.target.value || null })} /></Field>
        <Field label="SKU"><Input value={draft.sku || ""} onChange={(e) => setDraft({ ...draft, sku: e.target.value || null })} /></Field>
        <Field label="Preț de bază"><Input inputMode="decimal" value={draft.basePriceMinor === null ? "" : String(draft.basePriceMinor / 100)} onChange={(e) => setDraft({ ...draft, basePriceMinor: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value.replace(",", ".")) * 100)) })} /></Field>
        <Field label="Monedă"><Input value={draft.currency} maxLength={8} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></Field>
        <Field label="TVA %"><Input type="number" min="0" max="100" step="0.01" value={draft.vatBasisPoints / 100} onChange={(e) => setDraft({ ...draft, vatBasisPoints: Math.round(Number(e.target.value) * 100) })} /></Field>
        <Field label="Cod promoție"><Input value={draft.promotionCode || ""} onChange={(e) => setDraft({ ...draft, promotionCode: e.target.value || null })} /></Field>
        <Field label="Traseu de plată"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.paymentRoute} onChange={(e) => setDraft({ ...draft, paymentRoute: e.target.value as CommercialCodeDraft["paymentRoute"] })}>{["unconfigured", "invoice", "payment_link", "stripe", "bank_transfer", "manual"].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field label="Starea plății"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.paymentStatus} onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value as CommercialCodeDraft["paymentStatus"] })}>{["needs_configuration", "test", "active", "paused"].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
      </div><label className="mt-3 grid gap-1 text-xs text-slate-400">Note<textarea rows={3} maxLength={2000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-sm text-slate-200" /></label><div className="mt-4 flex justify-end"><Button disabled={saving} onClick={() => void save()}><Save className="size-4" /> {saving ? "Se salvează…" : "Salvează configurarea"}</Button></div></section>}
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="grid gap-1"><Label className="text-xs text-slate-400">{label}</Label>{children}</label>;
