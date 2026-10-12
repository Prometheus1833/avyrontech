import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CreditCard, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { adminOperationsApi, type AdminSubscription } from "@/lib/adminOperationsApi";
import { SUBSCRIPTION_CATEGORIES, SPEC_LABELS } from "@/data/subscriptionPlans";
import { produseApi, type AdminPartnershipPlan } from "@/lib/produseApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const field = "w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/50";

export default function StaffSubscriptionsAdminTab() {
  const [rows, setRows] = useState<AdminSubscription[]>([]);
  const [traffic, setTraffic] = useState({ events: 0, sessions: 0 });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminSubscription | null>(null);
  const [draft, setDraft] = useState({ serviceName: "", price: "0", billingCycle: "monthly", status: "active", nextBillingDate: "" });
  const [saving, setSaving] = useState(false);
  const [partnerships, setPartnerships] = useState<AdminPartnershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AdminPartnershipPlan | null>(null);
  const [planDraft, setPlanDraft] = useState({ name: "", ron: "", eur: "", components: "", sections: "", templates: "" });

  const load = useCallback(async () => {
    try { const [result, catalog] = await Promise.all([adminOperationsApi.subscriptions(), produseApi.admin.overview()]); setRows(result.data); setTraffic(result.traffic); setPartnerships(catalog.plans); }
    catch { toast.error("Abonamentele nu au putut fi încărcate."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const open = (item: AdminSubscription) => {
    setSelected(item);
    setDraft({ serviceName: item.service_name, price: String(item.price), billingCycle: item.billing_cycle, status: item.status, nextBillingDate: new Date(item.next_billing_date).toISOString().slice(0, 10) });
  };
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminOperationsApi.updateSubscription(selected.id, { ...draft, price: Number(draft.price), nextBillingDate: new Date(`${draft.nextBillingDate}T12:00:00`).getTime() });
      toast.success("Abonamentul și serviciul asociat au fost sincronizate."); setSelected(null); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Abonamentul nu a putut fi salvat."); }
    finally { setSaving(false); }
  };
  const openPlan = (plan: AdminPartnershipPlan) => { setSelectedPlan(plan); setPlanDraft({ name: plan.name, ron: String(plan.price_ron_cents / 100), eur: String(plan.price_eur_cents / 100), components: String(plan.components_per_day), sections: String(plan.sections_per_day), templates: String(plan.templates_per_day) }); };
  const savePlan = async () => {
    if (!selectedPlan) return;
    const numbers = [planDraft.ron, planDraft.eur, planDraft.components, planDraft.sections, planDraft.templates].map(Number);
    if (numbers.some(value => !Number.isFinite(value) || value < 0)) { toast.error("Valorile planului trebuie să fie numere pozitive."); return; }
    setSaving(true);
    try { const ok = await produseApi.admin.updatePlan(selectedPlan.id, { name: planDraft.name, priceRonCents: Math.round(numbers[0] * 100), priceEurCents: Math.round(numbers[1] * 100), componentsPerDay: Math.floor(numbers[2]), sectionsPerDay: Math.floor(numbers[3]), templatesPerDay: Math.floor(numbers[4]) }); if (!ok) throw new Error("Planul nu a putut fi salvat."); toast.success("Parteneriatul a fost actualizat în catalogul D1."); setSelectedPlan(null); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Planul nu a putut fi salvat."); }
    finally { setSaving(false); }
  };
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("ro");
    return value ? rows.filter((item) => [item.company_name, item.project_name, item.service_name, item.status].some((entry) => entry.toLocaleLowerCase("ro").includes(value))) : rows;
  }, [query, rows]);
  const active = rows.filter((item) => item.status === "active").length;
  const clients = new Set(rows.map((item) => item.client_id)).size;

  return <div className="space-y-4 text-slate-100">
    <header className="rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.13] via-[#11182d] to-cyan-400/[0.07] p-5 sm:p-6"><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-violet-200/70">Produse AVYRON</p><h1 className="mt-2 font-display text-2xl font-bold text-white">Abonamente</h1><p className="mt-1 max-w-3xl text-sm text-slate-400">Monitorizare, clienți, proiecte, mentenanță, prețuri și cicluri de facturare conectate la aceeași sursă D1.</p></header>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={CreditCard} label="Active" value={active} /><Metric icon={Users} label="Clienți abonați" value={clients} /><Metric icon={Activity} label="Sesiuni pagină · 30 zile" value={Number(traffic.sessions)} note={`${Number(traffic.events)} evenimente first-party`} /></div>
    <details className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5"><summary className="cursor-pointer text-sm font-semibold text-white">Toate tipurile de abonamente · {SUBSCRIPTION_CATEGORIES.reduce((total, category) => total + category.plans.length, 0)} planuri</summary><p className="mt-2 text-xs text-amber-200/80">Prețurile și beneficiile acestor planuri publice sunt versionate în cod și în catalogul de checkout. Aici sunt afișate pentru verificare; modificarea lor necesită schimbare coordonată și review înainte de publicare.</p><div className="mt-4 space-y-4">{SUBSCRIPTION_CATEGORIES.map(category => <section key={category.key}><h2 className="mb-2 text-sm font-semibold text-violet-200">{category.copy.ro.title}</h2><div className="grid gap-2 lg:grid-cols-3">{category.plans.map(plan => <article key={plan.sku} className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold text-white">{plan.name}</h3><span className="text-xs text-cyan-200">{(plan.priceCents / 100).toLocaleString("ro-RO")} lei/lună</span></div><p className="mt-1 font-mono text-[10px] text-slate-500">{plan.sku}</p><p className="mt-2 text-xs text-slate-400">{plan.copy.ro.summary}</p><ul className="mt-2 space-y-1 text-[11px] text-slate-500">{plan.specs.map(spec => <li key={spec.key}>{SPEC_LABELS[spec.key].ro}: {spec.ro}</li>)}</ul></article>)}</div></section>)}</div></details>
    <details className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5"><summary className="cursor-pointer text-sm font-semibold text-white">Parteneriate Produse AVYRON · configurabile în D1</summary><p className="mt-2 text-xs text-slate-400">Aceste limite și prețuri sunt citite de checkoutul parteneriatelor. Modifică-le cu atenție și verifică oferta publică după lansare.</p><div className="mt-3 grid gap-2 md:grid-cols-3">{partnerships.map(plan => <article key={plan.id} className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><h3 className="text-sm font-semibold">{plan.name}</h3><p className="mt-1 text-xs text-slate-400">{(plan.price_ron_cents / 100).toLocaleString("ro-RO")} lei · {plan.components_per_day} componente / {plan.sections_per_day} secțiuni / {plan.templates_per_day} template-uri pe zi</p><Button size="sm" variant="outline" className="mt-3" onClick={() => openPlan(plan)}>Configurează</Button></article>)}</div></details>
    <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><span className="sr-only">Caută abonament</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută client, proiect, serviciu sau stare…" className="w-full rounded-xl border border-white/[0.08] bg-[#10162a]/90 py-3 pl-10 pr-3 text-sm outline-none focus:border-violet-400/40" /></label>
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10162a]/90"><div className="hidden grid-cols-[1.2fr_1fr_1fr_110px_110px_100px] gap-3 border-b border-white/[0.07] px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-slate-600 md:grid"><span>Client</span><span>Proiect</span><span>Serviciu</span><span>Preț</span><span>Următoarea</span><span>Stare</span></div>{filtered.map((item) => <button key={item.id} onClick={() => open(item)} type="button" className="grid w-full gap-2 border-b border-white/[0.05] p-4 text-left last:border-0 hover:bg-violet-400/[0.05] md:grid-cols-[1.2fr_1fr_1fr_110px_110px_100px] md:items-center"><span className="truncate text-sm font-medium">{item.company_name}</span><span className="truncate text-xs text-slate-400">{item.project_name}</span><span className="truncate text-xs text-slate-400">{item.service_name}</span><span className="text-xs font-semibold">{Number(item.price).toLocaleString("ro-RO")} lei</span><span className="text-xs text-slate-500">{new Date(item.next_billing_date).toLocaleDateString("ro-RO")}</span><span className={`w-fit rounded-full px-2 py-1 text-[10px] ${item.status === "active" ? "bg-emerald-400/10 text-emerald-300" : item.status === "paused" ? "bg-amber-400/10 text-amber-200" : "bg-rose-400/10 text-rose-200"}`}>{item.status}</span></button>)}{filtered.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nu există abonamente pentru filtrul curent.</p>}</section>
    <Dialog open={selected !== null} onOpenChange={(openState) => { if (!openState && !saving) setSelected(null); }}><DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle className="font-display text-white">Configurează abonamentul</DialogTitle><DialogDescription className="text-slate-400">{selected?.company_name} · {selected?.project_name}. Anularea păstrează istoricul și oprește starea activă.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400 sm:col-span-2">Serviciu<input className={`${field} mt-1`} value={draft.serviceName} onChange={(e) => setDraft((v) => ({ ...v, serviceName: e.target.value }))} /></label><label className="text-xs text-slate-400">Preț RON<input type="number" min="0" step="0.01" className={`${field} mt-1`} value={draft.price} onChange={(e) => setDraft((v) => ({ ...v, price: e.target.value }))} /></label><label className="text-xs text-slate-400">Ciclu<select className={`${field} mt-1`} value={draft.billingCycle} onChange={(e) => setDraft((v) => ({ ...v, billingCycle: e.target.value }))}><option value="monthly">Lunar</option><option value="yearly">Anual</option><option value="one_time">Unică</option></select></label><label className="text-xs text-slate-400">Stare<select className={`${field} mt-1`} value={draft.status} onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value }))}><option value="active">Activ</option><option value="paused">În pauză</option><option value="cancelled">Anulat</option></select></label><label className="text-xs text-slate-400">Următoarea facturare<input type="date" className={`${field} mt-1`} value={draft.nextBillingDate} onChange={(e) => setDraft((v) => ({ ...v, nextBillingDate: e.target.value }))} /></label></div><DialogFooter><Button variant="ghost" onClick={() => setSelected(null)} disabled={saving}>Închide</Button><Button onClick={() => void save()} disabled={saving}>{saving ? "Se salvează…" : "Salvează"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={selectedPlan !== null} onOpenChange={open => { if (!open && !saving) setSelectedPlan(null); }}><DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle className="text-white">Parteneriat · {selectedPlan?.id}</DialogTitle><DialogDescription>Prețuri și limite utilizate de catalogul D1 și de checkout.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400 sm:col-span-2">Nume<input className={field} value={planDraft.name} onChange={e => setPlanDraft({ ...planDraft, name: e.target.value })}/></label>{[["Preț RON", "ron"], ["Preț EUR", "eur"], ["Componente/zi", "components"], ["Secțiuni/zi", "sections"], ["Template-uri/zi", "templates"]].map(([label, key]) => <label key={key} className="text-xs text-slate-400">{label}<input className={field} type="number" min="0" step={key === "ron" || key === "eur" ? "0.01" : "1"} value={planDraft[key as keyof typeof planDraft]} onChange={e => setPlanDraft({ ...planDraft, [key]: e.target.value })}/></label>)}</div><DialogFooter><Button variant="ghost" disabled={saving} onClick={() => setSelectedPlan(null)}>Anulează</Button><Button disabled={saving || !planDraft.name.trim()} onClick={() => void savePlan()}>{saving ? "Se salvează…" : "Salvează planul"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

const Metric = ({ icon: Icon, label, value, note }: { icon: typeof CreditCard; label: string; value: number; note?: string }) => <div className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4"><p className="flex items-center gap-2 text-xs text-slate-500"><Icon className="size-4 text-violet-300" /> {label}</p><p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>{note && <p className="mt-1 text-[10px] text-slate-600">{note}</p>}</div>;
