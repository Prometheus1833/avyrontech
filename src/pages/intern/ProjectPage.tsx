import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, Check, ClipboardList, FileText, Globe,
  Layers3, MessageSquareText, Settings2, Users,
} from "lucide-react";
import Link from "@/components/site/WorkspaceLink";
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, canOpenSection } from "@/lib/access";
import { internApi, type Project, type ProjectDetail } from "@/lib/internApi";
import { PROJECT_STAGES, projectStage } from "@/shared/projectLifecycle";
import { projectKindLabel } from "@/shared/projectSummary";
import { normalizeExternalLink } from "@/shared/externalUrl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import ProjectOverviewFields from "@/components/intern/ProjectOverviewFields";
import { ProjectWorkItems } from "@/components/intern/ProjectWorkItems";
import { ProjectStatisticsForm } from "@/components/intern/ProjectStatisticsForm";
import { MediaAttachments } from "@/components/intern/MediaAttachments";
import { ProjectSettings, ProjectRequests, ProjectSubscriptions } from "@/components/intern/ProjectDetailSections";
import "./project-page.css";

const ProjectDocuments = lazy(() => import("@/features/documents/DocumentCenter"));
const stages = [
  "Obiective și planificare",
  "Construcție și livrabile",
  "Verificări și ajustări",
  "Predare și acces",
];
const date = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" });

