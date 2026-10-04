import { useEffect, useState } from "react";
import { Cookie, Settings2, Check, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { updateConsent } from "@/lib/analytics";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_POLICY_VERSION,
  COOKIE_SETTINGS_EVENT,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentPreferences,
} from "@/lib/cookieConsent";

export { COOKIE_POLICY_VERSION, COOKIE_SETTINGS_EVENT } from "@/lib/cookieConsent";

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
    policy: "Politica de cookies", policyHref: "/politica-cookies",
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
    policy: "Cookie policy", policyHref: "/en/cookie-policy",
    version: "Policy version",
  },
  it: {
    dialog: "Impostazioni cookie", title: "Utilizziamo i cookie",
    body: "I cookie necessari mantengono operativo il sito. Con il tuo consenso utilizziamo anche cookie di analisi e marketing per migliorare l'esperienza.",
    details: "Dettagli", detailsHref: "/en/privacy",
    necessary: "Necessari", necessaryDesc: "Indispensabili per il funzionamento del sito.",
    analytics: "Analisi", analyticsDesc: "Ci aiutano a capire come viene utilizzato il sito.",
    marketing: "Marketing", marketingDesc: "Contenuti e offerte personalizzati.",
    save: "Salva preferenze", acceptAll: "Accetta tutti", onlyNecessary: "Solo necessari",
    hideSettings: "Nascondi impostazioni", settings: "Impostazioni",
    policy: "Informativa sui cookie", policyHref: "/en/cookie-policy",
    version: "Versione dell'informativa",
  },
  hu: {
    dialog: "Cookie-beállítások", title: "Cookie-kat használunk",
    body: "A szükséges cookie-k biztosítják a webhely működését. Hozzájárulásoddal elemzési és marketing cookie-kat is használunk az élmény javításához.",
    details: "Részletek", detailsHref: "/en/privacy",
    necessary: "Szükséges", necessaryDesc: "Nélkülözhetetlenek a webhely működéséhez.",
    analytics: "Elemzés", analyticsDesc: "Segítenek megérteni a webhely használatát.",
    marketing: "Marketing", marketingDesc: "Személyre szabott tartalmak és ajánlatok.",
    save: "Beállítások mentése", acceptAll: "Összes elfogadása", onlyNecessary: "Csak szükséges",
    hideSettings: "Beállítások elrejtése", settings: "Beállítások",
    policy: "Cookie-szabályzat", policyHref: "/en/cookie-policy",
    version: "Szabályzat verziója",
  },
  de: {
    dialog: "Cookie-Einstellungen", title: "Wir verwenden Cookies",
    body: "Notwendige Cookies halten die Website funktionsfähig. Mit deiner Zustimmung verwenden wir außerdem Analyse- und Marketing-Cookies, um das Erlebnis zu verbessern.",
    details: "Details", detailsHref: "/en/privacy",
    necessary: "Notwendig", necessaryDesc: "Für den Betrieb der Website unverzichtbar.",
    analytics: "Analyse", analyticsDesc: "Hilft uns zu verstehen, wie die Website genutzt wird.",
    marketing: "Marketing", marketingDesc: "Personalisierte Inhalte und Angebote.",
    save: "Auswahl speichern", acceptAll: "Alle akzeptieren", onlyNecessary: "Nur notwendige",
    hideSettings: "Einstellungen ausblenden", settings: "Einstellungen",
    policy: "Cookie-Richtlinie", policyHref: "/en/cookie-policy",
    version: "Version der Richtlinie",
  },
  fr: {
    dialog: "Paramètres des cookies", title: "Nous utilisons des cookies",
    body: "Les cookies nécessaires assurent le fonctionnement du site. Avec votre accord, nous utilisons aussi des cookies d'analyse et de marketing pour améliorer l'expérience.",
    details: "Détails", detailsHref: "/en/privacy",
    necessary: "Nécessaires", necessaryDesc: "Indispensables au fonctionnement du site.",
    analytics: "Analyse", analyticsDesc: "Nous aident à comprendre l'utilisation du site.",
    marketing: "Marketing", marketingDesc: "Contenus et offres personnalisés.",
    save: "Enregistrer les préférences", acceptAll: "Tout accepter", onlyNecessary: "Nécessaires seulement",
    hideSettings: "Masquer les paramètres", settings: "Paramètres",
    policy: "Politique des cookies", policyHref: "/en/cookie-policy",
    version: "Version de la politique",
  },
  pl: {
    dialog: "Ustawienia plików cookie", title: "Używamy plików cookie",
    body: "Niezbędne pliki cookie zapewniają działanie witryny. Za Twoją zgodą używamy też plików analitycznych i marketingowych, aby ulepszać doświadczenie.",
    details: "Szczegóły", detailsHref: "/en/privacy",
    necessary: "Niezbędne", necessaryDesc: "Konieczne do prawidłowego działania witryny.",
    analytics: "Analityczne", analyticsDesc: "Pomagają nam zrozumieć sposób korzystania z witryny.",
    marketing: "Marketing", marketingDesc: "Spersonalizowane treści i oferty.",
    save: "Zapisz preferencje", acceptAll: "Akceptuj wszystkie", onlyNecessary: "Tylko niezbędne",
    hideSettings: "Ukryj ustawienia", settings: "Ustawienia",
    policy: "Polityka cookie", policyHref: "/en/cookie-policy",
    version: "Wersja polityki",
  },
} as const;

const CookieBanner = () => {
  const { pathname } = useLocation();
  const pathLocale = pathname.split("/")[1];
  const copyLocale = pathLocale in COPY ? pathLocale as keyof typeof COPY : "ro";
  const c = COPY[copyLocale];
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<CookieConsentPreferences>({ necessary: true, analytics: false, marketing: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reopen = () => {
      try {
        const parsed = readCookieConsent();
        if (parsed) {
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
      const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      const parsed = readCookieConsent();
      if (parsed) {
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
      if (!parsed) {
        if (raw) localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
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

  const save = (p: CookieConsentPreferences) => {
    try {
      saveCookieConsent(p);
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
                {showSettings && (
                  <a
                    href={c.policyHref}
                    className="inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-300/[0.07] px-3 py-2 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-300/[0.14]"
                  >
                    {c.policy}
                  </a>
                )}
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
