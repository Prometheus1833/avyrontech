import { useEffect } from "react";
import { ArrowUpRight, BookOpen, Boxes, Clock3, ExternalLink, Library, Sparkles } from "lucide-react";

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

      {groups.map((group) => (
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

      <Card className="border-white/[0.07] bg-white/[0.025]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div><p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><BookOpen className="size-4 text-rose-300" /> Blog profesional</p><p className="mt-1 text-xs text-slate-500">Pagină specializată, inclusă în oferta de servicii și sincronizată cu planurile editoriale.</p></div>
          <a href="/servicii/blog-profesional" className="inline-flex items-center gap-1 text-xs font-medium text-violet-300">Deschide pagina <ArrowUpRight className="size-3.5" /></a>
        </CardContent>
      </Card>
    </div>
  );
}
