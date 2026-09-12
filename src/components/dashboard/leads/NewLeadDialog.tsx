import { useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { leadsApi, type LeadChannel, type NewLeadInput } from "@/lib/leadsApi";

const field = "w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const emptyDraft: NewLeadInput = { source: "manual", preferredChannel: "phone", urgent: false };

export function NewLeadDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: string) => void;
}) {
  const [draft, setDraft] = useState<NewLeadInput>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<NewLeadInput>) => setDraft((current) => ({ ...current, ...patch }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name?.trim() && !draft.business?.trim()) {
      toast.error("Completează numele persoanei sau al afacerii.");
      return;
    }
    setSaving(true);
    try {
      const result = await leadsApi.create(draft);
      toast.success("Lead-ul a fost adăugat și alocat contului tău.");
      setDraft(emptyDraft);
      onOpenChange(false);
      onCreated(result.id);
    } catch (error) {
      toast.error(error instanceof Error && error.message === "duplicate_lead"
        ? "Există deja un lead activ cu acest contact."
        : "Lead-ul nu a putut fi creat. Verifică datele și sesiunea MFA.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead nou</DialogTitle>
          <DialogDescription>Înregistrează numai datele necesare. Contactarea rămâne o acțiune umană și se notează separat în istoric.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Persoană<input className={field} value={draft.name ?? ""} onChange={(e) => set({ name: e.target.value })} maxLength={160} /></label>
            <label className="text-sm">Afacere<input className={field} value={draft.business ?? ""} onChange={(e) => set({ business: e.target.value })} maxLength={200} /></label>
            <label className="text-sm">Email<input type="email" className={field} value={draft.email ?? ""} onChange={(e) => set({ email: e.target.value })} maxLength={254} /></label>
            <label className="text-sm">Telefon / WhatsApp<input type="tel" className={field} value={draft.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} maxLength={40} /></label>
            <label className="text-sm">Sursă
              <select className={field} value={draft.source} onChange={(e) => set({ source: e.target.value })}>
                <option value="manual">Individual / manual</option><option value="necesit">Necesit</option>
                <option value="mestero">Mestero</option><option value="social">Rețele sociale</option>
                <option value="referral">Recomandare</option><option value="website">Website Avyron</option>
              </select>
            </label>
            <label className="text-sm">Produs(e)<input className={field} value={draft.product ?? ""} onChange={(e) => set({ product: e.target.value })} placeholder="Site prezentare, AI Bot…" maxLength={300} /></label>
            <label className="text-sm">Website<input type="url" className={field} value={draft.website ?? ""} onChange={(e) => set({ website: e.target.value })} placeholder="https://" /></label>
            <label className="text-sm">Canal preferat
              <select className={field} value={draft.preferredChannel} onChange={(e) => set({ preferredChannel: e.target.value as LeadChannel })}>
                <option value="phone">Telefon</option><option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option><option value="sms">SMS</option><option value="social">Social</option>
              </select>
            </label>
            <label className="text-sm">Follow-up
              <input type="datetime-local" className={field} onChange={(e) => set({ nextFollowUpAt: e.target.value ? new Date(e.target.value).getTime() : null })} />
            </label>
            <label className="text-sm">Estimare RON<input type="number" min={0} step={1} className={field} value={draft.estimateRon ?? ""} onChange={(e) => set({ estimateRon: e.target.value ? Number(e.target.value) : null })} /></label>
          </div>
          <label className="block text-sm">Context și nevoi<textarea className={`${field} mt-1 min-h-24`} value={draft.message ?? ""} onChange={(e) => set({ message: e.target.value })} maxLength={4000} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.urgent === true} onChange={(e) => set({ urgent: e.target.checked })} /> Reminder urgent</label>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? <LoaderCircle className="animate-spin" /> : <Plus />} Adaugă lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
