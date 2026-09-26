import type { Industry, Layout, FontKey, Style, StudioKind, Shape } from "./logoStudio";

type L<T> = Record<"ro" | "en", T>;

export const STUDIO_PATHS = { ro: "/servicii/logo/creeaza", en: "/en/services/logo/create" } as const;

export const STUDIO_META: L<{ title: string; description: string; name: string }> = {
  ro: {
    title: "Creează-ți logo-ul cu AI — static sau 3D dinamic | Avyron Logo Studio",
    description:
      "Descrie-ți afacerea și primești gratuit 4 concepte de logo vectorial, create cu AI. Le personalizezi, apoi plătești doar livrarea: logo static de la 75 lei, dinamic 3D de la 150 lei.",
    name: "Avyron Logo Studio",
  },
  en: {
    title: "Create your logo with AI — static or dynamic 3D | Avyron Logo Studio",
    description:
      "Describe your business and get 4 vector logo concepts made with AI, free. Customise them, then pay only for delivery: static logo from 75 lei, dynamic 3D from 150 lei.",
    name: "Avyron Logo Studio",
  },
};

export const INDUSTRY_LABELS: L<Record<Industry, string>> = {
  ro: {
    food: "Cafenea, restaurant, alimentație", beauty: "Beauty, saloane", health: "Sănătate, clinici", tech: "Tehnologie, software",
    finance: "Finanțe, contabilitate", law: "Juridic, consultanță", construction: "Construcții, amenajări", realestate: "Imobiliare",
    education: "Educație, cursuri", auto: "Auto, transport", fashion: "Modă, accesorii", creative: "Creativ, media, foto",
    sport: "Sport, fitness", travel: "Turism, evenimente", retail: "Magazin, comerț", other: "Altceva",
  },
  en: {
    food: "Café, restaurant, food", beauty: "Beauty, salons", health: "Health, clinics", tech: "Technology, software",
    finance: "Finance, accounting", law: "Legal, consulting", construction: "Construction, interiors", realestate: "Real estate",
    education: "Education, courses", auto: "Automotive, transport", fashion: "Fashion, accessories", creative: "Creative, media, photo",
    sport: "Sport, fitness", travel: "Travel, events", retail: "Shop, retail", other: "Something else",
  },
};

export const STYLE_LABELS: L<Record<Style, string>> = {
  ro: { modern: "Modern", elegant: "Elegant", playful: "Jucăuș", bold: "Puternic", minimal: "Minimalist", luxury: "Luxos", tech: "Tehnologic", natural: "Natural" },
  en: { modern: "Modern", elegant: "Elegant", playful: "Playful", bold: "Bold", minimal: "Minimal", luxury: "Luxury", tech: "Tech", natural: "Natural" },
};

export const LAYOUT_LABELS: L<Record<Layout, string>> = {
  ro: { "icon-left": "Simbol + nume", "icon-top": "Simbol deasupra", wordmark: "Doar nume", "icon-only": "Doar simbol", badge: "Emblemă" },
  en: { "icon-left": "Symbol + name", "icon-top": "Symbol on top", wordmark: "Name only", "icon-only": "Symbol only", badge: "Badge" },
};

export const FONT_LABELS: L<Record<FontKey, string>> = {
  ro: { geometric: "Geometric", grotesk: "Grotesk", rounded: "Rotunjit", serif: "Serif", slab: "Slab", mono: "Mono", condensed: "Condensat" },
  en: { geometric: "Geometric", grotesk: "Grotesk", rounded: "Rounded", serif: "Serif", slab: "Slab", mono: "Mono", condensed: "Condensed" },
};

export const SHAPE_LABELS: L<Record<Shape, string>> = {
  ro: {
    circle: "Cerc", square: "Pătrat", hexagon: "Hexagon", diamond: "Romb", shield: "Scut", peak: "Vârf", leaf: "Frunză", drop: "Picătură",
    spark: "Scânteie", orbit: "Orbită", wave: "Val", bars: "Bare", stack: "Straturi", arc: "Arc", grid: "Grilă", chevron: "Săgeată",
    bolt: "Fulger", house: "Casă", cross: "Cruce", heart: "Inimă",
  },
  en: {
    circle: "Circle", square: "Square", hexagon: "Hexagon", diamond: "Diamond", shield: "Shield", peak: "Peak", leaf: "Leaf", drop: "Drop",
    spark: "Spark", orbit: "Orbit", wave: "Wave", bars: "Bars", stack: "Stack", arc: "Arch", grid: "Grid", chevron: "Chevron",
    bolt: "Bolt", house: "House", cross: "Cross", heart: "Heart",
  },
};

