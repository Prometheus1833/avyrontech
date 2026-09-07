import {
  Accessibility,
  CalendarRange,
  CheckCircle2,
  Gauge,
  Laptop,
  Layers,
  Lock,
  MonitorSmartphone,
  Rocket,
  ServerCog,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Panel, Section, SectionHead } from "./ui";

/* SCENE 12 — devices. SCENE 13 — technical quality. SCENE 14 — scale & process. */

const devices = {
  ro: {
    eyebrow: "Orice ecran",
    title: "Aceeași experiență, de la telefon la desktop",
    lead: "Layout adaptiv, imagini optimizate și navigare confortabilă indiferent de dispozitiv.",
    items: [
      { icon: Smartphone, t: "Mobil", d: "Citit cu o mână, meniu accesibil, încărcare rapidă." },
      { icon: Tablet, t: "Tabletă", d: "Coloane echilibrate și spațiere confortabilă." },
      { icon: Laptop, t: "Desktop", d: "Cuprins lateral, lectură amplă, densitate corectă." },
      { icon: MonitorSmartphone, t: "Ecrane mari", d: "Lățimi controlate, fără linii obositoare." },
    ],
  },
  en: {
    eyebrow: "Any screen",
    title: "The same experience, from phone to desktop",
    lead: "Adaptive layout, optimised images and comfortable navigation on every device.",
    items: [
      { icon: Smartphone, t: "Mobile", d: "One-handed reading, accessible menu, fast loading." },
      { icon: Tablet, t: "Tablet", d: "Balanced columns and comfortable spacing." },
      { icon: Laptop, t: "Desktop", d: "Side contents, wide reading, correct density." },
      { icon: MonitorSmartphone, t: "Large screens", d: "Controlled widths, no tiring line lengths." },
    ],
  },
} as const;

export const DeviceExperience = () => {
  const { lang } = useLang();
  const c = devices[lang];
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

const tech = {
  ro: {
    eyebrow: "Calitate tehnică",
    title: "Fundația pe care crește conținutul",
    lead: "Un blog rapid nu este un detaliu estetic: influențează indexarea, atenția cititorului și conversia.",
    items: [
      { icon: Gauge, t: "Performanță", d: "Timp de încărcare mic și Core Web Vitals urmărite constant." },
      { icon: Accessibility, t: "Accesibilitate", d: "Contrast corect, navigare din tastatură, etichete clare." },
      { icon: Lock, t: "Securitate", d: "Bune practici de securitate, protecție anti-spam la formulare." },
      { icon: ServerCog, t: "Infrastructură", d: "Livrare pe rețea globală, backup și monitorizare." },
      { icon: Layers, t: "Cod curat", d: "Componente reutilizabile, ușor de extins în timp." },
      { icon: Rocket, t: "Scalabilitate", d: "Structură pregătită pentru volume mari de conținut." },
    ],
  },
  en: {
    eyebrow: "Technical quality",
    title: "The foundation your content grows on",
    lead: "A fast blog is not a cosmetic detail: it affects indexing, reader attention and conversion.",
    items: [
      { icon: Gauge, t: "Performance", d: "Low load times and Core Web Vitals monitored continuously." },
      { icon: Accessibility, t: "Accessibility", d: "Correct contrast, keyboard navigation, clear labels." },
      { icon: Lock, t: "Security", d: "Security best practices and anti-spam protection on forms." },
      { icon: ServerCog, t: "Infrastructure", d: "Global network delivery, backups and monitoring." },
      { icon: Layers, t: "Clean code", d: "Reusable components, easy to extend over time." },
      { icon: Rocket, t: "Scalability", d: "A structure ready for high content volume." },
    ],
  },
} as const;

export const TechnicalQuality = () => {
  const { lang } = useLang();
  const c = tech[lang];
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

const process = {
  ro: {
    eyebrow: "Proces",
    title: "De la discuție la primul articol publicat",
    lead: "Un proces scurt, clar, cu livrabile vizibile la fiecare pas.",
    steps: [
      { t: "Discuție & obiective", d: "Înțelegem publicul, subiectele și obiectivul comercial." },
      { t: "Arhitectură editorială", d: "Categorii, tipuri de conținut și structura articolelor." },
      { t: "Design & interfață", d: "Identitate vizuală editorială, adaptată brandului tău." },
      { t: "Dezvoltare & CMS", d: "Platforma, panoul de administrare și integrările alese." },
      { t: "SEO & analytics", d: "Metadate, date structurate, sitemap, urmărire evenimente." },
      { t: "Lansare & instruire", d: "Publicăm împreună primele articole și predăm platforma." },
    ],
    note: "Durata exactă depinde de complexitatea aleasă în configurator și de ritmul de livrare a conținutului.",
  },
  en: {
    eyebrow: "Process",
    title: "From the first conversation to the first published article",
    lead: "A short, clear process with visible deliverables at every step.",
    steps: [
      { t: "Discovery & goals", d: "We map the audience, the topics and the commercial goal." },
      { t: "Editorial architecture", d: "Categories, content types and article structure." },
      { t: "Design & interface", d: "An editorial visual identity aligned with your brand." },
      { t: "Development & CMS", d: "The platform, the admin panel and the chosen integrations." },
      { t: "SEO & analytics", d: "Metadata, structured data, sitemap, event tracking." },
      { t: "Launch & training", d: "We publish the first articles together and hand over the platform." },
    ],
    note: "The exact timeline depends on the complexity chosen in the configurator and on how fast content is delivered.",
  },
} as const;

export const ProcessTimeline = () => {
  const { lang } = useLang();
  const c = process[lang];
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

const included = {
  ro: {
    eyebrow: "Inclus în pachetul de bază",
    title: "Ce primești de la bun început",
    lead: "Tot ce are nevoie un blog profesional pentru a fi publicat, indexat și măsurat.",
    items: [
      "Design editorial personalizat",
      "Pagină de blog și pagini de articol",
      "Pagini de categorie și autor",
      "CMS complet pentru publicare",
      "Editor de conținut cu previzualizare",
      "SEO tehnic complet",
      "Date structurate pentru articole",
      "Sitemap și feed RSS",
      "Optimizare pentru mobil",
      "Mod întunecat",
      "Căutare de bază în conținut",
      "Formular de contact / lead",
      "Integrare Google Analytics 4",
      "Optimizare de performanță",
      "Instruire pentru utilizare",
    ],
  },
  en: {
    eyebrow: "Included in the base package",
    title: "What you get from day one",
    lead: "Everything a professional blog needs in order to be published, indexed and measured.",
    items: [
      "Custom editorial design",
      "Blog listing and article pages",
      "Category and author pages",
      "Full publishing CMS",
      "Content editor with preview",
      "Complete technical SEO",
      "Structured data for articles",
      "Sitemap and RSS feed",
      "Mobile optimisation",
      "Dark mode",
      "Basic content search",
      "Contact / lead form",
      "Google Analytics 4 integration",
      "Performance optimisation",
      "Usage training",
    ],
  },
} as const;

export const IncludedFeatures = () => {
  const { lang } = useLang();
  const c = included[lang];
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
