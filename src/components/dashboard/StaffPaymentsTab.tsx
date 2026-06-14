import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; amount_cents: number; currency: string; status: string; paid_at: string | null; invoice_number: string };

export const StaffPaymentsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, amount_cents, currency, status, paid_at, invoice_number")
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(100);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const ron = (cents: number) => (cents / 100).toLocaleString("ro-RO", { maximumFractionDigits: 2 });
  const total = rows.reduce((s, r) => s + (r.amount_cents || 0), 0);
  const last30 = rows.filter((r) => r.paid_at && Date.now() - new Date(r.paid_at).getTime() < 30 * 86400000);
  const last30Sum = last30.reduce((s, r) => s + (r.amount_cents || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="size-3.5" /> Total încasat</div>
          <div className="mt-1 font-display text-2xl font-bold">{ron(total)} RON</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="size-3.5" /> Ultimele 30 zile</div>
          <div className="mt-1 font-display text-2xl font-bold">{ron(last30Sum)} RON</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" /> Plăți (#)</div>
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
                  <div className="font-medium font-mono text-xs">{r.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">{r.paid_at ? new Date(r.paid_at).toLocaleDateString("ro-RO") : "—"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{ron(r.amount_cents)} {r.currency}</span>
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
