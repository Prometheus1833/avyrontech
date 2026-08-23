import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type ProfileLite = { id: string; display_name: string | null };
type Sub = {
  id: string;
  user_id: string;
  product_name: string;
  description: string | null;
  status: "active" | "suspended" | "cancelled" | "pending";
  price_cents: number;
  currency: string;
  billing_cycle: "monthly" | "quarterly" | "yearly" | "one_time";
};

const statusVariant: Record<Sub["status"], "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", pending: "secondary", suspended: "outline", cancelled: "destructive",
};

export function StaffSubscriptionsTab() {
  const { t } = useLang();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    user_id: "",
    product_name: "",
    description: "",
    price_cents: 0,
    currency: "RON",
    billing_cycle: "monthly" as Sub["billing_cycle"],
    status: "pending" as Sub["status"],
  });

  const load = async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      supabase.from("subscriptions").select("id,user_id,product_name,description,status,price_cents,currency,billing_cycle").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name"),
    ]);
    setSubs((s.data as Sub[]) ?? []);
    const map: Record<string, string> = {};
    ((p.data as ProfileLite[]) ?? []).forEach((x) => (map[x.id] = x.display_name ?? "—"));
    setProfiles(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.user_id || !form.product_name.trim()) return toast.error("Completează utilizatorul și produsul");
    const { error } = await supabase.from("subscriptions").insert({
      user_id: form.user_id,
      product_name: form.product_name.trim(),
      description: form.description.trim() || null,
      price_cents: Math.round(form.price_cents * 100),
      currency: form.currency,
      billing_cycle: form.billing_cycle,
      status: form.status,
      started_at: form.status === "active" ? new Date().toISOString() : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Abonament creat");
    setOpen(false);
    setForm({ user_id: "", product_name: "", description: "", price_cents: 0, currency: "RON", billing_cycle: "monthly", status: "pending" });
    load();
  };

  const updateStatus = async (id: string, status: Sub["status"]) => {
    const patch: { status: Sub["status"]; cancelled_at?: string; started_at?: string } = { status };
    if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
    if (status === "active") patch.started_at = new Date().toISOString();
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const profileOptions = Object.entries(profiles);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold">{t.auth.dash.staff.subsTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.auth.dash.staff.subsSub}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="size-4 mr-2" />{t.auth.dash.staff.createSub}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.auth.dash.staff.createSub}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t.auth.dash.staff.forUser}</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t.auth.dash.staff.selectUser} /></SelectTrigger>
                  <SelectContent>
                    {profileOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.auth.dash.subs.product}</Label>
                <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Descriere</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.auth.dash.subs.price}</Label>
                  <Input type="number" min={0} step="0.01" value={form.price_cents}
                    onChange={(e) => setForm({ ...form, price_cents: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Monedă</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RON">RON</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.auth.dash.subs.cycle}</Label>
                  <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v as Sub["billing_cycle"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["monthly", "quarterly", "yearly", "one_time"] as const).map((c) => (
                        <SelectItem key={c} value={c}>{t.auth.dash.subs.cycles[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t.auth.dash.common.status}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Sub["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pending", "active", "suspended", "cancelled"] as const).map((s) => (
                      <SelectItem key={s} value={s}>{t.auth.dash.subs.statuses[s]}</SelectItem>
                    ))}
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
      ) : subs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.common.empty}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Client</th>
                    <th className="text-left px-4 py-2.5 font-medium">{t.auth.dash.subs.product}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{t.auth.dash.subs.price}</th>
                    <th className="text-center px-4 py-2.5 font-medium">{t.auth.dash.common.status}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{t.auth.dash.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-3">{profiles[s.user_id] ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{s.product_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {(s.price_cents / 100).toFixed(2)} {s.currency} / {t.auth.dash.subs.cycles[s.billing_cycle]}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusVariant[s.status]}>{t.auth.dash.subs.statuses[s.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Select value={s.status} onValueChange={(v) => updateStatus(s.id, v as Sub["status"])}>
                          <SelectTrigger className="h-8 w-32 ml-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["pending", "active", "suspended", "cancelled"] as const).map((st) => (
                              <SelectItem key={st} value={st}>{t.auth.dash.subs.statuses[st]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
