import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2 } from "lucide-react";

type Announcement = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  priority: "info" | "normal" | "important" | "critical";
  created_at: string;
};

const priorityVariant: Record<Announcement["priority"], "default" | "secondary" | "destructive" | "outline"> = {
  info: "outline", normal: "secondary", important: "default", critical: "destructive",
};

export function StaffAnnouncementsTab() {
  const { t, lang } = useLang();
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", priority: "normal" as Announcement["priority"] });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("staff_announcements").select("*").order("created_at", { ascending: false });
    setItems((data as Announcement[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return;
    const { error } = await supabase.from("staff_announcements").insert({
      author_id: user.id,
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
    });
    if (error) return toast.error(error.message);
    toast.success("Anunț publicat");
    setOpen(false);
    setForm({ title: "", content: "", priority: "normal" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("staff_announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString(lang === "ro" ? "ro-RO" : "en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold">{t.auth.dash.staff.annTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.auth.dash.staff.annSub}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="size-4 mr-2" />{t.auth.dash.staff.newAnnouncement}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.auth.dash.staff.newAnnouncement}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Titlu</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>Conținut</Label>
                <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} maxLength={3000} />
              </div>
              <div className="space-y-1.5">
                <Label>Prioritate</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Announcement["priority"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="critical">Critic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t.auth.dash.common.cancel}</Button>
              <Button onClick={create}>{t.auth.dash.common.create}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.common.empty}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Megaphone className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmt(a.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={priorityVariant[a.priority]}>{a.priority}</Badge>
                  {(isAdmin || a.author_id === user?.id) && (
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{a.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
