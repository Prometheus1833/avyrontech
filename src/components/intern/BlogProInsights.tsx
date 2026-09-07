// Panou de administrare: câte vizite, sesiuni și conversii ajung la configuratorul
// blogului și la formularul de lead + ofertele primite și timpul lor de așteptare.
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { internApi, type FunnelSummary, type LeadPipeline } from "@/lib/internApi";
import { BarChart3, Clock, RefreshCw, Users } from "lucide-react";

const WINDOWS = [7, 30, 90] as const;

const fmt = (n: number) => new Intl.NumberFormat("ro-RO").format(n);
const date = (ms: number) => new Date(ms).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });

const STATUS_LABEL: Record<string, string> = {
  new: "Noi (în așteptare)",
  contacted: "Contactate",
  qualified: "Calificate",
  won: "Câștigate",
  lost: "Pierdute",
};

export default function BlogProInsights() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [funnel, setFunnel] = useState<FunnelSummary | null>(null);
  const [blogFunnel, setBlogFunnel] = useState<FunnelSummary | null>(null);
  const [articleFunnel, setArticleFunnel] = useState<FunnelSummary | null>(null);
  const [pipeline, setPipeline] = useState<LeadPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (window: number) => {
    setLoading(true);
    setError("");
    try {
      const [f, blog, article, p] = await Promise.all([
        internApi.getFunnel("blogpro", window),
        internApi.getFunnel("blog", window),
        internApi.getFunnel("blog_article", window),
        internApi.getLeadPipeline("blog_profesional", Math.max(window, 90)),
      ]);
      setFunnel(f);
      setBlogFunnel(blog);
      setArticleFunnel(article);
      setPipeline(p);
    } catch (e) {
      setError((e as Error).message || "Nu am putut încărca datele");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days);
  }, [days]);

  const cards = useMemo(() => {
    if (!funnel) return [];
    return [
      {
        label: "Vizite blog",
        value: fmt((blogFunnel?.views ?? 0) + (articleFunnel?.views ?? 0)),
        hint: `${fmt(blogFunnel?.views ?? 0)} listă · ${fmt(articleFunnel?.views ?? 0)} articole`,
      },
      { label: "Vizite pagină serviciu", value: fmt(funnel.views), hint: `${fmt(funnel.sessions)} sesiuni` },
      {
        label: "Ajung la configurator",
        value: fmt(funnel.steps.view_configurator.sessions),
        hint: `${funnel.conversion.toConfigurator}% din sesiuni`,
      },
      {
        label: "Ajung la formular",
        value: fmt(funnel.steps.view_lead_form.sessions),
        hint: `${funnel.conversion.toLeadForm}% din sesiuni`,
      },
      {
        label: "Oferte trimise",
        value: fmt(funnel.steps.generate_lead.hits),
        hint: `${funnel.conversion.toLead}% conversie`,
      },
    ];
  }, [funnel, blogFunnel, articleFunnel]);

  return (
    <section className="space-y-4" aria-labelledby="blogpro-insights-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="blogpro-insights-title" className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          Blog Profesional — trafic și oferte
        </h2>
        <div className="flex items-center gap-1.5">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              size="sm"
              variant={w === days ? "default" : "outline"}
              onClick={() => setDays(w)}
              aria-pressed={w === days}
            >
              {w} zile
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void load(days)} aria-label="Reîmprospătează">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold">{loading && !funnel ? "—" : card.value}</p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              În așteptare: <strong>{fmt(pipeline?.waiting.open ?? 0)}</strong> oferte
            </p>
            <p className="text-sm text-muted-foreground">
              Așteptare medie {pipeline?.waiting.avgHours ?? 0} h · cea mai veche {pipeline?.waiting.maxHours ?? 0} h
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden />
              {(pipeline?.byStatus ?? []).map((s) => `${STATUS_LABEL[s.status] || s.status}: ${s.n}`).join(" · ") || "Nicio ofertă încă"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Ultimele oferte primite din configuratorul blogului</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">Estimare</th>
                  <th className="py-2 pr-3">Primită</th>
                  <th className="py-2">Stare</th>
                </tr>
              </thead>
              <tbody>
                {(pipeline?.recent ?? []).map((lead) => {
                  const waitingH = Math.round(((Date.now() - lead.created_at) / 3600000) * 10) / 10;
                  return (
                    <tr key={lead.id} className="border-t border-border/60">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{lead.name || "—"}</span>
                        <span className="block text-xs text-muted-foreground">{lead.business || "—"}</span>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        <span className="block">{lead.email}</span>
                        <span className="block text-muted-foreground">{lead.phone}</span>
                      </td>
                      <td className="py-2 pr-3">{lead.estimate_ron ? `${fmt(lead.estimate_ron)} lei` : "—"}</td>
                      <td className="py-2 pr-3 text-xs">
                        {date(lead.created_at)}
                        {lead.status === "new" && !lead.first_response_at && (
                          <span className="block text-muted-foreground">așteaptă de {waitingH} h</span>
                        )}
                      </td>
                      <td className="py-2">
                        <Badge variant={lead.status === "new" ? "default" : "secondary"}>
                          {STATUS_LABEL[lead.status] || lead.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !(pipeline?.recent ?? []).length && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">
                      Nicio ofertă primită încă din configurator.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
