import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileCode2, RefreshCw, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SERVICE_COMMERCIAL_SOURCES } from "@/data/serviceCommercialSources";
import { catalogCodesApi, type CommercialCode, type CommercialProviderRef, type ProductCatalogSource } from "@/lib/catalogCodesApi";
import CommercialCodeEditor, { type CommercialEditorItem } from "./CommercialCodeEditor";

const money = (minor: number | null, currency: string) => minor === null ? "De configurat" : new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(minor / 100);

export default function CommercialCodesTab() {
  const [configured, setConfigured] = useState<CommercialCode[]>([]);
  const [products, setProducts] = useState<ProductCatalogSource[]>([]);
  const [references, setReferences] = useState<CommercialProviderRef[]>([]);
  const [selected, setSelected] = useState<CommercialEditorItem | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "service" | "product" | "missing">("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await catalogCodesApi.list(); setConfigured(result.data); setProducts(result.products); setReferences(result.references); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Nomenclatorul nu poate fi încărcat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const rows = useMemo<CommercialEditorItem[]>(() => {
    const byKey = new Map(configured.map(row => [`${row.entity_type}:${row.entity_key}`, row]));
    return [
      ...SERVICE_COMMERCIAL_SOURCES.map(service => ({ entityType: "service" as const, entityKey: service.entity_key, displayName: service.display_name, category: service.category, sourcePriceMinor: service.base_price_minor, sourceCurrency: "RON", detail: "Oferta de serviciu · verifică prețul și fiscalitatea înainte de facturare", config: byKey.get(`service:${service.entity_key}`), references: references.filter(ref => ref.entity_type === "service" && ref.entity_key === service.entity_key) })),
      ...products.map(product => ({ entityType: "product" as const, entityKey: product.entity_key, displayName: product.display_name, category: product.category, sourcePriceMinor: product.base_price_minor, sourceCurrency: "RON", detail: `Tip ${product.category} · stare catalog: ${product.status}`, config: byKey.get(`product:${product.entity_key}`), references: references.filter(ref => ref.entity_type === "product" && ref.entity_key === product.entity_key) })),
    ];
  }, [configured, products, references]);
  const visible = useMemo(() => rows.filter(row => {
    if (filter === "missing" && row.config?.accounting_code && row.config?.sku && row.config.tax_status === "verified") return false;
    if ((filter === "service" || filter === "product") && row.entityType !== filter) return false;
    const needle = query.trim().toLocaleLowerCase("ro");
    return !needle || `${row.displayName} ${row.entityKey} ${row.config?.accounting_code || ""} ${row.config?.sku || ""}`.toLocaleLowerCase("ro").includes(needle);
  }), [rows, filter, query]);
  const coded = rows.filter(row => row.config?.accounting_code && row.config?.sku && row.config.tax_status === "verified").length;
  const sync = async () => {
    setSyncing(true);
    try { const result = await catalogCodesApi.sync(); await load(); toast.success(`${result.created} elemente noi înregistrate; ${result.existing} păstrate. Codurile contabile și taxele rămân de verificat.`); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Sincronizarea nu a reușit."); }
    finally { setSyncing(false); }
  };
  return <div className="space-y-5">
    <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6"><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300"><FileCode2 className="size-3.5"/> AVYRON OS · nomenclator comercial</p><h1 className="mt-2 font-display text-2xl font-bold text-white">Coduri servicii și produse</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Alege un element pentru mini-dashboardul său: identitate, preț, TVA și traseu de plată. Registrul nu procesează bani și nu conectează singur procesatorii.</p></header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100"><AlertTriangle className="size-4 shrink-0"/>{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Elemente", value: rows.length }, { label: "Cod + TVA verificate", value: coded }, { label: "De configurat", value: rows.length - coded }].map(item => <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-semibold text-white">{item.value}</p></div>)}</div>
    <div className="flex flex-wrap gap-2"><div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"/><Input aria-label="Caută cod comercial" value={query} onChange={event => setQuery(event.target.value)} className="border-white/[0.08] bg-white/[0.025] pl-9" placeholder="Caută nume, cod sau SKU…"/></div><select aria-label="Filtrează nomenclatorul" value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-white/[0.08] bg-[#0e1527] px-3 py-2 text-xs text-slate-300"><option value="all">Toate</option><option value="service">Servicii</option><option value="product">Produse</option><option value="missing">Necesită configurare</option></select><Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4"/> Actualizează</Button><Button disabled={loading || syncing} onClick={() => void sync()}><RefreshCw className="size-4"/> {syncing ? "Se sincronizează…" : "Înregistrează lipsurile"}</Button></div>
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{visible.map(row => <article key={`${row.entityType}:${row.entityKey}`} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-violet-300">{row.entityType === "service" ? "Serviciu" : "Produs"} · {row.category}</p><h2 className="mt-1 text-sm font-semibold text-white">{row.displayName}</h2><p className="mt-1 break-all font-mono text-[10px] text-slate-500">{row.entityKey}</p></div><span className={`rounded-full px-2 py-1 text-[10px] ${row.config?.sku && row.config?.accounting_code && row.config.tax_status === "verified" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>{row.config?.sku && row.config?.accounting_code && row.config.tax_status === "verified" ? "Cod + TVA verificate" : "Incomplet"}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>{money(row.entityType === "product" ? row.sourcePriceMinor : row.config?.base_price_minor ?? row.sourcePriceMinor, row.entityType === "product" ? "RON" : row.config?.currency ?? row.sourceCurrency)}</span><span>SKU {row.config?.sku || "—"}</span><span>TVA {row.config?.tax_status === "verified" ? `${(row.config.vat_basis_points / 100).toLocaleString("ro-RO")}% verificat` : "de verificat"}</span>{row.config && row.config.base_price_minor !== row.sourcePriceMinor && <span className="text-amber-200">Preț diferit de sursă</span>}</div><Button className="mt-4 w-full justify-center" size="sm" variant="outline" onClick={() => setSelected(row)}><Settings2 className="size-3.5"/> Configurează</Button></article>)}{!loading && visible.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500">Niciun element pentru filtrul selectat.</p>}</div>
    <CommercialCodeEditor item={selected} onClose={() => setSelected(null)} onSaved={load}/>
  </div>;
}
