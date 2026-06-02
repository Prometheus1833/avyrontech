import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Calendar, FolderKanban, Link as LinkIcon, User, Phone, Mail, Trash2,
  Sparkles, ArrowUpRight, X, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type ProjectStatus =
  | "todo" | "in_progress" | "review" | "blocked" | "done" | "cancelled"
  | "started" | "refining" | "delivered" | "paid" | "maintenance";

type Project = {
  id: string;
  project_number: number;
  title: string;
  description: string | null;
  owner_id: string;
  assignee_id: string | null;
  client_id: string | null;
  linked_user_id: string | null;
  status: ProjectStatus;
  priority: "low" | "medium" | "high" | "urgent";
  budget_cents: number | null;
  additional_costs_cents: number | null;
  progress: number;
  created_at: string;
  link1: string | null; link2: string | null; link3: string | null;
  client_first_name: string | null; client_last_name: string | null;
  client_phone: string | null; client_email: string | null;
  client_facebook: string | null; client_instagram: string | null; client_tiktok: string | null;
  project_type: string | null;
  estimated_duration: string | null;
  start_date: string | null;
  delivery_date: string | null;
  integrations: string | null;
  client_change_requests: string | null;
  staff_members: string[] | null;
};

type StaffMember = { id: string; display_name: string | null; pseudonym: string | null; staff_role: string | null };
type UserRow = { id: string; display_name: string | null };
type Task = { id: string; content: string; completed: boolean; author_id: string; created_at: string };

