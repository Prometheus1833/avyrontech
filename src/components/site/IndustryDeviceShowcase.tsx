import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Bot, BriefcaseBusiness, HeartPulse, Scale, Smartphone, Sparkles, Trees, Utensils, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

type IndustryKey = "restaurant" | "clinic" | "guesthouse" | "legal";

type Industry = {
  key: IndustryKey;
  label: { ro: string; en: string };
  brand: string;
  eyebrow: { ro: string; en: string };
  headline: { ro: string; en: string };
  action: { ro: string; en: string };
  visual: { ro: string; en: string };
  accent: string;
  accentSoft: string;
  background: string;
  foreground: string;
  icon: LucideIcon;
};

const INDUSTRIES: Industry[] = [
  {
    key: "restaurant",
    label: { ro: "Restaurant", en: "Restaurant" },
    brand: "TRATTORIA",
    eyebrow: { ro: "meniu de sezon", en: "seasonal menu" },
    headline: { ro: "Rezervă masa de vineri seară.", en: "Book your Friday night table." },
    action: { ro: "Rezervă", en: "Book" },
    visual: { ro: "farfurie signature", en: "signature plate" },
    accent: "#e0a145",
    accentSoft: "rgba(224,161,69,.16)",
    background: "linear-gradient(145deg,#1b1008,#0b0705)",
    foreground: "#f6ecdc",
    icon: Utensils,
  },
  {
    key: "clinic",
    label: { ro: "Clinică", en: "Clinic" },
    brand: "MEDICLARA",
    eyebrow: { ro: "programări în 24h", en: "appointments within 24h" },
    headline: { ro: "Consultația ta, la ora ta.", en: "Care that fits your schedule." },
    action: { ro: "Programează", en: "Book a visit" },
    visual: { ro: "echipa medicală", en: "medical team" },
    accent: "#38dec9",
    accentSoft: "rgba(56,222,201,.14)",
    background: "linear-gradient(145deg,#06151a,#04090d)",
    foreground: "#e9f6f5",
    icon: HeartPulse,
  },
  {
    key: "guesthouse",
    label: { ro: "Pensiune", en: "Guesthouse" },
    brand: "CASA DE SUB DEAL",
    eyebrow: { ro: "liniște aproape de natură", en: "quiet stays close to nature" },
    headline: { ro: "Două nopți în ritmul tău.", en: "Two nights at your own pace." },
    action: { ro: "Verifică datele", en: "Check dates" },
    visual: { ro: "terasă la apus", en: "sunset terrace" },
    accent: "#a7e63d",
    accentSoft: "rgba(167,230,61,.14)",
    background: "linear-gradient(145deg,#11180a,#070a05)",
    foreground: "#eff4e4",
    icon: Trees,
  },
  {
    key: "legal",
    label: { ro: "Cabinet juridic", en: "Law firm" },
    brand: "CABINET & ASOCIAȚII",
    eyebrow: { ro: "drept comercial · litigii", en: "commercial law · disputes" },
    headline: { ro: "Claritate înainte de fiecare decizie.", en: "Clarity before every decision." },
    action: { ro: "Solicită consultanță", en: "Request counsel" },
    visual: { ro: "sala de ședințe", en: "meeting room" },
    accent: "#c7a86a",
    accentSoft: "rgba(199,168,106,.14)",
    background: "linear-gradient(145deg,#100d15,#07060a)",
    foreground: "#f2ece0",
    icon: Scale,
  },
];

