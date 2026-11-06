import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus, PenLine, Plus, Repeat2, ShieldCheck, Wrench } from "lucide-react";
export const services = {
  ro: {
    eyebrow: "Servicii opționale",
    title: "Dacă vrei, ne ocupăm și de conținut",
    lead: "Platforma funcționează perfect și dacă publici singur. Când ai nevoie de sprijin, îl oferim în pachete clare, cotate separat.",
    items: [
      { icon: PenLine, t: "Strategie de conținut", d: "Subiecte, cuvinte-cheie, calendar editorial și priorități." },
      { icon: Repeat2, t: "Redactare articole", d: "Articole scrise pentru publicul tău și optimizate SEO." },
      { icon: Wrench, t: "Mentenanță & publicare", d: "Actualizări tehnice, publicare recurentă, monitorizare." },
      { icon: ShieldCheck, t: "Optimizare continuă", d: "Actualizarea articolelor existente și raportare lunară." },
    ],
    note: "Serviciile recurente se cotează separat, în funcție de volum și ritm de publicare.",
  },
  en: {
    eyebrow: "Optional services",
    title: "If you want, we handle the content too",
    lead: "The platform works perfectly if you publish on your own. When you need support, we offer it in clear packages, quoted separately.",
    items: [
      { icon: PenLine, t: "Content strategy", d: "Topics, keywords, editorial calendar and priorities." },
      { icon: Repeat2, t: "Article writing", d: "Articles written for your audience and optimised for SEO." },
      { icon: Wrench, t: "Maintenance & publishing", d: "Technical updates, recurring publishing, monitoring." },
      { icon: ShieldCheck, t: "Continuous optimisation", d: "Refreshing existing articles and monthly reporting." },
    ],
    note: "Recurring services are quoted separately, based on volume and publishing rhythm.",
  },
} as const;
export const blogLink = {
  ro: {
    eyebrow: "Blogul AVYRON",
    title: "Vezi standardul nostru editorial în practică",
    lead: "Publicăm despre web, SEO, automatizări și strategie digitală. Aceleași principii stau la baza blogurilor pe care le construim.",
    all: "Citește blogul AVYRON",
    read: "Citește articolul",
    prev: "Articolul anterior",
    next: "Articolul următor",
  },
  en: {
    eyebrow: "AVYRON blog",
    title: "See our editorial standard in practice",
    lead: "We publish about web, SEO, automation and digital strategy. The same principles power the blogs we build.",
    all: "Read the AVYRON blog",
    read: "Read the article",
    prev: "Previous article",
    next: "Next article",

  },
} as const;
export const FAQ_ITEMS = {
  ro: [
    {
      q: "Pot publica singur, fără ajutor tehnic?",
      a: "Da. Panoul de administrare este gândit pentru publicare fără cunoștințe tehnice, iar la final facem o sesiune de instruire.",
    },
    {
      q: "Îmi puteți muta blogul existent?",
      a: "Da. Migrarea se configurează în calculator, în funcție de numărul de articole, și poate include maparea URL-urilor, redirecturi 301, imagini, metadata, categorii și autori.",
    },
    {
      q: "Blogul este optimizat SEO din start?",
      a: "Da. Structura semantică, datele structurate, sitemap-ul, feed-ul RSS, canonical-urile și optimizarea de performanță fac parte din pachetul de bază.",
    },
    {
      q: "Pot avea blog în mai multe limbi?",
      a: "Da. Poți alege 2, 3 sau mai multe limbi în configurator. Prețul acoperă infrastructura multilingvă; traducerea integrală a conținutului se cotează separat.",
    },
    {
      q: "Câte articole pot publica?",
      a: "Nelimitat. Nu taxăm numărul de articole publicate, iar structura rămâne scalabilă pe măsură ce conținutul crește.",
    },
    {
      q: "Cât durează implementarea?",
      a: "Durata depinde de complexitatea aleasă în configurator și de ritmul în care primim conținutul și feedback-ul. O estimare de timp o primești odată cu oferta.",
    },
    {
      q: "Funcțiile AI sunt obligatorii?",
      a: "Nu. Toate modulele AI sunt opționale. Le activăm doar dacă îți aduc un beneficiu clar, iar publicarea rămâne o decizie umană.",
    },
    {
      q: "Ce se întâmplă după lansare?",
      a: "Poți continua singur sau poți alege servicii recurente de conținut, mentenanță și optimizare, cotate separat.",
    },
  ],
  en: [
    {
      q: "Can I publish on my own, without technical help?",
      a: "Yes. The admin panel is designed for publishing without technical knowledge, and we run a training session at handover.",
    },
    {
      q: "Can you move my existing blog?",
      a: "Yes. Migration is configured in the calculator based on article count and can include URL mapping, 301 redirects, images, metadata, categories and authors.",
    },
    {
      q: "Is the blog SEO optimised from the start?",
      a: "Yes. Semantic structure, structured data, sitemap, RSS feed, canonicals and performance optimisation are part of the base package.",
    },
    {
      q: "Can I have the blog in several languages?",
      a: "Yes. You can select 2, 3 or more languages in the configurator. The price covers multilingual infrastructure; full content translation is quoted separately.",
    },
    {
      q: "How many articles can I publish?",
      a: "Unlimited. We never charge per published article, and the structure stays scalable as your content grows.",
    },
    {
      q: "How long does implementation take?",
      a: "It depends on the complexity chosen in the configurator and on how quickly we receive content and feedback. A timeline comes with the offer.",
    },
    {
      q: "Are the AI features mandatory?",
      a: "No. Every AI module is optional. We enable them only when they bring a clear benefit, and publishing stays a human decision.",
    },
    {
      q: "What happens after launch?",
      a: "You can continue on your own or choose recurring content, maintenance and optimisation services, quoted separately.",
    },
  ],
} as const;
export const faqCopy = {
  ro: { eyebrow: "Întrebări frecvente", title: "Ce ne întreabă clienții înainte de start" },
  en: { eyebrow: "FAQ", title: "What clients ask before we start" },
} as const;
export const finalCta = {
  ro: {
    eyebrow: "Următorul pas",
    title: "Expertiza ta merită un loc unde să lucreze pentru tine",
    lead: "Configurează blogul în câteva minute și primești o ofertă clară, cu pași concreți.",
    primary: "Configurează blogul",
    secondary: "Vezi toate produsele",
    to: "/servicii",
  },
  en: {
    eyebrow: "Next step",
    title: "Your expertise deserves a place where it works for you",
    lead: "Configure your blog in a few minutes and receive a clear offer with concrete next steps.",
    primary: "Configure your blog",
    secondary: "See all products",
    to: "/en/services",
  },
} as const;