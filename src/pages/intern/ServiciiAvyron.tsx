import { useEffect, useState } from "react";
import { ArrowUpRight, BadgePercent, BarChart3, BookOpen, Boxes, Clock3, ExternalLink, FileCode2, Library, List, Settings2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICES } from "@/data/services";

const GROUPS: Record<string, { label: string; order: number }> = {
  presence: { label: "Prezență digitală", order: 1 },
  brand: { label: "Brand și identitate", order: 2 },
  commerce: { label: "Comerț digital", order: 3 },
  software: { label: "Software, automatizări și AI", order: 4 },
  quality: { label: "Calitate și validare", order: 5 },
};

export default function ServiciiAvyron({ embedded = false }: { embedded?: boolean }) {
  const [view, setView] = useState<"dashboard" | "list" | "settings">("dashboard");
  useEffect(() => {
    if (embedded) return;
    void import("@/lib/seo").then(({ setPageMeta }) => setPageMeta({
      title: "Servicii AVYRON — AVYRON OS",
      description: "Taxonomia, paginile publice și legăturile comerciale ale serviciilor AVYRON.",
      path: "/intern/servicii",
      robots: "noindex, nofollow",
    }));
  }, [embedded]);

  const groups = Object.entries(GROUPS)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, group]) => ({ ...group, key, services: SERVICES.filter((service) => service.category === key) }))
    .filter((group) => group.services.length > 0);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300"><Sparkles className="size-3.5" /> Centru comercial</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-white">Servicii AVYRON</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Servicii personalizate, livrate pentru clienți. Sunt separate de Produse AVYRON, care conține componente, template-uri, unelte și integrări reutilizabile.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3"><p className="text-2xl font-semibold text-white">{SERVICES.length + 1}</p><p className="text-[10px] text-slate-500">servicii publice</p></div>
            <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3"><p className="text-2xl font-semibold text-white">2</p><p className="text-[10px] text-slate-500">limbi sincronizate</p></div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/servicii" className="inline-flex items-center gap-1.5 rounded-full bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">Deschide serviciile <ExternalLink className="size-3.5" /></a>
          <a href="/biblioteca" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05]"><Library className="size-3.5" /> Verifică Biblioteca</a>
          <a href="/produse" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05]"><Boxes className="size-3.5" /> Produse AVYRON</a>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5" aria-label="Secțiuni Servicii AVYRON">
        {[
          { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
          { id: "list" as const, label: "Listă servicii", icon: List },
          { id: "settings" as const, label: "Setări comerciale", icon: Settings2 },
        ].map((item) => <button key={item.id} type="button" onClick={() => setView(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${view === item.id ? "bg-violet-500/15 text-violet-200" : "text-slate-500 hover:text-slate-200"}`}><item.icon className="size-3.5" />{item.label}</button>)}
      </nav>

      {view === "dashboard" && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: "Servicii publice", value: SERVICES.length + 1 }, { label: "Categorii", value: groups.length }, { label: "Limbi sincronizate", value: 2 }, { label: "Configurare comercială", value: "Centralizată" }].map((item) => <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 text-xl font-semibold text-white">{item.value}</p></div>)}
      </section>}

      {view === "settings" && <section className="grid gap-3 md:grid-cols-3">
        <a href="/profil?tab=commercial-codes" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/30"><FileCode2 className="size-5 text-violet-300"/><h2 className="mt-3 text-sm font-semibold text-white">Prețuri, coduri și plată</h2><p className="mt-1 text-xs text-slate-500">Configurează codul contabil, TVA, prețul și traseul de plată pentru fiecare serviciu.</p></a>
        <a href="/profil?tab=promotions" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/30"><BadgePercent className="size-5 text-cyan-300"/><h2 className="mt-3 text-sm font-semibold text-white">Promoții</h2><p className="mt-1 text-xs text-slate-500">Reguli comerciale și coduri promoționale administrate separat, fără dublarea prețurilor.</p></a>
        <a href="/profil?tab=leads" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/30"><BarChart3 className="size-5 text-emerald-300"/><h2 className="mt-3 text-sm font-semibold text-white">Pipeline și rezultate</h2><p className="mt-1 text-xs text-slate-500">Cererile și conversiile serviciilor rămân în CRM și Financiar.</p></a>
      </section>}

      {view === "list" && groups.map((group) => (
        <section key={group.key} aria-labelledby={`service-group-${group.key}`}>
          <h2 id={`service-group-${group.key}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {group.services.map((service) => {
              const copy = service.copy.ro;
              return (
                <Card key={service.key} className="border-white/[0.07] bg-white/[0.025]">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div><CardTitle className="text-base text-slate-100">{copy.name}</CardTitle><p className="mt-1 text-xs text-slate-500">{copy.subtitle}</p></div>
                      <Badge variant="outline" className="border-emerald-400/20 text-emerald-300">Public</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400"><span>de la {service.priceEur} €</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{service.duration.ro}</span></div>
                    <div className="flex flex-wrap gap-2">
                      <a href={service.path.ro} className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200">Pagina RO <ArrowUpRight className="size-3.5" /></a>
                      <a href={service.path.en} className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">Pagina EN <ArrowUpRight className="size-3.5" /></a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      {view === "list" && <Card className="border-white/[0.07] bg-white/[0.025]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div><p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><BookOpen className="size-4 text-rose-300" /> Blog profesional</p><p className="mt-1 text-xs text-slate-500">Pagină specializată, inclusă în oferta de servicii și sincronizată cu planurile editoriale.</p></div>
          <a href="/servicii/blog-profesional" className="inline-flex items-center gap-1 text-xs font-medium text-violet-300">Deschide pagina <ArrowUpRight className="size-3.5" /></a>
        </CardContent>
      </Card>}
    </div>
  );
}
