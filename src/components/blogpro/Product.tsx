import { useState } from "react";
import {
  CalendarClock,
  Check,
  Eye,
  FileText,
  Image as ImageIcon,
  LayoutList,
  Moon,
  Smartphone,
  Tags,
  Type,
  Users,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Chip, Panel, Section, SectionHead } from "./ui";

/* SCENE 04 — CMS demo. SCENE 05 — reader experience. */

const cms = {
  ro: {
    eyebrow: "Panoul de administrare",
    title: "Un CMS pe care îl folosești fără manual",
    lead: "Editor curat, previzualizare instantanee, programare, autori și categorii. Publici în minute, nu în ședințe.",
    tabs: [
      { id: "editor", label: "Editor", icon: Type },
      { id: "seo", label: "SEO", icon: Eye },
      { id: "media", label: "Media", icon: ImageIcon },
      { id: "plan", label: "Planificare", icon: CalendarClock },
    ],
    panes: {
      editor: [
        "Editor vizual cu blocuri de conținut",
        "Titluri, citate, liste, cod, galerii",
        "Salvare automată și istoric versiuni",
      ],
      seo: [
        "Titlu SEO, descriere și slug editabile",
        "Previzualizare rezultat Google și card social",
        "Verificări automate înainte de publicare",
      ],
      media: [
        "Imagini optimizate automat, formate moderne",
        "Text alternativ obligatoriu pentru accesibilitate",
        "Bibliotecă media organizată și căutabilă",
      ],
      plan: [
        "Programare publicare la dată și oră",
        "Stări: ciornă, în revizuire, programat, publicat",
        "Roluri și permisiuni pentru echipă",
      ],
    },
    meta: [
      { icon: Tags, label: "Categorii" },
      { icon: Users, label: "Autori" },
      { icon: LayoutList, label: "Fluxuri de lucru" },
      { icon: FileText, label: "Ciorne nelimitate" },
    ],
  },
  en: {
    eyebrow: "Admin panel",
    title: "A CMS you can use without a manual",
    lead: "Clean editor, instant preview, scheduling, authors and categories. You publish in minutes, not in meetings.",
    tabs: [
      { id: "editor", label: "Editor", icon: Type },
      { id: "seo", label: "SEO", icon: Eye },
      { id: "media", label: "Media", icon: ImageIcon },
      { id: "plan", label: "Planning", icon: CalendarClock },
    ],
    panes: {
      editor: [
        "Visual editor built from content blocks",
        "Headings, quotes, lists, code, galleries",
        "Autosave and version history",
      ],
      seo: [
        "Editable SEO title, description and slug",
        "Google result and social card preview",
        "Automatic checks before publishing",
      ],
      media: [
        "Images optimised automatically, modern formats",
        "Alt text required for accessibility",
        "Organised, searchable media library",
      ],
      plan: [
        "Schedule publishing by date and time",
        "States: draft, in review, scheduled, published",
        "Roles and permissions for the team",
      ],
    },
    meta: [
      { icon: Tags, label: "Categories" },
      { icon: Users, label: "Authors" },
      { icon: LayoutList, label: "Workflows" },
      { icon: FileText, label: "Unlimited drafts" },
    ],
  },
} as const;

export const CmsExperience = () => {
  const { lang } = useLang();
  const c = cms[lang];
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
            return (
              <div
                key={t.id}
                role="tabpanel"
                id={`cms-pane-${t.id}`}
                aria-labelledby={`cms-tab-${t.id}`}
                className="p-4"
              >
                <ul className="space-y-2.5">
                  {c.panes[key].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div aria-hidden className="mt-4 space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
                  <div className="h-2 w-1/3 rounded-full bg-brand/40" />
                  <div className="h-2 w-full rounded-full bg-muted" />
                  <div className="h-2 w-11/12 rounded-full bg-muted" />
                  <div className="h-2 w-2/3 rounded-full bg-muted" />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </Section>
  );
};

const reader = {
  ro: {
    eyebrow: "Experiența de lectură",
    title: "Conținut care se citește, nu doar se deschide",
    lead: "Tipografie editorială, ritm vizual, mod întunecat și o experiență mobilă construită pentru atenție.",
    items: [
      { icon: Type, t: "Tipografie editorială", d: "Ierarhie clară, lungime optimă a rândului, contrast corect." },
      { icon: LayoutList, t: "Cuprins interactiv", d: "Navigare rapidă în articolele lungi, cu secțiune activă." },
      { icon: Eye, t: "Progres lectură", d: "Indicator subtil care menține contextul." },
      { icon: Moon, t: "Mod întunecat", d: "Aceleași contraste corecte în ambele teme." },
      { icon: Smartphone, t: "Mobil întâi", d: "Layout gândit pentru citit cu o singură mână." },
      { icon: FileText, t: "Articole conectate", d: "Recomandări relevante la finalul lecturii." },
    ],
    demo: { toc: "Cuprins", sections: ["Introducere", "Structura articolului", "Distribuție", "Măsurare"] },
  },
  en: {
    eyebrow: "Reading experience",
    title: "Content that gets read, not just opened",
    lead: "Editorial typography, visual rhythm, dark mode and a mobile experience built for attention.",
    items: [
      { icon: Type, t: "Editorial typography", d: "Clear hierarchy, optimal line length, correct contrast." },
      { icon: LayoutList, t: "Interactive table of contents", d: "Fast navigation in long reads with an active section." },
      { icon: Eye, t: "Reading progress", d: "A subtle indicator that keeps the context." },
      { icon: Moon, t: "Dark mode", d: "The same correct contrast in both themes." },
      { icon: Smartphone, t: "Mobile first", d: "A layout designed for one-handed reading." },
      { icon: FileText, t: "Connected articles", d: "Relevant recommendations at the end of the read." },
    ],
    demo: { toc: "Contents", sections: ["Introduction", "Article structure", "Distribution", "Measurement"] },
  },
} as const;

export const ReaderExperience = () => {
  const { lang } = useLang();
  const c = reader[lang];
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
