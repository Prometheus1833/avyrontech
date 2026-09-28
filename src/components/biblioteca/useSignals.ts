import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { QualityTier } from "@/lib/stage/capability";
import type { Lang } from "@/i18n/translations";

/**
 * Signal — notificările contextuale ale Bibliotecii.
 *
 * Comentează ce face utilizatorul chiar acum: cât stă pe un demo, cât de
 * repede derulează, pe ce treaptă de calitate rulează, câte efecte a strâns.
 * Regulile există ca să nu devină enervante: nimic în primele 8 secunde,
 * maximum trei mesaje pe sesiune, minimum 45 de secunde între ele, iar un
 * mesaj închis nu se mai întoarce niciodată.
 */

const QUIET_START_MS = 8000;
const GAP_MS = 45000;
const MAX_PER_SESSION = 3;
const SEEN_KEY = "avyron-signal-seen";

type SignalId =
  | "tier-light"
  | "dwell"
  | "fast-scroll"
  | "late-night"
  | "brief-three"
  | "reduced-motion"
  | "returning";

const COPY: Record<SignalId, { ro: string; en: string }> = {
  "tier-light": {
    ro: "Am trecut pe varianta ușoară ca să nu-ți chinuim dispozitivul. Tot arată bine, promitem.",
    en: "We switched to the light version so your device can breathe. It still looks good, we promise.",
  },
  dwell: {
    ro: "Te joci de-o vreme cu efectul ăsta. Îl vrei și la tine în pagină?",
    en: "You have been playing with this one for a while. Want it on your own page?",
  },
  "fast-scroll": {
    ro: "Ai derulat câțiva metri în câteva secunde. Vrei să-ți arătăm doar ce se potrivește cu proiectul tău?",
    en: "You covered a lot of ground in seconds. Want us to show only what fits your project?",
  },
  "late-night": {
    ro: "E trecut de miezul nopții. Efectele arată mai bine noaptea, deciziile nu.",
    en: "It is past midnight. Effects look better at night; decisions do not.",
  },
  "brief-three": {
    ro: "Trei efecte alese. La al patrulea începem să discutăm serios.",
    en: "Three effects picked. At the fourth we start talking seriously.",
  },
  "reduced-motion": {
    ro: "Am văzut că preferi mai puțină mișcare. Am oprit tot ce sare în ochi.",
    en: "We noticed you prefer less motion. Everything jumpy is switched off.",
  },
  returning: {
    ro: "Bine ai revenit. Ți-am păstrat efectele pe care le pusesei deoparte.",
    en: "Welcome back. We kept the effects you had set aside.",
  },
};

/** Pagina e întunecată; notificarea trebuie să fie la fel, altfel pare a altui site. */
const TOAST_STYLE = {
  duration: 7000,
  position: "bottom-left" as const,
  style: {
    background: "rgba(11, 13, 20, 0.96)",
    color: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.14)",
    backdropFilter: "blur(8px)",
  },
};

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markSeen(id: SignalId) {
  try {
    const seen = new Set(readSeen());
    seen.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* fără stocare, mesajul poate reapărea la următoarea vizită */
  }
}

type Options = {
  enabled: boolean;
  lang: Lang;
  tier: QualityTier;
  briefCount: number;
  activeDemo: string | null;
};

export function useSignals({ enabled, lang, tier, briefCount, activeDemo }: Options) {
  const mounted = useRef(Date.now());
  const shown = useRef(0);
  const lastAt = useRef(0);
  const fired = useRef<Set<SignalId>>(new Set());
  const dwellStart = useRef<{ demo: string | null; at: number }>({ demo: null, at: 0 });

  const fire = useRef((id: SignalId) => {
    const now = Date.now();
    if (!enabled) return;
    if (now - mounted.current < QUIET_START_MS) return;
    if (shown.current >= MAX_PER_SESSION) return;
    if (now - lastAt.current < GAP_MS) return;
    if (fired.current.has(id) || readSeen().includes(id)) return;

    fired.current.add(id);
    shown.current += 1;
    lastAt.current = now;

    toast(COPY[id][lang], { ...TOAST_STYLE, onDismiss: () => markSeen(id) });
  });

  // Ținem referința proaspătă fără să reînregistrăm ascultătorii la fiecare render.
  useEffect(() => {
    fire.current = (id: SignalId) => {
      const now = Date.now();
      if (!enabled) return;
      if (now - mounted.current < QUIET_START_MS) return;
      if (shown.current >= MAX_PER_SESSION) return;
      if (now - lastAt.current < GAP_MS) return;
      if (fired.current.has(id) || readSeen().includes(id)) return;

      fired.current.add(id);
      shown.current += 1;
      lastAt.current = now;

      toast(COPY[id][lang], { ...TOAST_STYLE, onDismiss: () => markSeen(id) });
    };
  }, [enabled, lang]);

  // Treapta de calitate și mișcarea redusă: o singură dată, după perioada de liniște.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      if (tier === "none") fire.current("reduced-motion");
      else if (tier === "usor") fire.current("tier-light");
    }, QUIET_START_MS + 500);
    return () => window.clearTimeout(timer);
  }, [enabled, tier]);

  // Ora târzie și revenirea.
  useEffect(() => {
    if (!enabled) return;
    const hour = new Date().getHours();
    const timer = window.setTimeout(() => {
      if (hour >= 0 && hour < 5) fire.current("late-night");
      else if (localStorage.getItem("avyron-brief-v1")) fire.current("returning");
    }, QUIET_START_MS + 12000);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  // Al treilea efect adăugat în brief.
  useEffect(() => {
    if (briefCount === 3) fire.current("brief-three");
  }, [briefCount]);

  // Cât stă pe același demo.
  useEffect(() => {
    if (!enabled) return;
    if (dwellStart.current.demo !== activeDemo) {
      dwellStart.current = { demo: activeDemo, at: Date.now() };
    }
    if (!activeDemo) return;
    const timer = window.setTimeout(() => fire.current("dwell"), 25000);
    return () => window.clearTimeout(timer);
  }, [enabled, activeDemo]);

  // Scroll foarte rapid pe o distanță mare.
  useEffect(() => {
    if (!enabled) return;
    let last = window.scrollY;
    let travelled = 0;
    let windowStart = Date.now();

    const onScroll = () => {
      const now = Date.now();
      travelled += Math.abs(window.scrollY - last);
      last = window.scrollY;
      if (now - windowStart > 20000) {
        travelled = 0;
        windowStart = now;
        return;
      }
      if (travelled > 12000) fire.current("fast-scroll");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);
}
