import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Send, Users2, Smile, Paperclip, Mic, Reply, MoreHorizontal,
  Search, ShieldCheck, Crown, Code2, Palette, Megaphone, Headphones,
  Circle, AtSign, Pin, Bell, Check, CheckCheck, X, Plus, Inbox, UserPlus, UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  reply_to?: string | null;
  reactions?: Record<string, string[]>;
};
type Profile = {
  id: string;
  pseudonym: string | null;
  display_name: string | null;
  avatar_url: string | null;
  staff_role: string | null;
};
type ConvoTarget =
  | { type: "channel"; id: string; name: string; emoji?: string }
  | { type: "dm"; id: string; name: string }
  | { type: "group"; id: string; name: string; memberIds: string[] };

const STAFF_CHANNELS = [
  { id: "general", name: "generala", emoji: "💬", topic: "Discuții generale ale echipei" },
  { id: "dev", name: "dev", emoji: "💻", topic: "Implementări, bug-uri, deploy" },
  { id: "design", name: "design", emoji: "🎨", topic: "UI/UX, mockup-uri, branding" },
  { id: "marketing", name: "marketing", emoji: "📣", topic: "Campanii, conținut, SEO" },
  { id: "random", name: "pauza-cafea", emoji: "☕", topic: "Off-topic, meme, relax" },
];

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "🎉", "👀", "✅"];

const STAFF_ROLE_META: Record<string, { label: string; icon: typeof Code2; color: string; gradient: string }> = {
  admin:     { label: "Admin",     icon: Crown,      color: "text-amber-500",  gradient: "from-amber-500/30 via-amber-400/10 to-transparent" },
  dev:       { label: "Dev",       icon: Code2,      color: "text-cyan-400",   gradient: "from-cyan-500/30 via-cyan-400/10 to-transparent" },
  designer:  { label: "Designer",  icon: Palette,    color: "text-pink-400",   gradient: "from-pink-500/30 via-pink-400/10 to-transparent" },
  marketing: { label: "Marketing", icon: Megaphone,  color: "text-emerald-400",gradient: "from-emerald-500/30 via-emerald-400/10 to-transparent" },
  support:   { label: "Support",   icon: Headphones, color: "text-violet-400", gradient: "from-violet-500/30 via-violet-400/10 to-transparent" },
};

const dateLabel = (d: Date) => isToday(d) ? "Astăzi" : isYesterday(d) ? "Ieri" : format(d, "d MMM yyyy");

