import { useEffect, useState } from "react";
import { Cookie, Settings2, Check, X } from "lucide-react";
import { updateConsent } from "@/lib/analytics";

type Prefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export const COOKIE_POLICY_VERSION = "2026-08-23";
export const COOKIE_SETTINGS_EVENT = "avyron:cookie-settings";
const STORAGE_KEY = "avyron-cookie-consent-v2";

type StoredPrefs = Prefs & { savedAt: string; policyVersion: string };

const COPY = {
  ro: {
    dialog: "Setări cookies", title: "Folosim cookies",
    body: "Cookie-urile necesare asigură funcționarea site-ului. Cu acordul tău, folosim și cookies de analiză și marketing pentru a îmbunătăți experiența.",
    details: "Detalii", detailsHref: "/gdpr",
    necessary: "Necesare", necessaryDesc: "Indispensabile pentru funcționarea site-ului.",
    analytics: "Analiză", analyticsDesc: "Ne ajută să înțelegem cum este folosit site-ul.",
    marketing: "Marketing", marketingDesc: "Conținut și oferte personalizate.",
    save: "Salvează preferințele", acceptAll: "Accept toate", onlyNecessary: "Doar necesare",
    hideSettings: "Ascunde setări", settings: "Setări",
    version: "Versiunea politicii",
  },
  en: {
    dialog: "Cookie settings", title: "We use cookies",
    body: "Necessary cookies keep the site running. With your consent, we also use analytics and marketing cookies to improve your experience.",
    details: "Details", detailsHref: "/en/privacy",
    necessary: "Necessary", necessaryDesc: "Essential for the site to work.",
    analytics: "Analytics", analyticsDesc: "Help us understand how the site is used.",
    marketing: "Marketing", marketingDesc: "Personalised content and offers.",
    save: "Save preferences", acceptAll: "Accept all", onlyNecessary: "Only necessary",
    hideSettings: "Hide settings", settings: "Settings",
    version: "Policy version",
  },
} as const;

const CookieBanner = () => {
  const isEn = typeof window !== "undefined" && window.location.pathname.startsWith("/en");
  const c = isEn ? COPY.en : COPY.ro;
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ necessary: true, analytics: false, marketing: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reopen = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as StoredPrefs;
          setPrefs({ necessary: true, analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing) });
        }
      } catch {
        setPrefs({ necessary: true, analytics: false, marketing: false });
      }
      setShowSettings(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as StoredPrefs;
        if (parsed.policyVersion !== COOKIE_POLICY_VERSION) {
          localStorage.removeItem(STORAGE_KEY);
          updateConsent({ analytics: false, marketing: false });
          setOpen(true);
          return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
        }
        const next = {
          necessary: true as const,
          analytics: Boolean(parsed.analytics),
          marketing: Boolean(parsed.marketing),
        };
        setPrefs(next);
        updateConsent(next);
      } else {
        updateConsent({ analytics: false, marketing: false });
      }
      if (!saved) {
        timer = setTimeout(() => setOpen(true), 600);
      }
    } catch {
      updateConsent({ analytics: false, marketing: false });
      setOpen(true);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
    };
  }, []);

  const save = (p: Prefs) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...p, savedAt: new Date().toISOString(), policyVersion: COOKIE_POLICY_VERSION }),
      );
    } catch {
      // Consent still applies for this page when storage is unavailable.
    }
    updateConsent(p);
    setOpen(false);
  };

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () => save({ necessary: true, analytics: false, marketing: false });
  const saveCustom = () => save(prefs);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={c.dialog}
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
                {c.title}
              </h2>
              <p className="mt-1 text-xs sm:text-[13px] text-white/70 leading-relaxed">
                {c.body}{" "}
                <a href={c.detailsHref} className="underline text-purple-300 hover:text-purple-200">{c.details}</a>
              </p>
              <p className="mt-1 text-[10px] text-white/45">{c.version}: {COOKIE_POLICY_VERSION}</p>

              {showSettings && (
                <div className="mt-3 space-y-2">
                  <Row label={c.necessary} desc={c.necessaryDesc} checked disabled />
                  <Row
                    label={c.analytics}
                    desc={c.analyticsDesc}
                    checked={prefs.analytics}
                    onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                  />
                  <Row
                    label={c.marketing}
                    desc={c.marketingDesc}
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
                    <Check className="size-3.5" /> {c.save}
                  </button>
                ) : (
                  <button
                    onClick={acceptAll}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 px-4 py-2 text-xs sm:text-sm font-semibold transition-all"
                  >
                    <Check className="size-3.5" /> {c.acceptAll}
                  </button>
                )}
                <button
                  onClick={rejectAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] px-4 py-2 text-xs sm:text-sm font-medium transition-all"
                >
                  <X className="size-3.5" /> {c.onlyNecessary}
                </button>
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-white/70 hover:text-white transition-colors"
                >
                  <Settings2 className="size-3.5" />
                  {showSettings ? c.hideSettings : c.settings}
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
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative shrink-0 h-5 w-9 overflow-hidden rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0612] ${
        checked ? "bg-gradient-to-r from-purple-500 to-purple-700" : "bg-white/15"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0.5 top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export default CookieBanner;
