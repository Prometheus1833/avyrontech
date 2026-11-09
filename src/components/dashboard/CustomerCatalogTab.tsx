import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publicSiteHref } from "@/lib/appHost";
import { cfAuth } from "@/lib/cfAuth";
import { type AccountCartItem } from "@/lib/accountCart";
import { useAccountCart } from "@/hooks/useAccountCart";

type Entry = {
  key: string;
  name: string;
  category: string;
  sku: string | null;
  priceMinor: number | null;
  currency: string;
  payable: boolean;
};
const price = (entry: Entry) =>
  entry.priceMinor === null
    ? "Preț la ofertă"
    : `${entry.payable ? "" : "De la "}${new Intl.NumberFormat("ro-RO", { style: "currency", currency: entry.currency }).format(entry.priceMinor / 100)}`;

export function CustomerCatalogTab({
  kind = "service",
}: {
  kind?: "service" | "product";
}) {
  const cart = useAccountCart(),
    adding = useRef(new Set<string>());
  const [pending, setPending] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<{
    services: Entry[];
    products: Entry[];
  }>({ services: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    cfAuth
      .request<{ services: Entry[]; products: Entry[] }>(
        "/api/commerce/catalog",
      )
      .then((data) => {
        if (active)
          setCatalog({
            services: data.services ?? [],
            products: data.products ?? [],
          });
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const add = async (entry: Entry, type: "service" | "product") => {
    const key = type + ":" + entry.key;
    if (adding.current.has(key)) return;
    if (
      cart.items.some((item) =>
        type === "service"
          ? item.type === "service" && item.serviceKey === entry.key
          : item.type === "product" && item.productSlug === entry.key,
      )
    )
      return toast.info("Elementul este deja în coș.");
    if (cart.items.length >= 20)
      return toast.error("Coșul poate conține cel mult 20 de elemente.");
    adding.current.add(key);
    setPending([...adding.current]);
    const item: AccountCartItem = {
      id: crypto.randomUUID(),
      source: type === "service" ? "services" : "products",
      sku: entry.sku || "custom-request",
      type,
      name: entry.name,
      ...(type === "service"
        ? { serviceKey: entry.key }
        : { productSlug: entry.key }),
      ...(entry.priceMinor !== null
        ? {
            price_estimate: entry.priceMinor,
            price_currency:
              entry.currency === "EUR" ? ("EUR" as const) : ("RON" as const),
          }
        : {}),
    };
    cart.replace([...cart.items, item]);
    try {
      await cart.flush();
      toast.success("Adăugat în coșul contului.");
    } catch {
      toast.info("Adăugat local; sincronizarea în cont se va relua.");
    } finally {
      adding.current.delete(key);
      setPending([...adding.current]);
    }
  };

  const render = (entries: Entry[], type: "service" | "product") => (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <article
          key={entry.key}
          className="group flex flex-col rounded-2xl border border-white/[.09] bg-[#10162a]/90 p-4 transition hover:border-violet-400/30 hover:bg-[#141b33]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[.17em] text-violet-300">
              {entry.category}
            </span>
          </div>
          <h3 className="mt-2 font-display text-base font-semibold">
            {entry.name}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {price(entry)} ·{" "}
            {entry.payable
              ? "preț comercial verificat"
              : "valoare orientativă, se confirmă prin ofertă"}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-3">
            <Button
              size="sm"
              disabled={pending.includes(type + ":" + entry.key)}
              onClick={() => void add(entry, type)}
            >
              <ShoppingCart className="mr-1.5 size-3.5" />{" "}
              {pending.includes(type + ":" + entry.key)
                ? "Se adaugă…"
                : "Adaugă în coș"}
            </Button>
            {type === "product" && (
              <a
                href={publicSiteHref("/produse")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Vezi produsele <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );

  const entries = kind === "service" ? catalog.services : catalog.products;
  return (
    <section
      className="min-w-0 space-y-4"
      aria-label={kind === "service" ? "Catalog servicii" : "Catalog produse"}
    >
      <header>
        <h1 className="text-2xl font-semibold">
          {kind === "service" ? "Servicii" : "Produse"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {kind === "service"
            ? "Alege serviciul potrivit proiectului tău."
            : "Descoperă produsele digitale disponibile. Achizițiile tale sunt păstrate separat în Produsele mele."}
        </p>
      </header>
      {loading ? (
        <p role="status" className="text-sm text-slate-400">
          Se încarcă catalogul…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/30 p-4 text-sm"
        >
          Catalogul nu poate fi încărcat momentan.{" "}
          <Button variant="outline" onClick={() => setRevision((v) => v + 1)}>
            Reîncearcă
          </Button>
        </div>
      ) : entries.length ? (
        render(entries, kind)
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
          Momentan nu există {kind === "service" ? "servicii" : "produse"}{" "}
          publicate în catalog.
        </p>
      )}
    </section>
  );
}
