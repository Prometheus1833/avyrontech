import { cms,reader } from '@/data/managedServiceCopy/blogProduct';
import { useServicePageContent } from '@/hooks/useServicePageContent';
import { useLang } from "@/i18n/LanguageContext";
import {
Check
} from "lucide-react";
import { useState } from "react";
import { Chip,Panel,Section,SectionHead } from "./ui";

/* SCENE 04 — CMS demo. SCENE 05 — reader experience. */



export const CmsExperience = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogProduct.cms',cms)[lang];
  const [tab, setTab] = useState<keyof typeof c.panes>("editor");

  return (
    <Section id="cms" scene="cms" tone="soft" labelledBy="cms-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <SectionHead id="cms-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
          <ul className="mt-5 flex flex-wrap gap-2">
            {c.meta.map((m) => (
              <li key={m.label}>
                <Chip>
                  <m.icon className="size-3.5 text-brand" aria-hidden />
                  {m.label}
                </Chip>
              </li>
            ))}
          </ul>
        </div>

        <Panel className="overflow-hidden p-0" >
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/60 px-3 py-2.5">
            <span aria-hidden className="size-2.5 rounded-full bg-destructive/50" />
            <span aria-hidden className="size-2.5 rounded-full bg-amber-400/60" />
            <span aria-hidden className="size-2.5 rounded-full bg-emerald-400/60" />
            <span className="ml-2 text-[11px] text-muted-foreground">avyron / cms</span>
          </div>

          <div role="tablist" aria-label={c.eyebrow} className="flex gap-1 overflow-x-auto border-b border-border/60 px-2 py-2">
            {c.tabs.map((t) => {
              const active = tab === (t.id as keyof typeof c.panes);
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  id={`cms-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`cms-pane-${t.id}`}
                  onClick={() => setTab(t.id as keyof typeof c.panes)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="size-3.5" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>

          {c.tabs.map((t) => {
            const key = t.id as keyof typeof c.panes;
            if (key !== tab) return null;
            const pane = c.panes[key];
            return (
              <div
                key={t.id}
                role="tabpanel"
                id={`cms-pane-${t.id}`}
                aria-labelledby={`cms-tab-${t.id}`}
                className="p-4"
              >
                <p className="text-sm font-semibold">{pane.d}</p>
                <ul className="mt-3 space-y-2.5">
                  {pane.lines.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {c.fnLabel}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {pane.actions.map((a) => (
                    <li key={a}>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-xs font-medium">
                        <span aria-hidden className="size-1.5 rounded-full bg-brand" />
                        {a}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Panel>
      </div>
    </Section>
  );
};




export const ReaderExperience = () => {
  const { lang } = useLang();
  const c = useServicePageContent('blog-profesional','blogProduct.reader',reader)[lang];
  return (
    <Section id="lectura" scene="reader" labelledBy="reader-title">
      <SectionHead id="reader-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <div className="mt-9 grid gap-3 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)]">
        <Panel className="p-4" >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{c.demo.toc}</p>
          <ul className="mt-3 space-y-2">
            {c.demo.sections.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                  i === 1 ? "bg-brand/10 font-semibold text-brand" : "text-muted-foreground"
                }`}
              >
                <span aria-hidden className={`h-4 w-0.5 rounded-full ${i === 1 ? "bg-brand" : "bg-border"}`} />
                {s}
              </li>
            ))}
          </ul>
          <div aria-hidden className="mt-4 space-y-2">
            <div className="h-2 w-full rounded-full bg-muted" />
            <div className="h-2 w-4/5 rounded-full bg-muted" />
            <div className="h-2 w-2/3 rounded-full bg-muted" />
          </div>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2">
          {c.items.map((item) => (
            <div
              key={item.t}
              data-reveal
              className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft transition-transform duration-300 hover:-translate-y-1"
            >
              <item.icon className="size-5 text-brand" aria-hidden />
              <h3 className="mt-3 font-display text-[0.95rem] font-bold tracking-tight">{item.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};
