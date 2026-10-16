import { useEffect, useState } from "react";
import { ArrowUpRight, Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cfAuth } from "@/lib/cfAuth";
import { addLocalAccountCartItem, syncLocalAccountCartSource, type AccountCartItem } from "@/lib/accountCart";

type Entry = { key: string; name: string; category: string; sku: string | null; priceMinor: number | null; currency: string; payable: boolean };
const price = (entry: Entry) => entry.priceMinor === null ? "Preț la ofertă" : `${entry.payable ? "" : "De la "}${new Intl.NumberFormat("ro-RO", { style: "currency", currency: entry.currency }).format(entry.priceMinor / 100)}`;

export function CustomerCatalogTab() {
  const [catalog, setCatalog] = useState<{ services: Entry[]; products: Entry[] }>({ services: [], products: [] });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([
      cfAuth.request<{ services: Entry[]; products: Entry[] }>("/api/commerce/catalog"),
      cfAuth.request<{ data: string[] }>("/api/commerce/favorites/services").catch(() => ({ data: [] as string[] })),
    ]).then(([data, saved]) => { if (active) { setCatalog({ services: data.services ?? [], products: data.products ?? [] }); setFavorites(saved.data ?? []); } }).catch(() => toast.error("Catalogul nu poate fi încărcat momentan.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleFavorite = async (key: string) => {
    const saved = favorites.includes(key);
    try {
      await cfAuth.request(`/api/commerce/favorites/services/${encodeURIComponent(key)}`, { method: saved ? "DELETE" : "PUT" });
      setFavorites((current) => saved ? current.filter((item) => item !== key) : [key, ...current]);
    } catch { toast.error("Favoritul nu a putut fi actualizat."); }
  };

  const add = async (entry: Entry, type: "service" | "product") => {
    const item: AccountCartItem = { id: crypto.randomUUID(), source: type === "service" ? "services" : "products", sku: entry.sku || "custom-request", type, name: entry.name, ...(type === "service" ? { serviceKey: entry.key } : { productSlug: entry.key }), ...(entry.priceMinor !== null ? { price_estimate: entry.priceMinor, price_currency: "RON" as const } : {}) };
    addLocalAccountCartItem(item);
    try { await syncLocalAccountCartSource(item.source); toast.success("Adăugat în coșul contului."); }
    catch { toast.info("Adăugat local; sincronizarea în cont se va relua."); }
  };

  const render = (entries: Entry[], type: "service" | "product") => <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry) => <article key={entry.key} className="group flex flex-col rounded-2xl border border-white/[.09] bg-[#10162a]/90 p-4 transition hover:border-violet-400/30 hover:bg-[#141b33]">
    <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[.17em] text-violet-300">{entry.category}</span>{type === "service" && <button type="button" onClick={() => void toggleFavorite(entry.key)} aria-pressed={favorites.includes(entry.key)} aria-label={favorites.includes(entry.key) ? `Scoate ${entry.name} din favorite` : `Adaugă ${entry.name} la favorite`} className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:text-pink-300"><Heart className={`size-4 ${favorites.includes(entry.key) ? "fill-pink-300 text-pink-300" : ""}`} /></button>}</div>
    <h3 className="mt-2 font-display text-base font-semibold">{entry.name}</h3><p className="mt-1 text-xs text-slate-400">{price(entry)} · {entry.payable ? "preț comercial verificat" : "valoare orientativă, se confirmă prin ofertă"}</p>
    <div className="mt-auto flex flex-wrap gap-2 pt-5"><Button size="sm" onClick={() => void add(entry, type)}><ShoppingCart className="mr-1.5 size-3.5" /> Adaugă în coș</Button>{type === "product" && <a href="/produse" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-white">Vezi produsele <ArrowUpRight className="size-3.5" /></a>}</div>
  </article>)}</div>;

  return <div className="space-y-7"><header className="rounded-2xl border border-white/[.09] bg-gradient-to-br from-violet-500/10 via-[#10162a] to-cyan-500/5 p-5"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Catalog AVYRON</p><h1 className="mt-2 font-display text-2xl font-bold">Servicii și produse pentru contul tău</h1><p className="mt-1 max-w-2xl text-sm text-slate-400">Alege ce îți trebuie, salvează serviciile preferate și adaugă tipuri diferite în coș. Prețul final este verificat înainte de plată.</p></header>
    {loading ? <p className="text-sm text-slate-400">Se încarcă catalogul…</p> : <><section className="space-y-3"><h2 className="font-display text-lg font-semibold">Servicii</h2>{render(catalog.services, "service")}</section><section className="space-y-3"><h2 className="font-display text-lg font-semibold">Produse digitale</h2>{catalog.products.length ? render(catalog.products, "product") : <p className="text-sm text-slate-400">Momentan nu există produse publicate în catalog.</p>}</section></>}
  </div>;
}
