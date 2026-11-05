import { arch,seo } from '@/data/managedServiceCopy/blogSeoSection';
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import { Panel,Section,SectionHead } from "./ui";

/* SCENE 06 — SEO engine. SCENE 07 — content architecture. */



export const SeoEngine = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogSeoSection.seo',seo)[lang];
  return (
    <Section id="seo" scene="seo" tone="graphite" labelledBy="seo-title">
      <SectionHead id="seo-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} invert />
      <div className="mt-9 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {c.items.map((item) => (
            <li
              key={item.t}
              data-reveal
              className="rounded-2xl border border-background/15 bg-background/[0.06] p-4 transition-colors duration-300 hover:border-background/35"
            >
              <item.icon className="size-5 text-brand-glow" aria-hidden />
              <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight text-background">{item.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-background/65">{item.d}</p>
            </li>
          ))}
        </ul>

        <Panel invert className="h-fit p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-background/55">{c.preview.label}</p>
          <div className="mt-3 rounded-xl bg-background/95 p-3.5 text-foreground">
            <p className="text-[11px] text-muted-foreground">{c.preview.url}</p>
            <p className="mt-1 text-sm font-semibold text-brand">{c.preview.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.preview.desc}</p>
          </div>
          <div className="mt-3 rounded-xl border border-background/15 p-3.5">
            <div aria-hidden className="h-16 rounded-lg bg-gradient-to-br from-brand/40 to-brand-2/30" />
            <p className="mt-2 text-xs font-semibold text-background">{c.preview.title}</p>
            <p className="mt-1 text-[11px] text-background/60">avyron.ro</p>
          </div>
        </Panel>
      </div>
    </Section>
  );
};



export const ContentArchitecture = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogSeoSection.arch',arch)[lang];
  const radius = 122;
  const center = { x: 170, y: 150 };

  return (
    <Section id="arhitectura" scene="architecture" labelledBy="arch-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div>
          <SectionHead id="arch-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
          <ul className="mt-5 space-y-2.5">
            {c.notes.map((n) => (
              <li key={n} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {n}
              </li>
            ))}
          </ul>
        </div>

        <div data-reveal className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-soft">
          <svg viewBox="0 0 340 300" role="img" aria-label={c.title} className="h-auto w-full">
            <g stroke="hsl(var(--border))" strokeWidth="1.2">
              {c.nodes.map((_, i) => {
                const a = (i / c.nodes.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <line
                    key={i}
                    x1={center.x}
                    y1={center.y}
                    x2={center.x + Math.cos(a) * radius}
                    y2={center.y + Math.sin(a) * radius}
                  />
                );
              })}
            </g>
            {c.nodes.map((node, i) => {
              const a = (i / c.nodes.length) * Math.PI * 2 - Math.PI / 2;
              const x = center.x + Math.cos(a) * radius;
              const y = center.y + Math.sin(a) * radius;
              return (
                <g key={node}>
                  <circle cx={x} cy={y} r="26" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
                  <text
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {node}
                  </text>
                </g>
              );
            })}
            <circle cx={center.x} cy={center.y} r="44" fill="hsl(var(--brand))" opacity="0.12" />
            <circle cx={center.x} cy={center.y} r="34" fill="hsl(var(--brand))" />
            <text
              x={center.x}
              y={center.y + 3}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="hsl(var(--brand-foreground))"
            >
              {c.center}
            </text>
          </svg>
        </div>
      </div>
    </Section>
  );
};
