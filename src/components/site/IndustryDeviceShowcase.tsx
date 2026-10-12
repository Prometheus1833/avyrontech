import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  Gamepad2,
  Globe2,
  Layers3,
  MessageCircle,
  MessagesSquare,
  MousePointer2,
  ShoppingBag,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

export type ShowcaseDomain = {
  key: string;
  label: string;
  title: string;
  description: string;
};

type IndustryDeviceShowcaseProps = {
  domains: ShowcaseDomain[];
  activeDomain: string;
  onDomainChange: (key: string) => void;
};

type AppMode = "app" | "game" | "crm" | "platform";
type AutomationMode = "social" | "leads" | "chat" | "other";

const STAGE_COUNT = 3;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const domainLooks: Record<string, { tag: string; metric: string; metricLabel: string; accent: string; soft: string; visual: "care" | "food" | "travel" | "commerce" | "professional" | "system" }> = {
  beauty: { tag: "Beauty, elevat", metric: "+34%", metricLabel: "programări", accent: "bg-rose-300", soft: "from-rose-300/35 to-amber-200/10", visual: "care" },
  resto: { tag: "Gust care se vede", metric: "18:30", metricLabel: "prima masă liberă", accent: "bg-orange-300", soft: "from-orange-300/35 to-yellow-200/10", visual: "food" },
  public: { tag: "Servicii publice clare", metric: "24/7", metricLabel: "cereri online", accent: "bg-sky-300", soft: "from-sky-300/35 to-cyan-200/10", visual: "system" },
  turism: { tag: "Rezervă experiența", metric: "4.9", metricLabel: "rating oaspeți", accent: "bg-cyan-300", soft: "from-cyan-300/35 to-emerald-200/10", visual: "travel" },
  pro: { tag: "Expertiză, fără zgomot", metric: "15m", metricLabel: "consultare inițială", accent: "bg-amber-300", soft: "from-amber-300/30 to-stone-200/10", visual: "professional" },
  local: { tag: "Aproape. Rapid. Clar.", metric: "2h", metricLabel: "răspuns estimat", accent: "bg-lime-300", soft: "from-lime-300/30 to-emerald-200/10", visual: "professional" },
  auto: { tag: "Performanță verificată", metric: "08:00", metricLabel: "următorul slot", accent: "bg-red-300", soft: "from-red-300/30 to-orange-200/10", visual: "system" },
  ecommerce: { tag: "Colecția care convertește", metric: "1 zi", metricLabel: "livrare rapidă", accent: "bg-lime-300", soft: "from-lime-300/30 to-sky-200/10", visual: "commerce" },
  national: { tag: "Platformă la scară reală", metric: "99.9%", metricLabel: "disponibilitate", accent: "bg-blue-300", soft: "from-blue-300/35 to-cyan-200/10", visual: "system" },
  other: { tag: "Construit pentru ideea ta", metric: "01", metricLabel: "concept personalizat", accent: "bg-emerald-300", soft: "from-emerald-300/35 to-sky-200/10", visual: "professional" },
};

const appModes: Array<{ key: AppMode; ro: string; en: string }> = [
  { key: "app", ro: "Web/Mobile App", en: "Web/Mobile App" },
  { key: "game", ro: "Joc", en: "Game" },
  { key: "crm", ro: "CRM", en: "CRM" },
  { key: "platform", ro: "Platformă", en: "Platform" },
];

const automationModes: Array<{ key: AutomationMode; ro: string; en: string }> = [
  { key: "social", ro: "Agent AI Social Media", en: "Social Media AI Agent" },
  { key: "leads", ro: "Leads", en: "Leads" },
  { key: "chat", ro: "ChatBot AI web și WhatsApp", en: "Web & WhatsApp AI ChatBot" },
  { key: "other", ro: "Alte automatizări", en: "Other automations" },
];