const STATUS_OPTS: { value: ProjectStatus; label: string; cls: string }[] = [
  { value: "started",     label: "Început",         cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { value: "in_progress", label: "În curs",         cls: "bg-primary/15 text-primary" },
  { value: "refining",    label: "Rafinare",        cls: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  { value: "done",        label: "Finalizat",       cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  { value: "delivered",   label: "Livrat",          cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { value: "paid",        label: "Plătit",          cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { value: "maintenance", label: "În administrare", cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  { value: "todo",        label: "De făcut",        cls: "bg-muted text-foreground" },
  { value: "review",      label: "Review",          cls: "bg-blue-500/15 text-blue-600" },
  { value: "blocked",     label: "Blocat",          cls: "bg-destructive/15 text-destructive" },
  { value: "cancelled",   label: "Anulat",          cls: "bg-muted text-muted-foreground" },
];

const statusMeta = Object.fromEntries(STATUS_OPTS.map(s => [s.value, s])) as Record<ProjectStatus, typeof STATUS_OPTS[number]>;

const PROJECT_TYPES = ["Website", "Aplicație", "Conturi sociale", "E-commerce", "Branding", "Marketing", "Altul"];

const emptyForm = {
  title: "",
  description: "",
  link1: "", link2: "", link3: "",
  client_first_name: "", client_last_name: "",
  client_phone: "", client_email: "",
  client_facebook: "", client_instagram: "", client_tiktok: "",
  project_type: "Website",
  budget: "",
  estimated_duration: "",
  assignee_id: "",
  staff_members: [] as string[],
  linked_user_id: "",
};

export const StaffProjectsTab = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openProject, setOpenProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState<"mine" | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      supabase.from("projects").select("*").order("project_number", { ascending: false }),
      supabase.from("profiles").select("id,display_name,pseudonym,staff_role"),
    ]);
    if (p.data) setProjects(p.data as unknown as Project[]);
    if (s.data) {
      const all = s.data as unknown as (StaffMember & { display_name: string | null })[];
      setStaff(all.filter(x => !!x.staff_role));
      setAllUsers(all.map(x => ({ id: x.id, display_name: x.pseudonym || x.display_name })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadTasks = async (projectId: string) => {
    const { data } = await supabase.from("project_tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
    if (data) setTasks(data as Task[]);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !user) { toast.error("Numele proiectului este obligatoriu"); return; }
    setSubmitting(true);
    const payload: any = {
      title: form.title.trim(),
      description: form.description || null,
      owner_id: user.id,
      assignee_id: form.assignee_id || null,
      staff_members: form.staff_members,
      linked_user_id: form.linked_user_id || null,
      client_id: form.linked_user_id || null,
      link1: form.link1 || null, link2: form.link2 || null, link3: form.link3 || null,
      client_first_name: form.client_first_name || null,
      client_last_name: form.client_last_name || null,
      client_phone: form.client_phone || null,
      client_email: form.client_email || null,
      client_facebook: form.client_facebook || null,
      client_instagram: form.client_instagram || null,
      client_tiktok: form.client_tiktok || null,
      project_type: form.project_type || null,
      estimated_duration: form.estimated_duration || null,
      budget_cents: form.budget ? Math.round(parseFloat(form.budget) * 100) : 0,
      status: "started",
    };
    const { error } = await supabase.from("projects").insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Proiect creat");
    setOpenCreate(false);
    setForm(emptyForm);
    load();
  };

  const updateProject = async (id: string, patch: Partial<Project>) => {
    const { error } = await supabase.from("projects").update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    if (openProject?.id === id) setOpenProject({ ...openProject, ...patch } as Project);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } as Project : p));
  };

  const addTask = async () => {
    if (!newTask.trim() || !openProject || !user) return;
    const { data, error } = await supabase.from("project_tasks").insert({
      project_id: openProject.id, author_id: user.id, content: newTask.trim(),
    }).select().single();
    if (error) return toast.error(error.message);
    setTasks(t => [...t, data as Task]);
    setNewTask("");
  };

  const toggleTask = async (t: Task) => {
    const { error } = await supabase.from("project_tasks").update({ completed: !t.completed }).eq("id", t.id);
    if (error) return toast.error(error.message);
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed: !t.completed } : x));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("project_tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTasks(prev => prev.filter(x => x.id !== id));
  };

  const staffName = (id: string | null) => {
    if (!id) return "—";
    const m = staff.find(x => x.id === id) || allUsers.find(x => x.id === id) as any;
    return m?.pseudonym || m?.display_name || "Necunoscut";
  };

  const visible = useMemo(() =>
    projects.filter(p => filter === "all" ? true
      : (p.assignee_id === user?.id || p.owner_id === user?.id || (p.staff_members ?? []).includes(user?.id || ""))),
    [projects, filter, user]);

  const toggleStaffMember = (id: string) => {
    setForm(f => ({
      ...f,
      staff_members: f.staff_members.includes(id)
        ? f.staff_members.filter(x => x !== id)
        : [...f.staff_members, id],
    }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Toate</Button>
          <Button size="sm" variant={filter === "mine" ? "default" : "outline"} onClick={() => setFilter("mine")}>Ale mele</Button>
        </div>

        {/* Cursor-style black create button */}
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <button
              className="group relative inline-flex items-center gap-2.5 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-all hover:bg-zinc-900 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:ring-zinc-900/10 dark:hover:bg-zinc-100"
            >
              <span className="relative flex size-5 items-center justify-center rounded-full bg-white/10 dark:bg-zinc-950/10">
                <Plus className="size-3.5" strokeWidth={2.5} />
              </span>
              <span>Creează un proiect</span>
              <ArrowUpRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Mini dashboard proiect nou
              </DialogTitle>
              <DialogDescription>Completează informațiile inițiale. Numărul proiectului se atribuie automat.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Basic */}
              <div className="space-y-3">
                <div>
                  <Label>Nume proiect *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="ex. Site prezentare Plase Ieftine" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([1,2,3] as const).map(i => (
                    <div key={i}>
                      <Label className="text-xs flex items-center gap-1"><LinkIcon className="size-3" />Link / subdomeniu {i}</Label>
                      <Input
                        value={(form as any)[`link${i}`]}
                        onChange={e => setForm({ ...form, [`link${i}`]: e.target.value } as any)}
                        placeholder="https://..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Client */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">// client</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Prenume</Label><Input value={form.client_first_name} onChange={e => setForm({ ...form, client_first_name: e.target.value })} /></div>
                  <div><Label className="text-xs">Nume</Label><Input value={form.client_last_name} onChange={e => setForm({ ...form, client_last_name: e.target.value })} /></div>
                  <div><Label className="text-xs">Telefon</Label><Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} /></div>
                  <div><Label className="text-xs">Email</Label><Input value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} /></div>
                  <div><Label className="text-xs">Facebook</Label><Input value={form.client_facebook} onChange={e => setForm({ ...form, client_facebook: e.target.value })} /></div>
                  <div><Label className="text-xs">Instagram</Label><Input value={form.client_instagram} onChange={e => setForm({ ...form, client_instagram: e.target.value })} /></div>
                  <div className="col-span-2"><Label className="text-xs">TikTok</Label><Input value={form.client_tiktok} onChange={e => setForm({ ...form, client_tiktok: e.target.value })} /></div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tip proiect</Label>
                  <Select value={form.project_type} onValueChange={v => setForm({ ...form, project_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Valoare proiect (RON)</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs">Durată estimată</Label><Input value={form.estimated_duration} onChange={e => setForm({ ...form, estimated_duration: e.target.value })} placeholder="ex. 2-3 săptămâni" /></div>
              </div>

              {/* Description */}
              <div>
                <Label>Descriere proiect</Label>
                <Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalii, obiective, observații…" />
              </div>

              {/* Staff & user */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">// echipă</p>
                <div>
                  <Label className="text-xs">Adaugă membri staff</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {staff.map(s => {
                      const active = form.staff_members.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleStaffMember(s.id)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted border-border"
                          }`}
                        >
                          {s.pseudonym || s.display_name || "—"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Asociază utilizator (client cu cont)</Label>
                  <Select value={form.linked_user_id || "none"} onValueChange={v => setForm({ ...form, linked_user_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Niciunul" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">— Niciunul —</SelectItem>
                      {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.display_name || u.id.slice(0,8)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenCreate(false)}>Anulează</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Se creează…" : "Creează proiectul"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {loading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> :
        visible.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Niciun proiect.</CardContent></Card> :
        <div className="grid gap-2">
          {visible.map(p => {
            const S = statusMeta[p.status] ?? statusMeta.todo;
            const clientName = [p.client_first_name, p.client_last_name].filter(Boolean).join(" ") || "—";
            return (
              <button
                key={p.id}
                onClick={() => { setOpenProject(p); loadTasks(p.id); }}
                className="text-left group rounded-xl border bg-card p-3.5 hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="shrink-0 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-xs">
                    <Hash className="size-3" />{String(p.project_number).padStart(3, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{p.title}</h3>
                      <Badge className={S.cls} variant="outline">{S.label}</Badge>
                      {p.project_type && <Badge variant="outline" className="text-xs">{p.project_type}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      <User className="size-3 inline mr-1" />{clientName}
                      {p.budget_cents ? <> · <strong className="text-foreground/70">{(p.budget_cents/100).toFixed(0)} RON</strong></> : null}
                      {p.delivery_date && <> · <Calendar className="size-3 inline mx-1" />{format(new Date(p.delivery_date), "dd MMM")}</>}
                      {" "}· echipă: {staffName(p.assignee_id)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      }

      {/* Project details dialog */}
      <Dialog open={!!openProject} onOpenChange={o => { if (!o) setOpenProject(null); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {openProject && (() => {
            const p = openProject;
            const completedCount = tasks.filter(t => t.completed).length;
            return <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">#{String(p.project_number).padStart(3, "0")}</span>
                  {p.title}
                </DialogTitle>
                <DialogDescription>
                  Owner: {staffName(p.owner_id)} · Alocat: {staffName(p.assignee_id)}
                  {p.linked_user_id && <> · Client cont: {staffName(p.linked_user_id)}</>}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Status row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Stare</Label>
                    <Select value={p.status} onValueChange={v => updateProject(p.id, { status: v as ProjectStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Data început</Label>
                    <Input type="date" value={p.start_date || ""} onChange={e => updateProject(p.id, { start_date: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-xs">Data livrare</Label>
                    <Input type="date" value={p.delivery_date || ""} onChange={e => updateProject(p.id, { delivery_date: e.target.value || null })} />
                  </div>
                </div>

                {/* Links */}
                {(p.link1 || p.link2 || p.link3) && (
                  <div className="flex flex-wrap gap-2">
                    {[p.link1, p.link2, p.link3].filter(Boolean).map((l, i) => (
                      <a key={i} href={l!} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs rounded-full border px-3 py-1 hover:bg-muted transition">
                        <LinkIcon className="size-3" />{l}
                      </a>
                    ))}
                  </div>
                )}

                {/* Client card */}
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">// client</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div><span className="text-muted-foreground text-xs">Nume:</span> {[p.client_first_name, p.client_last_name].filter(Boolean).join(" ") || "—"}</div>
                    <div><Phone className="size-3 inline mr-1 text-muted-foreground" />{p.client_phone || "—"}</div>
                    <div><Mail className="size-3 inline mr-1 text-muted-foreground" />{p.client_email || "—"}</div>
                    <div><span className="text-muted-foreground text-xs">FB:</span> {p.client_facebook || "—"}</div>
                    <div><span className="text-muted-foreground text-xs">IG:</span> {p.client_instagram || "—"}</div>
                    <div><span className="text-muted-foreground text-xs">TT:</span> {p.client_tiktok || "—"}</div>
                  </div>
                </div>

                {/* Type / duration / value */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Tip</Label>
                    <Select value={p.project_type || "Website"} onValueChange={v => updateProject(p.id, { project_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Durată estimată</Label>
                    <Input value={p.estimated_duration || ""} onChange={e => updateProject(p.id, { estimated_duration: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Valoare (RON)</Label>
                    <Input type="number" value={p.budget_cents ? p.budget_cents/100 : ""} onChange={e => updateProject(p.id, { budget_cents: e.target.value ? Math.round(parseFloat(e.target.value)*100) : 0 })} />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs">Descriere</Label>
                  <Textarea rows={3} value={p.description || ""} onChange={e => setOpenProject({ ...p, description: e.target.value })}
                    onBlur={e => updateProject(p.id, { description: e.target.value || null })} />
                </div>

                {/* Client change requests */}
                <div>
                  <Label className="text-xs">Modificări solicitate de client</Label>
                  <Textarea rows={3} value={p.client_change_requests || ""}
                    onChange={e => setOpenProject({ ...p, client_change_requests: e.target.value })}
                    onBlur={e => updateProject(p.id, { client_change_requests: e.target.value || null })} />
                </div>

                {/* Tasks */}
                <div className="rounded-xl border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">// taskuri ({completedCount}/{tasks.length})</p>
                  </div>
                  <div className="space-y-1.5 mb-2">
                    {tasks.map(t => (
                      <div key={t.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                        <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t)} />
                        <span className={`text-sm flex-1 ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.content}</span>
                        <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 transition">
                          <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                    {tasks.length === 0 && <p className="text-xs text-muted-foreground italic px-2">Niciun task.</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newTask} onChange={e => setNewTask(e.target.value)}
                      placeholder="Adaugă un task (10-15 cuvinte)…"
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTask())} />
                    <Button size="sm" onClick={addTask}><Plus className="size-4" /></Button>
                  </div>
                </div>

                {/* Integrations & additional costs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Integrări</Label>
                    <Textarea rows={3} value={p.integrations || ""}
                      onChange={e => setOpenProject({ ...p, integrations: e.target.value })}
                      onBlur={e => updateProject(p.id, { integrations: e.target.value || null })}
                      placeholder="Stripe, curieri, AI chat…" />
                  </div>
                  <div>
                    <Label className="text-xs">Costuri adiționale (RON)</Label>
                    <Input type="number" value={p.additional_costs_cents ? p.additional_costs_cents/100 : ""}
                      onChange={e => updateProject(p.id, { additional_costs_cents: e.target.value ? Math.round(parseFloat(e.target.value)*100) : 0 })} />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
                  <span><FolderKanban className="size-3 inline mr-1" />Creat: {format(new Date(p.created_at), "dd MMM yyyy")}</span>
                </div>
              </div>
            </>;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
