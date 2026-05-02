import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MessageSquarePlus, Send, ChevronDown, ChevronUp } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
};
type Message = {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_staff_reply: boolean;
  created_at: string;
};

const statusVariant: Record<Ticket["status"], "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
  closed: "outline",
};

export function TicketsTab({ staffMode = false }: { staffMode?: boolean }) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({ subject: "", description: "", priority: "medium" as Ticket["priority"] });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const q = supabase.from("tickets").select("*").order("created_at", { ascending: false });
    if (!staffMode) q.eq("user_id", user.id);
    const { data } = await q;
    setTickets((data as Ticket[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, staffMode]);

  const submit = async () => {
    if (!user || !form.subject.trim()) return;
    const { error } = await supabase.from("tickets").insert({
      user_id: user.id,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
    });
    if (error) return toast.error(error.message);
    toast.success(t.auth.dash.tickets.created);
    setOpen(false);
    setForm({ subject: "", description: "", priority: "medium" });
    load();
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold">
            {staffMode ? t.auth.dash.staff.ticketsTitle : t.auth.dash.tickets.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {staffMode ? t.auth.dash.staff.ticketsSub : t.auth.dash.tickets.subtitle}
          </p>
        </div>
        {!staffMode && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full"><MessageSquarePlus className="size-4 mr-2" />{t.auth.dash.tickets.newTicket}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t.auth.dash.tickets.newTicket}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t.auth.dash.tickets.subject}</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={200} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.auth.dash.tickets.description}</Label>
                  <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.auth.dash.tickets.priority}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Ticket["priority"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["low", "medium", "high", "urgent"] as const).map((p) => (
                        <SelectItem key={p} value={p}>{t.auth.dash.tickets.priorities[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{t.auth.dash.common.cancel}</Button>
                <Button onClick={submit}>{t.auth.dash.tickets.send}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : tickets.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.tickets.noTickets}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((tk) => (
            <Card key={tk.id} className="overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === tk.id ? null : tk.id)}
                className="w-full text-left hover:bg-muted/30 transition-colors"
              >
                <CardHeader className="flex flex-row items-center justify-between gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base truncate">{tk.subject}</CardTitle>
                      <Badge variant={statusVariant[tk.status]} className="shrink-0">{t.auth.dash.tickets.statuses[tk.status]}</Badge>
                      <Badge variant="outline" className="shrink-0 text-xs">{t.auth.dash.tickets.priorities[tk.priority]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.auth.dash.tickets.openedAt} {fmtDate(tk.created_at)}</p>
                  </div>
                  {expanded === tk.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </CardHeader>
              </button>
              {expanded === tk.id && (
                <CardContent className="border-t pt-4">
                  <TicketThread ticket={tk} staffMode={staffMode} onChanged={load} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketThread({ ticket, staffMode, onChanged }: { ticket: Ticket; staffMode: boolean; onChanged: () => void }) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ticket.id]);

  const send = async () => {
    if (!user || !reply.trim()) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: user.id,
      content: reply.trim(),
      is_staff_reply: staffMode,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setReply("");
    toast.success(t.auth.dash.tickets.messageSent);
    load();
  };

  const updateStatus = async (status: Ticket["status"]) => {
    const { error } = await supabase.from("tickets").update({
      status,
      closed_at: status === "closed" ? new Date().toISOString() : null,
    }).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString(lang === "ro" ? "ro-RO" : "en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      {ticket.description && (
        <div className="text-sm bg-muted/40 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">{t.auth.dash.tickets.description}</div>
          {ticket.description}
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-lg p-3 text-sm ${m.is_staff_reply ? "bg-primary/10 ml-6" : "bg-muted/40 mr-6"}`}>
            <div className="text-xs text-muted-foreground mb-1">
              {m.is_staff_reply ? "Staff Avyron" : "Client"} • {fmt(m.created_at)}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>

      {ticket.status !== "closed" && (
        <div className="flex gap-2">
          <Textarea
            placeholder={t.auth.dash.tickets.replyPlaceholder}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={2000}
            className="flex-1"
          />
          <Button onClick={send} disabled={sending || !reply.trim()} size="icon" className="self-end">
            <Send className="size-4" />
          </Button>
        </div>
      )}

      {staffMode && (
        <div className="flex gap-2 flex-wrap pt-2 border-t">
          <span className="text-xs text-muted-foreground self-center">{t.auth.dash.staff.changeStatus}:</span>
          {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={ticket.status === s ? "default" : "outline"}
              onClick={() => updateStatus(s)}
            >
              {t.auth.dash.tickets.statuses[s]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
