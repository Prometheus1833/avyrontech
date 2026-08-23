import { useEffect, useState } from "react";
import { Cookie, Settings2, Check, X } from "lucide-react";
import { updateConsent } from "@/lib/analytics";

type Prefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "avyron-cookie-consent-v1";

const CookieBanner = () => {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ necessary: true, analytics: false, marketing: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Prefs & { ts?: number };
        updateConsent(parsed.analytics);
      } else {
        updateConsent(false);
      }
      if (!saved) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      updateConsent(false);
      setOpen(true);
    }
  }, []);

  const save = (p: Prefs) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...p, ts: Date.now() })); } catch {}
    updateConsent(p.analytics);
    setOpen(false);
  };

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () => save({ necessary: true, analytics: false, marketing: false });
  const saveCustom = () => save(prefs);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Setări cookies"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0a0612]/95 backdrop-blur-xl text-white shadow-[0_20px_60px_-20px_rgba(168,85,247,0.5)] overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400" />

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="shrink-0 size-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 grid place-items-center">
              <Cookie className="size-4 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-semibold text-sm sm:text-base text-white">
                Folosim cookies
              </h2>
              <p className="mt-1 text-xs sm:text-[13px] text-white/70 leading-relaxed">
                Cookie-urile necesare asigură funcționarea site-ului. Cu acordul tău, folosim și cookies de analiză și marketing pentru a îmbunătăți experiența.{" "}
                <a href="/gdpr" className="underline text-purple-300 hover:text-purple-200">Detalii</a>
              </p>

              {showSettings && (
                <div className="mt-3 space-y-2">
                  <Row label="Necesare" desc="Indispensabile pentru funcționarea site-ului." checked disabled />
                  <Row
                    label="Analiză"
                    desc="Ne ajută să înțelegem cum este folosit site-ul."
                    checked={prefs.analytics}
                    onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                  />
                  <Row
                    label="Marketing"
                    desc="Conținut și oferte personalizate."
                    checked={prefs.marketing}
                    onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                  />
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {showSettings ? (
                  <button
                    onClick={saveCustom}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-4 py-2 text-xs sm:text-sm font-semibold transition-all"
                  >
                    <Check className="size-3.5" /> Salvează preferințele
                  </button>
                ) : (
                  <button
                    onClick={acceptAll}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-4 py-2 text-xs sm:text-sm font-semibold transition-all"
                  >
                    <Check className="size-3.5" /> Accept toate
                  </button>
                )}
                <button
                  onClick={rejectAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] px-4 py-2 text-xs sm:text-sm font-medium transition-all"
                >
                  <X className="size-3.5" /> Doar necesare
                </button>
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-white/70 hover:text-white transition-colors"
                >
                  <Settings2 className="size-3.5" />
                  {showSettings ? "Ascunde setări" : "Setări"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({
  label, desc, checked, onChange, disabled,
}: { label: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
    <div className="min-w-0">
      <div className="text-xs sm:text-sm font-medium text-white">{label}</div>
      <div className="text-[11px] text-white/60 leading-snug">{desc}</div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative shrink-0 h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-gradient-to-r from-purple-500 to-purple-700" : "bg-white/15"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  </div>
);

export default CookieBanner;
