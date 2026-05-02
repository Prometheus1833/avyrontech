import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Msg = { id: string; author_id: string; content: string; created_at: string };
type Profile = { id: string; pseudonym: string | null; display_name: string | null; avatar_url: string | null };

export const StaffChatTab = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async (ids: string[]) => {
    const missing = ids.filter(i => !profiles[i]);
    if (!missing.length) return;
    const { data } = await supabase.from("profiles").select("id,pseudonym,display_name,avatar_url").in("id", missing);
    if (data) setProfiles(p => ({ ...p, ...Object.fromEntries(data.map(d => [d.id, d as Profile])) }));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("staff_chat_messages").select("*").order("created_at", { ascending: true }).limit(200);
      if (data) {
        setMessages(data as Msg[]);
        loadProfiles([...new Set((data as Msg[]).map(m => m.author_id))]);
      }
      setLoading(false);
    })();

    const ch = supabase.channel("staff-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_chat_messages" }, payload => {
        const m = payload.new as Msg;
        setMessages(prev => [...prev, m]);
        loadProfiles([m.author_id]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    const { error } = await supabase.from("staff_chat_messages").insert({ author_id: user.id, content });
    if (error) toast.error(error.message);
  };

  const nameOf = (id: string) => profiles[id]?.pseudonym || profiles[id]?.display_name || "Staff";

  return (
    <Card className="h-[70vh] flex flex-col">
      <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
        {loading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> :
          messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Niciun mesaj. Începe conversația!</p> :
          messages.map(m => {
            const mine = m.author_id === user?.id;
            const name = nameOf(m.author_id);
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar className="size-8 shrink-0"><AvatarFallback className="text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 px-1">{name} • {format(new Date(m.created_at), "HH:mm")}</p>
                </div>
              </div>
            );
          })
        }
        <div ref={endRef} />
      </CardContent>
      <div className="p-3 border-t flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Scrie un mesaj…" onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} />
        <Button onClick={send} disabled={!input.trim()}><Send className="size-4" /></Button>
      </div>
    </Card>
  );
};