export const KIND_COPY: L<Record<StudioKind, { title: string; lead: string; gets: string[] }>> = {
  ro: {
    static: {
      title: "Logo static",
      lead: "Vector curat, gata de print, site și social media.",
      gets: [
        "SVG vectorial, color, alb și negru",
        "PNG transparent la 512, 1024 și 2048 px",
        "Favicon și poză de profil pentru social media",
        "Variante pe fundal deschis și închis",
        "Drept de folosire comercială, fără filigran",
      ],
    },
    dynamic: {
      title: "Logo dinamic 3D",
      lead: "Același logo, extrudat în 3D și animat.",
      gets: [
        "Tot ce e în logo static",
        "Randări 3D în materialul ales (4 unghiuri)",
        "Animație scurtă pentru intro video și reels",
        "Varianta 3D pentru site, cu imagine statică de rezervă",
        "Drept de folosire comercială, fără filigran",
      ],
    },
  },
  en: {
    static: {
      title: "Static logo",
      lead: "Clean vectors, ready for print, web and social media.",
      gets: [
        "Vector SVG in colour, white and black",
        "Transparent PNG at 512, 1024 and 2048 px",
        "Favicon and social media profile picture",
        "Versions for light and dark backgrounds",
        "Commercial use, no watermark",
      ],
    },
    dynamic: {
      title: "Dynamic 3D logo",
      lead: "The same logo, extruded in 3D and animated.",
      gets: [
        "Everything in the static logo",
        "3D renders in the chosen material (4 angles)",
        "Short animation for video intros and reels",
        "3D version for your website, with a static fallback",
        "Commercial use, no watermark",
      ],
    },
  },
};

