import {
  Activity,
  BarChart3,
  BellRing,
  BrainCircuit,
  CalendarCheck,
  FileSearch,
  Languages,
  Mail,
  MessageCircle,
  MousePointerClick,
  Plug,
  RefreshCcw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { Chip, Panel, Section, SectionHead } from "./ui";

/* SCENE 08 — conversion. SCENE 09 — analytics. SCENE 10 — AI. SCENE 11 — integrations. */

const conversion = {
  ro: {
    eyebrow: "De la cititor la lead",
    title: "Fiecare articol are un drum clar spre conversie",
    lead: "Nu adăugăm butoane la întâmplare. Punem îndemnul potrivit în momentul potrivit al lecturii.",
    steps: [
      { icon: FileSearch, t: "Citește", d: "Ajunge din căutare pe un articol relevant." },
      { icon: Target, t: "Se identifică", d: "Recunoaște problema descrisă în conținut." },
      { icon: MousePointerClick, t: "Acționează", d: "CTA contextual în articol, la final sau lateral." },
      { icon: Mail, t: "Lasă datele", d: "Formular scurt sau abonare la newsletter." },
      { icon: CalendarCheck, t: "Devine client", d: "Lead calificat, urmărit până la discuție." },
    ],
    tools: ["CTA în articol", "Formular contextual", "Newsletter", "WhatsApp", "Programare", "Resurse descărcabile"],
  },
  en: {
    eyebrow: "From reader to lead",
    title: "Every article has a clear path to conversion",
    lead: "We do not scatter buttons around. We place the right prompt at the right moment of the read.",
    steps: [
      { icon: FileSearch, t: "Reads", d: "Arrives from search on a relevant article." },
      { icon: Target, t: "Identifies", d: "Recognises the problem described in the content." },
      { icon: MousePointerClick, t: "Acts", d: "Contextual CTA inside, at the end or beside the article." },
      { icon: Mail, t: "Shares details", d: "A short form or a newsletter subscription." },
      { icon: CalendarCheck, t: "Becomes a client", d: "A qualified lead, tracked through to the conversation." },
    ],
    tools: ["In-article CTA", "Contextual form", "Newsletter", "WhatsApp", "Booking", "Downloadable resources"],
  },
} as const;

export const ConversionFlow = () => {
  const { lang } = useLang();
  const c = conversion[lang];
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

const analytics = {
  ro: {
    eyebrow: "Măsurare",
    title: "Vezi exact ce conținut aduce clienți",
    lead: "Fără estimări. Fiecare articol are cifrele lui: audiență, atenție, conversie.",
    metrics: [
      { icon: Users, label: "Vizitatori", hint: "Trafic organic și direct" },
      { icon: Activity, label: "Timp de lectură", hint: "Atenția reală pe articol" },
      { icon: BarChart3, label: "Articole de top", hint: "Ce subiecte performează" },
      { icon: Target, label: "Conversii", hint: "Lead-uri atribuite articolului" },
    ],
    bars: [72, 54, 88, 41, 63, 95, 78],
    note: "Rapoartele se conectează la Google Analytics 4 și Search Console.",
  },
  en: {
    eyebrow: "Measurement",
    title: "See exactly which content brings clients",
    lead: "No guessing. Every article has its own numbers: audience, attention, conversion.",
    metrics: [
      { icon: Users, label: "Visitors", hint: "Organic and direct traffic" },
      { icon: Activity, label: "Reading time", hint: "Real attention per article" },
      { icon: BarChart3, label: "Top articles", hint: "Which topics perform" },
      { icon: Target, label: "Conversions", hint: "Leads attributed to the article" },
    ],
    bars: [72, 54, 88, 41, 63, 95, 78],
    note: "Reports connect to Google Analytics 4 and Search Console.",
  },
} as const;

export const AnalyticsSection = () => {
  const { lang } = useLang();
  const c = analytics[lang];
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

const ai = {
  ro: {
    eyebrow: "AVYRON AI · opțional",
    title: "Inteligență care ajută redacția, nu o înlocuiește",
    lead: "Folosim modele consacrate — Claude, ChatGPT și Gemini — alese pentru fiecare sarcină. Modulele sunt opționale, iar publicarea rămâne o decizie umană.",
    modelsLabel: "Modele folosite",
    models: [
      { n: "Claude", d: "Texte lungi, ton editorial, rescriere" },
      { n: "ChatGPT", d: "Idei, titluri, structuri, meta" },
      { n: "Gemini", d: "Analiză SERP, imagini, multilingv" },
    ],
    items: [
      {
        icon: Sparkles,
        t: "Asistent de scriere",
        m: "Claude 4.5 · GPT-5",
        d: "Structuri, titluri și variante de introducere.",
        e: "Exemplu: „Scrie 5 titluri pentru un ghid despre facturare electronică”.",
      },
      {
        icon: FileSearch,
        t: "Brief de conținut",
        m: "Gemini · GPT-5",
        d: "Ce trebuie să acopere un articol pentru subiectul ales.",
        e: "Exemplu: analizează primele 10 rezultate Google și propune structura H2.",
      },
      {
        icon: BrainCircuit,
        t: "Asistent SEO",
        m: "GPT-5 mini",
        d: "Sugestii pentru titluri, descrieri și structură.",
        e: "Exemplu: meta description de 155 caractere, cu cuvântul-cheie principal.",
      },
      {
        icon: RefreshCcw,
        t: "Content refresh",
        m: "Claude 4.5",
        d: "Identifică articolele care merită actualizate.",
        e: "Exemplu: „Articolul are date din 2024 — actualizează cifrele și concluzia”.",
      },
      {
        icon: Languages,
        t: "Traducere asistată",
        m: "Gemini 3",
        d: "Versiuni în alte limbi, revizuite de om.",
        e: "Exemplu: versiune EN a ghidului, cu terminologie păstrată.",
      },
      {
        icon: BellRing,
        t: "Recomandări conexe",
        m: "Embeddings",
        d: "Articole relevante propuse automat cititorului.",
        e: "Exemplu: la finalul articolului apar 3 texte pe aceeași temă.",
      },
    ],
    note: "Modelele pot fi schimbate oricând, iar costurile de consum API se facturează separat, transparent.",
  },
  en: {
    eyebrow: "AVYRON AI · optional",
    title: "Intelligence that helps the editorial team, not replaces it",
    lead: "We use proven models — Claude, ChatGPT and Gemini — matched to each task. Modules are optional and publishing stays a human decision.",
    modelsLabel: "Models we use",
    models: [
      { n: "Claude", d: "Long-form, editorial tone, rewriting" },
      { n: "ChatGPT", d: "Ideas, headlines, outlines, meta" },
      { n: "Gemini", d: "SERP analysis, images, multilingual" },
    ],
    items: [
      {
        icon: Sparkles,
        t: "Writing assistant",
        m: "Claude 4.5 · GPT-5",
        d: "Structures, headlines and intro variations.",
        e: "Example: “Write 5 headlines for a guide on e-invoicing”.",
      },
      {
        icon: FileSearch,
        t: "Content brief",
        m: "Gemini · GPT-5",
        d: "What an article should cover for the chosen topic.",
        e: "Example: analyse the top 10 Google results and propose the H2 outline.",
      },
      {
        icon: BrainCircuit,
        t: "SEO assistant",
        m: "GPT-5 mini",
        d: "Suggestions for titles, descriptions and structure.",
        e: "Example: a 155-character meta description with the main keyword.",
      },
      {
        icon: RefreshCcw,
        t: "Content refresh",
        m: "Claude 4.5",
        d: "Spots the articles worth updating.",
        e: "Example: “This article uses 2024 data — refresh figures and conclusion”.",
      },
      {
        icon: Languages,
        t: "Assisted translation",
        m: "Gemini 3",
        d: "Versions in other languages, reviewed by a human.",
        e: "Example: an EN version of the guide with terminology preserved.",
      },
      {
        icon: BellRing,
        t: "Related recommendations",
        m: "Embeddings",
        d: "Relevant articles proposed to the reader automatically.",
        e: "Example: 3 articles on the same topic appear at the end of the read.",
      },
    ],
    note: "Models can be swapped at any time, and API usage costs are billed separately and transparently.",
  },
} as const;

export const AiSection = () => {
  const { lang } = useLang();
  const c = ai[lang];
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


const integrations = {
  ro: {
    eyebrow: "Integrări",
    title: "Se conectează cu instrumentele pe care le folosești deja",
    lead: "Alegi doar ce ai nevoie. Restul rămâne curat.",
    groups: [
      { icon: BarChart3, t: "Analiză", items: ["Google Analytics 4", "Search Console", "Meta Pixel", "TikTok Pixel"] },
      { icon: Mail, t: "Email & CRM", items: ["Newsletter", "Automatizări email", "CRM", "Webhooks"] },
      { icon: MessageCircle, t: "Comunicare", items: ["WhatsApp", "Formulare contextuale", "Programări"] },
      { icon: Plug, t: "Tehnic", items: ["API custom", "Export conținut", "Redirecturi", "RSS"] },
    ],
  },
  en: {
    eyebrow: "Integrations",
    title: "It connects with the tools you already use",
    lead: "Pick only what you need. Everything else stays clean.",
    groups: [
      { icon: BarChart3, t: "Analytics", items: ["Google Analytics 4", "Search Console", "Meta Pixel", "TikTok Pixel"] },
      { icon: Mail, t: "Email & CRM", items: ["Newsletter", "Email automation", "CRM", "Webhooks"] },
      { icon: MessageCircle, t: "Communication", items: ["WhatsApp", "Contextual forms", "Booking"] },
      { icon: Plug, t: "Technical", items: ["Custom API", "Content export", "Redirects", "RSS"] },
    ],
  },
} as const;

export const Integrations = () => {
  const { lang } = useLang();
  const c = integrations[lang];
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
