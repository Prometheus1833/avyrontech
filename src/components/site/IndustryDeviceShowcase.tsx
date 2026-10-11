import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bot, Check, MessageSquareText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";

type IndustryDeviceShowcaseProps = {
  domainKey: string;
  domainLabel: string;
  websiteTitle: string;
  websiteDescription: string;
};

const STAGE_COUNT = 3;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const IndustryDeviceShowcase = ({
  domainKey,
  domainLabel,
  websiteTitle,
  websiteDescription,
}: IndustryDeviceShowcaseProps) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const sectionRef = useRef<HTMLDivElement>(null);
  const deviceRefs = useRef<Array<HTMLDivElement | null>>([]);
  const visibleRef = useRef(false);
  const frameRef = useRef(0);
  const scrollDrivenRef = useRef(false);
  const paintRef = useRef<(progress: number) => void>(() => undefined);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const paint = (stageProgress: number) => {
      deviceRefs.current.forEach((device, index) => {
        if (!device) return;
        const near = Math.max(0, 1 - Math.abs(stageProgress - index));
        const direction = index - stageProgress;
        const activeScale = index === 1 ? 1.18 : index === 2 ? 1.1 : 1;
        device.style.opacity = (0.16 + near * 0.84).toFixed(3);
        device.style.filter = `saturate(${(0.38 + near * 0.62).toFixed(3)})`;
        device.style.transform = `translate3d(0, ${(-near * 18).toFixed(1)}px, 0) rotateY(${(
          direction * -6
        ).toFixed(2)}deg) scale(${(0.88 + near * (activeScale - 0.88)).toFixed(3)})`;
        device.style.zIndex = String(10 + Math.round(near * 20));
      });
    };
    paintRef.current = paint;
    paint(0);

    const syncMode = () => {
      scrollDrivenRef.current = !reduced.matches;
    };
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
      setActiveStage(Math.min(STAGE_COUNT - 1, Math.round(stageProgress)));
    };
    const schedule = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) schedule();
      },
      { rootMargin: "25% 0px" },
    );

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
    setActiveStage(stage);
    paintRef.current(stage);
    const section = sectionRef.current;
    if (!section || !scrollDrivenRef.current) return;
    const top = window.scrollY + section.getBoundingClientRect().top;
    const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
    window.scrollTo({ top: top + travel * (stage / (STAGE_COUNT - 1)), behavior: "smooth" });
  };

  const stages = [
    {
      label: ro ? "Website" : "Website",
      eyebrow: ro ? `Website pentru ${domainLabel}` : `Website for ${domainLabel}`,
      title: websiteTitle,
      description: websiteDescription,
      path: ro ? "/servicii/website-prezentare-profesional" : "/en/services/professional-presentation-website",
      cta: ro ? "Vezi serviciul de website" : "Explore the website service",
    },
    {
      label: ro ? "Aplicație" : "App",
      eyebrow: ro ? "Pe telefon · serviciu principal" : "On mobile · core service",
      title: ro ? "Aplicații și platforme" : "Apps and platforms",
      description: ro
        ? "Conturi, programări, notificări și operațiuni reale într-un produs construit mobile-first pentru clienți sau echipă."
        : "Accounts, bookings, notifications and real operations in a mobile-first product for customers or teams.",
      path: ro ? "/servicii/aplicatii-si-platforme" : "/en/services/apps-and-platforms",
      cta: ro ? "Descoperă aplicațiile" : "Explore apps",
    },
    {
      label: ro ? "Agent AI" : "AI agent",
      eyebrow: ro ? "Pe tabletă · controlul rămâne la echipă" : "On tablet · your team stays in control",
      title: ro ? "Agenți AI pentru echipă" : "AI agents for your team",
      description: ro
        ? "Agentul analizează surse controlate, pregătește propuneri și continuă numai după aprobare sau după modificarea cerută de un membru al echipei."
        : "The agent analyses controlled sources, prepares proposals and continues only after approval or a team member's requested revision.",
      path: ro ? "/servicii/automatizari-si-ai" : "/en/services/automation-and-ai",
      cta: ro ? "Vezi agenții AI" : "Explore AI agents",
    },
  ] as const;
  const activeContent = stages[activeStage];

  return (
    <div
      ref={sectionRef}
      id="domenii"
      data-testid="industry-device-showcase"
      data-active-stage={["laptop", "phone", "tablet"][activeStage]}
      data-domain={domainKey}
      className="relative h-[245svh] scroll-mt-24"
    >
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] min-h-[40rem] items-center overflow-hidden py-5 sm:top-20 sm:h-[calc(100svh-5rem)] sm:py-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_62%,hsl(var(--brand)/.16),transparent_38%),linear-gradient(to_bottom,transparent,hsl(var(--background)/.4))]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[62%] h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent" />

        <div className="relative mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-brand">
              {ro ? "Website · aplicație · agent AI" : "Website · app · AI agent"}
            </p>
            <div className="mt-3 min-h-[9.75rem] rounded-3xl border border-border/65 bg-background/72 p-4 shadow-soft backdrop-blur-xl sm:min-h-[10.25rem] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-left text-[10px] font-bold uppercase tracking-[.18em] text-brand">{activeContent.eyebrow}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">0{activeStage + 1} / 03</span>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold leading-tight tracking-[-.03em] sm:text-2xl">{activeContent.title}</h3>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">{activeContent.description}</p>
              <Link
                to={activeContent.path}
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 motion-reduce:transform-none"
              >
                {activeContent.cta}<ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto mt-5 max-w-4xl [perspective:1500px] sm:mt-7">
            <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(48px,.55fr)_minmax(78px,1fr)] items-end gap-1.5 sm:grid-cols-[minmax(0,2.15fr)_minmax(92px,.7fr)_minmax(170px,1.3fr)] sm:gap-5 lg:gap-7">
              <div
                ref={(element) => { deviceRefs.current[0] = element; }}
                data-testid="showcase-device-laptop"
                className="relative origin-bottom transform-gpu transition-[opacity,filter] duration-200 will-change-transform"
              >
                <div className="rounded-t-[.9rem] border border-white/15 bg-gradient-to-br from-[#2a2235] via-[#171020] to-[#09070f] p-1.5 shadow-[0_35px_90px_-35px_rgba(0,0,0,.95)] sm:rounded-t-[1.3rem] sm:p-2.5">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[.55rem] border border-white/10 bg-[#080610] p-2 text-left sm:rounded-[.85rem] sm:p-4">
                    <div className="flex items-center gap-1 border-b border-white/10 pb-1.5 sm:gap-1.5 sm:pb-2">
                      <span className="size-1 rounded-full bg-rose-300/70 sm:size-1.5" /><span className="size-1 rounded-full bg-amber-300/70 sm:size-1.5" /><span className="size-1 rounded-full bg-emerald-300/70 sm:size-1.5" />
                      <span className="ml-1.5 truncate text-[4px] font-bold uppercase tracking-[.16em] text-white/55 sm:ml-3 sm:text-[7px]">{domainLabel}</span>
                      <span className="ml-auto hidden text-[6px] text-white/30 sm:block">Servicii&nbsp;&nbsp; Despre&nbsp;&nbsp; Contact</span>
                    </div>
                    <div className="grid h-[calc(100%-1rem)] grid-cols-[1.08fr_.92fr] items-center gap-2 sm:h-[calc(100%-1.5rem)] sm:gap-4">
                      <div>
                        <span className="text-[4px] font-black uppercase tracking-[.2em] text-fuchsia-300 sm:text-[7px]">{ro ? "Prezență digitală construită pentru tine" : "A digital presence built for you"}</span>
                        <p className="mt-1 max-w-[14ch] font-display text-[8px] font-bold leading-[1.05] tracking-[-.04em] text-white sm:mt-2 sm:text-base lg:text-xl">{websiteTitle}</p>
                        <div className="mt-2 grid gap-1 sm:mt-3"><span className="h-0.5 w-11/12 rounded-full bg-white/16 sm:h-1" /><span className="h-0.5 w-8/12 rounded-full bg-white/10 sm:h-1" /></div>
                        <span className="mt-2 inline-flex rounded-full bg-lime-300 px-1.5 py-1 text-[4px] font-black text-[#0a0710] sm:mt-3 sm:px-3 sm:text-[7px]">{ro ? "SOLICITĂ OFERTĂ" : "REQUEST A QUOTE"}</span>
                      </div>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-white/10 bg-gradient-to-br from-fuchsia-400/30 via-violet-500/15 to-sky-400/20 sm:rounded-xl">
                        <div className="absolute -right-[18%] -top-[18%] size-[74%] rounded-full border border-white/15 bg-white/[.05]" />
                        <div className="absolute bottom-[12%] left-[10%] right-[10%] grid grid-cols-3 gap-1 sm:gap-1.5">
                          {[0, 1, 2].map((item) => <span key={item} className="aspect-square rounded-sm border border-white/10 bg-black/25 backdrop-blur sm:rounded-md" />)}
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.08] via-transparent to-transparent" />
                  </div>
                </div>
                <div className="mx-[-5%] h-2 rounded-b-xl border border-t-0 border-white/10 bg-gradient-to-b from-[#1b1524] to-[#0b0810] sm:h-3 sm:rounded-b-2xl" />
                <div className="mx-auto h-0.5 w-[18%] rounded-b-md bg-white/10 sm:h-1" />
                <p className="mt-2 text-center font-mono text-[7px] uppercase tracking-[.22em] text-muted-foreground sm:text-[9px]">{ro ? "Laptop · website" : "Laptop · website"}</p>
              </div>

              <div
                ref={(element) => { deviceRefs.current[1] = element; }}
                data-testid="showcase-device-phone"
                className="relative origin-bottom transform-gpu transition-[opacity,filter] duration-200 will-change-transform"
              >
                <div className="rounded-[1.1rem] border border-white/15 bg-gradient-to-br from-[#2a2235] to-[#09070f] p-1 shadow-[0_28px_65px_-28px_rgba(0,0,0,.95)] sm:rounded-[1.8rem] sm:p-1.5">
                  <div className="relative aspect-[9/19] overflow-hidden rounded-[.9rem] border border-white/10 bg-[#080610] p-1.5 sm:rounded-[1.4rem] sm:p-2">
                    <div className="mx-auto h-0.5 w-1/3 rounded-full bg-white/20 sm:h-1" />
                    <div className="mt-2 flex items-center justify-between sm:mt-3"><span className="text-[4px] font-black text-white sm:text-[6px]">AVY APP</span><span className="size-1.5 rounded-full bg-lime-300 sm:size-2" /></div>
                    <div className="mt-1.5 rounded-md bg-gradient-to-br from-indigo-400/30 to-fuchsia-400/10 p-1.5 sm:mt-2 sm:rounded-xl sm:p-2">
                      <p className="text-[4px] font-bold text-white sm:text-[7px]">{ro ? "Bun venit" : "Welcome"}</p>
                      <p className="mt-0.5 text-[3px] text-white/45 sm:text-[5px]">{ro ? "Totul într-un singur loc" : "Everything in one place"}</p>
                    </div>
                    <div className="mt-1.5 grid gap-1 sm:mt-2 sm:gap-1.5">
                      {["Fluxuri", "Programări", "Notificări"].map((label, index) => (
                        <div key={label} className="flex items-center gap-1 rounded border border-white/[.07] bg-white/[.035] p-1 sm:rounded-lg sm:p-1.5">
                          <span className={`size-1.5 rounded-sm sm:size-2.5 ${index === 0 ? "bg-indigo-300" : index === 1 ? "bg-fuchsia-300" : "bg-sky-300"}`} />
                          <span className="truncate text-[3px] text-white/55 sm:text-[5px]">{ro ? label : ["Flows", "Bookings", "Alerts"][index]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-1.5 bottom-1.5 grid grid-cols-3 gap-1 rounded-md border border-white/[.07] bg-white/[.04] p-1 sm:inset-x-2 sm:bottom-2 sm:rounded-lg">
                      {[0, 1, 2].map((item) => <span key={item} className={`mx-auto size-1 rounded-full sm:size-1.5 ${item === 0 ? "bg-indigo-300" : "bg-white/20"}`} />)}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center font-mono text-[6px] uppercase tracking-[.16em] text-muted-foreground sm:text-[8px]">{ro ? "Telefon · aplicație" : "Phone · app"}</p>
              </div>

              <div
                ref={(element) => { deviceRefs.current[2] = element; }}
                data-testid="showcase-device-tablet"
                className="relative origin-bottom transform-gpu transition-[opacity,filter] duration-200 will-change-transform"
              >
                <div className="rounded-[.8rem] border border-white/15 bg-gradient-to-br from-[#2a2235] to-[#09070f] p-1 shadow-[0_30px_70px_-28px_rgba(0,0,0,.95)] sm:rounded-[1.35rem] sm:p-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[.55rem] border border-white/10 bg-[#080610] sm:rounded-[.95rem]">
                    <div className="grid h-full grid-cols-[22%_78%]">
                      <div className="border-r border-white/[.08] bg-white/[.025] p-1 sm:p-2">
                        <div className="flex items-center gap-1"><Sparkles className="size-1.5 text-fuchsia-300 sm:size-3" aria-hidden /><span className="hidden text-[5px] font-bold text-white sm:inline">AVY</span></div>
                        <div className="mt-2 grid gap-1 sm:mt-3 sm:gap-1.5">{[0, 1, 2, 3].map((item) => <span key={item} className={`h-1 rounded-full sm:h-1.5 ${item === 1 ? "bg-fuchsia-300/60" : "bg-white/10"}`} />)}</div>
                      </div>
                      <div className="p-1.5 text-left sm:p-2.5">
                        <div className="flex items-center justify-between"><span className="text-[4px] font-bold text-white sm:text-[7px]">AI workspace</span><Bot className="size-1.5 text-sky-300 sm:size-3" aria-hidden /></div>
                        <div className="mt-1.5 rounded border border-fuchsia-300/15 bg-fuchsia-400/[.07] p-1.5 sm:mt-2 sm:rounded-lg sm:p-2">
                          <p className="flex items-center gap-1 text-[4px] font-bold text-fuchsia-200 sm:text-[6px]"><MessageSquareText className="size-1.5 sm:size-2.5" aria-hidden />{ro ? "Propunere pregătită" : "Proposal ready"}</p>
                          <div className="mt-1.5 grid gap-1"><span className="h-0.5 w-full rounded-full bg-white/14 sm:h-1" /><span className="h-0.5 w-4/5 rounded-full bg-white/10 sm:h-1" /><span className="h-0.5 w-2/3 rounded-full bg-white/10 sm:h-1" /></div>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-1 sm:mt-2 sm:gap-1.5">
                          <span className="rounded border border-white/10 py-1 text-center text-[3px] font-semibold text-white/60 sm:rounded-md sm:py-1.5 sm:text-[5px]">{ro ? "Propune modificare" : "Request revision"}</span>
                          <span className="flex items-center justify-center gap-0.5 rounded bg-lime-300 py-1 text-center text-[3px] font-black text-[#0c0812] sm:rounded-md sm:py-1.5 sm:text-[5px]"><Check className="size-1 sm:size-2" aria-hidden />{ro ? "Aprobă" : "Approve"}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 rounded bg-white/[.035] p-1 sm:mt-2 sm:rounded-md sm:p-1.5"><span className="size-1 rounded-full bg-emerald-300 sm:size-1.5" /><span className="truncate text-[3px] text-white/45 sm:text-[5px]">{ro ? "Agentul continuă după decizia echipei" : "The agent continues after the team's decision"}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center font-mono text-[6px] uppercase tracking-[.16em] text-muted-foreground sm:text-[8px]">{ro ? "Tabletă · agent AI" : "Tablet · AI agent"}</p>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-4 grid max-w-xl grid-cols-3 gap-2 sm:mt-5" aria-label={ro ? "Etapele experienței" : "Experience stages"}>
            {stages.map((stage, index) => (
              <button
                key={stage.label}
                type="button"
                aria-current={activeStage === index ? "step" : undefined}
                onClick={() => moveToStage(index)}
                className={`rounded-xl border px-2 py-2 text-[9px] font-bold uppercase tracking-[.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 sm:text-[10px] ${
                  activeStage === index
                    ? "border-brand/50 bg-brand/12 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryDeviceShowcase;