export default function ProjectPage() {
  const { slug = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const scope = userId && slug ? `${userId}:${slug}` : "";
  const [result, setResult] = useState<{ scope: string; data?: ProjectDetail; error?: string }>();
  const request = useRef({ revision: 0 });
  const load = useCallback(async () => {
    if (!scope) return;
    const revision = ++request.current.revision;
    try {
      const data = await internApi.getProject(slug);
      if (revision === request.current.revision) setResult({ scope, data });
    } catch (error) {
      if (revision !== request.current.revision) return;
      const status = (error as { status?: number }).status;
      const forbidden = status === 401 || status === 403 || status === 404;
      setResult((previous) => ({
        scope,
        data: !forbidden && previous?.scope === scope ? previous.data : undefined,
        error: forbidden ? "Proiectul nu este disponibil pentru contul tău." : "Datele proiectului nu au putut fi încărcate.",
      }));
    }
  }, [scope, slug]);

  useEffect(() => {
    const state = request.current;
    void load();
    return () => { ++state.revision; };
  }, [load]);

  const current = result?.scope === scope ? result : undefined;
  return (
    <>
      <Toaster />
      <main className="project-page mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <Button variant="ghost" size="sm" asChild><Link to="/profil?tab=projects"><ArrowLeft className="size-4" />Toate proiectele</Link></Button>
        {authLoading || (user && !current) ? (
          <p role="status" className="project-panel mt-4 p-5 text-muted-foreground">Se încarcă proiectul…</p>
        ) : !user ? (
          <p className="project-panel mt-4 p-5">Autentifică-te pentru a vedea proiectul. <Link className="underline" to="/auth">Intră în cont</Link></p>
        ) : (
          <>
            {current?.error && (
              <div role="alert" className="project-panel mt-4 flex flex-wrap items-center gap-3 p-4">
                <p>{current.error}</p>
                <Button variant="outline" size="sm" onClick={() => void load()}>Reîncearcă</Button>
              </div>
            )}
            {current?.data && <ProjectView key={scope} data={current.data} onChange={load} />}
          </>
        )}
      </main>
    </>
  );
}

function ProjectView({ data, onChange }: { data: ProjectDetail; onChange: () => Promise<void> }) {
  const { hash } = useLocation();
  const { roles, isSuperAdmin, capabilities } = useAuth();
  const access = buildAccess({ roles, superadmin: isSuperAdmin, capabilities });
  const { project, permission, staff, proposals, updates } = data;
  const canWrite = permission.write;
  const site = project.url ? normalizeExternalLink(project.url) : null;
  const cover = project.cover_image_url ? normalizeExternalLink(project.cover_image_url) : null;
  const favicon = project.favicon_url ? normalizeExternalLink(project.favicon_url) : null;
  const pending = proposals.filter(({ status }) => status === "proposed").length;
  const showDocuments = access.isClient || canOpenSection("documents", access);
  const shortcuts = [
    { id: "rezumat", text: "Rezumat", icon: Layers3 },
    { id: "livrare", text: "Livrare", icon: ClipboardList },
    { id: "cereri", text: "Cereri", icon: MessageSquareText },
    ...(canWrite || data.links.length ? [{ id: "configurare", text: canWrite ? "Configurare" : "Resurse", icon: Settings2 }] : []),
    { id: "documente", text: "Documente", icon: FileText },
  ];
  return (
    <div className="mt-4 grid gap-5 sm:gap-6">
      <header className="project-hero project-panel">
        {cover && <img src={cover} alt="" className="project-hero-cover" decoding="async" />}
        <div className="project-hero-body">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="project-identity" aria-hidden="true">
              {favicon ? <img src={favicon} alt="" className="size-7 rounded-md object-contain" onError={(event) => { event.currentTarget.hidden = true; }} /> : <Layers3 className="size-6" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{projectKindLabel(project.kind)}</p>
              <h1 className="mt-1 break-words font-display text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{project.name}</h1>
              {project.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{project.description}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {site && (
              <Button variant="outline" size="sm" asChild>
                <a href={site} target="_blank" rel="noreferrer"><ArrowUpRight className="size-4" />Deschide site-ul</a>
              </Button>
            )}
            {canOpenSection("intern", access) && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/profil?tab=intern&chatProject=${encodeURIComponent(project.id)}`}><MessageSquareText className="size-4" />Conversația proiectului</Link>
              </Button>
            )}
            {!canWrite && <Button size="sm" asChild><a href="#cereri">Trimite o cerere<ArrowRight className="size-4" /></a></Button>}
          </div>
        </div>
        <ProjectPipeline project={project} canWrite={canWrite} onChange={onChange} />
      </header>

      <nav className="project-navigation" aria-label="Secțiunile proiectului">
        {shortcuts.map(({ id, text, icon: Icon }) => (
          <a key={id} href={`#${id}`} aria-current={hash === `#${id}` ? "location" : undefined}><Icon aria-hidden="true" className="size-4" />{text}
            {id === "cereri" && pending > 0 && <span aria-label={`${pending} noi`} className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">{pending}</span>}
          </a>
        ))}
      </nav>

      <div className="project-layout">
        <aside className="project-sidebar" aria-label="Datele proiectului">
          <ProjectOverviewFields project={project} canWrite={canWrite} onChanged={onChange} />
          <ProjectSubscriptions data={data} canManage={canOpenSection("subscriptions-admin", access)} showAccountLink={access.isClient} onChange={onChange} />
          {staff.length > 0 && (
            <section className="project-panel p-4 sm:p-5" aria-labelledby="project-team-title">
              <h2 id="project-team-title" className="project-heading"><Users aria-hidden="true" />Echipa proiectului</h2>
              <ul className="mt-3 space-y-2">
                {staff.map((member) => {
                  const name = member.display_name || (access.isStaff ? member.email : "Membru AVYRON");
                  return (
                    <li key={member.user_id} className="flex min-w-0 items-center gap-2.5 text-sm">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0 break-words">
                        <p className="font-medium">{name}</p>
                        {access.isStaff && <p className="text-xs text-muted-foreground">{member.role}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>

        <div className="project-main-column">
          <ProjectWorkItems projectId={project.id} projectPage />
          <ProjectRequests projectId={project.id} proposals={proposals} canWrite={canWrite} onChange={onChange} />
          <section className="project-panel p-4 sm:p-5" aria-labelledby="project-activity-title">
            <h2 id="project-activity-title" className="project-heading"><Activity aria-hidden="true" />Actualizări</h2>
            {updates.length ? (
              <ul className="project-timeline mt-4">
                {updates.map((update) => (
                  <li key={update.id}>
                    <time dateTime={new Date(update.created_at).toISOString()} className="text-xs text-muted-foreground">{date.format(update.created_at)}</time>
                    <p className="mt-0.5 break-words font-medium">{update.title}</p>
                    {update.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{update.body}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted-foreground">Actualizările echipei vor apărea aici.</p>}
            {canWrite && <ProjectStatisticsForm projectId={project.id} />}
          </section>
          {canWrite || data.links.length > 0 ? <ProjectSettings data={data} onChange={onChange} /> : null}
        </div>
      </div>

      <section id="documente" className="project-panel project-section p-4 sm:p-5" aria-labelledby="project-documents-title">
        <div className="border-b border-border/60 pb-4">
          <h2 id="project-documents-title" className="project-heading"><FileText aria-hidden="true" />Documentele proiectului</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Fișiere de lucru și documente din Centru Documente.</p>
        </div>
        <div className="mt-4 grid min-w-0 gap-5">
          <MediaAttachments projectId={project.id} canWrite={canWrite && access.isStaff} projectFiles />
          {showDocuments && (
            <div className="project-documents-center dark min-w-0 rounded-xl bg-[#0b1120] p-3 sm:p-4">
              <Suspense fallback={<p role="status" className="text-sm text-slate-300">Se încarcă documentele alocate…</p>}>
                <ProjectDocuments embedded projectId={project.id} />
              </Suspense>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectPipeline({ project, canWrite, onChange }: { project: Project; canWrite: boolean; onChange: () => Promise<void> }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const current = PROJECT_STAGES.findIndex(({ id }) => id === projectStage(project));
  const next = PROJECT_STAGES[current + 1];
  const update = async (banner: Project["banner_status"]) => {
    if (busy || project.banner_status === banner) return;
    setBusy(true);
    try {
      await internApi.updateProject(project.id, { banner_status: banner });
      await onChange();
      toast({ description: "Etapa proiectului a fost actualizată." });
    } catch (error) {
      toast({ variant: "destructive", description: error instanceof Error ? error.message : "Etapa nu a fost salvată." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="project-pipeline" aria-labelledby="project-pipeline-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="project-pipeline-title" className="text-sm font-semibold">Parcursul proiectului</h2>
        {project.banner_status === "offline" && <Badge variant="outline"><Globe className="mr-1 size-3" />Site offline</Badge>}
        {project.banner_status === "revizuire" && <Badge variant="outline">În revizuire</Badge>}
      </div>
      <ol className="project-steps">
        {PROJECT_STAGES.map((stage, index) => (
          <li key={stage.id} data-stage={index === current ? "current" : index < current ? "past" : "next"} aria-current={index === current ? "step" : undefined}>
            <span className="project-step-mark" aria-hidden="true">{index < current ? <Check className="size-4" /> : index + 1}</span>
            <span className="min-w-0">
              <strong className="block text-sm font-semibold">{stage.label}</strong>
              <span className="mt-0.5 block text-xs text-muted-foreground">{stages[index]}</span>
            </span>
          </li>
        ))}
      </ol>
      {canWrite && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            Schimbă etapa
            <select value={PROJECT_STAGES[current].banner} disabled={busy} onChange={(event) => void update(event.target.value as Project["banner_status"])} className="project-select">
              {PROJECT_STAGES.map((stage) => <option key={stage.id} value={stage.banner}>{stage.label}</option>)}
            </select>
          </label>
          {next && <Button type="button" size="sm" disabled={busy} onClick={() => void update(next.banner)}>{busy ? "Se salvează…" : `Treci la ${next.label}`}<ArrowRight className="size-4" /></Button>}
        </div>
      )}
    </section>
  );
}