export const STUDIO_UI: L<{
  h1: string;
  lead: string;
  how: string[];
  kindLabel: string;
  from: string;
  briefTitle: string;
  name: string;
  namePh: string;
  tagline: string;
  taglinePh: string;
  industry: string;
  style: string;
  color: string;
  noColor: string;
  notes: string;
  notesPh: string;
  generate: string;
  generating: string;
  quick: string;
  again: string;
  aiNote: string;
  localNote: string;
  limitNote: string;
  resultsTitle: string;
  choose: string;
  chosen: string;
  editorTitle: string;
  symbol: string;
  layout: string;
  font: string;
  caseLabel: string;
  cases: [string, string, string];
  monogram: string;
  tracking: string;
  colors: string;
  primary: string;
  accent: string;
  ink: string;
  bgLight: string;
  bgDark: string;
  material: string;
  checkoutTitle: string;
  locked: string;
  download: string;
  email: string;
  share: string;
  buy: (price: string) => string;
  pro: string;
  proLink: string;
  formTitle: string;
  fullName: string;
  emailLabel: string;
  phone: string;
  company: string;
  cui: string;
  consent: string;
  terms: string;
  submit: string;
  sending: string;
  doneTitle: string;
  doneText: string;
  error: string;
  staffTitle: string;
  preview: string;
  back: string;
}> = {
  ro: {
    h1: "Creează-ți logo-ul cu AI",
    lead: "Descrie-ți afacerea în câteva cuvinte. AI-ul nostru îți propune 4 concepte vectoriale, pe care le poți ajusta liber. Creația e gratuită; plătești doar când vrei fișierele.",
    how: ["Descrii afacerea", "Alegi și ajustezi un concept", "Plătești livrarea și primești fișierele"],
    kindLabel: "Ce fel de logo vrei",
    from: "de la",
    briefTitle: "Despre afacerea ta",
    name: "Numele afacerii",
    namePh: "ex. Brava Coffee",
    tagline: "Slogan (opțional)",
    taglinePh: "ex. cafea de specialitate",
    industry: "Domeniu",
    style: "Stil",
    color: "Culoare preferată",
    noColor: "Lasă AI-ul să aleagă",
    notes: "Ce ar trebui să transmită (opțional)",
    notesPh: "ex. prietenos, local, pentru studenți; fără maro",
    generate: "Generează 4 concepte cu AI",
    generating: "AI-ul lucrează la concepte…",
    quick: "Variante rapide, fără AI",
    again: "Alte concepte",
    aiNote: "Concepte alese de AI pentru afacerea ta.",
    localNote: "AI-ul nu e disponibil acum; ți-am pregătit variante din generatorul nostru rapid.",
    limitNote: "Ai atins limita de generări cu AI pentru moment. Poți continua cu variantele rapide.",
    resultsTitle: "Alege un concept",
    choose: "Alege",
    chosen: "Ales",
    editorTitle: "Ajustează-l",
    symbol: "Simbol",
    layout: "Așezare",
    font: "Font",
    caseLabel: "Litere",
    cases: ["MAJUSCULE", "Normal", "minuscule"],
    monogram: "Inițiale în simbol",
    tracking: "Spațiere litere",
    colors: "Culori",
    primary: "Principală",
    accent: "Accent",
    ink: "Text",
    bgLight: "Fundal deschis",
    bgDark: "Fundal închis",
    material: "Material 3D",
    checkoutTitle: "Gata? Ia-ți fișierele",
    locked: "Disponibil după plată",
    download: "Descarcă",
    email: "Trimite pe email",
    share: "Distribuie",
    buy: (price) => `Cumpără logo-ul — ${price}`,
    pro: "Vrei un logo desenat de designerii noștri, cu concepte originale și revizii?",
    proLink: "Vezi pachetele Logo Dinamic 3D",
    formTitle: "Date pentru livrare și factură",
    fullName: "Nume și prenume",
    emailLabel: "Email",
    phone: "Telefon",
    company: "Firmă (opțional)",
    cui: "CUI (opțional)",
    consent: "Sunt de acord ca livrarea conținutului digital să înceapă după plată și iau act că, odată livrat, dreptul de retragere se pierde.",
    terms: "Termeni și condiții",
    submit: "Trimite comanda",
    sending: "Se trimite…",
    doneTitle: "Comanda a fost înregistrată",
    doneText: "Îți trimitem pe email linkul de plată (card sau transfer). După confirmarea plății primești fișierele finale, fără filigran.",
    error: "Nu am putut trimite comanda. Încearcă din nou sau scrie-ne pe WhatsApp.",
    staffTitle: "Export (echipa Avyron)",
    preview: "PREVIZUALIZARE",
    back: "Înapoi la Logo Dinamic 3D",
  },
  en: {
    h1: "Create your logo with AI",
    lead: "Describe your business in a few words. Our AI proposes 4 vector concepts you can freely adjust. Creating is free; you only pay when you want the files.",
    how: ["Describe your business", "Pick and adjust a concept", "Pay for delivery and get the files"],
    kindLabel: "What kind of logo",
    from: "from",
    briefTitle: "About your business",
    name: "Business name",
    namePh: "e.g. Brava Coffee",
    tagline: "Tagline (optional)",
    taglinePh: "e.g. specialty coffee",
    industry: "Industry",
    style: "Style",
    color: "Preferred colour",
    noColor: "Let the AI choose",
    notes: "What should it convey (optional)",
    notesPh: "e.g. friendly, local, for students; no brown",
    generate: "Generate 4 concepts with AI",
    generating: "The AI is working on concepts…",
    quick: "Quick variants, no AI",
    again: "More concepts",
    aiNote: "Concepts chosen by the AI for your business.",
    localNote: "The AI is unavailable right now; here are variants from our quick generator.",
    limitNote: "You've reached the AI generation limit for now. You can continue with quick variants.",
    resultsTitle: "Pick a concept",
    choose: "Choose",
    chosen: "Chosen",
    editorTitle: "Adjust it",
    symbol: "Symbol",
    layout: "Layout",
    font: "Font",
    caseLabel: "Letters",
    cases: ["UPPERCASE", "Normal", "lowercase"],
    monogram: "Initials in the symbol",
    tracking: "Letter spacing",
    colors: "Colours",
    primary: "Primary",
    accent: "Accent",
    ink: "Text",
    bgLight: "Light background",
    bgDark: "Dark background",
    material: "3D material",
    checkoutTitle: "Done? Get your files",
    locked: "Available after payment",
    download: "Download",
    email: "Send by email",
    share: "Share",
    buy: (price) => `Buy the logo — ${price}`,
    pro: "Want a logo drawn by our designers, with original concepts and revisions?",
    proLink: "See the Dynamic 3D Logo packages",
    formTitle: "Delivery and invoice details",
    fullName: "Full name",
    emailLabel: "Email",
    phone: "Phone",
    company: "Company (optional)",
    cui: "VAT / company ID (optional)",
    consent: "I agree that delivery of digital content starts after payment and acknowledge that, once delivered, the right of withdrawal is lost.",
    terms: "Terms and conditions",
    submit: "Send the order",
    sending: "Sending…",
    doneTitle: "Your order is in",
    doneText: "We'll email you a payment link (card or bank transfer). Once payment is confirmed you receive the final files, without watermark.",
    error: "We couldn't send the order. Please try again or message us on WhatsApp.",
    staffTitle: "Export (Avyron team)",
    preview: "PREVIEW",
    back: "Back to Dynamic 3D Logo",
  },
};

