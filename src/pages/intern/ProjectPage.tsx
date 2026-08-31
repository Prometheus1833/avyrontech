import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { internApi, type ProjectDetail, type ProposalStatus, type BannerStatus, type ProjectKind, type LinkKind } from "@/lib/internApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ExternalLink, Trash2, RefreshCw, Plus } from "lucide-react";
import { MediaAttachments } from "@/components/intern/MediaAttachments";
import PaymentMethodCard from "@/components/intern/PaymentMethodCard";
import ContactRail from "@/components/intern/ContactRail";
import PageBackLink from "@/components/site/PageBackLink";

const BANNER_LABEL: Record<BannerStatus, { label: string; className: string }> = {
  online:      { label: "Online",              className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  offline:     { label: "Offline",             className: "bg-red-500/15 text-red-500 border-red-500/30" },
  revizuire:   { label: "Revizuire",           className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  in_progress: { label: "În curs de modificare", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  testing:     { label: "Testare",             className: "bg-violet-500/15 text-violet-500 border-violet-500/30" },
};

const KIND_LABEL: Record<ProjectKind, string> = {
  website_prezentare: "Website Prezentare",
  prezentare_premium: "Prezentare Premium",
  magazin_online: "Magazin Online",
  retele_sociale: "Rețele Sociale",
  identitate_completa: "Identitate Completă Online",
  aplicatie: "Aplicație",
};

const PROPOSAL_LABEL: Record<ProposalStatus, string> = {
  proposed: "Propus", reviewed: "Revizuit", in_progress: "În curs", done: "Finalizat", rejected: "Respins",
};

const LINK_KINDS: { value: LinkKind; label: string }[] = [
  { value: "cloudflare", label: "Cloudflare Panel" },
  { value: "gsc", label: "Google Search Console" },
  { value: "gbp", label: "Google Business Profile" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Alt link" },
];

const SUB_PLANS = [
  { value: "50e", label: "50€ / lună · site-uri de prezentare și bloguri" },
  { value: "150e", label: "150€ / lună · magazine online și primării" },
  { value: "300e", label: "300€ / lună · instituții și platforme" },
];

const subscriptionPlanLabel = (value: string | null) => value === "100e"
  ? "100€ / lună · plan anterior"
  : SUB_PLANS.find((plan) => plan.value === value)?.label ?? value;

export default function ProjectPage() {
  const { slug = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await internApi.getProject(slug);
      setData(d);
      setUrlDraft(d.project.url ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [slug]);
  useEffect(() => { if (slug) void load(); }, [load, slug]);

  if (authLoading || loading) return <PageShell><p className="text-muted-foreground">Se încarcă…</p></PageShell>;
  if (!user) return <PageShell><p>Necesită autentificare. <Link className="underline" to="/auth">Loghează-te</Link></p></PageShell>;
  if (error || !data) return <PageShell><p className="text-red-500">{error ?? "Proiect indisponibil"}</p></PageShell>;

  const { project, links, proposals, updates, staff, permission } = data;
  const canWrite = permission.write;

  return (
    <PageShell>
      <div className="mb-4">
        <PageBackLink to="/profil?tab=projects" label="Înapoi" title="Înapoi la toate proiectele" />
      </div>

      {/* Header */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {project.cover_image_url && (
          <div className="h-40 sm:h-56 bg-muted" style={{ backgroundImage: `url(${project.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        )}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            <div className="flex items-start gap-3 min-w-0">
              {project.favicon_url && <img src={project.favicon_url} alt="" className="w-10 h-10 rounded" onError={(e) => (e.currentTarget.style.display = "none")} />}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{KIND_LABEL[project.kind] ?? project.kind}</p>
                <h1 className="text-2xl sm:text-3xl font-semibold truncate">{project.name}</h1>
                {project.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{project.description}</p>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {project.url && (
                <a href={project.url} target="_blank" rel="noreferrer">
                  <Button variant="default"><ExternalLink className="w-4 h-4 mr-2" />Accesare produs</Button>
                </a>
              )}
            </div>
          </div>

          <BannerStatusRow status={project.banner_status} projectId={project.id} canWrite={canWrite} onChange={load} />

          {/* Kind selector (staff only) */}
          {canWrite && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Tip produs:</span>
              <Select
                value={project.kind}
                onValueChange={async (v) => {
                  await internApi.updateProject(project.id, { kind: v as ProjectKind });
                  toast({ description: "Tip actualizat" });
                  void load();
                }}
              >
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* URL + Metadata extractor */}
      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">Link produs & metadate</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="https://exemplu.ro" disabled={!canWrite} />
            <Button
              disabled={!canWrite || savingUrl || !urlDraft}
              onClick={async () => {
                setSavingUrl(true);
                try {
                  const meta = await internApi.extractMetadata(urlDraft);
                  await internApi.updateProject(project.id, {
                    url: urlDraft,
                    favicon_url: meta.favicon ?? null,
                    og_title: meta.title ?? null,
                    og_description: meta.description ?? null,
                    og_image_url: meta.image ?? null,
                  });
                  toast({ description: "Link validat și salvat" });
                  void load();
                } catch (e) {
                  toast({ variant: "destructive", description: (e as Error).message });
                } finally { setSavingUrl(false); }
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />Validează & salvează
            </Button>
          </div>
          {(project.og_title || project.og_image_url) && (
            <div className="flex gap-3 items-start rounded-lg border border-border p-3 bg-muted/30">
              {project.og_image_url && <img src={project.og_image_url} alt="" className="w-24 h-24 object-cover rounded" />}
              <div className="min-w-0">
                <p className="font-medium truncate">{project.og_title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{project.og_description}</p>
                {project.url && <p className="text-xs text-muted-foreground mt-1 truncate">{new URL(project.url).host}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info produs (preluat conceptual din /costurisiproduse — se poate edita) */}
      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">Detalii produs & preț</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
          <EditableField label="Preț (RON)" value={project.price_ron?.toString() ?? ""} disabled={!canWrite}
            onSave={async (v) => { await internApi.updateProject(project.id, { price_ron: v ? parseFloat(v) : null }); void load(); }} />
          <EditableField label="Preț (EUR)" value={project.price_eur?.toString() ?? ""} disabled={!canWrite}
            onSave={async (v) => { await internApi.updateProject(project.id, { price_eur: v ? parseFloat(v) : null }); void load(); }} />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Abonament</p>
            {project.subscription_status === "active" && project.subscription_plan ? (
              <div>
                <Badge variant="secondary">{subscriptionPlanLabel(project.subscription_plan)}</Badge>
                {project.billing_next && <p className="text-xs text-muted-foreground mt-1">Următoarea facturare: {new Date(project.billing_next).toLocaleDateString("ro-RO")}</p>}
              </div>
            ) : (
              <Select
                value={project.subscription_plan ?? ""}
                onValueChange={async (v) => {
                  await internApi.updateProject(project.id, { subscription_plan: v, subscription_status: "active" });
                  toast({ description: "Abonament selectat (doar vizual)" });
                  void load();
                }}
                disabled={!canWrite}
              >
                <SelectTrigger><SelectValue placeholder="Selectează abonament" /></SelectTrigger>
                <SelectContent>
                  {SUB_PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metodă de plată vizuală (sincronizată cu abonamentul de mai sus) */}
      {project.subscription_plan && (
        <div className="mt-5">
          <PaymentMethodCard
            planLabel={subscriptionPlanLabel(project.subscription_plan)}
            billingNext={project.billing_next}
          />
        </div>
      )}

      {/* Linkuri externe */}
      <LinksSection projectId={project.id} links={links} canWrite={canWrite} onChange={load} />

      {/* Propuneri modificări */}
      <ProposalsSection projectId={project.id} proposals={proposals} canWrite={canWrite} onChange={load} />

      {/* Durată / Ultimele modificări */}
      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">Durată finalizare & ultimele modificări</CardTitle></CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu există modificări înregistrate încă.</p>
          ) : (
            <ul className="space-y-3">
              {updates.map((u) => (
                <li key={u.id} className="border-l-2 border-primary/50 pl-3">
                  <p className="font-medium text-sm">{u.title}</p>
                  {u.body && <p className="text-sm text-muted-foreground">{u.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(u.created_at).toLocaleString("ro-RO")}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Staff alocat */}
      {staff.length > 0 && (
        <Card className="mt-5">
          <CardHeader><CardTitle className="text-base">Echipă alocată</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {staff.map((s) => (
              <Badge key={s.user_id} variant="outline" className="gap-1">
                {s.display_name ?? s.email} · {s.role}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bara de contact — mereu utilă */}
      <div className="mt-5"><ContactRail /></div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}

function BannerStatusRow({ status, projectId, canWrite, onChange }: { status: BannerStatus; projectId: string; canWrite: boolean; onChange: () => void }) {
  const cfg = BANNER_LABEL[status] ?? BANNER_LABEL.in_progress;
  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 flex-wrap ${cfg.className}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      <span className="font-medium">Stare: {cfg.label}</span>
      {canWrite && (
        <Select value={status} onValueChange={async (v) => { await internApi.updateProject(projectId, { banner_status: v as BannerStatus }); onChange(); }}>
          <SelectTrigger className="w-48 ml-auto bg-background/40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(BANNER_LABEL) as BannerStatus[]).map((s) => <SelectItem key={s} value={s}>{BANNER_LABEL[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function EditableField({ label, value, disabled, onSave }: { label: string; value: string; disabled?: boolean; onSave: (v: string) => Promise<void> }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex gap-1">
        <Input value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} />
        {!disabled && v !== value && <Button size="sm" onClick={() => onSave(v)}>OK</Button>}
      </div>
    </div>
  );
}

function LinksSection({ projectId, links, canWrite, onChange }: { projectId: string; links: ProjectDetail["links"]; canWrite: boolean; onChange: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = useState<LinkKind>("cloudflare");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  return (
    <Card className="mt-5">
      <CardHeader><CardTitle className="text-base">Conturi & panouri externe</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {links.length === 0 && <p className="text-sm text-muted-foreground">Niciun link salvat.</p>}
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-2 flex-wrap border border-border rounded-md p-2">
              <Badge variant="outline">{LINK_KINDS.find((k) => k.value === l.kind)?.label ?? l.kind}</Badge>
              <span className="text-sm truncate flex-1">{l.label}</span>
              <a href={l.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" />Deschide</Button></a>
              {canWrite && (
                <Button size="icon" variant="ghost" onClick={async () => { await internApi.deleteLink(l.id); onChange(); }}><Trash2 className="w-4 h-4" /></Button>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <div className="grid sm:grid-cols-[180px_1fr_1fr_auto] gap-2 items-end pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tip</p>
              <Select value={kind} onValueChange={(v) => setKind(v as LinkKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LINK_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="text-xs text-muted-foreground mb-1">Etichetă</p><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex: Cont principal" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">URL</p><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
            <Button disabled={!label || !url} onClick={async () => {
              try { await internApi.upsertLink(projectId, { kind, label, url }); setLabel(""); setUrl(""); toast({ description: "Link salvat" }); onChange(); }
              catch (e) { toast({ variant: "destructive", description: (e as Error).message }); }
            }}><Plus className="w-4 h-4 mr-1" />Adaugă</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProposalsSection({ projectId, proposals, canWrite, onChange }: { projectId: string; proposals: ProjectDetail["proposals"]; canWrite: boolean; onChange: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle className="text-base">Propuneri modificări</CardTitle>
        <p className="text-xs text-muted-foreground">Trimite o cerere de modificare — echipa va actualiza starea. Poți ataca imagini/documente în etapa următoare.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 border-b border-border pb-4">
          <Input placeholder="Titlu propunere (ex: Actualizare pagina Contact)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Descriere detaliată (opțional)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          <div className="flex justify-end">
            <Button disabled={!title} onClick={async () => {
              try { await internApi.addProposal(projectId, { title, description: desc }); setTitle(""); setDesc(""); toast({ description: "Propunere trimisă" }); onChange(); }
              catch (e) { toast({ variant: "destructive", description: (e as Error).message }); }
            }}><Plus className="w-4 h-4 mr-1" />Trimite propunere</Button>
          </div>
        </div>
        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio propunere încă.</p>
        ) : (
          <ul className="space-y-2">
            {proposals.map((p) => (
              <li key={p.id} className="border border-border rounded-md p-3 space-y-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.title}</p>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString("ro-RO")}</p>
                  </div>
                  {canWrite ? (
                    <Select value={p.status} onValueChange={async (v) => {
                      await internApi.updateProposal(p.id, { status: v as ProposalStatus });
                      toast({ description: "Stare actualizată" }); onChange();
                    }}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PROPOSAL_LABEL) as ProposalStatus[]).map((s) => <SelectItem key={s} value={s}>{PROPOSAL_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{PROPOSAL_LABEL[p.status]}</Badge>
                  )}
                </div>
                <MediaAttachments projectId={projectId} proposalId={p.id} canWrite={canWrite} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
