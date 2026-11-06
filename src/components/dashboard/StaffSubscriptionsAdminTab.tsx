import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import ClientSubscriptionsPanel from "./subscriptions/ClientSubscriptionsPanel";
import { toast } from "sonner";
import {
  adminOperationsApi,
  type AdminSubscription,
} from "@/lib/adminOperationsApi";
import { produseApi, type AdminPartnershipPlan } from "@/lib/produseApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const field =
  "w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/50";

export default function StaffSubscriptionsAdminTab() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AdminSubscription | null>(null);
  const [draft, setDraft] = useState({
    serviceName: "",
    price: "0",
    billingCycle: "monthly",
    status: "active",
    nextBillingDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [partnerships, setPartnerships] = useState<AdminPartnershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AdminPartnershipPlan | null>(
    null,
  );
  const [planDraft, setPlanDraft] = useState({
    name: "",
    ron: "",
    eur: "",
    components: "",
    sections: "",
    templates: "",
  });

  const load = useCallback(async () => {
    try {
      const catalog = await produseApi.admin.overview();
      setPartnerships(catalog.plans);
    } catch {
      toast.error("Abonamentele nu au putut fi încărcate.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const open = (item: AdminSubscription) => {
    if (item.maintenance_enabled) {
      navigate(
        `/profil?tab=client-maintenance&project=${encodeURIComponent(item.project_id)}`,
      );
      return;
    }
    setSelected(item);
    setDraft({
      serviceName: item.service_name,
      price: String(item.price),
      billingCycle: item.billing_cycle,
      status: item.status,
      nextBillingDate: new Date(item.next_billing_date)
        .toISOString()
        .slice(0, 10),
    });
  };
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminOperationsApi.updateSubscription(selected.id, {
        ...draft,
        price: Number(draft.price),
        nextBillingDate: new Date(
          `${draft.nextBillingDate}T12:00:00`,
        ).getTime(),
      });
      toast.success("Abonamentul și serviciul asociat au fost sincronizate.");
      setSelected(null);
      window.dispatchEvent(new Event("avyron:subscriptions-changed"));
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Abonamentul nu a putut fi salvat.",
      );
    } finally {
      setSaving(false);
    }
  };
  const openPlan = (plan: AdminPartnershipPlan) => {
    setSelectedPlan(plan);
    setPlanDraft({
      name: plan.name,
      ron: String(plan.price_ron_cents / 100),
      eur: String(plan.price_eur_cents / 100),
      components: String(plan.components_per_day),
      sections: String(plan.sections_per_day),
      templates: String(plan.templates_per_day),
    });
  };
  const savePlan = async () => {
    if (!selectedPlan) return;
    const numbers = [
      planDraft.ron,
      planDraft.eur,
      planDraft.components,
      planDraft.sections,
      planDraft.templates,
    ].map(Number);
    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
      toast.error("Valorile planului trebuie să fie numere pozitive.");
      return;
    }
    setSaving(true);
    try {
      const ok = await produseApi.admin.updatePlan(selectedPlan.id, {
        name: planDraft.name,
        priceRonCents: Math.round(numbers[0] * 100),
        priceEurCents: Math.round(numbers[1] * 100),
        componentsPerDay: Math.floor(numbers[2]),
        sectionsPerDay: Math.floor(numbers[3]),
        templatesPerDay: Math.floor(numbers[4]),
      });
      if (!ok) throw new Error("Planul nu a putut fi salvat.");
      toast.success("Parteneriatul a fost actualizat în catalogul D1.");
      setSelectedPlan(null);
      await load();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Planul nu a putut fi salvat.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4 text-slate-100">
      <ClientSubscriptionsPanel onConfigureSubscription={open} />
      <details className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Parteneriate Produse AVYRON · configurabile în D1
        </summary>
        <p className="mt-2 text-xs text-slate-400">
          Aceste limite și prețuri sunt citite de checkoutul parteneriatelor.
          Modifică-le cu atenție și verifică oferta publică după lansare.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {partnerships.map((plan) => (
            <article
              key={plan.id}
              className="rounded-xl border border-white/[0.07] bg-black/10 p-3"
            >
              <h3 className="text-sm font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                {(plan.price_ron_cents / 100).toLocaleString("ro-RO")} lei ·{" "}
                {plan.components_per_day} componente / {plan.sections_per_day}{" "}
                secțiuni / {plan.templates_per_day} template-uri pe zi
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => openPlan(plan)}
              >
                Configurează
              </Button>
            </article>
          ))}
        </div>
      </details>
      <Dialog
        open={selected !== null}
        onOpenChange={(openState) => {
          if (!openState && !saving) setSelected(null);
        }}
      >
        <DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-white">
              Configurează abonamentul
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selected?.company_name} · {selected?.project_name}. Anularea
              păstrează istoricul și oprește starea activă.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400 sm:col-span-2">
              Serviciu
              <input
                className={`${field} mt-1`}
                value={draft.serviceName}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, serviceName: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-400">
              Preț RON
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${field} mt-1`}
                value={draft.price}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, price: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-400">
              Ciclu
              <select
                className={`${field} mt-1`}
                value={draft.billingCycle}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, billingCycle: e.target.value }))
                }
              >
                <option value="monthly">Lunar</option>
                <option value="yearly">Anual</option>
                <option value="one_time">Unică</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Stare
              <select
                className={`${field} mt-1`}
                value={draft.status}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, status: e.target.value }))
                }
              >
                <option value="active">Activ</option>
                <option value="paused">În pauză</option>
                <option value="cancelled">Anulat</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Următoarea facturare
              <input
                type="date"
                className={`${field} mt-1`}
                value={draft.nextBillingDate}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, nextBillingDate: e.target.value }))
                }
              />
            </label>
          </div>
          {selected && (
            <a
              className="mt-3 inline-flex min-h-10 items-center text-sm text-violet-300 underline"
              href={`/profil?tab=documents&subscription=${encodeURIComponent(selected.id)}`}
            >
              Documentele abonamentului
            </a>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSelected(null)}
              disabled={saving}
            >
              Închide
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Se salvează…" : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={selectedPlan !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setSelectedPlan(null);
        }}
      >
        <DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              Parteneriat · {selectedPlan?.id}
            </DialogTitle>
            <DialogDescription>
              Prețuri și limite utilizate de catalogul D1 și de checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400 sm:col-span-2">
              Nume
              <input
                className={field}
                value={planDraft.name}
                onChange={(e) =>
                  setPlanDraft({ ...planDraft, name: e.target.value })
                }
              />
            </label>
            {[
              ["Preț RON", "ron"],
              ["Preț EUR", "eur"],
              ["Componente/zi", "components"],
              ["Secțiuni/zi", "sections"],
              ["Template-uri/zi", "templates"],
            ].map(([label, key]) => (
              <label key={key} className="text-xs text-slate-400">
                {label}
                <input
                  className={field}
                  type="number"
                  min="0"
                  step={key === "ron" || key === "eur" ? "0.01" : "1"}
                  value={planDraft[key as keyof typeof planDraft]}
                  onChange={(e) =>
                    setPlanDraft({ ...planDraft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => setSelectedPlan(null)}
            >
              Anulează
            </Button>
            <Button
              disabled={saving || !planDraft.name.trim()}
              onClick={() => void savePlan()}
            >
              {saving ? "Se salvează…" : "Salvează planul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