export const STUDIO_FAQ: L<Array<{ q: string; a: string }>> = {
  ro: [
    { q: "E cu adevărat gratuit să creez logo-ul?", a: "Da. Generarea conceptelor, ajustarea și previzualizarea sunt gratuite. Plătești doar livrarea fișierelor finale, fără filigran: 75 lei pentru logo static și 150 lei pentru logo dinamic 3D." },
    { q: "Ce AI folosiți?", a: "Un model de limbaj open-source (Llama), rulat pe infrastructura Cloudflare. AI-ul face alegerile de art director — simbol, compoziție, font, culori — iar logo-ul e desenat vectorial de motorul nostru. De aceea literele ies mereu corect și fișierul se poate mări oricât." },
    { q: "Pot folosi logo-ul comercial?", a: "Da, după plată primești dreptul de folosire comercială. Logo-urile generate folosesc forme geometrice simple și fonturi open-source, deci pot semăna cu alte mărci; dacă vrei să-l înregistrezi la OSIM, îți recomandăm o verificare de anterioritate sau un logo desenat de echipa noastră." },
    { q: "Care e diferența față de pachetele Logo Dinamic 3D?", a: "Aici îți creezi singur logo-ul, rapid și ieftin. În pachetele Logo Dinamic 3D (de la 500 lei) designerii noștri desenează concepte originale, cu runde de revizie, ghid de utilizare și drepturi cedate prin contract." },
    { q: "Cum primesc fișierele?", a: "După ce trimiți comanda primești pe email linkul de plată. După confirmarea plății îți trimitem arhiva cu fișierele finale." },
  ],
  en: [
    { q: "Is creating the logo really free?", a: "Yes. Generating concepts, adjusting and previewing are free. You only pay for delivery of the final files without watermark: 75 lei for a static logo and 150 lei for a dynamic 3D logo." },
    { q: "Which AI do you use?", a: "An open-source language model (Llama) running on Cloudflare's infrastructure. The AI makes the art-director choices — symbol, composition, font, colours — and our engine draws the logo as vectors, so the lettering is always correct and the file scales to any size." },
    { q: "Can I use the logo commercially?", a: "Yes, after payment you get commercial usage rights. Generated logos use simple geometric shapes and open-source fonts, so they may resemble other marks; if you plan to register a trademark, we recommend a prior-mark search or a logo drawn by our team." },
    { q: "How is this different from the Dynamic 3D Logo packages?", a: "Here you create the logo yourself, fast and affordably. In the Dynamic 3D Logo packages (from 500 lei) our designers draw original concepts, with revision rounds, a usage guide and a copyright transfer by contract." },
    { q: "How do I get the files?", a: "After you send the order you receive a payment link by email. Once payment is confirmed we send you the archive with the final files." },
  ],
};
