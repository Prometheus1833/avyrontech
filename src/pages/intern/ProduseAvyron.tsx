import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Box, Plus, RefreshCw, Search, Settings2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import CommercialCodeEditor, { type CommercialEditorItem } from "@/components/dashboard/CommercialCodeEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EMPTY_OVERVIEW, produseApi, type AdminOverview, type AdminProductItem, type PlanId } from "@/lib/produseApi";
import { catalogCodesApi, type CommercialCode } from "@/lib/catalogCodesApi";

const TYPES = [["component", "Componentă"], ["section", "Secțiune"], ["template", "Template"], ["effect", "Efect"], ["tool", "Unealtă"], ["api", "Integrare API"], ["doc", "Document"], ["logo", "Logo"]] as const;
const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/40";
type ProductDraft = { slug: string; type: string; category: string; nameRo: string; nameEn: string; access: PlanId; status: AdminProductItem["status"]; price: string };
const emptyDraft: ProductDraft = { slug: "", type: "component", category: "", nameRo: "", nameEn: "", access: "free", status: "draft", price: "" };
const fromItem = (item: AdminProductItem): ProductDraft => ({ slug: item.slug, type: item.type, category: item.category, nameRo: item.name_ro, nameEn: item.name_en, access: item.access, status: item.status, price: item.price_ron_cents === null ? "" : String(item.price_ron_cents / 100) });

