import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, Boxes, CreditCard, Heart, Receipt, Repeat, ShoppingCart } from "lucide-react";
import type { SectionId } from "@/lib/access";
import { cfAuth } from "@/lib/cfAuth";

const actions = [
  { id: "catalog", label: "Servicii și produse", description: "Explorează catalogul AVYRON", icon: Boxes },
  { id: "cart", label: "Coșul meu", description: "Pregătește următoarea comandă", icon: ShoppingCart },
  { id: "orders", label: "Istoric și plăți", description: "Urmărește comenzile și plata", icon: CreditCard },
  { id: "subscriptions", label: "Abonamente", description: "Planuri și servicii recurente", icon: Repeat },
  { id: "invoices", label: "Facturi", description: "Documente și date de facturare", icon: Receipt },
  { id: "collection", label: "Favorite și colecție", description: "Produsele salvate și cumpărate", icon: Heart },
] as const;

export function CustomerHomeTab({ displayName, onOpenSection }: { displayName: string; onOpenSection: (section: SectionId) => void }) {
  const [recent, setRecent] = useState<{ id: string; status: string; total_cents: number; currency: string } | null>(null);
  useEffect(() => {
    let active = true;
    void cfAuth.request<{ data: Array<{ id: string; status: string; total_cents: number; currency: string }> }>("/api/commerce/orders")
      .then((response) => { if (active) setRecent(response.data?.[0] ?? null); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <div className="space-y-5">
    <header className="relative overflow-hidden rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,.22),transparent_45%),linear-gradient(135deg,#11162a,#0a1020)] p-6 sm:p-8"><div className="relative"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-violet-300">Contul tău AVYRON</p><h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Bună, {displayName}.</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Găsești aici serviciile, produsele și documentele tale. Poți pregăti o comandă în câțiva pași.</p><button type="button" onClick={() => onOpenSection("catalog")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">Explorează catalogul <ArrowUpRight className="size-4" /></button></div></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{actions.map((action) => <button key={action.id} type="button" onClick={() => onOpenSection(action.id)} className="group flex min-h-28 flex-col items-start rounded-2xl border border-white/[.08] bg-[#10162a]/90 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/30"><action.icon className="size-5 text-violet-300" /><span className="mt-3 text-sm font-semibold text-white">{action.label}</span><span className="mt-0.5 text-xs text-slate-400">{action.description}</span></button>)}</div>
    {recent && <button type="button" onClick={() => onOpenSection("orders")} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.08] bg-white/[.035] p-4 text-left"><span><span className="block text-xs text-slate-400">Ultima comandă · #{recent.id.slice(0, 8).toUpperCase()}</span><span className="mt-1 block text-sm font-medium">{recent.status === "paid" ? "Plătită" : "Vezi starea și opțiunile de plată"}</span></span><ArrowUpRight className="size-4 text-violet-300" /></button>}
    <div className="flex flex-wrap gap-3 text-sm"><a href="/blog" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-slate-300 hover:text-white"><BookOpen className="size-4" /> Blog AVYRON</a><a href="/biblioteca" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-slate-300 hover:text-white"><Boxes className="size-4" /> Bibliotecă</a></div>
  </div>;
}
