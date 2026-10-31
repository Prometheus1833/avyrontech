import type { Lang } from "@/i18n/translations";
import { SERVICE_ROUTES } from "./serviceRoutes";

export type GrowthServiceKey = "seo-ai" | "marketing-ads";
type Copy = {
  name: string;
  eyebrow: string;
  title: string;
  lead: string;
  metaTitle: string;
  metaDescription: string;
  promise: string;
  scopeTitle: string;
  scopeLead: string;
  signals: string[];
  pillars: { title: string; text: string }[];
  processTitle: string;
  process: { title: string; text: string }[];
  deliverablesTitle: string;
  deliverables: string[];
  measurementTitle: string;
  measurement: string;
  faq: { q: string; a: string }[];
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
};

export const GROWTH_SERVICES: Record<GrowthServiceKey, {
  path: { ro: string; en: string };
  copy: Record<Lang, Copy>;
}> = {
  "seo-ai": {
    path: SERVICE_ROUTES.seoAi,
    copy: {
      ro: {
        name: "SEO & AI Performance and Visibility",
        eyebrow: "Căutare organică · vizibilitate AI · viteză",
        title: "Fă-ți expertiza ușor de găsit, înțeles și ales.",
        lead: "Construim o bază tehnică rapidă, conținut care răspunde intențiilor reale și o prezență digitală coerentă pentru căutarea clasică și experiențele AI.",
        metaTitle: "SEO & AI Performance and Visibility | Servicii Avyron",
        metaDescription: "SEO tehnic, AI Visibility, verificarea indexării Google și performanță web. Audit inițial gratuit; abonamente de la 690 lei/lună și optimizare unică de la 550 lei.",
        promise: "Vizibilitatea începe cu o sursă clară și credibilă.",
        scopeTitle: "Un sistem de descoperire, nu o listă de trucuri.",
        scopeLead: "Legăm arhitectura site-ului, conținutul, datele structurate și performanța de întrebările pe care le pun clienții tăi.",
        signals: ["Descoperire", "Înțelegere", "Încredere"],
        pillars: [
          { title: "SEO tehnic & indexare", text: "Verificăm accesul crawlerelor, canonical, sitemap, legături interne, pagini duplicate și erori care ascund conținutul util." },
          { title: "Conținut care răspunde", text: "Mapăm intenții și întrebări, apoi structurăm pagini de servicii, explicații și dovezi originale într-un limbaj clar." },
          { title: "AI visibility & autoritate", text: "Clarificăm entitatea, serviciile și sursele de încredere. Urmărim mențiuni și citări unde pot fi observate, fără a promite includerea în răspunsuri AI." },
          { title: "Core Web Vitals & UX", text: "Optimizăm resursele, stabilitatea vizuală și răspunsul la interacțiune pe dispozitive reale și conexiuni mobile." },
        ],
        processTitle: "Din diagnostic în îmbunătățiri verificabile.",
        process: [
          { title: "01 / Bază de referință", text: "Audităm paginile, interogările, indexarea, datele disponibile și experiența mobilă. Stabilim ce se poate măsura." },
          { title: "02 / Arhitectură", text: "Prioritizăm paginile și subiectele după relevanță comercială, claritate și efort tehnic." },
          { title: "03 / Implementare", text: "Corectăm problemele tehnice, îmbunătățim conținutul și datele structurate acolo unde descriu fapte vizibile." },
          { title: "04 / Monitorizare", text: "Urmărim indexarea, vizibilitatea, viteza și conversiile; ajustăm planul în funcție de date." },
        ],
        deliverablesTitle: "Ce poate include colaborarea",
        deliverables: [
          "Audit SEO tehnic și plan de priorități",
          "Cercetare de intenții, termeni și întrebări ale clienților",
          "Arhitectură de pagini, linking intern și briefuri editoriale",
          "Implementare metadata, canonical, sitemap și date structurate adecvate",
          "Optimizare Core Web Vitals și accesibilitate de bază",
          "Tablou de măsurare și raport cu schimbări explicate",
        ],
        measurementTitle: "Măsurăm progresul, nu inventăm certitudini.",
        measurement: "Analizăm Search Console, trafic organic relevant, pagini indexate, Core Web Vitals și solicitări atribuite când există date și consimțământ. Citările AI se pot observa parțial și pot varia; nicio platformă nu garantează afișarea, poziția sau recomandarea.",
        faq: [
          { q: "Puteți garanta prima poziție sau apariția în răspunsurile AI?", a: "Nu. Motoarele de căutare și sistemele AI decid ce afișează. Putem îmbunătăți accesibilitatea, calitatea și măsurarea prezenței tale digitale." },
          { q: "Este nevoie de un site nou?", a: "Nu neapărat. Începem cu un audit al site-ului existent și recomandăm modificări numai acolo unde aduc claritate sau rezolvă probleme măsurabile." },
          { q: "Cât durează până vedem rezultate?", a: "Depinde de istoricul domeniului, concurență, ritmul de implementare și procesarea de către motoarele de căutare. Stabilim repere și evaluăm evoluția periodic." },
          { q: "Cât costă auditul SEO & AI inițial?", a: "Este gratuit și nu creează obligații contractuale. Abonamentele încep de la 690 lei/lună, iar lucrările unice de optimizare de la 550 lei pentru 5–15 pagini." },
        ],
        ctaTitle: "Hai să vedem ce te face greu de găsit.",
        ctaText: "Trimite-ne site-ul și piețele vizate. Începem cu un audit SEO & AI gratuit, fără obligații contractuale, apoi stabilim prioritățile.",
        ctaButton: "Solicită auditul gratuit",
      },
      en: {
        name: "SEO & AI Performance and Visibility",
        eyebrow: "Organic search · AI visibility · speed",
        title: "Make your expertise easy to find, understand and choose.",
        lead: "We build a fast technical foundation, content shaped around real intent and a coherent presence for traditional search and AI experiences.",
        metaTitle: "SEO & AI Performance and Visibility | Avyron Services",
        metaDescription: "Technical SEO, AI visibility, Google indexing review and web performance. Free initial audit; monthly plans from 690 RON/month and one-time work from 550 RON.",
        promise: "Visibility begins with a clear, credible source.",
        scopeTitle: "A discovery system, not a bag of tricks.",
        scopeLead: "We connect site architecture, content, structured data and performance to the questions your customers actually ask.",
        signals: ["Discovery", "Understanding", "Trust"],
        pillars: [
          { title: "Technical SEO & indexing", text: "We review crawler access, canonicals, sitemaps, internal links, duplicates and errors that hide useful content." },
          { title: "Content that answers", text: "We map intent and questions, then structure service pages, explanations and original proof in clear language." },
          { title: "AI visibility & authority", text: "We clarify your entity, services and reliable sources. We track mentions and citations where observable, without promising inclusion in AI answers." },
          { title: "Core Web Vitals & UX", text: "We optimize resources, visual stability and interaction responsiveness on real devices and mobile connections." },
        ],
        processTitle: "From diagnosis to verifiable improvements.",
        process: [
          { title: "01 / Baseline", text: "We audit pages, queries, indexing, available data and the mobile experience. We agree what can be measured." },
          { title: "02 / Architecture", text: "We prioritize pages and topics by commercial relevance, clarity and engineering effort." },
          { title: "03 / Implementation", text: "We fix technical issues and improve content and structured data where they reflect visible facts." },
          { title: "04 / Monitoring", text: "We review indexing, visibility, speed and conversions, then adapt the plan to the evidence." },
        ],
        deliverablesTitle: "What the engagement can include",
        deliverables: [
          "Technical SEO audit and prioritized roadmap",
          "Research into intent, search terms and customer questions",
          "Page architecture, internal linking and editorial briefs",
          "Appropriate metadata, canonical, sitemap and structured data",
          "Core Web Vitals and baseline accessibility improvements",
          "Measurement dashboard and an explained change report",
        ],
        measurementTitle: "We measure progress without inventing certainty.",
        measurement: "We review Search Console, relevant organic traffic, indexed pages, Core Web Vitals and attributed enquiries where data and consent allow. AI citations are only partly observable and may vary; no platform guarantees display, position or recommendation.",
        faq: [
          { q: "Can you guarantee first place or inclusion in AI answers?", a: "No. Search engines and AI systems decide what to show. We can improve accessibility, quality and measurement of your digital presence." },
          { q: "Do we need a new website?", a: "Not necessarily. We start with an audit of your existing site and recommend changes where they add clarity or solve measurable problems." },
          { q: "How long until we see results?", a: "It depends on domain history, competition, implementation pace and search engine processing. We agree milestones and review progress regularly." },
          { q: "What does the initial SEO & AI audit cost?", a: "It is free with no contractual obligation. Monthly plans start at 690 RON, and one-time optimization starts at 550 RON for 5–15 pages." },
        ],
        ctaTitle: "Let's find what makes you hard to discover.",
        ctaText: "Send us your website and target markets. We start with a free SEO & AI audit, with no contractual obligation, then agree priorities.",
        ctaButton: "Request the free audit",
      },
    },
  },
  "marketing-ads": {
    path: SERVICE_ROUTES.digitalMarketing,
    copy: {
      ro: {
        name: "Digital Marketing & Ads",
        eyebrow: "Strategie · campanii · conversii",
        title: "Fiecare campanie trebuie să aibă o direcție.",
        lead: "Conectăm oferta, mesajul, creativul, landing page-ul și măsurarea într-un sistem de campanii plătite pe care îl poți înțelege și îmbunătăți.",
        metaTitle: "Digital Marketing & Ads | Campanii și măsurare Avyron",
        metaDescription: "Digital Marketing & Ads: Ads Start 990 lei/lună, Ads Growth 1.690 lei/lună, Ads Performance de la 2.990 lei/lună. Bugetul publicitar se achită separat.",
        promise: "Nu cumpărăm trafic. Construim un traseu spre acțiune.",
        scopeTitle: "De la primul semnal la cererea potrivită.",
        scopeLead: "O reclamă bună nu se termină la click. Lucrăm la fiecare punct de contact care schimbă interesul în conversație.",
        signals: ["Atenție", "Interes", "Acțiune"],
        pillars: [
          { title: "Strategie & audiențe", text: "Definim obiectivul, oferta, segmentele și canalele potrivite înainte de a aloca buget." },
          { title: "Search & social ads", text: "Structurăm campanii Google Ads și Meta Ads în funcție de intenție, etapă și materialele disponibile. Alegerea platformelor se face după brief." },
          { title: "Materiale creative și pagini de destinație", text: "Adaptăm mesajele și materialele la formatul canalului și recomandăm îmbunătățiri ale paginilor de destinație. Implementarea se stabilește separat în ofertă." },
          { title: "Tracking & optimizare", text: "Configurăm evenimente și conversii cu respectarea consimțământului, testăm ipoteze și mutăm accentul spre semnalele utile afacerii." },
        ],
        processTitle: "Campanii construite cu ipoteze și dovezi.",
        process: [
          { title: "01 / Brief & ofertă", text: "Înțelegem marja, clientul, ciclul de decizie și obiectivul: cereri, vânzări sau programări." },
          { title: "02 / Pregătire", text: "Verificăm conturile, măsurarea, mesajele, paginile de destinație și materialele aprobate." },
          { title: "03 / Lansare controlată", text: "Pornim structura agreată, verificăm livrarea și citim primele semnale fără concluzii grăbite." },
          { title: "04 / Iterație", text: "Revizuim căutările, audiențele, creativul, costul și calitatea solicitărilor; documentăm deciziile." },
        ],
        deliverablesTitle: "Ce poate include colaborarea",
        deliverables: [
          "Plan de canale, audiențe, mesaje și obiective",
          "Structură de campanii Google Ads și/sau Meta Ads",
          "Texte și direcții creative adaptate formatelor alese",
          "Recomandări sau implementare pentru landing pages",
          "Configurarea măsurării cu respectarea consimțământului",
          "Raport periodic cu cheltuieli, rezultate și decizii",
        ],
        measurementTitle: "Bugetul media și serviciul sunt lucruri distincte.",
        measurement: "Bugetul de publicitate este achitat separat de client și se stabilește distinct de serviciile AVYRON. Urmărim cheltuieli, cereri, vânzări și calitatea leadurilor când infrastructura permite. Atribuirea este imperfectă, iar rezultatele depind de ofertă, piață, buget și timp.",
        faq: [
          { q: "Bugetul reclamelor este inclus?", a: "Nu. Bugetul media se plătește separat de client. Abonamentele AVYRON încep de la 990 lei/lună, iar configurarea inițială Ads de la 590 lei." },
          { q: "Lucrați doar cu Google Ads sau Meta Ads?", a: "Acestea sunt puncte de pornire frecvente. Selectăm canalele după public, obiectiv, piață și resursele disponibile." },
          { q: "Garanți un număr de leaduri sau un ROAS?", a: "Nu promitem un rezultat fix înainte să avem date. Definim indicatori, verificăm măsurarea și optimizăm pe baza calității rezultatelor." },
        ],
        ctaTitle: "Hai să construim următoarea campanie cu sens.",
        ctaText: "Spune-ne ce vinzi, cui și ce ai testat până acum. Pornim de la oferta ta și de la datele disponibile.",
        ctaButton: "Discută despre campanii",
      },
      en: {
        name: "Digital Marketing & Ads",
        eyebrow: "Strategy · campaigns · conversions",
        title: "Every campaign needs a direction.",
        lead: "We connect the offer, message, creative, landing page and measurement into a paid campaign system you can understand and improve.",
        metaTitle: "Digital Marketing & Ads | Campaigns and Measurement | Avyron",
        metaDescription: "Digital Marketing & Ads: Ads Start 990 RON/month, Ads Growth 1,690 RON/month, Ads Performance from 2,990 RON/month. Media spend is separate.",
        promise: "We build a path to action, not just traffic.",
        scopeTitle: "From the first signal to the right enquiry.",
        scopeLead: "A good ad does not end at the click. We work on each touchpoint that turns interest into a conversation.",
        signals: ["Attention", "Interest", "Action"],
        pillars: [
          { title: "Strategy & audiences", text: "We define the objective, offer, segments and suitable channels before assigning budget." },
          { title: "Search & social ads", text: "We structure Google Ads and Meta Ads campaigns by intent, stage and available assets. Platform selection follows the brief." },
          { title: "Creative assets & landing pages", text: "We adapt messages and assets to the channel and recommend landing page improvements. Implementation is scoped separately in the proposal." },
          { title: "Tracking & optimization", text: "We configure consent-aware events and conversions, test hypotheses and focus on signals useful to the business." },
        ],
        processTitle: "Campaigns built on hypotheses and evidence.",
        process: [
          { title: "01 / Brief & offer", text: "We understand margin, customer, decision cycle and objective: enquiries, sales or bookings." },
          { title: "02 / Preparation", text: "We review accounts, measurement, messages, landing pages and approved assets." },
          { title: "03 / Controlled launch", text: "We start the agreed structure, verify delivery and read early signals without rushed conclusions." },
          { title: "04 / Iteration", text: "We review queries, audiences, creative, cost and enquiry quality, documenting decisions." },
        ],
        deliverablesTitle: "What the engagement can include",
        deliverables: [
          "Channel, audience, message and objective plan",
          "Google Ads and/or Meta Ads campaign structure",
          "Copy and creative direction for selected formats",
          "Landing page recommendations or implementation",
          "Consent-aware measurement configuration",
          "Periodic report on spend, outcomes and decisions",
        ],
        measurementTitle: "Media budget and service fees are separate.",
        measurement: "The client pays advertising spend separately from AVYRON service fees. We track spend, enquiries, sales and lead quality when the infrastructure allows. Attribution is imperfect, and outcomes depend on the offer, market, budget and time.",
        faq: [
          { q: "Is advertising spend included?", a: "No. The client pays media spend separately. AVYRON plans start at 990 RON/month, with initial Ads setup from 590 RON." },
          { q: "Do you only work with Google Ads or Meta Ads?", a: "These are common starting points. We select channels based on audience, objective, market and available resources." },
          { q: "Do you guarantee leads or ROAS?", a: "We do not promise a fixed result before we have data. We define indicators, verify measurement and optimize for outcome quality." },
        ],
        ctaTitle: "Let's build the next campaign with purpose.",
        ctaText: "Tell us what you sell, to whom and what you have tried so far. We start with your offer and available data.",
        ctaButton: "Discuss campaigns",
      },
    },
  },
};
