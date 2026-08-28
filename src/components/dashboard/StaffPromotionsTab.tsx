import { useCallback, useEffect, useState } from "react";
import { BadgePercent, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth } from "@/lib/cfAuth";

const PROMOTION_OWNER_EMAIL = "prometheus@avyron.ro";

type Promotion = {
  id: string;
  code: string;
  label: string;
  discount_percent: number;
  active: 0 | 1;
  registration_required: 0 | 1;
  per_user_limit: number | null;
  max_redemptions: number | null;
  starts_at: number | null;
  expires_at: number | null;
  redemptions: number;
  discount_total_cents: number;
};

const initialForm = {
  code: "",
  label: "",
  discountPercent: "10",
  perUserLimit: "1",
  maxRedemptions: "",
  registrationRequired: true,
};

export function StaffPromotionsTab() {
  const { user } = useAuth();
  const isOwner = user?.email?.trim().toLowerCase() === PROMOTION_OWNER_EMAIL;
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const response = await cfAuth.request<{ data: Promotion[] }>("/api/promotions/admin");
      setItems(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promoțiile nu au putut fi încărcate");
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => { void load(); }, [load]);

  if (!isOwner) return null;

  const createPromotion = async () => {
    setSaving(true);
    try {
      await cfAuth.request("/api/promotions/admin", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          label: form.label,
          discountPercent: Number(form.discountPercent),
          perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
          registrationRequired: form.registrationRequired,
        }),
      });
      toast.success("Promoția a fost creată");
      setForm(initialForm);
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promoția nu a putut fi creată");
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (promotion: Promotion, active: boolean) => {
    setItems((current) => current.map((item) => item.id === promotion.id ? { ...item, active: active ? 1 : 0 } : item));
    try {
      await cfAuth.request(`/api/promotions/admin/${promotion.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      toast.success(active ? "Promoție activată" : "Promoție oprită");
    } catch (error) {
      setItems((current) => current.map((item) => item.id === promotion.id ? promotion : item));
      toast.error(error instanceof Error ? error.message : "Starea nu a putut fi actualizată");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2"><BadgePercent className="size-6" /> Promoții</h2>
          <p className="text-sm text-muted-foreground">Coduri server-side, limite de utilizare și impact financiar. Acces exclusiv contului desemnat.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2 rounded-full"><Plus className="size-4" /> Promoție nouă</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Adaugă un cod promoțional</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="promotion-code">Cod</Label><Input id="promotion-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/\s+/g, "") })} maxLength={32} className="font-mono uppercase" placeholder="EX: AVYRON20" /></div>
              <div className="space-y-1.5"><Label htmlFor="promotion-percent">Reducere (%)</Label><Input id="promotion-percent" type="number" min={1} max={100} value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="promotion-label">Denumire internă</Label><Input id="promotion-label" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} maxLength={120} placeholder="Campanie parteneri" /></div>
              <div className="space-y-1.5"><Label htmlFor="promotion-user-limit">Utilizări / cont</Label><Input id="promotion-user-limit" type="number" min={1} max={100} value={form.perUserLimit} onChange={(event) => setForm({ ...form, perUserLimit: event.target.value })} placeholder="Nelimitat" /></div>
              <div className="space-y-1.5"><Label htmlFor="promotion-global-limit">Limită totală</Label><Input id="promotion-global-limit" type="number" min={1} max={1000000} value={form.maxRedemptions} onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })} placeholder="Nelimitat" /></div>
              <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border p-3">
                <div><Label htmlFor="promotion-registration">Necesită cont verificat</Label><p className="text-xs text-muted-foreground">Codul poate fi validat numai după autentificare.</p></div>
                <Switch id="promotion-registration" checked={form.registrationRequired} onCheckedChange={(checked) => setForm({ ...form, registrationRequired: checked })} />
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button><Button onClick={createPromotion} disabled={saving}>{saving ? "Se salvează..." : "Creează promoția"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-3 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> API-ul verifică identitatea, prețurile, limitele și codul la fiecare comandă; dezactivarea păstrează istoricul.</div>

      {loading ? <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((promotion) => (
            <Card key={promotion.id} className={!promotion.active ? "opacity-65" : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><CardTitle className="font-mono text-lg truncate">{promotion.code}</CardTitle><p className="text-xs text-muted-foreground truncate">{promotion.label}</p></div>
                  <Badge variant={promotion.active ? "default" : "secondary"}>{promotion.discount_percent}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2"><div className="font-semibold tabular-nums">{promotion.redemptions}</div><div className="text-[10px] text-muted-foreground">utilizări</div></div>
                  <div className="rounded-lg bg-muted/50 p-2"><div className="font-semibold tabular-nums">{promotion.per_user_limit ?? "∞"}</div><div className="text-[10px] text-muted-foreground">per cont</div></div>
                  <div className="rounded-lg bg-muted/50 p-2"><div className="font-semibold tabular-nums">{(promotion.discount_total_cents / 100).toFixed(0)}</div><div className="text-[10px] text-muted-foreground">RON redus</div></div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-3"><span className="text-sm">{promotion.active ? "Activă" : "Oprită"}</span><Switch aria-label={`Activează ${promotion.code}`} checked={Boolean(promotion.active)} onCheckedChange={(checked) => void setActive(promotion, checked)} /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
