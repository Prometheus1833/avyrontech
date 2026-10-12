import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, ChevronDown, Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { PhoneScreen, TabletScreen, WebsiteScreen } from "./ShowcaseScreens";
import { appModes, automationModes, domainContent, type AppMode, type AutomationMode } from "./showcaseContent";
import "./device-showcase.css";

export type ShowcaseDomain = { key: string; label: string; title: string; description: string };
type Props = { domains: ShowcaseDomain[]; activeDomain: string; onDomainChange: (key: string) => void };

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
const phaseAt = (progress: number) => smooth(.23, .42, progress) + smooth(.62, .81, progress);
const anchors = [.10, .52, .90];
const stageKeys = ["laptop", "phone", "tablet"];

function Laptop({ domain, ro }: { domain: ShowcaseDomain; ro: boolean }) {
  const content = domainContent(domain.key, ro);
  return (
    <div className="laptop-composition" style={{ "--domain-accent": content.accent } as CSSProperties}>
      <ul className="domain-notes domain-notes--top" data-testid="website-domain-details">
        {content.details.slice(0, 3).map((detail, index) => <li key={detail.title}><span>0{index + 1}</span><div><strong>{detail.title}</strong><p>{detail.description}</p></div></li>)}
      </ul>
      <div className="laptop-space">
        <div className="laptop-object">
          <div className="laptop-lid">
            <span className="laptop-webcam" aria-hidden="true"><i /></span>
            <div className="laptop-display"><WebsiteScreen domain={domain} ro={ro} /></div>
            <span className="laptop-wordmark" aria-hidden="true">AVYRON</span>
          </div>
          <div className="laptop-hinge" aria-hidden="true" />
          <div className="laptop-deck" aria-hidden="true">
            <div className="laptop-speaker" /><div className="laptop-keyboard">{Array.from({ length: 60 }, (_, index) => <i key={index} />)}</div><div className="laptop-speaker" />
            <span className="laptop-trackpad" />
          </div>
          <div className="laptop-edge" aria-hidden="true"><i /><span /><i /></div>
        </div>
      </div>
      <ul className="domain-notes domain-notes--bottom">
        {content.details.slice(3, 6).map((detail, index) => <li key={detail.title}><span>0{index + 4}</span><div><strong>{detail.title}</strong><p>{detail.description}</p></div></li>)}
      </ul>
    </div>
  );
}

function Phone({ mode, ro }: { mode: AppMode; ro: boolean }) {
  return (
    <div className="phone-object">
      <span className="phone-button phone-button--mute" aria-hidden="true" /><span className="phone-button phone-button--up" aria-hidden="true" /><span className="phone-button phone-button--down" aria-hidden="true" /><span className="phone-button phone-button--power" aria-hidden="true" />
      <span className="phone-antenna phone-antenna--top" aria-hidden="true" /><span className="phone-antenna phone-antenna--bottom" aria-hidden="true" />
      <div className="phone-glass"><span className="phone-island" aria-hidden="true"><i /></span><PhoneScreen mode={mode} ro={ro} /><span className="device-glass-light" aria-hidden="true" /></div>
    </div>
  );
}

function Tablet({ mode, ro }: { mode: AutomationMode; ro: boolean }) {
  return (
    <div className="tablet-object">
      <span className="tablet-button" aria-hidden="true" /><span className="tablet-volume" aria-hidden="true" /><span className="tablet-camera" aria-hidden="true"><i /></span>
      <div className="tablet-glass"><TabletScreen mode={mode} ro={ro} /><span className="device-glass-light" aria-hidden="true" /></div>
      <span className="tablet-pencil" aria-hidden="true"><i /></span><span className="tablet-speakers" aria-hidden="true" />
    </div>
  );
}

