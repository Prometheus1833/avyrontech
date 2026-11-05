import { ai,analytics,conversion,integrations } from '@/data/managedServiceCopy/blogGrowth';
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import { Chip,Panel,Section,SectionHead } from "./ui";

/* SCENE 08 — conversion. SCENE 09 — analytics. SCENE 10 — AI. SCENE 11 — integrations. */



export const ConversionFlow = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogGrowth.conversion',conversion)[lang];
  return (
    <Section id="conversie" scene="conversion" tone="soft" labelledBy="conversion-title">
      <SectionHead id="conversion-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <ol className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {c.steps.map((s, i) => (
          <li key={s.t} data-reveal className="relative">
            <Panel className="h-full p-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              <s.icon className="mt-2.5 size-5 text-foreground" aria-hidden />
              <h3 className="mt-2.5 font-display text-[0.95rem] font-bold tracking-tight">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </Panel>
          </li>
        ))}
      </ol>
      <ul className="mt-5 flex flex-wrap gap-2">
        {c.tools.map((t) => (
          <li key={t}>
            <Chip>{t}</Chip>
          </li>
        ))}
      </ul>
    </Section>
  );
};



export const AnalyticsSection = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogGrowth.analytics',analytics)[lang];
  return (
    <Section id="analytics" scene="analytics" labelledBy="analytics-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <SectionHead id="analytics-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {c.metrics.map((m) => (
              <li key={m.label} className="rounded-xl border border-border/70 bg-card/70 p-3.5">
                <m.icon className="size-4 text-brand" aria-hidden />
                <p className="mt-2 text-sm font-semibold">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.hint}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{c.note}</p>
        </div>

        <Panel className="p-4" >
          <div aria-hidden className="flex h-44 items-end gap-2.5">
            {c.bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand/25 to-brand" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div aria-hidden className="mt-3 grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-background/60 p-2.5">
                <div className="h-1.5 w-8 rounded-full bg-brand/40" />
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Section>
  );
};



export const AiSection = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogGrowth.ai',ai)[lang];
  return (
    <Section id="ai" scene="ai" tone="graphite" labelledBy="ai-title">
      <SectionHead id="ai-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} invert />

      <div className="mt-6" data-reveal>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-background/50">{c.modelsLabel}</p>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {c.models.map((m) => (
            <li key={m.n}>
              <Chip invert>
                <span className="font-bold text-background">{m.n}</span>
                <span className="text-background/60">{m.d}</span>
              </Chip>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c.items.map((item) => (
          <div
            key={item.t}
            data-reveal
            className="rounded-2xl border border-background/15 bg-background/[0.06] p-4 transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <item.icon className="size-5 text-brand-glow" aria-hidden />
              <span className="rounded-full border border-background/20 px-2 py-0.5 text-[10px] font-semibold text-background/70">
                {item.m}
              </span>
            </div>
            <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight text-background">{item.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-background/65">{item.d}</p>
            <p className="mt-2 border-t border-background/10 pt-2 text-xs leading-relaxed text-background/50">{item.e}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-background/50">{c.note}</p>
    </Section>
  );
};




export const Integrations = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogGrowth.integrations',integrations)[lang];
  return (
    <Section id="integrari" scene="integrations" tone="soft" labelledBy="integrations-title">
      <SectionHead id="integrations-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {c.groups.map((g) => (
          <Panel key={g.t} className="p-4">
            <g.icon className="size-5 text-brand" aria-hidden />
            <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight">{g.t}</h3>
            <ul className="mt-2.5 space-y-1.5">
              {g.items.map((i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {i}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </Section>
  );
};
