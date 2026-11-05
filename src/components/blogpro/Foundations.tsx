import { devices,included,process,tech } from '@/data/managedServiceCopy/blogFoundations';
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import {
CalendarRange,
CheckCircle2
} from "lucide-react";
import { Panel,Section,SectionHead } from "./ui";

/* SCENE 12 — devices. SCENE 13 — technical quality. SCENE 14 — scale & process. */



export const DeviceExperience = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogFoundations.devices',devices)[lang];
  return (
    <Section id="dispozitive" scene="devices" labelledBy="devices-title">
      <SectionHead id="devices-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {c.items.map((d) => (
          <Panel key={d.t} className="p-4 transition-transform duration-300 hover:-translate-y-1">
            <d.icon className="size-5 text-brand" aria-hidden />
            <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight">{d.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.d}</p>
          </Panel>
        ))}
      </div>
    </Section>
  );
};



export const TechnicalQuality = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogFoundations.tech',tech)[lang];
  return (
    <Section id="tehnic" scene="technical" tone="soft" labelledBy="tech-title">
      <SectionHead id="tech-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c.items.map((item) => (
          <Panel key={item.t} className="p-4">
            <item.icon className="size-5 text-brand" aria-hidden />
            <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight">{item.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
          </Panel>
        ))}
      </div>
    </Section>
  );
};



export const ProcessTimeline = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogFoundations.process',process)[lang];
  return (
    <Section id="proces" scene="process" labelledBy="process-title">
      <SectionHead id="process-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <ol className="mt-9 space-y-3 border-l border-border/70 pl-5">
        {c.steps.map((s, i) => (
          <li key={s.t} data-reveal className="relative">
            <span
              aria-hidden
              className="absolute -left-[1.68rem] top-1.5 grid size-5 place-items-center rounded-full border border-border bg-card text-[10px] font-bold text-brand"
            >
              {i + 1}
            </span>
            <h3 className="font-display text-[0.95rem] font-bold tracking-tight">{s.t}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
      <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
        <CalendarRange className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        {c.note}
      </p>
    </Section>
  );
};



export const IncludedFeatures = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogFoundations.included',included)[lang];
  return (
    <Section id="inclus" scene="included" tone="soft" labelledBy="included-title">
      <SectionHead id="included-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <ul className="mt-8 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {c.items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
};
