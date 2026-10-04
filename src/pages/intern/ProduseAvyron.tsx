import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, CalendarClock, Database, FileCode2, Layers, LineChart, List, RefreshCw, Settings2, ShoppingBag, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPTY_OVERVIEW, produseApi, type AdminOverview } from "@/lib/produseApi";

/**
 * Centrul „Produse Avyron” din AVYRON OS.
 *
 * Patru întrebări, patru blocuri: ce e în catalog și ce se mută luna asta
 * dintr-un parteneriat în altul, cine are drepturi, ce s-a vândut și cât se
 * folosește. Datele vin agregate din Worker — nicio listă de clienți aici.
 */

const TYPE_LABEL: Record<string, string> = {
  component: "Componente",
  section: "Secțiuni",
  template: "Template-uri",
  effect: "Efecte 3D",
  tool: "Unelte",
  api: "Integrări API",
  doc: "Documente",
  logo: "Logo",
};

const ACCESS_LABEL: Record<string, string> = { free: "Gratuit", pro: "Pro", studio: "Studio" };

const lei = (cents: number) => `${(cents / 100).toLocaleString("ro-RO")} lei`;
const date = (value: number | null) => (value ? new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—");

export default function ProduseAvyron({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<AdminOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"dashboard" | "catalog" | "collection" | "sources" | "settings">("dashboard");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await produseApi.admin.overview());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (embedded) return;
    void import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: "Produse Avyron — AVYRON OS",
        description: "Catalogul, parteneriatele și comenzile din magazinul Produse Avyron.",
        path: "/intern/produse",
        robots: "noindex, nofollow",
      }),
    );
  }, [embedded]);

  const byType = useMemo(() => {
    const map = new Map<string, { total: number; free: number; paid: number; soon: number }>();
    for (const row of data.catalog) {
      const entry = map.get(row.type) ?? { total: 0, free: 0, paid: 0, soon: 0 };
      entry.total += row.count;
      if (row.access === "free") entry.free += row.count;
      else entry.paid += row.count;
      if (row.status === "soon") entry.soon += row.count;
      map.set(row.type, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [data.catalog]);

  const copiesTotal = data.copies.reduce((sum, row) => sum + row.count, 0);
  const peakPeople = data.copies.reduce((max, row) => Math.max(max, row.people), 0);
  const paidOrders = data.orders.filter((order) => order.status === "paid");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && <h1 className="text-xl font-semibold">Produse Avyron</h1>}

      {data.unavailable && (
        <Card>
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="text-muted-foreground">
              {data.unavailable === "catalog_unavailable"
                ? "Migrarea catalogului (0025 + 0026) nu e încă aplicată pe această bază, deci centrul nu are ce arăta. Se aplică odată cu lansarea magazinului."
                : "Centrul e rezervat conturilor de super administrator."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Produse în catalog", value: data.catalog.reduce((sum, row) => sum + row.count, 0), icon: Layers },
          { label: "Obțineri, 14 zile", value: copiesTotal, icon: LineChart },
          { label: "Parteneri activi", value: data.entitlements.filter((row) => row.kind !== "produs").reduce((sum, row) => sum + row.count, 0), icon: Users },
          { label: "Comenzi plătite", value: paidOrders.length, icon: ShoppingBag },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="text-2xl font-semibold tabular-nums">{tile.value}</p>
              </div>
              <tile.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5" aria-label="Secțiuni Produse AVYRON">
        {[
          { id: "dashboard" as const, label: "Dashboard", icon: LineChart },
          { id: "catalog" as const, label: "Listă produse", icon: List },
          { id: "collection" as const, label: "Colecție", icon: Layers },
          { id: "sources" as const, label: "Surse", icon: Database },
          { id: "settings" as const, label: "Setări", icon: Settings2 },
        ].map((item) => <button key={item.id} type="button" onClick={() => setView(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${view === item.id ? "bg-violet-500/15 text-violet-200" : "text-slate-500 hover:text-slate-200"}`}><item.icon className="size-3.5" />{item.label}</button>)}
      </nav>

      {view === "catalog" && <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Catalog</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Reîncarcă">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-sm text-muted-foreground">Catalogul nu e încă în baza de date.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Tip</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                    <th className="pb-2 text-right font-medium">Gratuite</th>
                    <th className="pb-2 text-right font-medium">În parteneriat</th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map(([type, row]) => (
                    <tr key={type} className="border-t">
                      <td className="py-1.5">{TYPE_LABEL[type] ?? type}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.total}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.free}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Trec în alt parteneriat în 30 de zile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.transitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nimic de mutat luna asta.</p>
            ) : (
              <ul className="divide-y text-sm">
                {data.transitions.map((row) => (
                  <li key={row.slug} className="flex items-center justify-between gap-2 py-1.5">
                    <span>{row.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ACCESS_LABEL[row.access] ?? row.access} → {row.pro_at ? `Pro pe ${date(row.pro_at)}` : `Free pe ${date(row.free_at)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>}

      {(view === "dashboard" || view === "collection") && <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comenzi recente</CardTitle>
          </CardHeader>
          <CardContent>
            {data.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio comandă din pagina Produse până acum.</p>
            ) : (
              <ul className="divide-y text-sm">
                {data.orders.slice(0, 10).map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="truncate">{String(order.items[0]?.name ?? "—")}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{lei(order.total_cents)}</span>
                      <Badge variant={order.status === "paid" ? "default" : "secondary"}>{order.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cele mai luate produse (30 de zile)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Încă nu s-a obținut niciun produs. Vârf de utilizatori într-o zi: {peakPeople}.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {data.topItems.map((row) => (
                  <li key={row.slug} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="truncate">{row.name}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>}

      {view === "sources" && <Card>
        <CardHeader>
          <CardTitle className="text-base">Cereri din pagină</CardTitle>
        </CardHeader>
        <CardContent>
          {data.requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cererile de funcții și selecțiile din pagină apar aici și în Leaduri &amp; CRM.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.requests.slice(0, 10).map((request) => (
                <li key={request.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{request.email}</span>
                    <Badge variant="outline">{request.source.replace("produse:", "")}</Badge>
                  </div>
                  {request.message && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>}

      {view === "settings" && <section className="grid gap-3 md:grid-cols-3">
        <a href="/profil?tab=commercial-codes" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/30"><FileCode2 className="size-5 text-violet-300"/><h2 className="mt-3 text-sm font-semibold text-white">Coduri, prețuri și plată</h2><p className="mt-1 text-xs text-slate-500">SKU, cod contabil, TVA, preț și traseul de plată pentru fiecare produs.</p></a>
        <a href="/profil?tab=promotions" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/30"><BadgePercent className="size-5 text-cyan-300"/><h2 className="mt-3 text-sm font-semibold text-white">Promoții</h2><p className="mt-1 text-xs text-slate-500">Campanii și reguli comerciale fără duplicarea catalogului.</p></a>
        <a href="/produse" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/30"><ShoppingBag className="size-5 text-emerald-300"/><h2 className="mt-3 text-sm font-semibold text-white">Verifică magazinul</h2><p className="mt-1 text-xs text-slate-500">Deschide traseul public și verifică oferta înainte de activarea plății.</p></a>
      </section>}
    </div>
  );
}
