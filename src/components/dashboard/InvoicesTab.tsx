import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Receipt } from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string;
  amount_cents: number;
  currency: string;
  status: "paid" | "pending" | "overdue" | "cancelled";
  issued_at: string;
  due_at: string | null;
  pdf_url: string | null;
};

const statusVariant: Record<Invoice["status"], "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
  cancelled: "outline",
};

export function InvoicesTab() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as Invoice[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const fmt = (cents: number, currency: string) =>
    new Intl.NumberFormat(lang === "ro" ? "ro-RO" : "en-US", { style: "currency", currency }).format(cents / 100);
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">{t.auth.dash.invoices.title}</h2>
        <p className="text-sm text-muted-foreground">{t.auth.dash.invoices.subtitle}</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.common.empty}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">{t.auth.dash.invoices.number}</th>
                    <th className="text-left px-4 py-2.5 font-medium">{t.auth.dash.invoices.issued}</th>
                    <th className="text-left px-4 py-2.5 font-medium">{t.auth.dash.invoices.due}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{t.auth.dash.invoices.amount}</th>
                    <th className="text-center px-4 py-2.5 font-medium">{t.auth.dash.common.status}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{t.auth.dash.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((inv) => (
                    <tr key={inv.id} className="border-t">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <Receipt className="size-4 text-muted-foreground" />
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.issued_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.due_at)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(inv.amount_cents, inv.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusVariant[inv.status]}>{t.auth.dash.invoices.statuses[inv.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.pdf_url ? (
                          <Button asChild size="sm" variant="ghost">
                            <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="size-4 mr-1" /> PDF
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