export const StaffChatTab = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [staff, setStaff] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [target, setTarget] = useState<ConvoTarget>({ type: "channel", id: "general", name: "general" });
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [search, setSearch] = useState("");
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [recording, setRecording] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; memberIds: string[] }>>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async (ids: string[]) => {
    const missing = [...new Set(ids)].filter(i => !profiles[i]);
    if (!missing.length) return;
    const { data } = await supabase.from("profiles")
      .select("id,pseudonym,display_name,avatar_url,staff_role").in("id", missing);
    if (data) setProfiles(p => ({ ...p, ...Object.fromEntries(data.map(d => [d.id, d as Profile])) }));
  };

  // Load all staff + clients for sidebars
  useEffect(() => {
    (async () => {
      const [{ data: staffRows }, { data: clientRows }] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "staff"),
        supabase.from("profiles").select("id,pseudonym,display_name,avatar_url,staff_role").limit(50),
      ]);
      const staffIds = new Set((staffRows ?? []).map(r => r.user_id as string));
      const all = (clientRows ?? []) as Profile[];
      setStaff(all.filter(p => staffIds.has(p.id)));
      setClients(all.filter(p => !staffIds.has(p.id)));
    })();
  }, []);

  // Load messages + subscribe (only the staff_chat_messages table exists; DMs are mocked locally)
  useEffect(() => {
    if (target.type !== "channel") { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("staff_chat_messages")
        .select("id,author_id,content,created_at").order("created_at", { ascending: true }).limit(200);
      if (data) {
        setMessages(data as Msg[]);
        loadProfiles((data as Msg[]).map(m => m.author_id));
      }
    })();
    const ch = supabase.channel(`chat-${target.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_chat_messages" }, p => {
        const m = p.new as Msg;
        setMessages(prev => [...prev, m]);
        loadProfiles([m.author_id]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, target.type]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const content = replyTo ? `↪ @${nameOf(replyTo.author_id)}: "${replyTo.content.slice(0, 60)}"\n${input.trim()}` : input.trim();
    setInput(""); setReplyTo(null);
    if (target.type === "channel") {
      const { error } = await supabase.from("staff_chat_messages").insert({ author_id: user.id, content });
      if (error) toast.error(error.message);
    } else {
      // DM: optimistic local-only message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), author_id: user.id, content, created_at: new Date().toISOString(),
      }]);
    }
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    if (!user) return;
    setReactions(prev => {
      const m = { ...(prev[msgId] || {}) };
      const arr = new Set(m[emoji] || []);
      arr.has(user.id) ? arr.delete(user.id) : arr.add(user.id);
      m[emoji] = [...arr];
      if (!m[emoji].length) delete m[emoji];
      return { ...prev, [msgId]: m };
    });
  };

  const nameOf = (id: string) => profiles[id]?.pseudonym || profiles[id]?.display_name || "Staff";
  const initialsOf = (id: string) => nameOf(id).slice(0, 2).toUpperCase();

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter(m => m.content.toLowerCase().includes(q) || nameOf(m.author_id).toLowerCase().includes(q));
  }, [messages, search, profiles]);

  // Group by day
  const grouped = useMemo(() => {
    const out: Array<{ kind: "divider"; label: string } | { kind: "msg"; msg: Msg; showAuthor: boolean }> = [];
    let lastDay = "";
    let lastAuthor = "";
    let lastTime = 0;
    filteredMessages.forEach(m => {
      const d = new Date(m.created_at);
      const dk = format(d, "yyyy-MM-dd");
      if (dk !== lastDay) { out.push({ kind: "divider", label: dateLabel(d) }); lastDay = dk; lastAuthor = ""; lastTime = 0; }
      const showAuthor = m.author_id !== lastAuthor || (d.getTime() - lastTime) > 5 * 60 * 1000;
      out.push({ kind: "msg", msg: m, showAuthor });
      lastAuthor = m.author_id; lastTime = d.getTime();
    });
    return out;
  }, [filteredMessages, profiles]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-[78vh] flex rounded-xl overflow-hidden border border-border/70 bg-card shadow-sm">

        {/* ===== Sidebar: channels + DMs ===== */}
        <aside className="w-64 shrink-0 border-r border-border/70 bg-muted/40 flex flex-col">
          <div className="p-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-md bg-gradient-to-br from-primary to-brand flex items-center justify-center text-background font-bold text-xs">A</div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">Avyron · Intern</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                  <Circle className="size-1.5 fill-current" /> online
                </p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-6">
              {/* Clienți — urcat sus */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Clienți</span>
                  <span className="text-[10px] text-muted-foreground">{clients.length}</span>
                </div>
                <div className="space-y-0.5">
                  {clients.slice(0, 20).map(c => {
                    const active = target.type === "dm" && target.id === c.id;
                    const name = c.display_name || c.pseudonym || "Client";
                    return (
                      <button key={c.id} onClick={() => setTarget({ type: "dm", id: c.id, name })}
                        className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition",
                          active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/70")}>
                        <Avatar className="size-7"><AvatarImage src={c.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="truncate">{name}</span>
                      </button>
                    );
                  })}
                  {clients.length === 0 && <p className="text-[11px] text-muted-foreground px-2">Niciun client momentan.</p>}
                </div>
              </div>

              {/* Camere — # înlocuit cu emoji sugestiv */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Camere</span>
                  <Plus className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                </div>
                <div className="space-y-0.5">
                  {STAFF_CHANNELS.map(c => {
                    const active = target.type === "channel" && target.id === c.id;
                    return (
                      <button key={c.id} onClick={() => setTarget({ type: "channel", id: c.id, name: c.name, emoji: c.emoji })}
                        className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition",
                          active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/70")}>
                        <span className="text-base leading-none shrink-0">{c.emoji}</span>
                        <span className="truncate">{c.name}</span>
                        {c.id === "general" && <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">live</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grupuri — conversații cu mai mulți membri staff */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Grupuri</span>
                  <button
                    onClick={() => { setInviteOpen(true); setNewGroupMembers([]); setNewGroupName(""); }}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                  >
                    <UserPlus className="size-3" /> Nou
                  </button>
                </div>
                <div className="space-y-0.5">
                  {groups.length === 0 && (
                    <p className="text-[11px] text-muted-foreground px-2">Nicio conversație de grup. Apasă <em>Nou</em> ca să inviți mai mulți colegi.</p>
                  )}
                  {groups.map(g => {
                    const active = target.type === "group" && target.id === g.id;
                    return (
                      <button key={g.id} onClick={() => setTarget({ type: "group", id: g.id, name: g.name, memberIds: g.memberIds })}
                        className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition",
                          active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/70")}>
                        <UsersRound className="size-4 shrink-0 opacity-70" />
                        <span className="truncate">{g.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{g.memberIds.length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-2 border-t border-border/70 flex items-center gap-2">
            <Avatar className="size-7"><AvatarImage src={profiles[user?.id ?? ""]?.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">EU</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{nameOf(user?.id ?? "")}</p>
              <p className="text-[10px] text-muted-foreground">#{user?.id.slice(0, 6)}</p>
            </div>
            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="size-7"><Inbox className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Mesaje (WhatsApp/Telegram – în curând)</TooltipContent></Tooltip>
          </div>
        </aside>

        {/* ===== Main chat ===== */}
        <section className="flex-1 min-w-0 flex flex-col bg-background">
          {/* Top bar */}
          <div className="h-14 border-b border-border/70 flex items-center px-4 gap-3">
            {target.type === "channel" ? (
              <span className="text-xl leading-none">{(target as any).emoji ?? STAFF_CHANNELS.find(c => c.id === target.id)?.emoji ?? "💬"}</span>
            ) : target.type === "group" ? (
              <UsersRound className="size-5 text-muted-foreground" />
            ) : (
              <AtSign className="size-5 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{target.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {target.type === "channel"
                  ? (STAFF_CHANNELS.find(c => c.id === target.id)?.topic ?? "")
                  : target.type === "group"
                    ? `${(target as any).memberIds?.length ?? 0} membri · conversație de grup`
                    : "Conversație directă"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="relative hidden md:block">
                <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Caută…" className="h-8 pl-7 w-44 text-xs" />
              </div>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5"
                  onClick={() => { setInviteOpen(true); setNewGroupMembers(target.type === "group" ? (target as any).memberIds : []); setNewGroupName(target.type === "group" ? target.name : ""); }}>
                  <UserPlus className="size-3.5" /> <span className="hidden sm:inline text-xs">Invită</span>
                </Button>
              </TooltipTrigger><TooltipContent>Invită colegi într-o conversație de grup</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="size-8"><Pin className="size-4" /></Button></TooltipTrigger><TooltipContent>Mesaje fixate</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="size-8"><Bell className="size-4" /></Button></TooltipTrigger><TooltipContent>Notificări</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setShowMembers(s => !s)}>
                  <Users2 className="size-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Lista membri</TooltipContent></Tooltip>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
              {grouped.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">Niciun mesaj încă. Începe conversația!</p>
              )}
              {grouped.map((row, i) => {
                if (row.kind === "divider") {
                  return (
                    <div key={`d-${i}`} className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{row.label}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  );
                }
                const m = row.msg;
                const meName = nameOf(m.author_id);
                const meta = STAFF_ROLE_META[profiles[m.author_id]?.staff_role || ""];
                const mine = m.author_id === user?.id;
                const rxs = reactions[m.id] || {};
                return (
                  <div key={m.id} className={cn("group relative flex gap-3 px-2 py-0.5 rounded-md hover:bg-muted/50",
                    row.showAuthor ? "mt-3" : "mt-0")}>
                    <div className="w-10 shrink-0">
                      {row.showAuthor ? (
                        <Avatar className="size-10"><AvatarImage src={profiles[m.author_id]?.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{initialsOf(m.author_id)}</AvatarFallback></Avatar>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground block text-right pr-1 pt-1">
                          {format(new Date(m.created_at), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {row.showAuthor && (
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm">{meName}</span>
                          {meta && <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider", meta.color)}>
                            <meta.icon className="size-2.5" />{meta.label}
                          </span>}
                          <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "d MMM HH:mm")}</span>
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                      {Object.keys(rxs).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(rxs).map(([e, users]) => (
                            <button key={e} onClick={() => toggleReaction(m.id, e)}
                              className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition",
                                users.includes(user?.id || "") ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted border-border hover:border-foreground/30")}>
                              <span>{e}</span><span className="text-[10px]">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {mine && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCheck className="size-3 text-cyan-500" />
                          <span className="text-[10px] text-muted-foreground">Trimis</span>
                        </div>
                      )}
                    </div>

                    {/* Hover actions */}
                    <div className="absolute -top-3 right-4 hidden group-hover:flex items-center gap-0.5 rounded-md border border-border bg-card shadow-sm">
                      <Popover>
                        <PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-7"><Smile className="size-3.5" /></Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-1.5 flex gap-1">
                          {QUICK_REACTIONS.map(e => (
                            <button key={e} onClick={() => toggleReaction(m.id, e)} className="size-7 rounded hover:bg-muted text-lg leading-none">{e}</button>
                          ))}
                        </PopoverContent>
                      </Popover>
                      <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="size-7" onClick={() => setReplyTo(m)}><Reply className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Răspunde</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="size-7"><Pin className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Fixează</TooltipContent></Tooltip>
                      <Button size="icon" variant="ghost" className="size-7"><MoreHorizontal className="size-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {/* Reply preview */}
          {replyTo && (
            <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 border-l-2 border-primary">
              <Reply className="size-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Răspuns către</span>
              <span className="text-xs font-medium">{nameOf(replyTo.author_id)}</span>
              <span className="text-xs text-muted-foreground truncate flex-1">— {replyTo.content.slice(0, 80)}</span>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
            </div>
          )}

          {/* Composer */}
          <div className="p-3">
            <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-muted/30 focus-within:border-primary/60 px-2 py-1.5">
              <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="size-9" onClick={() => toast.info("Atașamente — în curând (drop & paste fișiere)")}><Paperclip className="size-4" /></Button></TooltipTrigger><TooltipContent>Atașament</TooltipContent></Tooltip>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={target.type === "channel" ? `Mesaj în #${target.name}` : `Mesaj direct către @${target.name}`}
                className="border-0 bg-transparent focus-visible:ring-0 shadow-none h-9"
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              />
              <Popover>
                <PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-9"><Smile className="size-4" /></Button></PopoverTrigger>
                <PopoverContent className="w-auto p-1.5 flex gap-1">
                  {QUICK_REACTIONS.map(e => (
                    <button key={e} onClick={() => setInput(s => s + e)} className="size-7 rounded hover:bg-muted text-lg leading-none">{e}</button>
                  ))}
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className={cn("size-9", recording && "text-red-500 animate-pulse")}
                    onClick={() => { setRecording(r => !r); toast.info(recording ? "Înregistrare oprită" : "Înregistrare voce (mock)"); }}>
                    <Mic className="size-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Mesaj vocal (în curând)</TooltipContent>
              </Tooltip>
              <Button onClick={send} disabled={!input.trim()} size="icon" className="size-9 rounded-full">
                <Send className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-1.5 px-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="size-3" /> Enter pentru trimitere · Shift+Enter rând nou</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />WhatsApp · Telegram — în curând</span>
              </span>
            </div>
          </div>
        </section>

        {/* ===== Members list ===== */}
        {showMembers && (
          <aside className="w-60 shrink-0 border-l border-border/70 bg-muted/40 hidden lg:flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Staff section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="size-3.5 text-primary" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Staff — {staff.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {staff.map(s => {
                      const name = s.pseudonym || s.display_name || "Staff";
                      const meta = STAFF_ROLE_META[s.staff_role || "dev"];
                      const Icon = meta?.icon || Code2;
                      return (
                        <div key={s.id} className="relative rounded-lg overflow-hidden">
                          <div className={cn("absolute inset-0 bg-gradient-to-r", meta?.gradient || "from-muted to-transparent")} />
                          <div className="relative flex items-center gap-2 p-2">
                            <div className="relative">
                              <Avatar className="size-8 ring-2 ring-background"><AvatarImage src={s.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                              <Circle className="absolute -bottom-0.5 -right-0.5 size-2.5 fill-emerald-500 text-emerald-500 ring-2 ring-background rounded-full" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate flex items-center gap-1">
                                {name} <Icon className={cn("size-3", meta?.color)} />
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">{meta?.label || "Staff"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Membri grup activ (dacă e cazul) */}
                {target.type === "group" && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UsersRound className="size-3.5 text-primary" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        În acest grup — {(target as any).memberIds?.length ?? 0}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full gap-1.5 h-8"
                      onClick={() => { setInviteOpen(true); setNewGroupMembers((target as any).memberIds); setNewGroupName(target.name); }}>
                      <UserPlus className="size-3.5" /> <span className="text-xs">Invită alți colegi</span>
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>

      {/* ===== Invite / create-group dialog ===== */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setInviteOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              <h3 className="font-semibold">{target.type === "group" ? "Invită colegi" : "Conversație de grup nouă"}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nume grup</label>
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="ex: Lansare site Plase Ieftine" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Selectează membri staff</label>
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {staff.filter(s => s.id !== user?.id).map(s => {
                  const name = s.pseudonym || s.display_name || "Staff";
                  const meta = STAFF_ROLE_META[s.staff_role || "dev"];
                  const checked = newGroupMembers.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" checked={checked}
                        onChange={() => setNewGroupMembers(m => checked ? m.filter(i => i !== s.id) : [...m, s.id])}
                        className="size-4 accent-primary" />
                      <Avatar className="size-7"><AvatarImage src={s.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <span className="text-sm flex-1 truncate">{name}</span>
                      {meta && <span className={cn("text-[10px] font-mono uppercase", meta.color)}>{meta.label}</span>}
                    </label>
                  );
                })}
                {staff.filter(s => s.id !== user?.id).length === 0 && (
                  <p className="text-xs text-muted-foreground p-3 text-center">Niciun coleg disponibil.</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>Anulează</Button>
              <Button onClick={() => {
                if (!newGroupName.trim() || newGroupMembers.length === 0) { toast.error("Adaugă nume și cel puțin un membru."); return; }
                if (target.type === "group") {
                  setGroups(gs => gs.map(g => g.id === target.id ? { ...g, name: newGroupName.trim(), memberIds: newGroupMembers } : g));
                  setTarget({ type: "group", id: target.id, name: newGroupName.trim(), memberIds: newGroupMembers });
                  toast.success("Grup actualizat");
                } else {
                  const id = crypto.randomUUID();
                  const g = { id, name: newGroupName.trim(), memberIds: newGroupMembers };
                  setGroups(gs => [...gs, g]);
                  setTarget({ type: "group", id, name: g.name, memberIds: g.memberIds });
                  toast.success("Grup creat");
                }
                setInviteOpen(false);
              }}>
                {target.type === "group" ? "Salvează" : "Creează grup"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};
