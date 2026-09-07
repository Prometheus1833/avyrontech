import {
  Building2,
  GraduationCap,
  Landmark,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Newspaper,
  PenLine,
  Search,
  Stethoscope,
  Target,
  UsersRound,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Panel, Section, SectionHead } from "./ui";

/* SCENE 02 — from idea to lead. SCENE 03 — who it is for. */

const journey = {
  ro: {
    eyebrow: "Traseul conținutului",
    title: "De la o idee la un client",
    lead: "Un articol bun nu se termină la publicare. Îl construim ca pe un sistem: se scrie, se structurează, se indexează, se distribuie, se citește și se transformă în lead.",
    steps: [
      { icon: Lightbulb, t: "Idee", d: "Pornim de la întrebările reale ale clienților tăi." },
      { icon: PenLine, t: "Articol", d: "Structură editorială clară, ușor de scris și de actualizat." },
      { icon: Search, t: "Indexare", d: "Structuri semantice și date structurate pregătite pentru motoare." },
      { icon: Megaphone, t: "Distribuție", d: "Social, newsletter și linking intern automat." },
      { icon: UsersRound, t: "Lectură", d: "Experiență de citit rapidă, curată, plăcută pe mobil." },
      { icon: MousePointerClick, t: "Lead", d: "CTA contextual, formular scurt și urmărire în analytics." },
    ],
  },
  en: {
    eyebrow: "Content journey",
    title: "From an idea to a client",
    lead: "A good article does not end at publishing. We build it as a system: written, structured, indexed, distributed, read and turned into a lead.",
    steps: [
      { icon: Lightbulb, t: "Idea", d: "We start from the real questions your clients ask." },
      { icon: PenLine, t: "Article", d: "A clear editorial structure, easy to write and to update." },
      { icon: Search, t: "Indexing", d: "Semantic structure and structured data ready for engines." },
      { icon: Megaphone, t: "Distribution", d: "Social, newsletter and automated internal linking." },
      { icon: UsersRound, t: "Reading", d: "A fast, clean, genuinely pleasant mobile reading experience." },
      { icon: MousePointerClick, t: "Lead", d: "Contextual CTA, short form and analytics tracking." },
    ],
  },
} as const;

const audiences = {
  ro: {
    eyebrow: "Pentru cine",
    title: "Blogul potrivit pentru fiecare tip de autoritate",
    lead: "Aceeași fundație tehnică, structuri editoriale diferite.",
    items: [
      { icon: Building2, t: "Blog de business", d: "Servicii, studii de caz și expertiză care aduc cereri de ofertă." },
      { icon: Target, t: "Blog de expert", d: "Brand personal, opinie și poziționare într-o nișă." },
      { icon: Landmark, t: "Content hub", d: "Ghiduri și resurse organizate pe categorii și niveluri." },
      { icon: Newspaper, t: "Publicație / newsroom", d: "Volum mare de articole, autori multipli, fluxuri redacționale." },
      { icon: Stethoscope, t: "Nișe reglementate", d: "Medical, juridic, financiar — conținut clar și responsabil." },
      { icon: GraduationCap, t: "Educație & training", d: "Cursuri, lecții și materiale descărcabile." },
    ],
  },
  en: {
    eyebrow: "Who it is for",
    title: "The right blog for every kind of authority",
    lead: "The same technical foundation, different editorial structures.",
    items: [
      { icon: Building2, t: "Business blog", d: "Services, case studies and expertise that generate enquiries." },
      { icon: Target, t: "Expert blog", d: "Personal brand, opinion and positioning inside a niche." },
      { icon: Landmark, t: "Content hub", d: "Guides and resources organised by category and level." },
      { icon: Newspaper, t: "Publication / newsroom", d: "High article volume, multiple authors, editorial workflows." },
      { icon: Stethoscope, t: "Regulated niches", d: "Medical, legal, financial — clear and responsible content." },
      { icon: GraduationCap, t: "Education & training", d: "Courses, lessons and downloadable material." },
    ],
  },
} as const;

export const ContentJourney = () => {
  const { lang } = useLang();
  const c = journey[lang];
  return (
    <Section id="content-journey" scene="journey" tone="soft" labelledBy="content-journey-title">
      <SectionHead id="content-journey-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <ol className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c.steps.map((step, i) => (
          <li key={step.t} data-reveal>
            <Panel className="group h-full p-4 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
                  <step.icon className="size-4.5" aria-hidden />
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
  const c = audiences[lang];
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
