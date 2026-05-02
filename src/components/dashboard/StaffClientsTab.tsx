import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  entity_type: string | null;
  company_name: string | null;
};

export function StaffClientsTab() {
  const { t } = useLang();
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("*").order("display_name").then(({ data }) => {
      setItems((data as Profile[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter((p) =>
      (p.display_name ?? "").toLowerCase().includes(k) ||
      (p.company_name ?? "").toLowerCase().includes(k)
    );
  }, [q, items]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">{t.auth.dash.staff.clientsTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.auth.dash.staff.clientsSub}</p>
      </div>

      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={t.auth.dash.staff.searchClients} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.common.empty}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.map((p) => {
              const initials = (p.display_name ?? "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={p.id} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                  <Avatar className="size-10">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.display_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.company_name ? `${p.company_name} • ` : ""}{p.entity_type ?? "individual"}
                    </div>
                  </div>
                  {p.phone && <div className="text-xs text-muted-foreground hidden sm:block">{p.phone}</div>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
