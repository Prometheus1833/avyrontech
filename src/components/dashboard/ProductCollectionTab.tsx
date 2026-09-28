import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Boxes, ExternalLink, Heart, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { EMPTY_STATE, produseApi, type AccountState, type LimitBucket } from "@/lib/produseApi";
import { PRODUSE_BASE, PRODUSE_ITEM_ROUTES } from "@/features/produse/data/routes";

/**
 * „Colecția mea” — partea din cont a paginii Produse Avyron.
 *
 * Arată parteneriatul activ, cât a mai rămas din limitele de azi, produsele
 * salvate, cele cumpărate și ce s-a obținut recent. Cifrele vin de la Worker:
 * ce scrie aici e exact ce ar accepta serverul la următoarea obținere.
 */

const BUCKETS: Array<{ id: LimitBucket; label: string }> = [
  { id: "components", label: "Componente" },
  { id: "sections", label: "Secțiuni" },
  { id: "templates", label: "Template-uri" },
];

const PLAN_LABEL: Record<AccountState["plan"], string> = {
  free: "AVY Partener Free",
  pro: "AVY Partener Pro",
  studio: "AVY Studio",
};

// Lista de rute e fișierul „prost" al paginii (slug + segment de tip), deci
// linkurile nu aduc în cont catalogul complet cu texte bilingve.
const TYPE_SEGMENT = new Map(PRODUSE_ITEM_ROUTES.map((entry) => [entry.slug, entry.type]));
const productHref = (slug: string) => {
  const segment = TYPE_SEGMENT.get(slug);
  return segment ? `${PRODUSE_BASE.ro}/${segment}/${slug}` : PRODUSE_BASE.ro;
};

const prettySlug = (slug: string) =>
  slug
    .split("-")
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");

const formatDate = (value: number | null) =>
  value ? new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : null;

export function ProductCollectionTab() {
  const { user } = useAuth();
  const [state, setState] = useState<AccountState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setState(await produseApi.state());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  // Ce a strâns vizitatorul în browser înainte de login urcă o singură dată în
  // cont; după aceea contul e sursa, iar pagina publică citește de la el.
  useEffect(() => {
    if (!user || loading) return;
    let local: string[] = [];
    try {
      const raw = window.localStorage.getItem("avyron-produse-v1");
      local = raw ? ((JSON.parse(raw) as { favorites?: string[] }).favorites ?? []) : [];
    } catch {
      return;
    }
    const missing = local.filter((slug) => !state.collection.includes(slug));
    if (!missing.length) return;
    void produseApi.collection.sync(missing).then((data) => setState((current) => ({ ...current, collection: data })));
  }, [user, loading, state.collection]);

  const remove = async (slug: string) => {
    setBusy(slug);
    try {
      const data = await produseApi.collection.remove(slug);
      setState((current) => ({ ...current, collection: data }));
    } finally {
      setBusy(null);
    }
  };

  const expiry = useMemo(() => formatDate(state.planExpiresAt), [state.planExpiresAt]);
  const notMigrated = !loading && state.day === "";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Parteneriatul tău
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Reîncarcă">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {notMigrated ? (
            <p className="text-sm text-muted-foreground">
              Magazinul de produse se activează odată cu lansarea paginii Produse Avyron. Până atunci, colecția rămâne salvată în browser.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">{PLAN_LABEL[state.plan]}</Badge>
                {expiry && <span className="text-sm text-muted-foreground">valabil până pe {expiry}</span>}
                {state.plan === "free" && (
                  <a className="inline-flex items-center gap-1 text-sm underline underline-offset-4" href="/produse-avyron#parteneriate">
                    Vezi parteneriatele <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {BUCKETS.map((bucket) => {
                  const { used, limit } = state.limits[bucket.id];
                  const left = Math.max(0, limit - used);
                  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
                  return (
                    <div key={bucket.id} className="rounded-lg border p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">{bucket.label}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {left} din {limit}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Limitele se resetează la miezul nopții, ora României. A doua obținere a aceluiași produs în aceeași zi nu consumă, iar produsele
                cumpărate separat nu intră deloc în limită.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4" aria-hidden="true" />
              Produse salvate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.collection.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nimic salvat încă. Pe pagina Produse Avyron, inima de pe card adaugă produsul aici.
              </p>
            ) : (
              <ul className="space-y-2">
                {state.collection.map((slug) => (
                  <li key={slug} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <a className="text-sm hover:underline" href={productHref(slug)}>
                      {prettySlug(slug)}
                    </a>
                    <Button variant="ghost" size="sm" disabled={busy === slug} onClick={() => void remove(slug)}>
                      Scoate
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Cumpărate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nimic cumpărat separat. Produsele din parteneriat nu apar aici.</p>
            ) : (
              <ul className="space-y-2">
                {state.purchases.map((slug) => (
                  <li key={slug} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <a className="text-sm hover:underline" href={productHref(slug)}>
                      {prettySlug(slug)}
                    </a>
                    <Badge variant="secondary">licență pe viață</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="h-4 w-4" aria-hidden="true" />
            Obținute recent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Istoricul apare aici după prima descărcare sau copiere de cod.</p>
          ) : (
            <ul className="divide-y">
              {state.recent.map((entry) => (
                <li key={`${entry.slug}-${entry.created_at}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <a className="hover:underline" href={productHref(entry.slug)}>
                    {prettySlug(entry.slug)}
                  </a>
                  <span className="text-muted-foreground">
                    {entry.day} · {entry.channel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductCollectionTab;
