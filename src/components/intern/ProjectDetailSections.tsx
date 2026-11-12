import { useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronDown, CircleDollarSign, Link2, MessageSquareText, Plus, Settings2, Trash2 } from "lucide-react";
import Link from "@/components/site/WorkspaceLink";
import { internApi, type LinkKind, type Project, type ProjectDetail, type ProposalStatus } from "@/lib/internApi";
import { PROJECT_KIND_LABELS } from "@/shared/projectSummary";
import { normalizeExternalLink } from "@/shared/externalUrl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MediaAttachments } from "./MediaAttachments";

const requestStates: Record<ProposalStatus, string> = {
  proposed: "Nouă", reviewed: "Revizuită", in_progress: "În lucru", done: "Rezolvată", rejected: "Respinsă",
};
const linkTypes: Record<LinkKind, string> = {
  cloudflare: "Cloudflare", gsc: "Google Search Console", gbp: "Google Business Profile", facebook: "Facebook",
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", other: "Alt link",
};
const date = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" });
const amount = (value: number, currency = "RON") => new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value);

export function ProjectRequests({ projectId, proposals, canWrite, onChange }: {
  projectId: string; proposals: ProjectDetail["proposals"]; canWrite: boolean; onChange: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { toast } = useToast();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await internApi.addProposal(projectId, { title: title.trim(), description: description.trim() });
      setTitle("");
      setDescription("");
      await onChange();
      toast({ description: "Cererea a fost trimisă." });
    } catch {
      setError("Cererea nu a fost trimisă. Textul introdus este păstrat.");
    } finally {
      setSending(false);
    }
  }
  async function changeStatus(id: string, status: ProposalStatus) {
    if (changing) return;
    setChanging(id);
    try {
      await internApi.updateProposal(id, { status });
      await onChange();
      toast({ description: "Starea cererii a fost actualizată." });
    } catch {
      toast({ variant: "destructive", description: "Starea cererii nu a putut fi actualizată." });
    } finally {
      setChanging(null);
    }
  }
  return (
    <section id="cereri" className="project-panel project-section p-4 sm:p-5" aria-labelledby="project-requests-title">
      <h2 id="project-requests-title" className="project-heading"><MessageSquareText aria-hidden="true" />Cereri de modificare</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Descrie ce trebuie schimbat și urmărește răspunsul echipei în această listă.</p>
      <form onSubmit={submit} className="project-form mt-4 grid gap-3 rounded-xl p-3 sm:p-4">
        <label className="grid gap-1.5 text-sm font-medium">Titlul cererii
          <Input required maxLength={200} disabled={sending} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="De exemplu, actualizează pagina de contact" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">Detalii <span className="sr-only">(opțional)</span>
          <Textarea rows={2} maxLength={4000} disabled={sending} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Adaugă pagina, textul dorit sau alte detalii utile." />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={sending || !title.trim()} className="justify-self-start">
          <Plus className="size-4" />{sending ? "Se trimite…" : "Trimite cererea"}
        </Button>
      </form>
      {proposals.length ? (
        <ul className="mt-4 divide-y divide-border/60">
          {proposals.map((request) => (
            <li key={request.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{request.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{date.format(request.created_at)}</p>
                </div>
                {canWrite ? (
                  <select aria-label={`Starea cererii: ${request.title}`} value={request.status} disabled={!!changing}
                    onChange={(event) => void changeStatus(request.id, event.target.value as ProposalStatus)} className="project-select">
                    {Object.entries(requestStates).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
                  </select>
                ) : <Badge variant="outline">{requestStates[request.status]}</Badge>}
              </div>
              {request.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{request.description}</p>}
              <RequestFiles projectId={projectId} requestId={request.id} canWrite={canWrite} />
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-sm text-muted-foreground">Nu există cereri pentru acest proiect.</p>}
    </section>
  );
}

function RequestFiles({ projectId, requestId, canWrite }: { projectId: string; requestId: string; canWrite: boolean }) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="mt-2" onToggle={(event) => { if (event.currentTarget.open) setOpened(true); }}>
      <summary className="w-fit cursor-pointer py-1 text-xs font-medium text-primary">Atașamentele cererii</summary>
      {opened && <div className="mt-2"><MediaAttachments projectId={projectId} proposalId={requestId} canWrite={canWrite} /></div>}
    </details>
  );
}

export function ProjectSubscriptions({ data, canManage, showAccountLink, onChange }: {
  data: ProjectDetail; canManage: boolean; showAccountLink: boolean; onChange: () => Promise<void>;
}) {
  const { project, permission, subscriptions } = data;
  const showPrices = project.budget_visible !== false;
  const canEditBudget = permission.write && permission.finance && showPrices;
  const accountUrl = canManage
    ? `/profil?tab=subscriptions-admin${project.client_id ? `&client=${encodeURIComponent(project.client_id)}` : ""}`
    : "/profil?tab=subscriptions";
  return (
    <section className="project-panel p-4 sm:p-5" aria-labelledby="project-subscriptions-title">
      <h2 id="project-subscriptions-title" className="project-heading"><CircleDollarSign aria-hidden="true" />Abonamentele proiectului</h2>
      {subscriptions?.length ? (
        <ul className="mt-3 divide-y divide-border/60">
          {subscriptions.map((subscription) => (
            <li key={subscription.id} className="min-w-0 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="min-w-0 break-words text-sm font-semibold">{subscription.service_name}</p>
                <Badge variant="outline">{({ active: "Activ", paused: "În pauză", cancelled: "Anulat" } as Record<string, string>)[subscription.status] ?? subscription.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {showPrices && subscription.price != null && <>{amount(subscription.price)} · </>}
                {subscription.billing_cycle === "monthly" ? "Lunar" : subscription.billing_cycle === "yearly" ? "Anual" : subscription.billing_cycle}
              </p>
              {subscription.next_billing_date != null && <p className="mt-1 text-xs text-muted-foreground">Facturare {date.format(subscription.next_billing_date)}</p>}
              {subscription.plan_sku && <p className="mt-1 break-all text-xs text-muted-foreground">{subscription.plan_sku}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-muted-foreground">Nu există abonamente alocate.</p>}
      {(canManage || showAccountLink) && (
        <Link className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline" to={accountUrl}>
          {canManage ? "Administrează abonamentele" : "Vezi abonamentele din cont"}<ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
      {canEditBudget && <ProjectBudgetForm project={project} onChange={onChange} />}
    </section>
  );
}

function ProjectBudgetForm({ project, onChange }: { project: Project; onChange: () => Promise<void> }) {
  const [ron, setRon] = useState(project.price_ron?.toString() ?? "");
  const [eur, setEur] = useState(project.price_eur?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  return (
    <details className="project-disclosure mt-3">
      <summary>Editează bugetul<ChevronDown aria-hidden="true" /></summary>
      <form className="mt-3 grid grid-cols-2 gap-2" onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          await internApi.updateProject(project.id, { price_ron: ron === "" ? null : Number(ron), price_eur: eur === "" ? null : Number(eur) });
          await onChange();
          toast({ description: "Bugetul a fost salvat." });
        } catch {
          toast({ variant: "destructive", description: "Bugetul nu a putut fi salvat." });
        } finally { setSaving(false); }
      }}>
        <label className="grid min-w-0 gap-1 text-xs font-medium">Preț (RON)
          <Input type="number" min="0" max="1000000000000" step="0.01" value={ron} disabled={saving} onChange={(event) => setRon(event.target.value)} />
        </label>
        <label className="grid min-w-0 gap-1 text-xs font-medium">Preț (EUR)
          <Input type="number" min="0" max="1000000000000" step="0.01" value={eur} disabled={saving} onChange={(event) => setEur(event.target.value)} />
        </label>
        <p className="col-span-2 text-xs text-muted-foreground">Lasă suma goală dacă nu a fost stabilită.</p>
        <Button size="sm" type="submit" disabled={saving} className="col-span-2 justify-self-start">{saving ? "Se salvează…" : "Salvează bugetul"}</Button>
      </form>
    </details>
  );
}

export function ProjectSettings({ data, onChange }: { data: ProjectDetail; onChange: () => Promise<void> }) {
  const { project, links, permission } = data;
  return (
    <section id="configurare" className="project-panel project-section p-4 sm:p-5" aria-labelledby="project-settings-title">
      <h2 id="project-settings-title" className="project-heading"><Settings2 aria-hidden="true" />{permission.write ? "Configurarea proiectului" : "Resurse și linkuri"}</h2>
      {permission.write && <ProjectIdentityForm project={project} onChange={onChange} />}
      <ProjectLinks projectId={project.id} links={links} canWrite={permission.write} onChange={onChange} />
    </section>
  );
}

function ProjectIdentityForm({ project, onChange }: { project: Project; onChange: () => Promise<void> }) {
  const [name, setName] = useState(project.name);
  const [kind, setKind] = useState(project.kind);
  const [description, setDescription] = useState(project.description ?? "");
  const [url, setUrl] = useState(project.url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  async function save(event: FormEvent, importMetadata = false) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    const validUrl = url.trim() ? normalizeExternalLink(url.trim()) : null;
    if (url.trim() && !validUrl) { setError("Introdu o adresă web validă, care începe cu https:// sau http://."); return; }
    setError("");
    setBusy(true);
    try {
      let patch: Partial<Project> = { name: name.trim(), kind, description: description.trim() || null, url: validUrl };
      if (importMetadata && validUrl) {
        const metadata = await internApi.extractMetadata(validUrl);
        patch = { ...patch, favicon_url: metadata.favicon ?? null, og_title: metadata.title ?? null, og_description: metadata.description ?? null, og_image_url: metadata.image ?? null };
      } else if (!validUrl || validUrl !== (project.url ? normalizeExternalLink(project.url) : null)) {
        patch = { ...patch, favicon_url: null, og_title: null, og_description: null, og_image_url: null };
      }
      await internApi.updateProject(project.id, patch);
      await onChange();
      toast({ description: importMetadata ? "Datele și metadatele au fost salvate." : "Datele proiectului au fost salvate." });
    } catch {
      setError(importMetadata ? "Metadatele nu au putut fi preluate. Poți salva datele proiectului separat." : "Datele nu au putut fi salvate. Modificările sunt păstrate.");
    } finally { setBusy(false); }
  }
  return (
    <details className="project-disclosure mt-3">
      <summary>Datele proiectului și linkul public<ChevronDown aria-hidden="true" /></summary>
      <form onSubmit={(event) => void save(event)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">Nume<Input required value={name} maxLength={180} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
        <label className="grid gap-1.5 text-sm font-medium">Tip de proiect
          <select value={kind} disabled={busy} onChange={(event) => setKind(event.target.value as Project["kind"])} className="project-select w-full">
            {Object.entries(PROJECT_KIND_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Descriere
          <Textarea rows={2} value={description} maxLength={4000} disabled={busy} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Adresa site-ului
          <Input type="url" placeholder="https://exemplu.ro" value={url} disabled={busy} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">Adresa apare în butonul „Deschide site-ul”. Preluarea metadatelor salvează și titlul, descrierea și pictograma disponibile pe site.</p>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button size="sm" type="submit" disabled={busy || !name.trim()}>Salvează datele</Button>
          <Button size="sm" variant="outline" type="button" disabled={busy || !name.trim() || !url.trim()} onClick={(event) => void save(event, true)}>Preia metadatele și salvează</Button>
        </div>
        {(project.og_title || project.og_description) && (
          <div className="project-form rounded-lg p-3 sm:col-span-2">
            {project.og_title && <p className="break-words text-sm font-medium">{project.og_title}</p>}
            {project.og_description && <p className="mt-1 break-words text-xs text-muted-foreground">{project.og_description}</p>}
          </div>
        )}
      </form>
    </details>
  );
}

function ProjectLinks({ projectId, links, canWrite, onChange }: {
  projectId: string; links: ProjectDetail["links"]; canWrite: boolean; onChange: () => Promise<void>;
}) {
  const [kind, setKind] = useState<LinkKind>("cloudflare");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return (
    <details className="project-disclosure mt-3" open={canWrite ? undefined : true}>
      <summary><span className="flex items-center gap-2"><Link2 className="size-4" aria-hidden="true" />Conturi și panouri externe <span className="text-xs text-muted-foreground">{links.length}</span></span><ChevronDown aria-hidden="true" /></summary>
      <ul className="mt-2 divide-y divide-border/60">
        {links.map((link) => {
          const target = normalizeExternalLink(link.url);
          return (
            <li key={link.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                {target ? <a className="inline-flex items-center gap-1 break-words text-sm font-medium text-primary hover:underline" href={target} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight className="size-3.5 shrink-0" /></a> : <p className="break-words text-sm font-medium">{link.label}</p>}
                <p className="text-xs text-muted-foreground">{linkTypes[link.kind] ?? link.kind}</p>
              </div>
              {canWrite && <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={`Șterge linkul ${link.label}`} onClick={async () => {
                if (!window.confirm(`Ștergi linkul „${link.label}”?`)) return;
                setBusy(true);
                try { await internApi.deleteLink(link.id); await onChange(); }
                catch { toast({ variant: "destructive", description: "Linkul nu a putut fi șters." }); }
                finally { setBusy(false); }
              }}><Trash2 className="size-4" /></Button>}
            </li>
          );
        })}
      </ul>
      {!links.length && <p className="mt-2 text-sm text-muted-foreground">Niciun link adăugat.</p>}
      {canWrite && (
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
          event.preventDefault();
          const validUrl = normalizeExternalLink(url.trim());
          if (busy || !label.trim() || !validUrl) return;
          setBusy(true);
          try {
            await internApi.upsertLink(projectId, { kind, label: label.trim(), url: validUrl });
            setLabel(""); setUrl("");
            await onChange();
            toast({ description: "Linkul a fost adăugat." });
          } catch {
            toast({ variant: "destructive", description: "Linkul nu a putut fi adăugat." });
          } finally { setBusy(false); }
        }}>
          <label className="grid gap-1.5 text-sm font-medium">Tip de link
            <select value={kind} onChange={(event) => setKind(event.target.value as LinkKind)} className="project-select" disabled={busy}>
              {Object.entries(linkTypes).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Denumire<Input required maxLength={160} value={label} disabled={busy} onChange={(event) => setLabel(event.target.value)} placeholder="De exemplu, panoul principal" /></label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Adresă web<Input type="url" required value={url} disabled={busy} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label>
          <Button type="submit" size="sm" disabled={busy || !label.trim() || !url.trim()} className="justify-self-start"><Plus className="size-4" />Adaugă linkul</Button>
        </form>
      )}
    </details>
  );
}