function WebsiteScreen({ domain, ro }: { domain: ShowcaseDomain; ro: boolean }) {
  const look = domainLooks[domain.key] ?? domainLooks.other;
  return (
    <div className="relative h-full overflow-hidden rounded-[.7rem] bg-[#07100f] text-white sm:rounded-[1rem]">
      <div className="flex h-8 items-center gap-1.5 border-b border-white/10 px-3 sm:h-11 sm:px-5">
        <span className="size-1.5 rounded-full bg-red-300/70" /><span className="size-1.5 rounded-full bg-amber-300/70" /><span className="size-1.5 rounded-full bg-emerald-300/70" />
        <span className="ml-2 rounded-full bg-white/[.06] px-3 py-1 text-[5px] text-white/45 sm:text-[8px]">{domain.label.toLowerCase().replace(/\s+/g, "-")}.ro</span>
        <span className="ml-auto hidden text-[7px] text-white/40 sm:block">{ro ? "Servicii · Poveste · Contact" : "Services · Story · Contact"}</span>
      </div>
      <div className="grid h-[calc(100%-2rem)] grid-cols-[1.08fr_.92fr] items-center gap-3 p-3 sm:h-[calc(100%-2.75rem)] sm:gap-7 sm:p-7">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[5px] font-black uppercase tracking-[.2em] text-white/55 sm:text-[8px]"><span className={`size-1.5 rounded-full ${look.accent}`} />{look.tag}</div>
          <h4 className="mt-2 max-w-[14ch] font-display text-[12px] font-bold leading-[.98] tracking-[-.045em] sm:mt-4 sm:text-2xl lg:text-[2rem]">{domain.title}</h4>
          <p className="mt-2 line-clamp-2 max-w-[34ch] text-[5px] leading-relaxed text-white/52 sm:mt-3 sm:text-[9px]">{domain.description}</p>
          <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[5px] font-black text-[#07100f] sm:mt-5 sm:px-4 sm:py-2 sm:text-[8px] ${look.accent}`}>{ro ? "DESCOPERĂ" : "EXPLORE"}</span>
        </div>
        <div className={`relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${look.soft} sm:rounded-2xl`}>
          {look.visual === "food" && <><div className="absolute left-[12%] top-[12%] size-[58%] rounded-full border-[10px] border-white/10 bg-orange-200/25 sm:border-[18px]" /><div className="absolute bottom-[12%] right-[8%] rounded-full bg-[#07100f]/80 px-2 py-1 text-[5px] sm:text-[8px]">Meniu sezonier</div></>}
          {look.visual === "care" && <><div className="absolute left-[14%] top-[12%] h-[70%] w-[48%] rounded-t-full bg-rose-100/20" /><Sparkles className="absolute right-[14%] top-[16%] size-5 text-rose-200 sm:size-8" /><div className="absolute bottom-[12%] right-[8%] h-[28%] w-[54%] rounded-lg border border-white/15 bg-black/25" /></>}
          {look.visual === "travel" && <><div className="absolute inset-x-[8%] bottom-[12%] h-[36%] rounded-xl bg-cyan-100/15" /><div className="absolute left-[16%] top-[14%] size-[38%] rounded-full bg-amber-100/45 blur-[1px]" /><div className="absolute bottom-[20%] left-[17%] right-[16%] h-px bg-white/35" /></>}
          {look.visual === "commerce" && <><ShoppingBag className="absolute left-[18%] top-[18%] size-7 text-lime-200 sm:size-12" /><div className="absolute bottom-[14%] left-[10%] right-[10%] grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="aspect-[.8] rounded-md border border-white/10 bg-white/[.07]" />)}</div></>}
          {(look.visual === "professional" || look.visual === "system") && <><div className="absolute left-[10%] top-[14%] h-[12%] w-[55%] rounded-full bg-white/16" /><div className="absolute left-[10%] top-[34%] h-[7%] w-[74%] rounded-full bg-white/8" /><div className="absolute bottom-[12%] left-[10%] right-[10%] grid grid-cols-2 gap-2"><span className="h-10 rounded-lg border border-white/10 bg-white/[.06] sm:h-16" /><span className="h-10 rounded-lg border border-white/10 bg-white/[.06] sm:h-16" /></div></>}
          <div className="absolute right-[8%] top-[9%] rounded-lg border border-white/15 bg-[#07100f]/75 p-2 backdrop-blur sm:p-3"><strong className="block text-[8px] sm:text-sm">{look.metric}</strong><span className="block text-[4px] text-white/45 sm:text-[7px]">{look.metricLabel}</span></div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.07] via-transparent to-transparent" />
    </div>
  );
}

function PhoneScreen({ mode, ro }: { mode: AppMode; ro: boolean }) {
  const labels = {
    app: ro ? ["Programări", "Mesaje", "Contul meu"] : ["Bookings", "Messages", "My account"],
    game: ro ? ["Misiuni", "Inventar", "Clasament"] : ["Missions", "Inventory", "Leaderboard"],
    crm: ro ? ["Lead nou", "Ofertă", "Câștigat"] : ["New lead", "Proposal", "Won"],
    platform: ro ? ["Activitate", "Servicii", "Plăți"] : ["Activity", "Services", "Payments"],
  }[mode];
  const Icon = mode === "game" ? Gamepad2 : mode === "crm" ? Target : mode === "platform" ? Layers3 : CalendarDays;
  return (
    <div className="relative h-full bg-[#06100f] px-3 pb-4 pt-7 text-white sm:px-4 sm:pb-5 sm:pt-9">
      <div className="flex items-center justify-between"><div><span className="text-[6px] font-bold uppercase tracking-[.18em] text-lime-200/70 sm:text-[8px]">AVY {mode.toUpperCase()}</span><h4 className="mt-1 text-[10px] font-bold sm:text-sm">{mode === "game" ? (ro ? "Nivelul tău" : "Your level") : mode === "crm" ? (ro ? "Pipeline astăzi" : "Today's pipeline") : mode === "platform" ? (ro ? "Centrul tău" : "Your hub") : (ro ? "Bun venit" : "Welcome")}</h4></div><span className="grid size-7 place-items-center rounded-full bg-lime-300 text-[#06100f] sm:size-9"><Icon className="size-3.5 sm:size-4" /></span></div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-300/18 to-sky-300/8 p-3 sm:mt-5 sm:p-4">
        <div className="flex items-end justify-between"><div><span className="text-[6px] text-white/45 sm:text-[8px]">{mode === "game" ? "XP" : mode === "crm" ? (ro ? "Conversie" : "Conversion") : mode === "platform" ? (ro ? "Utilizatori activi" : "Active users") : (ro ? "Următoarea acțiune" : "Next action")}</span><strong className="mt-1 block text-base sm:text-xl">{mode === "game" ? "7 420" : mode === "crm" ? "28%" : mode === "platform" ? "1 284" : "14:30"}</strong></div><BarChart3 className="size-5 text-sky-200 sm:size-7" /></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.span key={mode} initial={{ width: 0 }} animate={{ width: mode === "game" ? "78%" : mode === "crm" ? "62%" : "84%" }} className="block h-full rounded-full bg-lime-300" /></div>
      </div>
      <div className="mt-3 grid gap-2">{labels.map((label, index) => <div key={label} className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.035] p-2.5"><span className={`grid size-6 place-items-center rounded-lg ${index === 0 ? "bg-sky-300 text-[#06100f]" : "bg-white/[.07] text-white/55"}`}><span className="text-[7px] font-black">0{index + 1}</span></span><span className="text-[7px] text-white/70 sm:text-[9px]">{label}</span><ChevronDown className="ml-auto size-3 -rotate-90 text-white/30" /></div>)}</div>
      <div className="absolute inset-x-4 bottom-3 flex justify-around rounded-full border border-white/10 bg-white/[.05] px-3 py-2">{[0, 1, 2, 3].map((i) => <span key={i} className={`size-1.5 rounded-full ${i === 0 ? "bg-lime-300" : "bg-white/20"}`} />)}</div>
    </div>
  );
}

function TabletScreen({ mode, ro }: { mode: AutomationMode; ro: boolean }) {
  const config = {
    social: { title: ro ? "Plan editorial" : "Editorial plan", metric: "12", sub: ro ? "postări pregătite" : "posts ready", icon: Sparkles },
    leads: { title: ro ? "Lead-uri calificate" : "Qualified leads", metric: "28", sub: ro ? "oportunități active" : "active opportunities", icon: Target },
    chat: { title: "AI Inbox", metric: "7", sub: ro ? "conversații asistate" : "assisted conversations", icon: MessagesSquare },
    other: { title: ro ? "Fluxuri automate" : "Automated flows", metric: "9", sub: ro ? "procese active" : "active processes", icon: Workflow },
  }[mode];
  const Icon = config.icon;
  return (
    <div className="grid h-full grid-cols-[24%_76%] bg-[#07100f] text-white">
      <div className="border-r border-white/10 bg-white/[.025] p-2 sm:p-4"><div className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-md bg-lime-300 text-[#07100f] sm:size-8"><Bot className="size-3 sm:size-4" /></span><span className="hidden text-[8px] font-black sm:block">AVY AI</span></div><div className="mt-5 grid gap-2">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 rounded-full sm:h-2 ${i === 1 ? "bg-lime-300/75" : "bg-white/10"}`} />)}</div></div>
      <div className="p-2.5 sm:p-5">
        <div className="flex items-start justify-between"><div><span className="text-[5px] font-bold uppercase tracking-[.18em] text-sky-200/65 sm:text-[8px]">{ro ? "CONTROL CU APROBARE" : "APPROVAL CONTROL"}</span><h4 className="mt-1 text-[9px] font-bold sm:text-base">{config.title}</h4></div><span className="grid size-6 place-items-center rounded-lg bg-sky-300/15 text-sky-200 sm:size-9"><Icon className="size-3 sm:size-4" /></span></div>
        <div className="mt-3 grid grid-cols-[.72fr_1.28fr] gap-2 sm:mt-5 sm:gap-3"><div className="rounded-xl border border-white/10 bg-white/[.035] p-2.5 sm:p-4"><strong className="text-base sm:text-2xl">{config.metric}</strong><span className="mt-1 block text-[5px] text-white/40 sm:text-[8px]">{config.sub}</span><div className="mt-3 flex h-9 items-end gap-1 sm:h-14">{[38, 62, 48, 84, 72].map((h, i) => <span key={i} className="flex-1 rounded-t bg-sky-300/50" style={{ height: `${h}%` }} />)}</div></div><div className="rounded-xl border border-lime-300/15 bg-lime-300/[.055] p-2.5 sm:p-4"><div className="flex items-center gap-1.5 text-[6px] font-bold text-lime-100 sm:text-[9px]"><MessageCircle className="size-3" />{mode === "chat" ? "WhatsApp + Web" : ro ? "Propunere pregătită" : "Proposal ready"}</div><div className="mt-2 grid gap-1.5"><span className="h-1.5 w-full rounded-full bg-white/13" /><span className="h-1.5 w-5/6 rounded-full bg-white/9" /><span className="h-1.5 w-2/3 rounded-full bg-white/9" /></div><div className="mt-3 grid grid-cols-2 gap-1.5"><span className="rounded-md border border-white/10 py-1.5 text-center text-[5px] text-white/60 sm:text-[7px]">{ro ? "Modifică" : "Revise"}</span><span className="flex items-center justify-center gap-1 rounded-md bg-lime-300 py-1.5 text-[5px] font-black text-[#07100f] sm:text-[7px]"><Check className="size-2.5" />{ro ? "Aprobă" : "Approve"}</span></div></div></div>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/[.07] bg-white/[.03] p-2 sm:mt-3"><span className="size-1.5 rounded-full bg-emerald-300" /><span className="text-[5px] text-white/45 sm:text-[8px]">{ro ? "Agentul execută numai regulile și aprobările configurate" : "The agent executes only configured rules and approvals"}</span></div>
      </div>
    </div>
  );
}

export default function IndustryDeviceShowcase({ domains, activeDomain, onDomainChange }: IndustryDeviceShowcaseProps) {
  const { lang } = useLang();
  const ro = lang === "ro";
  const sectionRef = useRef<HTMLDivElement>(null);
  const deviceRefs = useRef<Array<HTMLDivElement | null>>([]);
  const visibleRef = useRef(false);
  const frameRef = useRef(0);
  const activeRef = useRef(0);
  const scrollDrivenRef = useRef(false);
  const paintRef = useRef<(progress: number) => void>(() => undefined);
  const [activeStage, setActiveStage] = useState(0);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("app");
  const [automationMode, setAutomationMode] = useState<AutomationMode>("social");
  const domain = useMemo(() => domains.find((item) => item.key === activeDomain) ?? domains[0], [domains, activeDomain]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const paint = (stageProgress: number) => {
      deviceRefs.current.forEach((device, index) => {
        if (!device) return;
        const distance = Math.abs(stageProgress - index);
        const near = clamp(1 - distance / 0.72);
        const direction = index - stageProgress;
        device.style.opacity = near.toFixed(3);
        device.style.pointerEvents = near > 0.86 ? "auto" : "none";
        device.style.transform = `translate3d(${(direction * 18).toFixed(2)}%, ${(distance * 30).toFixed(1)}px, 0) rotateY(${(direction * -7).toFixed(2)}deg) scale(${(0.86 + near * 0.14).toFixed(3)})`;
      });
    };
    paintRef.current = paint;
    paint(0);
    const syncMode = () => { scrollDrivenRef.current = !reduced.matches; };
    syncMode();
    const update = () => {
      frameRef.current = 0;
      if (!visibleRef.current || !scrollDrivenRef.current) return;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-rect.top / travel);
      const stageProgress = progress * (STAGE_COUNT - 1);
      section.style.setProperty("--showcase-progress", progress.toFixed(3));
      paint(stageProgress);
      const next = Math.min(STAGE_COUNT - 1, Math.round(stageProgress));
      if (next !== activeRef.current) { activeRef.current = next; setActiveStage(next); }
    };
    const schedule = () => { if (!frameRef.current) frameRef.current = window.requestAnimationFrame(update); };
    const observer = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; if (entry.isIntersecting) schedule(); }, { rootMargin: "20% 0px" });
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", syncMode);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", syncMode);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const moveToStage = (stage: number) => {
    activeRef.current = stage;
    setActiveStage(stage);
    paintRef.current(stage);
    const section = sectionRef.current;
    if (!section || !scrollDrivenRef.current) return;
    const top = window.scrollY + section.getBoundingClientRect().top;
    const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
    window.scrollTo({ top: top + travel * (stage / (STAGE_COUNT - 1)), behavior: "smooth" });
  };

  const stages = [
    { label: "Website", path: ro ? "/servicii/website-prezentare-profesional" : "/en/services/professional-presentation-website", cta: ro ? "Serviciul Website" : "Website service" },
    { label: ro ? "Aplicație" : "Application", path: ro ? "/servicii/aplicatii-si-platforme" : "/en/services/apps-and-platforms", cta: ro ? "Aplicații și platforme" : "Apps and platforms" },
    { label: ro ? "Automatizări" : "Automations", path: ro ? "/servicii/automatizari-si-ai" : "/en/services/automation-and-ai", cta: ro ? "Automatizări și AI" : "Automation and AI" },
  ];

  return (
    <div ref={sectionRef} id="domenii" data-testid="industry-device-showcase" data-active-stage={["laptop", "phone", "tablet"][activeStage]} data-domain={domain.key} className="relative h-[300svh] scroll-mt-20">
      <div className="sticky top-20 h-[calc(100svh-5rem)] min-h-[39rem] overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,hsl(var(--foreground)/.055),transparent_43%)]" />
        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-[9px] font-bold uppercase tracking-[.24em] text-brand">{ro ? "Explorează prin scroll" : "Explore by scrolling"}</p><AnimatePresence mode="wait"><motion.h3 key={stages[activeStage].label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-1 font-display text-2xl font-bold tracking-[-.04em] sm:text-4xl">{stages[activeStage].label}</motion.h3></AnimatePresence></div>
            <Link to={stages[activeStage].path} className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-bold shadow-soft backdrop-blur hover:border-foreground/25 sm:inline-flex">{stages[activeStage].cta}<ArrowUpRight className="size-3.5" /></Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2" aria-label={ro ? "Progres servicii" : "Services progress"}>{stages.map((stage, index) => <button key={stage.label} type="button" aria-label={stage.label} onClick={() => moveToStage(index)} aria-current={activeStage === index ? "step" : undefined} className="group text-left"><span className={`block h-1 overflow-hidden rounded-full ${activeStage >= index ? "bg-foreground/18" : "bg-foreground/[.07]"}`}><span className={`block h-full origin-left rounded-full bg-brand transition-transform duration-500 ${activeStage >= index ? "scale-x-100" : "scale-x-0"}`} /></span><span className={`mt-1.5 block text-[8px] font-bold uppercase tracking-[.12em] sm:text-[10px] ${activeStage === index ? "text-foreground" : "text-muted-foreground"}`}>0{index + 1} · {stage.label}</span></button>)}</div>

          <div className="relative min-h-0 flex-1 [perspective:1500px]">
            <div ref={(el) => { deviceRefs.current[0] = el; }} data-testid="showcase-device-laptop" className="absolute inset-0 flex origin-center transform-gpu items-center justify-center will-change-transform"><div className="w-[88%] max-w-[40rem] sm:w-[62%]"><div className="rounded-t-[1.1rem] border border-white/15 bg-gradient-to-br from-[#2d3332] via-[#151b1a] to-[#070b0a] p-1.5 shadow-[0_34px_80px_-32px_rgba(0,0,0,.9)] sm:rounded-t-[1.5rem] sm:p-2.5"><div className="aspect-[16/9.4]"><WebsiteScreen domain={domain} ro={ro} /></div></div><div className="mx-[-4%] h-2.5 rounded-b-2xl border border-t-0 border-white/10 bg-gradient-to-b from-[#28302e] to-[#0a0e0d] sm:h-4" /><div className="mx-auto h-1 w-[18%] rounded-b-md bg-foreground/12" /></div></div>
            <div ref={(el) => { deviceRefs.current[1] = el; }} data-testid="showcase-device-phone" className="absolute inset-0 flex origin-center transform-gpu items-center justify-center will-change-transform"><div className="relative w-[10.2rem] sm:w-[11rem]"><span className="absolute -left-1 top-[24%] h-12 w-1 rounded-l bg-[#222927]" /><span className="absolute -right-1 top-[18%] h-16 w-1 rounded-r bg-[#222927]" /><div className="rounded-[2.4rem] border border-white/20 bg-gradient-to-br from-[#424a48] via-[#161c1b] to-[#070b0a] p-1.5 shadow-[0_35px_75px_-25px_rgba(0,0,0,.95)]"><div className="relative aspect-[9/19.4] overflow-hidden rounded-[2rem] border border-black/80"><span className="absolute left-1/2 top-2 z-20 h-4 w-[38%] -translate-x-1/2 rounded-full bg-black shadow" /><PhoneScreen mode={appMode} ro={ro} /><div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.12] via-transparent to-transparent" /></div></div></div></div>
            <div ref={(el) => { deviceRefs.current[2] = el; }} data-testid="showcase-device-tablet" className="absolute inset-0 flex origin-center transform-gpu items-center justify-center will-change-transform"><div className="w-[88%] max-w-[32rem] sm:w-[54%]"><div className="rounded-[1.3rem] border border-white/20 bg-gradient-to-br from-[#414947] via-[#171d1c] to-[#070b0a] p-1.5 shadow-[0_35px_80px_-28px_rgba(0,0,0,.94)] sm:rounded-[2rem] sm:p-2.5"><div className="relative aspect-[4/3] overflow-hidden rounded-[.95rem] border border-black/70 sm:rounded-[1.35rem]"><span className="absolute left-1/2 top-1 z-20 size-1 -translate-x-1/2 rounded-full bg-black sm:size-1.5" /><TabletScreen mode={automationMode} ro={ro} /><div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.1] via-transparent to-transparent" /></div></div></div></div>
          </div>

          <div className="relative z-30 min-h-[7.2rem]">
            <AnimatePresence mode="wait">
              {activeStage === 0 && <motion.div key="website-controls" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mx-auto max-w-4xl text-center"><button type="button" aria-expanded={domainsOpen} onClick={() => setDomainsOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background shadow-elev"><Globe2 className="size-4" />{ro ? "Domenii" : "Industries"}<ChevronDown className={`size-3.5 transition-transform ${domainsOpen ? "rotate-180" : ""}`} /></button><AnimatePresence initial={false}>{domainsOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-3 flex max-h-[4.8rem] flex-wrap justify-center gap-1.5 overflow-y-auto px-1">{domains.map((item) => <button key={item.key} type="button" aria-pressed={item.key === domain.key} onClick={() => onDomainChange(item.key)} className={`rounded-full border px-3 py-1.5 text-[9px] font-bold transition-colors sm:text-[10px] ${item.key === domain.key ? "border-foreground bg-foreground text-background" : "border-border/70 bg-background/75 text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}</div></motion.div>}</AnimatePresence><p className="mt-2 text-[10px] text-muted-foreground">{ro ? "Alege un domeniu: hero-ul website-ului se adaptează instant." : "Choose an industry: the website hero adapts instantly."}</p></motion.div>}
              {activeStage === 1 && <motion.div key="app-controls" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mx-auto max-w-3xl"><div className="flex flex-wrap justify-center gap-2" role="group" aria-label={ro ? "Tip aplicație" : "Application type"}>{appModes.map((item) => <button key={item.key} type="button" aria-pressed={appMode === item.key} onClick={() => setAppMode(item.key)} className={`rounded-full border px-3.5 py-2 text-[10px] font-bold sm:text-xs ${appMode === item.key ? "border-lime-300/60 bg-lime-300 text-[#07100f]" : "border-border/70 bg-background/75 text-muted-foreground hover:text-foreground"}`}>{ro ? item.ro : item.en}</button>)}</div><p className="mt-3 text-center text-[10px] text-muted-foreground">{ro ? "Selectează produsul, iar interfața telefonului își schimbă funcția și ierarhia." : "Select a product and the phone interface changes its purpose and hierarchy."}</p></motion.div>}
              {activeStage === 2 && <motion.div key="automation-controls" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mx-auto max-w-4xl"><div className="flex flex-wrap justify-center gap-2" role="group" aria-label={ro ? "Tip automatizare" : "Automation type"}>{automationModes.map((item) => <button key={item.key} type="button" aria-pressed={automationMode === item.key} onClick={() => setAutomationMode(item.key)} className={`rounded-full border px-3 py-2 text-[9px] font-bold sm:text-[11px] ${automationMode === item.key ? "border-sky-300/60 bg-sky-300 text-[#07100f]" : "border-border/70 bg-background/75 text-muted-foreground hover:text-foreground"}`}>{ro ? item.ro : item.en}</button>)}</div><p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground"><MousePointer2 className="size-3" />{ro ? "Fiecare flux păstrează controlul și aprobarea la echipa ta." : "Every workflow keeps control and approval with your team."}</p></motion.div>}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
