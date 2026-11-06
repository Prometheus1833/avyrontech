import { audiences,journey } from '@/data/managedServiceCopy/blogStory';
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import { Panel,Section,SectionHead } from "./ui";

/* SCENE 02 — from idea to lead. SCENE 03 — who it is for. */





export const ContentJourney = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogStory.journey',journey)[lang];
  return (
    <Section id="content-journey" scene="journey" tone="soft" labelledBy="content-journey-title">
      <SectionHead id="content-journey-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <ol className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c.steps.map((step, i) => (
          <li key={step.t} data-reveal>
            <Panel className="group h-full p-4 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
                  <step.icon className="size-4" aria-hidden />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-3 font-display text-base font-bold tracking-tight">{step.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
            </Panel>
          </li>
        ))}
      </ol>
    </Section>
  );
};

export const BlogAudiences = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogStory.audiences',audiences)[lang];
  return (
    <Section id="pentru-cine" scene="audiences" labelledBy="audiences-title">
      <SectionHead id="audiences-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c.items.map((item) => (
          <article
            key={item.t}
            data-reveal
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft transition-colors duration-300 hover:border-brand/40"
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-brand to-violet-500 transition-transform duration-300 group-hover:scale-x-100"
            />
            <item.icon className="size-5 text-brand" aria-hidden />
            <h3 className="mt-3 font-display text-base font-bold tracking-tight">{item.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
          </article>
        ))}
      </div>
    </Section>
  );
};
