import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, AlertTriangle, CheckCircle2, Clock, Pause, XCircle, Eye, FolderKanban, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Project = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  owner_id: string;
  assignee_id: string | null;
  status: "todo" | "in_progress" | "review" | "blocked" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string | null;
  budget_cents: number | null;
  progress: number;
  created_at: string;
};

type StaffMember = { id: string; display_name: string | null; pseudonym: string | null };
type Note = { id: string; content: string; author_id: string; created_at: string };

const statusMeta: Record<Project["status"], { label: string; icon: any; cls: string }> = {
  todo: { label: "De făcut", icon: Clock, cls: "bg-muted text-foreground" },
  in_progress: { label: "În lucru", icon: FolderKanban, cls: "bg-primary/15 text-primary" },
  review: { label: "Review", icon: Eye, cls: "bg-blue-500/15 text-blue-600" },
  blocked: { label: "Blocat", icon: AlertTriangle, cls: "bg-destructive/15 text-destructive" },
  done: { label: "Finalizat", icon: CheckCircle2, cls: "bg-green-500/15 text-green-600" },
  cancelled: { label: "Anulat", icon: XCircle, cls: "bg-muted text-muted-foreground" },
};

const priorityMeta: Record<Project["priority"], { label: string; cls: string }> = {
  low: { label: "Scăzută", cls: "bg-muted text-muted-foreground" },
  medium: { label: "Medie", cls: "bg-blue-500/15 text-blue-600" },
  high: { label: "Mare", cls: "bg-orange-500/15 text-orange-600" },
  urgent: { label: "Urgent", cls: "bg-destructive/15 text-destructive" },
};

export const StaffProjectsTab = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openProject, setOpenProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    assignee_id: "",
    priority: "medium" as Project["priority"],
    deadline: "",
    budget: "",
  });

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,display_name,pseudonym"),
    ]);
    if (p.data) setProjects(p.data as Project[]);
    if (s.data) setStaff(s.data as StaffMember[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadNotes = async (projectId: string) => {
    const { data } = await supabase.from("project_notes").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    if (data) setNotes(data as Note[]);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !user) return;
    const { error } = await supabase.from("projects").insert({
      title: form.title,
      description: form.description || null,
      requirements: form.requirements || null,
      owner_id: user.id,
      assignee_id: form.assignee_id || null,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      budget_cents: form.budget ? Math.round(parseFloat(form.budget) * 100) : 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Proiect creat");
    setOpenCreate(false);
    setForm({ title: "", description: "", requirements: "", assignee_id: "", priority: "medium", deadline: "", budget: "" });
    load();
  };

  const updateProject = async (id: string, patch: Partial<Project>) => {
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Actualizat");
    load();
    if (openProject?.id === id) setOpenProject({ ...openProject, ...patch } as Project);
  };

  const addNote = async () => {
    if (!newNote.trim() || !openProject || !user) return;
    const { error } = await supabase.from("project_notes").insert({ project_id: openProject.id, author_id: user.id, content: newNote });
    if (error) return toast.error(error.message);
    setNewNote("");
    loadNotes(openProject.id);
  };

  const staffName = (id: string | null) => {
    if (!id) return "—";
    const m = staff.find(x => x.id === id);
    return m?.pseudonym || m?.display_name || "Necunoscut";
  };

  const visible = projects.filter(p => filter === "all" ? true : (p.assignee_id === user?.id || p.owner_id === user?.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "mine" ? "default" : "outline"} onClick={() => setFilter("mine")}>Ale mele</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Toate</Button>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />Proiect nou</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Proiect nou</DialogTitle><DialogDescription>Completează detaliile inițiale.</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label>Titlu *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descriere</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Cerințe</Label><Textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Alocat lui</Label>
                  <Select value={form.assignee_id} onValueChange={v => setForm({ ...form, assignee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.pseudonym || s.display_name || "—"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioritate</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as Project["priority"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(priorityMeta).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
                <div><Label>Buget (RON)</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Creează</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> :
        visible.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Niciun proiect.</CardContent></Card> :
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map(p => {
            const S = statusMeta[p.status];
            return (
              <Card key={p.id} className="cursor-pointer hover:border-primary transition" onClick={() => { setOpenProject(p); loadNotes(p.id); }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <Badge className={priorityMeta[p.priority].cls} variant="outline">{priorityMeta[p.priority].label}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{p.description || "Fără descriere"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge className={S.cls} variant="outline"><S.icon className="size-3 mr-1" />{S.label}</Badge>
                    {p.deadline && <span className="text-muted-foreground inline-flex items-center gap-1"><Calendar className="size-3" />{format(new Date(p.deadline), "dd MMM")}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">Alocat: {staffName(p.assignee_id)}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${p.progress}%` }} /></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      }

      <Dialog open={!!openProject} onOpenChange={o => { if (!o) setOpenProject(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {openProject && (() => {
            const S = statusMeta[openProject.status];
            return <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{openProject.title}</DialogTitle>
                <DialogDescription>Owner: {staffName(openProject.owner_id)} • Alocat: {staffName(openProject.assignee_id)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={openProject.status} onValueChange={v => updateProject(openProject.id, { status: v as Project["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(statusMeta).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Prioritate</Label>
                    <Select value={openProject.priority} onValueChange={v => updateProject(openProject.id, { priority: v as Project["priority"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(priorityMeta).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Alocat lui</Label>
                    <Select value={openProject.assignee_id || ""} onValueChange={v => updateProject(openProject.id, { assignee_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.pseudonym || s.display_name || "—"}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Progres ({openProject.progress}%)</Label>
                    <Input type="range" min="0" max="100" value={openProject.progress} onChange={e => setOpenProject({ ...openProject, progress: parseInt(e.target.value) })} onMouseUp={e => updateProject(openProject.id, { progress: parseInt((e.target as HTMLInputElement).value) })} />
                  </div>
                </div>

                {openProject.deadline && <p className="text-sm"><Calendar className="size-4 inline mr-1" /><strong>Deadline:</strong> {format(new Date(openProject.deadline), "dd MMM yyyy")}</p>}
                {openProject.budget_cents ? <p className="text-sm"><strong>Buget:</strong> {(openProject.budget_cents / 100).toFixed(2)} RON</p> : null}

                {openProject.description && <div><Label className="text-xs">Descriere</Label><p className="text-sm whitespace-pre-wrap p-3 bg-muted/50 rounded-md">{openProject.description}</p></div>}
                {openProject.requirements && <div><Label className="text-xs">Cerințe</Label><p className="text-sm whitespace-pre-wrap p-3 bg-muted/50 rounded-md">{openProject.requirements}</p></div>}

                <div>
                  <Label className="text-xs flex items-center gap-1"><MessageSquarePlus className="size-3" />Notițe ({notes.length})</Label>
                  <div className="flex gap-2 mt-2">
                    <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Adaugă o notiță…" onKeyDown={e => e.key === "Enter" && addNote()} />
                    <Button size="sm" onClick={addNote}>Adaugă</Button>
                  </div>
                  <div className="space-y-2 mt-3 max-h-60 overflow-y-auto">
                    {notes.map(n => (
                      <div key={n.id} className="text-sm p-2 bg-muted/40 rounded">
                        <p className="whitespace-pre-wrap">{n.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{staffName(n.author_id)} • {format(new Date(n.created_at), "dd MMM HH:mm")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