export default function IndustryDeviceShowcase({ domains, activeDomain, onDomainChange }: Props) {
  const { lang } = useLang();
  const ro = lang === "ro";
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const domainTriggerRef = useRef<HTMLButtonElement>(null);
  const deviceRefs = useRef<Array<HTMLDivElement | null>>([]);
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const controller = useRef<(stage: number) => void>(() => undefined);
  const [activeStage, setActiveStage] = useState(0);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("app");
  const [automationMode, setAutomationMode] = useState<AutomationMode>("social");
  const domain = useMemo(() => domains.find((item) => item.key === activeDomain) ?? domains[0], [domains, activeDomain]);

  useEffect(() => {
    if (!domainsOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setDomainsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDomainsOpen(false);
        domainTriggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [domainsOpen]);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    if (!section || !frame) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = false;
    let current = 0;
    let target = 0;
    let lastTime = 0;
    let active = 0;
    let travel = 1;
    let stickyTop = 80;

    const paint = (progress: number, manualStage?: number) => {
      const phase = manualStage ?? phaseAt(progress);
      const nextStage = Math.min(2, Math.round(phase));
      const drift = reduced.matches ? 0 : Math.sin(progress * Math.PI * 2) * 1.8;
      deviceRefs.current.forEach((device, index) => {
        if (!device) return;
        const direction = index - phase;
        const distance = Math.abs(direction);
        const opacity = 1 - smooth(.16, .90, distance);
        const hidden = opacity < .005;
        device.style.visibility = hidden ? "hidden" : "visible";
        device.style.opacity = opacity.toFixed(3);
        device.style.transform = reduced.matches ? "none" :
          `translate3d(${(direction * 48).toFixed(2)}%, ${(distance * 74).toFixed(1)}px, ${(-distance * 210).toFixed(1)}px) rotateX(${(distance * 16 + drift).toFixed(2)}deg) rotateY(${(direction * -32 + drift).toFixed(2)}deg) rotateZ(${(direction * 4).toFixed(2)}deg) scale(${(1 - Math.min(distance, 1) * .12).toFixed(3)})`;
        device.style.pointerEvents = index === nextStage ? "auto" : "none";
        device.inert = index !== nextStage;
        device.setAttribute("aria-hidden", String(index !== nextStage));
        device.style.willChange = visible && !reduced.matches ? "transform, opacity" : "auto";
      });
      barsRef.current.forEach((bar, index) => {
        if (bar) bar.style.transform = `scaleX(${clamp(phase - index + 1).toFixed(3)})`;
      });
      if (lightRef.current) lightRef.current.style.transform = `translate3d(${-8 + progress * 16}%,0,0)`;
      if (active !== nextStage) {
        active = nextStage;
        setActiveStage(nextStage);
        setDomainsOpen(false);
      }
    };
    const measure = () => {
      stickyTop = Number.parseFloat(getComputedStyle(frame).top) || 0;
      travel = Math.max(1, section.offsetHeight - frame.offsetHeight);
    };
    const readTarget = () => {
      target = clamp((stickyTop - section.getBoundingClientRect().top) / travel);
    };
    const tick = (time: number) => {
      raf = 0;
      if (!visible || document.hidden || reduced.matches) return;
      readTarget();
      const delta = Math.min(time - (lastTime || time - 16), 64);
      lastTime = time;
      current += (target - current) * (1 - Math.exp(-delta / 65));
      if (Math.abs(target - current) < .00015) current = target;
      paint(current);
      if (current !== target) raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (visible && !document.hidden && !reduced.matches && !raf) {
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const modeChanged = () => {
      section.dataset.motion = reduced.matches ? "reduced" : "full";
      measure();
      if (reduced.matches) paint(anchors[active], active);
      else { readTarget(); current = target; paint(current); schedule(); }
    };
    const resize = new ResizeObserver(() => { measure(); schedule(); });
    resize.observe(section);
    resize.observe(frame);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { measure(); readTarget(); current = target; paint(current, reduced.matches ? active : undefined); schedule(); }
      else { if (raf) cancelAnimationFrame(raf); raf = 0; deviceRefs.current.forEach((device) => { if (device) device.style.willChange = "auto"; }); }
    }, { rootMargin: "10% 0px" });
    observer.observe(section);
    controller.current = (stage: number) => {
      if (reduced.matches) { active = stage; setActiveStage(stage); setDomainsOpen(false); paint(anchors[stage], stage); return; }
      measure();
      const top = window.scrollY + section.getBoundingClientRect().top;
      window.scrollTo({ top: top - stickyTop + travel * anchors[stage], behavior: "smooth" });
    };
    modeChanged();
    window.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", modeChanged);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      document.removeEventListener("visibilitychange", schedule);
      reduced.removeEventListener("change", modeChanged);
      controller.current = () => undefined;
    };
  }, []);

  const stages = [
    { label: "Website", path: ro ? "/servicii/website-prezentare-profesional" : "/en/services/professional-presentation-website", cta: ro ? "Serviciul Website" : "Website service" },
    { label: ro ? "Aplicație" : "Application", path: ro ? "/servicii/aplicatii-si-platforme" : "/en/services/apps-and-platforms", cta: ro ? "Aplicații și platforme" : "Apps and platforms" },
    { label: ro ? "Automatizări" : "Automations", path: ro ? "/servicii/automatizari-si-ai" : "/en/services/automation-and-ai", cta: ro ? "Automatizări și AI" : "Automation and AI" },
  ];
  return (
    <div ref={sectionRef} id="domenii" className="device-showcase" data-testid="industry-device-showcase" data-active-stage={stageKeys[activeStage]} data-domain={domain.key}>
      <div ref={frameRef} className="device-scene">
        <div ref={lightRef} className="scene-light" aria-hidden="true" /><div className="scene-floor" aria-hidden="true" />
        <div className="scene-content">
          <div className="scene-header">
            <div><p><ArrowDown size={11}/>{ro ? "Explorează prin scroll" : "Explore by scrolling"}<span> / {ro ? "Exemple de interfețe" : "Interface examples"}</span></p><h3 className="font-display" aria-live="polite">{stages[activeStage].label}</h3></div>
            <Link to={stages[activeStage].path}>{stages[activeStage].cta}<ArrowUpRight size={14}/></Link>
          </div>
          <div className="scene-progress" aria-label={ro ? "Progres servicii" : "Services progress"}>
            {stages.map((stage, index) => <button type="button" key={stage.label} aria-label={stage.label} aria-current={activeStage === index ? "step" : undefined} onClick={() => controller.current(index)}><span><i ref={(el) => { barsRef.current[index] = el; }}/></span><strong>0{index + 1} <b> / </b>{stage.label}</strong></button>)}
          </div>
          <div className="scene-viewport">
            <div ref={(el) => { deviceRefs.current[0] = el; }} className="scene-device scene-device--laptop" data-testid="showcase-device-laptop"><Laptop domain={domain} ro={ro}/></div>
            <div ref={(el) => { deviceRefs.current[1] = el; }} className="scene-device scene-device--phone" data-testid="showcase-device-phone"><Phone mode={appMode} ro={ro}/></div>
            <div ref={(el) => { deviceRefs.current[2] = el; }} className="scene-device scene-device--tablet" data-testid="showcase-device-tablet"><Tablet mode={automationMode} ro={ro}/></div>
          </div>
          <div className="scene-controls">
            {activeStage === 0 && <div className="website-controls">
              <div ref={pickerRef} className="domain-picker">
                <button ref={domainTriggerRef} type="button" aria-expanded={domainsOpen} aria-controls="showcase-domains" className="domain-trigger" onClick={() => setDomainsOpen((open) => !open)}><Globe2 size={15}/>{ro ? "Domenii" : "Industries"}<ChevronDown size={14} style={{ transform: domainsOpen ? "rotate(180deg)" : undefined }}/></button>
                {domainsOpen && <div id="showcase-domains" className="domain-menu" role="group" aria-label={ro ? "Domeniul website-ului" : "Website industry"}>
                  {domains.map((item) => <button key={item.key} type="button" aria-pressed={item.key === domain.key} onClick={() => { onDomainChange(item.key); setDomainsOpen(false); domainTriggerRef.current?.focus({ preventScroll: true }); }}>{item.label}</button>)}
                </div>}
              </div>
              <span className="selected-domain">{domain.label}</span>
            </div>}
            {activeStage === 1 && <div className="scene-options" role="group" aria-label={ro ? "Tip aplicație" : "Application type"}>{appModes.map((item) => <button type="button" key={item.key} aria-pressed={appMode === item.key} onClick={() => setAppMode(item.key)}>{ro ? item.ro : item.en}</button>)}</div>}
            {activeStage === 2 && <div className="scene-options scene-options--automation" role="group" aria-label={ro ? "Tip automatizare" : "Automation type"}>{automationModes.map((item) => <button type="button" key={item.key} aria-pressed={automationMode === item.key} onClick={() => setAutomationMode(item.key)}>{ro ? item.ro : item.en}</button>)}</div>}
            <p className="scene-scroll-cue"><span/>{activeStage === 2 ? (ro ? "Continuă pentru a descoperi AVYRON" : "Keep scrolling to discover AVYRON") : (ro ? "Continuă scroll-ul pentru următorul serviciu" : "Keep scrolling to explore the next service")}<ArrowDown size={11}/></p>
          </div>
        </div>
      </div>
    </div>
  );
}
