import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileCode2, RefreshCw, Search, Settings2, Copy, BriefcaseBusiness, Boxes, Download, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { catalogCodesApi, type CommercialCode, type CommercialProviderRef, type ProductCatalogSource, type ServiceCatalogSource, type CommercialJournalEntry } from "@/lib/catalogCodesApi";
import CommercialCodeEditor, { type CommercialEditorItem } from "./CommercialCodeEditor";

const complete = (row: CommercialEditorItem) => !!(row.config?.sku?.trim() && row.config?.accounting_code?.trim());
const searchable = (row: CommercialEditorItem, q: string) => `${row.displayName} ${row.entityKey} ${row.category} ${row.config?.sku || ""} ${row.config?.accounting_code || ""}`.toLocaleLowerCase("ro").includes(q.trim().toLocaleLowerCase("ro"));
const copy = async (value: string) => {
  try { await navigator.clipboard.writeText(value); toast.success("Cod copiat"); }
  catch { toast.error("Copiere indisponibilă. Selectează codul."); }
};
const actionLabel: Record<string, string> = { catalog_sync: "Înregistrare din catalog", identity_completion: "Completare coduri", catalog_backfill_0117: "Completare registru", created: "Înregistrare", configuration_updated: "Configurare actualizată" };

export default function CommercialCodesTab() {
  const [configured, setConfigured] = useState<CommercialCode[]>([]);
  const [services, setServices] = useState<ServiceCatalogSource[]>([]);
  const [products, setProducts] = useState<ProductCatalogSource[]>([]);
  const [references, setReferences] = useState<CommercialProviderRef[]>([]);
  const [selected, setSelected] = useState<CommercialEditorItem | null>(null);
  const [listKind, setListKind] = useState<"service" | "product" | null>(null);
  const [listQuery, setListQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [journal, setJournal] = useState<CommercialJournalEntry[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await catalogCodesApi.list();
      setConfigured(result.data); setServices(result.services || []); setProducts(result.products); setReferences(result.references);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Registrul nu poate fi încărcat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const history = async (offset = 0) => {
    setHistoryLoading(true); setHistoryError("");
    try { const result = await catalogCodesApi.journal(offset); setJournal(old => offset ? [...old, ...result.data] : result.data); setNextOffset(result.nextOffset); }
    catch { setHistoryError("Jurnalul nu poate fi încărcat. Reîncearcă."); }
    finally { setHistoryLoading(false); }
  };
  const rows = useMemo<CommercialEditorItem[]>(() => {
    const byKey = new Map(configured.map(row => [`${row.entity_type}:${row.entity_key}`, row]));
    const sources: CommercialEditorItem[] = [
      ...services.map(s => ({ entityType: "service" as const, entityKey: s.entity_key, displayName: s.display_name, category: s.category, sourcePriceMinor: s.base_price_minor, sourceCurrency: s.currency || "RON", detail: "Serviciu din catalogul curent", config: byKey.get(`service:${s.entity_key}`) })),
      ...products.map(p => ({ entityType: "product" as const, entityKey: p.entity_key, displayName: p.display_name, category: p.category, sourcePriceMinor: p.base_price_minor, sourceCurrency: "RON", detail: `Produs · ${p.status}`, config: byKey.get(`product:${p.entity_key}`) })),
    ];
    const keys = new Set(sources.map(r => `${r.entityType}:${r.entityKey}`));
    // Registry-only records remain visible: custom articles and historical identifiers are never discarded.
    for (const c of configured) if (!keys.has(`${c.entity_type}:${c.entity_key}`)) sources.push({ entityType: c.entity_type, entityKey: c.entity_key, displayName: c.display_name, category: c.category, sourcePriceMinor: c.base_price_minor, sourceCurrency: c.currency, detail: "Înregistrare proprie / istoric · absentă din catalogul curent", config: c });
    return sources.map(r => ({ ...r, references: references.filter(ref => ref.entity_type === r.entityType && ref.entity_key === r.entityKey) }));
  }, [configured, services, products, references]);
  const visible = rows.filter(r => searchable(r, query) && (filter === "all" || filter === "missing" && !complete(r) || filter === "tax" && r.config?.tax_status !== "verified" || r.entityType === filter));
  const coded = rows.filter(complete).length;
  const listRows = rows.filter(r => r.entityType === listKind && searchable(r, listQuery));
  const sync = async () => {
    setSyncing(true);
    try { const r = await catalogCodesApi.sync(); await load(); if (historyOpen) await history(); toast.success(`${r.created} înregistrări noi · ${r.completed} completate · ${r.existing} păstrate.`); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Sincronizarea nu a reușit."); }
    finally { setSyncing(false); }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), scope: "internal-reference", entries: rows.map(r => ({ type: r.entityType, key: r.entityKey, name: r.displayName, sku: r.config?.sku || null, article: r.config?.accounting_code || null, source: r.detail, taxStatus: r.config?.tax_status || "unverified" })) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "AVYRON-registru-coduri.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const identity = (r: CommercialEditorItem) => <dl className="mt-2 grid gap-2 sm:grid-cols-3">{[["Identificator", r.entityKey], ["SKU", r.config?.sku], ["Cod articol", r.config?.accounting_code]].map(([label, value]) => <div key={label} className="relative min-h-12 min-w-0 rounded-[10px] bg-white/[.035] px-2 py-1 pr-12"><dt className="text-[11px] text-slate-400">{label}</dt><dd className="min-w-0"><code className={`break-all text-xs ${value ? "text-cyan-100" : "text-amber-200"}`}>{value || "Necompletat"}</code>{value && <button type="button" className="absolute right-1 top-1 grid size-11 place-items-center rounded-md hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" aria-label={`Copiază ${label} · ${r.displayName}`} onClick={() => copy(value)}><Copy className="size-3.5" /></button>}</dd></div>)}</dl>;
  return <div className="min-w-0 space-y-4">
    <header className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-cyan-400/5 p-4 sm:p-5"><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-violet-300"><FileCode2 className="size-4" /> AVYRON OS · registru de referință</p><h1 className="mt-2 font-display text-2xl font-bold">Coduri servicii și produse</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Identificatori stabili pentru catalog, documente, comenzi și facturare. Sincronizarea completează codurile lipsă; configurările comerciale existente sunt păstrate.</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={loading || syncing || !!error} onClick={() => void sync()}><RefreshCw className="mr-2 size-4" />{syncing ? "Se sincronizează…" : "Sincronizează codurile"}</Button><Button variant="outline" disabled={loading || !!error} onClick={download}><Download className="mr-2 size-4" />Export registru</Button><Button variant="ghost" disabled={loading} onClick={() => void load()}>Actualizează</Button></div></header>
    {error && <p role="alert" className="flex gap-2 rounded-xl border border-amber-300/20 p-3 text-sm text-amber-100"><AlertTriangle className="size-4 shrink-0" />{error}</p>}
    <div className="grid gap-2 sm:grid-cols-2" aria-label="Liste coduri">{(["service", "product"] as const).map((kind) => { const Icon = kind === "service" ? BriefcaseBusiness : Boxes; const count = rows.filter(r => r.entityType === kind); return <Button key={kind} aria-label={kind === "service" ? "Coduri servicii" : "Coduri produse"} variant="outline" className="h-auto min-h-16 justify-start gap-3 whitespace-normal rounded-xl border-white/10 p-3" onClick={() => { setListQuery(""); setListKind(kind); }}><Icon className="size-5 shrink-0 text-violet-300" /><span className="min-w-0 text-left"><strong className="block">Coduri {kind === "service" ? "servicii" : "produse"}</strong><span className="text-xs text-slate-400">{count.length} înregistrări · {count.filter(complete).length} cu identitate completă</span></span></Button>; })}</div>
    <p className="text-xs text-slate-400" role="status">{loading ? "Se încarcă registrul…" : `${coded}/${rows.length} identități complete · ${rows.length - coded} de completat · ${rows.filter(r => r.config?.tax_status !== "verified").length} cu fiscalitate de verificat separat`}</p>
    <div className="flex flex-wrap gap-2"><div className="relative min-w-0 flex-1 basis-52"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input aria-label="Caută cod comercial" value={query} onChange={e => setQuery(e.target.value)} className="min-h-11 pl-9" placeholder="Nume, identificator, SKU sau cod…" /></div><select aria-label="Filtrează nomenclatorul" value={filter} onChange={e => setFilter(e.target.value)} className="min-h-11 max-w-full rounded-xl border border-white/15 bg-[#10162a] px-3 text-sm"><option value="all">Toate</option><option value="service">Servicii</option><option value="product">Produse</option><option value="missing">Coduri lipsă</option><option value="tax">Fiscalitate de verificat</option></select></div>
    <div className="grid items-start gap-2 lg:grid-cols-2">{visible.map(r => <article key={`${r.entityType}:${r.entityKey}`} className="min-w-0 rounded-xl border border-white/10 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-sm font-semibold">{r.displayName}</h2><p className="mt-1 text-[11px] text-slate-400">{r.detail}</p></div><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] ${complete(r) ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-400/10 text-amber-200"}`}>{complete(r) ? "Coduri complete" : "Coduri lipsă"}</span></div>{identity(r)}<div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] text-slate-400">TVA {r.config?.tax_status === "verified" ? "verificat" : "de verificat"} · plăți {r.config?.payment_status === "active" ? "active" : "de configurat"}</span><Button size="sm" variant="outline" onClick={() => setSelected(r)}><Settings2 className="mr-1 size-3.5" />Configurează</Button></div></article>)}</div>
    {!loading && !error && !visible.length && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">Nicio înregistrare pentru filtrul ales.</p>}
    <details className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm font-semibold">Convenții și legături în sistem</summary><div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400"><p>Identificatorul tehnic leagă înregistrarea de catalog. SKU identifică articolul comercial. Codul de articol se folosește în documente și facturare; nu reprezintă un cont contabil.</p><p>Servicii: AVY-SRV-… / AVS001… · Produse: AVY-DIG-CMP/SEC/TPL/3DE/TOL/API/DOC/LGO-… / AVD0001… . Codurile istorice și convențiile pachetelor SEO, Ads și abonamentelor rămân valabile.</p><p>Document Center, comenzile și fluxurile de vânzare citesc același registru. Modificarea unui cod utilizat într-o comandă este blocată. Codurile complete nu echivalează cu verificarea TVA, a licenței sau cu activarea procesatorului.</p></div></details>
    <section aria-label="Jurnal coduri" className="rounded-xl border border-white/10 p-3"><Button variant="ghost" className="w-full justify-start hover:bg-white/5 hover:text-white" aria-expanded={historyOpen} onClick={() => { const open = !historyOpen; setHistoryOpen(open); if (open) void history(); }}><History className="mr-2 size-4" />Jurnalul modificărilor</Button>{historyOpen && <div className="mt-2 space-y-2">{historyError && <p role="alert" className="text-sm text-amber-200">{historyError}<Button variant="ghost" onClick={() => void history()}>Reîncearcă</Button></p>}{journal.map(e => <article key={e.id} className="min-w-0 rounded-lg bg-white/[.035] p-2 text-xs"><div className="flex flex-wrap justify-between gap-1"><strong>{e.display_name}</strong><time className="text-slate-400" dateTime={new Date(e.created_at).toISOString()}>{new Date(e.created_at).toLocaleString("ro-RO")}</time></div><p className="mt-1 text-slate-400">{actionLabel[e.action] || "Configurare actualizată"} · {e.entity_key}</p><p className="mt-1 break-all font-mono">{e.before_sku && e.before_sku !== e.sku ? `${e.before_sku} → ` : ""}{e.sku || "—"} · {e.before_article && e.before_article !== e.article ? `${e.before_article} → ` : ""}{e.article || "—"}</p></article>)}{historyLoading && <p role="status" className="text-xs">Se încarcă jurnalul…</p>}{!historyLoading && !historyError && !journal.length && <p className="text-xs text-slate-400">Nicio modificare înregistrată.</p>}{nextOffset !== null && <Button disabled={historyLoading} variant="outline" onClick={() => void history(nextOffset)}>Încarcă mai multe</Button>}</div>}</section>
    <Dialog open={!!listKind} onOpenChange={open => { if (!open) setListKind(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto border-white/15 bg-[#10162a] text-slate-100 sm:max-w-4xl"><DialogHeader className="pr-7 text-left"><DialogTitle>{listKind === "service" ? "Coduri servicii" : "Coduri produse"}</DialogTitle><DialogDescription>Registru central sincronizat cu sursele curente și înregistrările istorice. Identificatorul, SKU și codul de articol au roluri distincte.</DialogDescription></DialogHeader><Input aria-label="Caută în lista de coduri" value={listQuery} onChange={e => setListQuery(e.target.value)} placeholder="Nume, identificator, SKU sau cod…" className="min-h-11 text-base sm:text-sm" />{loading && <p role="status" className="text-sm text-slate-400">Se încarcă lista…</p>}{error && <div role="alert" className="rounded-lg border border-amber-300/20 p-3 text-sm text-amber-100">{error}<Button variant="outline" className="mt-2 block" disabled={loading} onClick={() => void load()}>Reîncearcă încărcarea</Button></div>}<div className="space-y-2">{!loading && !error && listRows.map(r => <article key={r.entityKey} className="rounded-xl border border-white/10 p-3"><div className="flex items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-semibold">{r.displayName}</h3><Button size="sm" variant="outline" onClick={() => { setListKind(null); setSelected(r); }}>Configurează</Button></div>{identity(r)}</article>)}{!loading && !error && !listRows.length && <p className="text-sm text-slate-400">Niciun cod pentru căutarea curentă.</p>}</div></DialogContent></Dialog>
    <CommercialCodeEditor item={selected} onClose={() => setSelected(null)} onSaved={async () => { await load(); if (historyOpen) await history(); }} />
  </div>;
}