const STAGE_COUNT = 3;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const IndustryDeviceShowcase = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const sectionRef = useRef<HTMLElement>(null);
  const visibleRef = useRef(false);
  const frameRef = useRef(0);
  const scrollDrivenRef = useRef(false);
  const [activeStage, setActiveStage] = useState(0);
  const [industryKey, setIndustryKey] = useState<IndustryKey>("restaurant");
  const industry = INDUSTRIES.find((item) => item.key === industryKey) ?? INDUSTRIES[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px)");
    const syncMode = () => {
      scrollDrivenRef.current = !reduced.matches && desktop.matches;
    };
    syncMode();

    const update = () => {
      frameRef.current = 0;
      if (!visibleRef.current || !scrollDrivenRef.current) return;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-rect.top / travel);
      section.style.setProperty("--showcase-progress", progress.toFixed(3));
      setActiveStage(Math.min(STAGE_COUNT - 1, Math.floor(progress * STAGE_COUNT)));
    };
    const schedule = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting) schedule();
    }, { rootMargin: "25% 0px" });

    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", syncMode);
    desktop.addEventListener("change", syncMode);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", syncMode);
      desktop.removeEventListener("change", syncMode);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const moveToStage = (stage: number) => {
    const section = sectionRef.current;
    setActiveStage(stage);
    if (!section || !scrollDrivenRef.current) return;
    const top = window.scrollY + section.getBoundingClientRect().top;
    const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
    window.scrollTo({ top: top + travel * (stage / (STAGE_COUNT - 1)), behavior: "smooth" });
  };

  const chooseIndustry = (key: IndustryKey) => {
    setIndustryKey(key);
    moveToStage(0);
  };

  const stageContent = [
    {
      kicker: ro ? "Website adaptat domeniului" : "A website shaped around your field",
      title: ro ? industry.headline.ro : industry.headline.en,
      description: ro
        ? "Structura, tonul și traseul spre contact se schimbă după activitatea aleasă. Conceptul este demonstrativ; proiectul final se construiește pe identitatea și conținutul afacerii tale."
        : "Structure, tone and the path to contact change with the selected field. This is an illustrative concept; the final project is built around your own identity and content.",
      path: ro ? "/servicii/website-prezentare-profesional" : "/en/services/professional-presentation-website",
      cta: ro ? "Vezi serviciul de website" : "Explore the website service",
    },
    {
      kicker: ro ? "Pe telefon · serviciu principal" : "On mobile · core service",
      title: ro ? "Aplicații și platforme" : "Apps and platforms",
      description: ro
        ? "Conturi, fluxuri, notificări și operațiuni reale, proiectate mobile-first și conectate la infrastructura de care echipa ta are nevoie."
        : "Accounts, workflows, notifications and real operations, designed mobile-first and connected to the infrastructure your team needs.",
      path: ro ? "/servicii/aplicatii-si-platforme" : "/en/services/apps-and-platforms",
      cta: ro ? "Descoperă aplicațiile" : "Explore apps",
    },
    {
      kicker: ro ? "Pe tabletă · lucru asistat" : "On tablet · assisted work",
      title: ro ? "Agenți AI personalizați" : "Custom AI agents",
      description: ro
        ? "Un spațiu clar pentru analiză, propuneri și aprobări umane. Agentul lucrează pe surse controlate și predă echipei deciziile importante."
        : "A clear workspace for analysis, proposals and human approvals. The agent works from controlled sources and hands important decisions back to the team.",
      path: ro ? "/servicii/automatizari-si-ai" : "/en/services/automation-and-ai",
      cta: ro ? "Vezi agenții AI" : "Explore AI agents",
    },
  ] as const;
  const activeContent = stageContent[activeStage];

  const deviceClass = (stage: number, base: string) =>
    `${base} transition-[transform,opacity,filter] duration-700 ease-out motion-reduce:transition-none ${
      activeStage === stage
        ? "z-30 scale-100 opacity-100 saturate-100"
        : "z-10 scale-[.88] opacity-30 saturate-50"
    }`;

  return (
    <section
      ref={sectionRef}
      id="domenii"
      data-testid="industry-device-showcase"
      data-active-stage={["laptop", "phone", "tablet"][activeStage]}
      aria-labelledby="industry-device-title"
      className="relative border-y border-border/60 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--brand)/.14),transparent_34%),radial-gradient(circle_at_86%_70%,hsl(var(--brand-2)/.12),transparent_30%)] lg:h-[260svh] motion-reduce:h-auto"
    >
      <div className="relative flex min-h-0 items-center overflow-visible pb-20 pt-36 lg:sticky lg:top-20 lg:h-[calc(100svh-5rem)] lg:min-h-[35rem] lg:overflow-hidden lg:py-8 motion-reduce:relative motion-reduce:top-auto motion-reduce:h-auto motion-reduce:min-h-0">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(hsl(var(--foreground)/.035)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/.035)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-7 px-4 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-10">
          <div className="relative z-40 max-w-xl lg:pt-14">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-brand">
              {ro ? "Concept demonstrativ · trei produse digitale" : "Illustrative concept · three digital products"}
            </p>
            <h2 id="industry-device-title" className="mt-3 font-display text-3xl font-bold leading-[1.03] tracking-[-.04em] sm:text-4xl lg:text-5xl">
              {ro ? "Alege domeniul tău și vezi cum ar arăta." : "Choose your field and see what it could look like."}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              {ro
                ? "Derulează pentru a trece de la website la aplicație și apoi la agentul AI. Fiecare ecran deschide serviciul potrivit."
                : "Scroll from the website to the app and then to the AI agent. Each screen opens the relevant service."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2" aria-label={ro ? "Alege domeniul" : "Choose a field"}>
              {INDUSTRIES.map((item) => {
                const Icon = item.icon;
                const selected = item.key === industryKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseIndustry(item.key)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
                      selected ? "border-brand/55 bg-brand/15 text-foreground" : "border-border/70 bg-background/55 text-muted-foreground hover:border-brand/35 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {ro ? item.label.ro : item.label.en}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-border/65 bg-background/70 p-4 shadow-soft backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[.2em] text-brand">{activeContent.kicker}</span>
                <span className="font-mono text-[10px] text-muted-foreground">0{activeStage + 1} / 03</span>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl">{activeContent.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{activeContent.description}</p>
              <Link to={activeContent.path} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 motion-reduce:transform-none">
                {activeContent.cta}<span aria-hidden>↗</span>
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2" aria-label={ro ? "Etapele demonstrației" : "Demo stages"}>
              {(ro ? ["Website", "Aplicație", "Agent AI"] : ["Website", "App", "AI agent"]).map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-current={activeStage === index ? "step" : undefined}
                  onClick={() => moveToStage(index)}
                  className={`rounded-xl border px-2 py-2 text-[10px] font-bold uppercase tracking-[.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${activeStage === index ? "border-brand/50 bg-brand/12 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[19rem] sm:h-[23rem] lg:h-[31rem]" aria-hidden>
            <div className="absolute inset-x-[6%] bottom-[2%] h-[30%] rounded-[50%] bg-brand/20 blur-[70px]" />

            <div className={deviceClass(0, `absolute bottom-[8%] left-1/2 w-[88%] -translate-x-1/2 lg:bottom-[10%] lg:w-[82%] ${activeStage === 0 ? "-translate-y-3" : "translate-y-5"}`)}>
              <div className="rounded-t-[1.15rem] border border-white/15 bg-gradient-to-br from-[#2a2235] to-[#0d0914] p-2.5 shadow-[0_35px_90px_-35px_rgba(0,0,0,.95)]">
                <div
                  className="relative aspect-[16/10] overflow-hidden rounded-[.7rem] border border-white/10 p-3 sm:p-5"
                  style={{ background: industry.background, color: industry.foreground, "--industry-accent": industry.accent, "--industry-accent-soft": industry.accentSoft } as CSSProperties}
                >
                  <div className="flex items-center border-b border-white/10 pb-2 text-[7px] sm:text-[9px]">
                    <span className="font-black tracking-[.12em]">{industry.brand}</span><span className="ml-auto h-1 w-10 rounded-full bg-white/15" /><span className="ml-2 rounded-full px-2 py-1 font-bold text-[#09070b]" style={{ background: industry.accent }}>{ro ? industry.action.ro : industry.action.en}</span>
                  </div>
                  <div className="grid h-[calc(100%-1.5rem)] grid-cols-[1.08fr_.92fr] items-center gap-3 text-left">
                    <div>
                      <p className="text-[6px] font-bold uppercase tracking-[.2em] sm:text-[8px]" style={{ color: industry.accent }}>{ro ? industry.eyebrow.ro : industry.eyebrow.en}</p>
                      <p className="mt-2 max-w-[12ch] font-display text-sm font-bold leading-[1.02] tracking-[-.04em] sm:text-2xl lg:text-3xl">{ro ? industry.headline.ro : industry.headline.en}</p>
                      <div className="mt-3 grid gap-1"><span className="h-1 w-11/12 rounded-full bg-white/15" /><span className="h-1 w-8/12 rounded-full bg-white/15" /></div>
                    </div>
                    <div className="grid aspect-[4/3] place-items-center rounded-xl border border-white/10" style={{ background: industry.accentSoft }}>
                      <span className="text-[6px] font-bold uppercase tracking-[.17em] sm:text-[8px]" style={{ color: industry.accent }}>{ro ? industry.visual.ro : industry.visual.en}</span>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.08] via-transparent to-transparent" />
                </div>
              </div>
              <div className="mx-[-5%] h-3 rounded-b-2xl border border-t-0 border-white/10 bg-gradient-to-b from-[#1b1524] to-[#0b0810]" />
              <div className="mx-auto h-1 w-[18%] rounded-b-md bg-white/10" />
              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[.24em] text-muted-foreground">Laptop · website</p>
            </div>

            <div className={deviceClass(1, `absolute bottom-[3%] max-w-[8.5rem] ${activeStage === 1 ? "left-1/2 w-[42%] -translate-x-1/2 -translate-y-4 lg:left-[2%] lg:w-[24%] lg:-translate-y-5 lg:translate-x-4" : "left-[2%] w-[24%] -translate-x-2 translate-y-4"}`)}>
              <div className="rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-[#2a2235] to-[#0d0914] p-1.5 shadow-[0_30px_70px_-28px_rgba(0,0,0,.95)]">
                <div className="relative aspect-[9/19] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#090714] p-2">
                  <div className="mx-auto h-1 w-7 rounded-full bg-white/15" />
                  <div className="mt-3 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/10 p-2">
                    <Smartphone className="size-4 text-indigo-300" aria-hidden />
                    <p className="mt-2 text-[7px] font-bold text-white">{ro ? "Aplicația ta" : "Your app"}</p>
                    <p className="mt-1 text-[5px] leading-relaxed text-white/55">{ro ? "Conturi · fluxuri · notificări" : "Accounts · flows · alerts"}</p>
                  </div>
                  <div className="mt-2 grid gap-1.5">{["", "", ""].map((_, index) => <span key={index} className="h-5 rounded-lg border border-white/[.07] bg-white/[.035]" />)}</div>
                  <span className="absolute inset-x-2 bottom-2 rounded-lg bg-indigo-400 py-1.5 text-center text-[6px] font-black text-[#090714]">{ro ? "DESCHIDE FLUXUL" : "OPEN FLOW"}</span>
                </div>
              </div>
              <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[.2em] text-muted-foreground">{ro ? "Telefon · aplicație" : "Phone · app"}</p>
            </div>

            <div className={deviceClass(2, `absolute bottom-[5%] max-w-[14rem] ${activeStage === 2 ? "left-1/2 w-[62%] -translate-x-1/2 -translate-y-5 lg:left-auto lg:right-[1%] lg:w-[38%] lg:-translate-x-3" : "right-[1%] w-[38%] translate-x-3 translate-y-5"}`)}>
              <div className="rounded-[1.45rem] border border-white/15 bg-gradient-to-br from-[#2a2235] to-[#0d0914] p-2 shadow-[0_30px_70px_-28px_rgba(0,0,0,.95)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] border border-white/10 bg-[#090714] p-2.5">
                  <div className="flex items-center gap-1.5 border-b border-white/[.08] pb-2"><Sparkles className="size-3 text-fuchsia-300" aria-hidden /><span className="text-[7px] font-bold text-white">AVY · AI workspace</span></div>
                  <div className="mt-2 rounded-lg border border-fuchsia-300/15 bg-fuchsia-400/[.07] p-2 text-left"><p className="text-[6px] font-bold text-fuchsia-200">{ro ? "Propunere pregătită" : "Proposal ready"}</p><p className="mt-1 text-[5px] leading-relaxed text-white/50">{ro ? "Surse verificate · impact estimat · aprobare umană" : "Verified sources · estimated impact · human approval"}</p></div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5"><span className="rounded-md border border-white/[.08] py-2 text-center text-[5px] text-white/50">{ro ? "Modifică" : "Revise"}</span><span className="rounded-md bg-fuchsia-300 py-2 text-center text-[5px] font-black text-[#160b1d]">{ro ? "Aprobă" : "Approve"}</span></div>
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/[.035] p-2"><Bot className="size-3 text-sky-300" aria-hidden /><span className="text-[5px] text-white/55">{ro ? "Agentul continuă după aprobare" : "The agent continues after approval"}</span></div>
                </div>
              </div>
              <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[.2em] text-muted-foreground">{ro ? "Tabletă · agent AI" : "Tablet · AI agent"}</p>
            </div>

            <div className="absolute right-0 top-0 hidden items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-2 text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground backdrop-blur lg:flex">
              <BriefcaseBusiness className="size-3.5 text-brand" aria-hidden />
              {ro ? "Website · aplicație · AI" : "Website · app · AI"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IndustryDeviceShowcase;