export default function ProduseAvyron({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<AdminOverview>(EMPTY_OVERVIEW);
  const [codes, setCodes] = useState<CommercialCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminProductItem | "new" | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [commercial, setCommercial] = useState<CommercialEditorItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const overview = await produseApi.admin.overview();
      setData(overview);
      if (overview.unavailable) setError(overview.unavailable === "catalog_unavailable" ? "Catalogul D1 nu este disponibil pe această bază." : "Nu ai acces la catalog.");
      const catalog = await catalogCodesApi.list().catch(() => null);
      if (!catalog) setError(current => current || "Codurile comerciale nu sunt disponibile pe această bază.");
      setCodes((catalog?.data || []).filter(code => code.entity_type === "product"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Catalogul nu a putut fi încărcat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!embedded) void import("@/lib/seo").then(({ setPageMeta }) => setPageMeta({ title: "Produse Avyron — AVYRON OS", description: "Catalogul comercial intern al produselor AVYRON.", path: "/intern/produse", robots: "noindex, nofollow" })); }, [embedded]);

  const items = useMemo(() => data.items.filter(item => `${item.name_ro} ${item.name_en} ${item.slug} ${item.category}`.toLocaleLowerCase("ro").includes(query.trim().toLocaleLowerCase("ro"))), [data.items, query]);
  const openItem = (item: AdminProductItem | "new") => { setSelected(item); setDraft(item === "new" ? emptyDraft : fromItem(item)); };
  const saveItem = async (archive = false) => {
    if (!selected || !draft.nameRo.trim() || !draft.nameEn.trim() || !draft.category.trim()) { toast.error("Completează denumirile și categoria."); return; }
    const price = draft.price.trim() === "" ? null : Number(draft.price.replace(",", "."));
    if (price !== null && (!Number.isFinite(price) || price < 0)) { toast.error("Prețul nu este valid."); return; }
    setSaving(true);
    try {
      const priceRonCents = price === null ? null : Math.round(price * 100);
      const ok = selected === "new"
        ? await produseApi.admin.createItem({ slug: draft.slug, type: draft.type, category: draft.category, nameRo: draft.nameRo, nameEn: draft.nameEn, access: draft.access, priceRonCents })
        : await produseApi.admin.patchItem({ slug: draft.slug, type: draft.type, category: draft.category, nameRo: draft.nameRo, nameEn: draft.nameEn, access: draft.access, status: archive ? "archived" : draft.status, priceRonCents });
      if (!ok) throw new Error("Serverul a refuzat modificarea catalogului.");
      toast.success(selected === "new" ? "Produsul a fost adăugat ca draft." : archive ? "Produsul a fost arhivat; istoricul rămâne păstrat." : "Produsul a fost actualizat.");
      setSelected(null); await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Produsul nu a putut fi salvat."); }
    finally { setSaving(false); }
  };
  const openCommercial = (item: AdminProductItem) => setCommercial({ entityType: "product", entityKey: item.slug, displayName: item.name_ro, category: item.type, sourcePriceMinor: item.price_ron_cents, sourceCurrency: "RON", detail: `${item.category} · ${item.access} · ${item.status}`, config: codes.find(code => code.entity_key === item.slug) });

  return <div className="space-y-5 text-slate-100">
    <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-violet-300">Centru comercial · produse</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-bold text-white">Produse AVYRON</h1><p className="mt-1 text-sm text-slate-400">Catalogul, accesul, prețurile și codurile într-un singur flux. Eliminarea se face prin arhivare, fără pierderea istoricului.</p></div><Button onClick={() => openItem("new")}><Plus className="size-4"/> Produs nou</Button></div></header>
    {error && <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">{error}</p>}
    {loading && <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">Se încarcă produsele și configurările comerciale…</p>}
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Produse", value: data.items.length, icon: Box }, { label: "Publicabile", value: data.items.filter(item => item.status === "live").length, icon: ShoppingBag }, { label: "Coduri comerciale", value: codes.filter(code => code.sku && code.accounting_code).length, icon: Settings2 }].map(tile => <div key={tile.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><tile.icon className="size-4 text-violet-300"/><p className="mt-2 text-xs text-slate-500">{tile.label}</p><p className="text-2xl font-semibold">{tile.value}</p></div>)}</div>
    <div className="flex gap-2"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"/><span className="sr-only">Caută produs</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Caută produs, tip sau categorie…" className="w-full rounded-xl border border-white/[0.08] bg-[#10162a] py-3 pl-10 pr-3 text-sm outline-none"/></label><Button variant="outline" aria-label="Actualizează catalogul" onClick={() => void load()}><RefreshCw className="size-4"/></Button></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={item.slug} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-violet-300">{TYPES.find(([type]) => type === item.type)?.[1] || item.type} · {item.category}</p><h2 className="mt-1 text-sm font-semibold text-white">{item.name_ro}</h2><p className="mt-1 break-all font-mono text-[10px] text-slate-600">{item.slug}</p></div><span className={`rounded-full px-2 py-1 text-[10px] ${item.status === "live" ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-400/10 text-slate-300"}`}>{item.status}</span></div><p className="mt-3 text-xs text-slate-400">{item.price_ron_cents === null ? "Preț de configurat" : `${(item.price_ron_cents / 100).toLocaleString("ro-RO")} lei`} · acces {item.access} · SKU {codes.find(code => code.entity_key === item.slug)?.sku || "—"}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openItem(item)}>Editează</Button><Button size="sm" variant="outline" onClick={() => openCommercial(item)}><Settings2 className="size-3.5"/> Coduri și plată</Button></div></article>)}{!loading && items.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-400">Nu există produse pentru această căutare.</p>}</div>
    <details className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><summary className="cursor-pointer text-sm font-semibold">Activitate și parteneriate</summary><div className="mt-4 grid gap-3 sm:grid-cols-3"><p className="rounded-xl bg-black/10 p-3 text-xs text-slate-400">Obțineri în 14 zile <strong className="mt-1 block text-xl text-white">{data.copies.reduce((sum, row) => sum + row.count, 0)}</strong></p><p className="rounded-xl bg-black/10 p-3 text-xs text-slate-400">Comenzi plătite <strong className="mt-1 block text-xl text-white">{data.orders.filter(order => order.status === "paid").length}</strong></p><p className="rounded-xl bg-black/10 p-3 text-xs text-slate-400">Planuri de parteneriat <strong className="mt-1 block text-xl text-white">{data.plans.length}</strong></p></div></details>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open && !saving) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#0c1425] text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle className="text-white">{selected === "new" ? "Produs nou" : "Editează produsul"}</DialogTitle><DialogDescription>Un produs nou rămâne draft. Arhivarea ascunde oferta fără a șterge comenzile sau drepturile existente.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label="Slug / cod stabil"><input className={inputClass} value={draft.slug} disabled={selected !== "new"} onChange={e => setDraft({ ...draft, slug: e.target.value.toLowerCase() })}/></Field><Field label="Tip"><select className={inputClass} value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Nume RO"><input className={inputClass} value={draft.nameRo} onChange={e => setDraft({ ...draft, nameRo: e.target.value })}/></Field><Field label="Nume EN"><input className={inputClass} value={draft.nameEn} onChange={e => setDraft({ ...draft, nameEn: e.target.value })}/></Field><Field label="Categorie"><input className={inputClass} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/></Field><Field label="Preț RON"><input className={inputClass} inputMode="decimal" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="Neconfigurat"/></Field><Field label="Acces"><select className={inputClass} value={draft.access} onChange={e => setDraft({ ...draft, access: e.target.value as PlanId })}><option value="free">Free</option><option value="pro">Pro</option><option value="studio">Studio</option></select></Field>{selected !== "new" && <Field label="Stare"><select className={inputClass} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as ProductDraft["status"] })}><option value="draft">Draft</option><option value="soon">În curând</option><option value="live">Live</option><option value="archived">Arhivat</option></select></Field>}</div><p className="text-xs text-amber-200/80">Catalogul comercial D1 controlează accesul și checkoutul. Publicarea vizuală a unui produs nou în vitrina statică necesită o lansare a site-ului.</p><div className="flex flex-wrap justify-between gap-2">{selected !== "new" && draft.status !== "archived" ? <Button variant="ghost" className="text-rose-300" disabled={saving} onClick={() => void saveItem(true)}><Archive className="size-4"/> Arhivează</Button> : <span/>}<div className="flex gap-2"><Button variant="ghost" onClick={() => setSelected(null)} disabled={saving}>Anulează</Button><Button disabled={saving || !draft.slug || !draft.nameRo || !draft.nameEn || !draft.category} onClick={() => void saveItem()}>{saving ? "Se salvează…" : "Salvează"}</Button></div></div></DialogContent></Dialog>
    <CommercialCodeEditor item={commercial} onClose={() => setCommercial(null)} onSaved={load}/>
  </div>;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="min-w-0 text-xs text-slate-400">{label}{children}</label>;
