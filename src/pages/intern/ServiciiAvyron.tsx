import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Clock3, ExternalLink, Search, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommercialCodeEditor, { type CommercialEditorItem } from "@/components/dashboard/CommercialCodeEditor";
import { SERVICES } from "@/data/services";
import { useAuth } from "@/hooks/useAuth";
import { catalogCodesApi, type CommercialCode, type CommercialProviderRef } from "@/lib/catalogCodesApi";

const GROUPS: Record<string, string> = {
  presence: "Prezență digitală", brand: "Brand și identitate", commerce: "Comerț digital", growth: "SEO și marketing",
  software: "Software, automatizări și AI", quality: "Calitate și validare",
};
const ALL_SERVICES = [...SERVICES, {
  key: "blog-profesional", category: "presence", priceRon: 1500,
  copy: { ro: { name: "Blog profesional și content hub", subtitle: "CMS, SEO tehnic, analytics și flux editorial configurabil." } },
  duration: { ro: "În funcție de configurație" },
  path: { ro: "/servicii/blog-profesional", en: "/en/services/professional-blog" },
}, {
  key: "audit", category: "quality", priceRon: 0,
  copy: { ro: { name: "Audit Website / Soft Actual", subtitle: "Evaluare la cerere a performanței, securității și experienței." } },
  duration: { ro: "În funcție de evaluare" },
  path: { ro: "/servicii/audit-website", en: "/en/services/website-audit" },
}, {
  key: "seo-ai", category: "growth", priceRon: 690,
  copy: { ro: { name: "SEO & AI Visibility and Performance", subtitle: "Audit gratuit; abonamente și optimizări unice." } },
  duration: { ro: "Lunar sau lucrare unică" },
  path: { ro: "/servicii/seo-ai-visibility-performance", en: "/en/services/seo-ai-visibility-performance" },
}, {
  key: "marketing-ads", category: "growth", priceRon: 990,
  copy: { ro: { name: "Digital Marketing & Ads", subtitle: "Campanii Ads, creative, AI și raportare." } },
  duration: { ro: "Lunar" },
  path: { ro: "/servicii/digital-marketing-ads", en: "/en/services/digital-marketing-ads" },
}];

export default function ServiciiAvyron({ embedded = false }: { embedded?: boolean }) {
  const { isSuperAdmin } = useAuth();
  const [codes, setCodes] = useState<CommercialCode[]>([]);
  const [references, setReferences] = useState<CommercialProviderRef[]>([]);
  const [selected, setSelected] = useState<CommercialEditorItem | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    try { const result = await catalogCodesApi.list(); setCodes(result.data.filter(item => item.entity_type === "service")); setReferences(result.references); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Setările comerciale nu sunt disponibile."); }
  }, [isSuperAdmin]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (embedded) return;
    void import("@/lib/seo").then(({ setPageMeta }) => setPageMeta({
      title: "Servicii AVYRON — AVYRON OS", description: "Serviciile și configurația comercială internă.",
      path: "/intern/servicii", robots: "noindex, nofollow",
    }));
  }, [embedded]);
  const visible = useMemo(() => ALL_SERVICES.filter(service => `${service.copy.ro.name} ${service.copy.ro.subtitle} ${GROUPS[service.category] || ""}`.toLocaleLowerCase("ro").includes(query.trim().toLocaleLowerCase("ro"))), [query]);
  const configured = codes.filter(item => item.accounting_code && item.sku && item.tax_status === "verified").length;

  return <div className="space-y-5 text-slate-100">
    <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300"><Sparkles className="size-3.5"/> Centru comercial</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div className="max-w-3xl"><h1 className="font-display text-2xl font-bold text-white">Servicii AVYRON</h1><p className="mt-2 text-sm leading-relaxed text-slate-400">Oferta într-un singur loc: pagini, durată, preț și configurarea comercială a fiecărui serviciu.</p></div><a href="/servicii" className="inline-flex items-center gap-1.5 rounded-full bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">Deschide serviciile <ExternalLink className="size-3.5"/></a></div>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Servicii în catalog", value: ALL_SERVICES.length }, { label: "Categorii", value: Object.keys(GROUPS).length }, { label: "Codificate complet", value: configured }].map(item => <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 text-xl font-semibold text-white">{item.value}</p></div>)}</div>
    {error && <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">{error}</p>}
    <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"/><span className="sr-only">Caută serviciu</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Caută un serviciu sau o categorie…" className="w-full rounded-xl border border-white/[0.08] bg-[#10162a] py-3 pl-10 pr-3 text-sm outline-none focus:border-violet-400/40"/></label>
    {Object.entries(GROUPS).map(([key, label]) => {
      const services = visible.filter(service => service.category === key);
      if (!services.length) return null;
      return <section key={key} aria-labelledby={`service-group-${key}`}><h2 id={`service-group-${key}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</h2><div className="grid gap-3 lg:grid-cols-2">{services.map(service => {
        const code = codes.find(item => item.entity_key === service.key);
        const price = code?.base_price_minor == null ? (service.priceRon > 0 ? service.priceRon : null) : code.base_price_minor / 100;
        const active = code ? Boolean(code.active) : true;
        return <article key={service.key} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-violet-300">{label}</p><h3 className="mt-1 text-base font-semibold text-white">{service.copy.ro.name}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{service.copy.ro.subtitle}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${active ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{active ? "Activ" : "Retras"}</span></div><div className="mt-4 grid gap-2 rounded-xl border border-white/[0.06] bg-black/10 p-3 text-xs text-slate-400 sm:grid-cols-3"><div><span className="block text-[10px] uppercase text-slate-600">Preț de bază</span><strong className="text-slate-200">{price === null ? "La ofertă" : `${price.toLocaleString("ro-RO")} lei`}</strong></div><div><span className="block text-[10px] uppercase text-slate-600">SKU</span><strong className="break-all font-mono text-slate-200">{code?.sku || "Neconfigurat"}</strong></div><div><span className="block text-[10px] uppercase text-slate-600">Durată</span><strong className="inline-flex items-center gap-1 text-slate-200"><Clock3 className="size-3"/>{service.duration.ro}</strong></div></div><div className="mt-4 flex flex-wrap items-center gap-3"><a href={service.path.ro} className="inline-flex items-center gap-1 text-xs text-violet-300 hover:underline">Pagina RO <ArrowUpRight className="size-3"/></a><a href={service.path.en} className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">Pagina EN <ArrowUpRight className="size-3"/></a>{isSuperAdmin && <Button size="sm" variant="outline" className="ml-auto" onClick={() => setSelected({ entityType: "service", entityKey: service.key, displayName: service.copy.ro.name, category: service.category, sourcePriceMinor: service.priceRon > 0 ? service.priceRon * 100 : null, sourceCurrency: "RON", detail: `${service.duration.ro} · paginile publice RO/EN rămân în catalogul site-ului`, config: code, references: references.filter(ref => ref.entity_type === "service" && ref.entity_key === service.key) })}><Settings2 className="size-3.5"/> Configurează</Button>}</div></article>;
      })}</div></section>;
    })}
    {visible.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">Niciun serviciu pentru această căutare.</p>}
    <CommercialCodeEditor item={selected} onClose={() => setSelected(null)} onSaved={load}/>
  </div>;
}
