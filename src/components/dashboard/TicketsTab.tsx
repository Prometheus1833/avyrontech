import { useCallback, useEffect, useRef, useState } from "react";
import { workspaceApi } from "@/lib/workspaceApi";
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
import {useSearchParams} from 'react-router-dom';

type Ticket = {
  id: string;
  revision: number;
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

export function TicketsTab({ staffMode = false, embedded=false }: { staffMode?: boolean; embedded?:boolean }) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchParams]=useSearchParams();
  const requestedTicket=searchParams.get('ticket');
  useEffect(()=>{if(requestedTicket&&tickets.some(row=>row.id===requestedTicket))setExpanded(requestedTicket);},[requestedTicket,tickets]);

  const [clients, setClients] = useState<{id:string;company_name:string}[]>([]);
  const [clientId, setClientId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium" as Ticket["priority"] });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const {data} = await workspaceApi.list<Ticket>("tickets"); setTickets(data);
      if (!staffMode) {
        const linked = await workspaceApi.list<{id:string;company_name:string}>("clients");
        setClients(linked.data);
        setClientId(current => current || linked.data[0]?.id || "");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Suportul nu poate fi încărcat."); }
    finally { setLoading(false); }
  }, [staffMode, user]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!user || !form.subject.trim()) return;
    if (creating) return;
    setCreating(true);
    try { await workspaceApi.write("tickets", clientId ? { ...form, client_id: clientId } : { ...form }); }
    catch (error) { return toast.error(error instanceof Error ? error.message : "Solicitarea nu poate fi salvată."); }
    finally { setCreating(false); }
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
          {!embedded&&<h2 className="text-2xl font-display font-bold">
            {staffMode ? t.auth.dash.staff.ticketsTitle : t.auth.dash.tickets.title}
          </h2>}
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
                {clients.length > 1 && <label className="block text-sm">Cont client<select aria-label="Cont client" className="mt-1 w-full rounded border bg-background p-2" value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Selectează clientul</option>{clients.map(client=><option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label>}
                
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
                <Button onClick={submit} disabled={creating || !form.subject.trim()}>{t.auth.dash.tickets.send}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && <p role="alert" className="text-destructive">{error}</p>}
      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : error ? null : tickets.length === 0 ? (
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

  const [older, setOlder] = useState(false), [loadingOlder, setLoadingOlder] = useState(false);
  const [readError, setReadError] = useState(false), [readAttempt, setReadAttempt] = useState(0);
  const historyOffset = useRef(0), lastRead = useRef("");
  const scroller = useRef<HTMLDivElement>(null), end = useRef<HTMLDivElement>(null), atBottom = useRef(true);
  const load = useCallback(async (offset = 0) => {
    try {
      const {data} = await workspaceApi.list<Message>(`tickets/${encodeURIComponent(ticket.id)}/messages?recent=1&offset=${offset}`);
      setMessages(previous => Array.from(new Map([...previous,...data].map(message=>[message.id,message])).values())
        .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id.localeCompare(b.id)));
      if(offset>0||historyOffset.current===0){setOlder(data.length===50);historyOffset.current=offset+data.length;}
    } catch (error) { toast.error(error instanceof Error ? error.message : "Mesajele nu pot fi încărcate."); }
  }, [ticket.id]);
  useEffect(() => {
    void load();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},30000);
    return()=>clearInterval(timer);
  }, [load]);
  const lastId=messages[messages.length-1]?.id;
  useEffect(()=>{
    if(atBottom.current&&scroller.current)scroller.current.scrollTop=scroller.current.scrollHeight;
  },[lastId]);
  useEffect(()=>{
    if(staffMode||!lastId||!end.current)return;
    let active=true;
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting)||document.visibilityState!=='visible'||lastRead.current===lastId)return;
      lastRead.current=lastId;
      void workspaceApi.write(`tickets/${encodeURIComponent(ticket.id)}/read`,{messageId:lastId})
        .then(()=>{if(active)setReadError(false);})
        .catch(()=>{lastRead.current='';if(active)setReadError(true);});
    });
    const node=end.current,observe=()=>{observer.unobserve(node);observer.observe(node);};
    observe();document.addEventListener('visibilitychange',observe);
    return()=>{active=false;observer.disconnect();document.removeEventListener('visibilitychange',observe);};
  },[lastId,staffMode,ticket.id,readAttempt]);
  const loadOlder=async()=>{
    if(loadingOlder)return;
    setLoadingOlder(true);atBottom.current=false;
    try{await load(historyOffset.current);}finally{setLoadingOlder(false);}
  };

  const send = async () => {
    if (!user || !reply.trim()) return;
    setSending(true);
    try { await workspaceApi.write(`tickets/${encodeURIComponent(ticket.id)}/messages`, { content: reply.trim() }); }
    catch (error) { return toast.error(error instanceof Error ? error.message : "Mesajul nu poate fi salvat."); }
    finally { setSending(false); }
    setReply("");
    toast.success(t.auth.dash.tickets.messageSent);
    load();
  };

  const updateStatus = async (status: Ticket["status"]) => {
    try { await workspaceApi.write(`tickets/${encodeURIComponent(ticket.id)}`, { status, revision: ticket.revision }, "PATCH"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Starea nu poate fi schimbată."); onChanged(); return; }
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

      <div className="flex items-center justify-between gap-2">
        {older?<Button variant="ghost" size="sm" disabled={loadingOlder} onClick={()=>void loadOlder()}>Mesaje mai vechi</Button>:<span/>}
        <Button variant="ghost" size="sm" onClick={()=>void load()}>Actualizează răspunsurile</Button>
      </div>
      <div ref={scroller} onScroll={()=>{const node=scroller.current;if(node)atBottom.current=node.scrollHeight-node.scrollTop-node.clientHeight<40;}} className="space-y-2 max-h-72 overflow-y-auto" role="log" aria-live="polite" aria-label="Răspunsurile solicitării">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-lg p-3 text-sm ${m.is_staff_reply ? "bg-primary/10 ml-6" : "bg-muted/40 mr-6"}`}>
            <div className="text-xs text-muted-foreground mb-1">
              {m.is_staff_reply ? "Staff Avyron" : "Client"} • {fmt(m.created_at)}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {!!messages.length&&<div ref={end} aria-hidden="true" className="h-px"/>}
      </div>
      {readError&&<p role="status" className="text-xs text-amber-300">Citirea mesajelor nu a putut fi confirmată. <button className="underline" onClick={()=>setReadAttempt(n=>n+1)}>Reîncearcă</button></p>}

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
