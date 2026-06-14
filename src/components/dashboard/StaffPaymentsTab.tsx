import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; amount: number; status: string; created_at: string; client_name: string | null };

export const StaffPaymentsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, amount, status, created_at, client_name")
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const last30 = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 30 * 86400000);
  const last30Sum = last30.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-3.5" /> Total încasat
          </div>
          <div className="mt-1 font-display text-2xl font-bold">{total.toLocaleString("ro-RO")} RON</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" /> Ultimele 30 zile
          </div>
          <div className="mt-1 font-display text-2xl font-bold">{last30Sum.toLocaleString("ro-RO")} RON</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Plăți (#)
          </div>
          <div className="mt-1 font-display text-2xl font-bold">{rows.length}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-display text-lg font-semibold mb-3">Încasări recente</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio încasare înregistrată.</p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{r.client_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ro-RO")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{Number(r.amount).toLocaleString("ro-RO")} RON</span>
                  <Badge variant="default">paid</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
