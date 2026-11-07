import { useEffect, useRef, useState } from "react";
import { Sparkles, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { logoOperationsApi, type LogoOverview } from "@/lib/logoOperationsApi";
import { skillsApi } from "@/lib/skillsApi";
import { blankBrief, RUN_STATES, type SkillRun } from "@/shared/skills/model";
const cls =
  "mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-white/[.035] px-3 py-2 text-base outline-none focus:border-violet-400 sm:text-sm";
export default function LogoProductControls({
  data,
  onSaved,
}: {
  data: LogoOverview;
  onSaved: () => void;
}) {
  const [priceOpen, setPriceOpen] = useState(false),
    [aiOpen, setAiOpen] = useState(false),
    [price, setPrice] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState({
      business: "",
      activity: "",
      preferences: "",
    }),
    [run, setRun] = useState<SkillRun | null>(null),
    [runId, setRunId] = useState(""),
    [error, setError] = useState("");
  const runStatus = run?.status;
  const key = useRef(crypto.randomUUID()),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!aiOpen || !runId) return;
    let active = true;
    const controller = new AbortController();
    const read = async () => {
      try {
        const r = await skillsApi.run("logo-engine", runId, controller.signal);
        if (active) setRun(r.run);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Rezultatul nu poate fi citit.",
          );
      }
    };
    void read();
    const interval = setInterval(() => {
      if (
        !document.hidden &&
        (!runStatus || ["queued", "preparing"].includes(runStatus))
      )
        void read();
    }, 3000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [aiOpen, runId, runStatus]);
  const savePrice = async () => {
    if (!data.product || busy || !confirmed) return;
    const value = Number(price.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Introdu un preț pozitiv în RON.");
      return;
    }
    setBusy(true);
    try {
      await logoOperationsApi.savePrice(
        Math.round(value * 100),
        data.product.updated_at,
      );
      setPriceOpen(false);
      onSaved();
      toast.success(
        "Preț salvat în catalog și checkout. Reverifică activarea comercială.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prețul nu a fost salvat.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const prepare = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await skillsApi.create(
        "logo-engine",
        {
          ...blankBrief(),
          ...brief,
          objective:
            "Propune trei direcții de brief Logo Studio 3D și o listă scurtă de verificări pentru pregătire, aprobare și livrare. Nu genera prețuri, contracte sau logo final.",
        },
        "ai",
        key.current,
        { freeOnly: true },
      );
      setRunId(result.id);
      key.current = crypto.randomUUID();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pregătirea AI nu a pornit.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  if (!data.canManageCatalog) return null;
  return (
    <section
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/[.05] p-3"
      aria-label="Configurare Logo Studio 3D"
    >
      <Button
        variant="outline"
        onClick={() => {
          setPrice(String((data.product?.price_ron_cents || 0) / 100));
          setConfirmed(false);
          setPriceOpen(true);
        }}
        disabled={!data.product}
      >
        <Settings2 className="mr-2 size-4" />
        Configurează prețul
      </Button>
      <Button variant="outline" onClick={() => setAiOpen(true)}>
        <Sparkles className="mr-2 size-4" />
        Asistență flux · AI Free
      </Button>
      <p className="text-xs text-slate-400">
        Prețul produsului 3D este separat de serviciul profesional și livrarea
        asistată 2D.
      </p>
      <Dialog
        open={priceOpen}
        onOpenChange={(v) => {
          if (!busy) setPriceOpen(v);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/15 bg-[#10162a] text-slate-100">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle>Preț Logo Studio 3D</DialogTitle>
            <DialogDescription>
              Modifică prețul acestui produs în catalog. Comenzile și plățile
              anterioare își păstrează valorile. Activarea vânzării necesită
              reverificare.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm">
            Preț RON
            <input
              aria-label="Preț Logo 3D RON"
              className={cls}
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Ajustare preț">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPrice(
                  String(
                    Math.max(
                      0.01,
                      Math.round(Number(price.replace(",", ".")) * 0.9 * 100) /
                        100,
                    ),
                  ),
                );
                setConfirmed(false);
              }}
            >
              −10%
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPrice(
                  String(
                    Math.round(Number(price.replace(",", ".")) * 1.1 * 100) /
                      100,
                  ),
                );
                setConfirmed(false);
              }}
            >
              +10%
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPrice(String((data.product?.price_ron_cents || 0) / 100));
                setConfirmed(false);
              }}
            >
              Preț curent
            </Button>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Confirm noul preț pentru produsul Logo Studio 3D.
          </label>
          <Button
            disabled={!confirmed || busy}
            onClick={() => void savePrice()}
          >
            {busy ? "Se salvează…" : "Salvează prețul"}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={aiOpen}
        onOpenChange={(v) => {
          if (!busy) setAiOpen(v);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/15 bg-[#10162a] text-slate-100 sm:max-w-2xl">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle>Asistență flux Logo · Workers AI Free</DialogTitle>
            <DialogDescription>
              Pregătește o ciornă de brief și verificări în Logo Engine. Modelul
              este ales din registrul Free existent; cotele și oprirea umană se
              păstrează. Nu aprobă, nu publică și nu schimbă prețuri.
            </DialogDescription>
          </DialogHeader>
          <p className="break-words text-xs text-slate-400">
            Modele Free configurate:{" "}
            {data.models?.map((m) => m.model_id.split("/").pop()).join(" · ") ||
              "Niciun model disponibil"}
          </p>
          {!runId ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void prepare();
              }}
            >
              <label className="block text-xs">
                Brand / afacere
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  className={cls}
                  value={brief.business}
                  onChange={(e) => {
                    setBrief({ ...brief, business: e.target.value });
                    key.current = crypto.randomUUID();
                  }}
                />
              </label>
              <label className="block text-xs">
                Activitate
                <input
                  required
                  minLength={2}
                  maxLength={300}
                  className={cls}
                  value={brief.activity}
                  onChange={(e) => {
                    setBrief({ ...brief, activity: e.target.value });
                    key.current = crypto.randomUUID();
                  }}
                />
              </label>
              <label className="block text-xs">
                Preferințe și flux dorit
                <textarea
                  maxLength={1200}
                  rows={3}
                  className={cls}
                  value={brief.preferences}
                  onChange={(e) => {
                    setBrief({ ...brief, preferences: e.target.value });
                    key.current = crypto.randomUUID();
                  }}
                />
              </label>
              <Button type="submit" disabled={busy || !data.models?.length}>
                {busy ? "Se pregătește…" : "Pregătește ciorna cu AI Free"}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <p role="status" className="text-sm">
                {run ? RUN_STATES[run.status] : "Se citește starea…"}
                {run?.model ? ` · ${run.model.split("/").pop()}` : ""}
              </p>
              {run?.error_code && (
                <p
                  role="alert"
                  className="rounded-xl border border-amber-400/20 p-3 text-sm text-amber-200"
                >
                  Pregătirea este blocată: {run.error_code}. Verifică resursele
                  și cota AI din Avy Skills.
                </p>
              )}
              {run?.output_md && (
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 p-3 font-sans text-sm">
                  {run.output_md}
                </pre>
              )}
              {run &&
                ["ready", "approved", "archived"].includes(run.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void skillsApi
                        .download(
                          `/api/skills/logo-engine/runs/${run.id}/export?format=md`,
                          "brief-logo.md",
                        )
                        .catch((e) => toast.error(String(e.message)))
                    }
                  >
                    Descarcă brief
                  </Button>
                )}
              <Button
                size="sm"
                variant="outline"
                disabled={
                  busy ||
                  (!!run && ["queued", "preparing"].includes(run.status))
                }
                onClick={() => {
                  setRunId("");
                  setRun(null);
                  setError("");
                  key.current = crypto.randomUUID();
                }}
              >
                Brief nou
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-amber-200">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
