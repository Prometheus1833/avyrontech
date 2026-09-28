import type { Lang } from "@/i18n/translations";
import type { SegmentKey } from "@/components/logo3d/marks";

/**
 * Content for the "Logo Dinamic 3D" service page (/servicii/logo).
 * One source for the page, the pricing card, JSON-LD and the tests.
 * Prices are in lei (RON); the page converts to EUR with the live rate.
 */

export const LOGO3D_PATHS = { ro: "/servicii/logo", en: "/en/services/logo" } as const;

type L<T> = Record<Lang, T>;

export const LOGO3D_META: L<{ title: string; description: string; name: string; short: string }> = {
  ro: {
    title: "Logo Dinamic 3D — logo 3D și animat, de la 500 lei | AVYRON",
    description:
      "Creăm logo-uri originale gândite pentru print, 3D și mișcare: variante vectoriale, model 3D, animație și logo interactiv pentru site. Pachete de la 500 lei, drepturi cedate integral.",
    name: "Logo Dinamic 3D",
    short: "Logo dinamic 3D",
  },
  en: {
    title: "Dynamic 3D Logo — 3D and animated logo design from 500 lei | AVYRON",
    description:
      "Original logos designed for print, 3D and motion: vector files, a 3D model, animation and an interactive logo for your website. Packages from 500 lei, full rights transferred.",
    name: "Dynamic 3D Logo",
    short: "Dynamic 3D logo",
  },
};

export const LOGO3D_HERO: L<{
  title: string;
  lead: string;
  from: string;
  delivery: string;
  primary: string;
  secondary: string;
  materialsLabel: string;
  conceptLabel: string;
}> = {
  ro: {
    title: "Logo dinamic 3D",
    lead: "Un singur logo, gândit din prima pentru hârtie, pentru volum și pentru mișcare. Îl primești ca fișiere vectoriale, model 3D, animație și ca logo viu pe site-ul tău.",
    from: "de la",
    delivery: "Livrare în 5–15 zile lucrătoare, drepturi cedate integral",
    primary: "Cere o previzualizare gratuită",
    secondary: "Vezi-ți numele în 3D",
    materialsLabel: "Material",
    conceptLabel: "Concept Avyron",
  },
  en: {
    title: "Dynamic 3D logo",
    lead: "One logo, designed from day one for paper, for volume and for motion. You get it as vector files, a 3D model, an animation and a living logo on your website.",
    from: "from",
    delivery: "Delivered in 5–15 working days, full rights transferred",
    primary: "Request a free preview",
    secondary: "See your name in 3D",
    materialsLabel: "Material",
    conceptLabel: "Avyron concept",
  },
};

export const MATERIAL_LABELS: L<Record<"metal" | "glass" | "neon" | "matte", string>> = {
  ro: { metal: "Metal", glass: "Sticlă", neon: "Neon", matte: "Mat" },
  en: { metal: "Metal", glass: "Glass", neon: "Neon", matte: "Matte" },
};

export const LOGO3D_STATES: L<{ title: string; lead: string; items: Array<{ title: string; text: string }> }> = {
  ro: {
    title: "Trei stări, aceeași identitate",
    lead: "Un logo obișnuit e desenat pentru o foaie albă. Unul dinamic trebuie să rămână recunoscut și când se rotește, se aprinde sau apare într-un intro de două secunde.",
    items: [
      { title: "Static", text: "Vector curat pentru antet, factură, fațadă și broderie. Funcționează și într-o singură culoare, la 16 pixeli." },
      { title: "Volum", text: "Grosime, teșituri și material ales: metal, sticlă, neon sau mat. Pentru site, prezentări, afișaje și realitate augmentată." },
      { title: "Mișcare", text: "Intro, buclă și tranziție, cu aceeași logică vizuală. Pentru reels, video, aplicații și încărcarea site-ului." },
    ],
  },
  en: {
    title: "Three states, one identity",
    lead: "A regular logo is drawn for a white page. A dynamic one has to stay recognisable while it turns, lights up or appears in a two-second intro.",
    items: [
      { title: "Static", text: "Clean vectors for letterheads, invoices, signage and embroidery. Works in a single colour, down to 16 pixels." },
      { title: "Volume", text: "Depth, bevels and a chosen material: metal, glass, neon or matte. For websites, decks, displays and augmented reality." },
      { title: "Motion", text: "Intro, loop and transition sharing one visual logic. For reels, video, apps and website loading." },
    ],
  },
};

export const LOGO3D_GENESIS: L<{ title: string; lead: string; steps: Array<{ title: string; text: string }> }> = {
  ro: {
    title: "Cum se naște un logo dinamic",
    lead: "Derulează: același logo trece prin toate etapele prin care îl ducem și pe al tău.",
    steps: [
      { title: "Schiță", text: "Pornim de la ce faci și pentru cine. Căutăm o formă simplă, cu o idee pe care o poți explica într-o propoziție." },
      { title: "Vector", text: "Forma se construiește pe grilă, cu curbe măsurate. Aici se decide dacă logo-ul rezistă la 16 pixeli și pe o fațadă." },
      { title: "Volum", text: "Extrudăm, teșim muchiile și alegem materialul. Lumina trebuie să arate forma, nu să o acopere." },
      { title: "Mișcare", text: "Stabilim cum apare, cum respiră și cum dispare. Aceeași mișcare devine intro, buclă pe site și animație pentru social media." },
    ],
  },
  en: {
    title: "How a dynamic logo is made",
    lead: "Scroll: the same logo goes through every stage we take yours through.",
    steps: [
      { title: "Sketch", text: "We start from what you do and who it is for, looking for a simple form with an idea you can explain in one sentence." },
      { title: "Vector", text: "The form is built on a grid with measured curves. This is where we check it survives at 16 pixels and on a building." },
      { title: "Volume", text: "We extrude, bevel the edges and choose the material. Light should reveal the form, not hide it." },
      { title: "Motion", text: "We decide how it enters, breathes and leaves. The same motion becomes the intro, the website loop and the social animation." },
    ],
  },
};

export const SEGMENT_LABELS: L<Record<SegmentKey | "all", string>> = {
  ro: { all: "Toate", personal: "Persoane fizice", small: "Firme mici", medium: "Firme medii", brand: "Branduri", startup: "Startupuri" },
  en: { all: "All", personal: "Individuals", small: "Small businesses", medium: "Mid-size companies", brand: "Brands", startup: "Startups" },
};

export const LOGO3D_GALLERY: L<{ title: string; lead: string; note: string; filterLabel: string }> = {
  ro: {
    title: "Concepte create de noi",
    lead: "Șase branduri inventate, șase logo-uri randate live în pagină de motorul nostru 3D. Treci cu mouse-ul peste ele sau atinge-le ca să le rotești.",
    note: "Brandurile sunt fictive. Le-am creat ca să arătăm procesul, fără legătură cu firme sau mărci reale.",
    filterLabel: "Filtrează conceptele",
  },
  en: {
    title: "Concepts we created",
    lead: "Six invented brands, six logos rendered live on this page by our own 3D engine. Hover or tap them to turn them.",
    note: "These brands are fictional. We made them to show the process; they are not linked to any real company or trademark.",
    filterLabel: "Filter the concepts",
  },
};

export const LOGO3D_NAME: L<{
  title: string;
  lead: string;
  inputLabel: string;
  placeholder: string;
  colorLabel: string;
  want: string;
  preview: string;
  download: string;
  downloadNote: string;
  whatsapp: (name: string, material: string) => string;
}> = {
  ro: {
    title: "Vezi-ți numele în 3D",
    lead: "Scrie numele afacerii tale și alege materialul. E doar un text extrudat, nu un logo — dar îți arată în câteva secunde ce înseamnă volumul și lumina pentru brandul tău.",
    inputLabel: "Numele tău sau al afacerii",
    placeholder: "Numele tău",
    colorLabel: "Culori",
    want: "Vreau un logo 3D pentru acest nume",
    preview: "Cere previzualizarea gratuită",
    download: "Descarcă imaginea",
    downloadNote: "Previzualizare cu filigran. Logo-ul adevărat îl desenăm de la zero.",
    whatsapp: (name, material) =>
      `Bună! Am încercat „Vezi-ți numele în 3D” cu numele „${name}”, material ${material}. Aș vrea un logo dinamic 3D.`,
  },
  en: {
    title: "See your name in 3D",
    lead: "Type your business name and pick a material. It is only extruded text, not a logo — but in seconds it shows what volume and light do for your brand.",
    inputLabel: "Your name or business name",
    placeholder: "Your name",
    colorLabel: "Colours",
    want: "I want a 3D logo for this name",
    preview: "Request the free preview",
    download: "Download the image",
    downloadNote: "Watermarked preview. The real logo is drawn from scratch.",
    whatsapp: (name, material) =>
      `Hi! I tried "See your name in 3D" with the name "${name}", material ${material}. I'd like a dynamic 3D logo.`,
  },
};

export const NAME_SWATCHES: Array<{ key: string; face: string; side: string; glow: string; label: L<string> }> = [
  { key: "avyron", face: "#c4b5fd", side: "#4c1d95", glow: "#a78bfa", label: { ro: "Violet Avyron", en: "Avyron violet" } },
  { key: "ocean", face: "#bae6fd", side: "#075985", glow: "#38bdf8", label: { ro: "Albastru ocean", en: "Ocean blue" } },
  { key: "gold", face: "#f3d9a4", side: "#7a5a22", glow: "#e7c27d", label: { ro: "Auriu", en: "Gold" } },
  { key: "mint", face: "#bbf7d0", side: "#166534", glow: "#4ade80", label: { ro: "Verde mentă", en: "Mint green" } },
  { key: "rose", face: "#fecdd3", side: "#9f1239", glow: "#fb7185", label: { ro: "Roz coral", en: "Coral rose" } },
];

export type Audience = {
  key: SegmentKey;
  title: string;
  who: string;
  gets: string[];
  uses: string;
  pack: "esential" | "business" | "brand";
};

export const LOGO3D_AUDIENCES: L<{ title: string; lead: string; recommended: string; items: Audience[] }> = {
  ro: {
    title: "Pentru cine lucrăm",
    lead: "Același proces, dozat diferit. Alege-ți situația și vezi ce primești și unde îl folosești.",
    recommended: "Pachet potrivit",
    items: [
      {
        key: "personal",
        title: "Persoane fizice și creatori",
        who: "Fotografi, consultanți, antrenori, artiști, creatori de conținut, PFA.",
        gets: ["Marcă personală sau monogramă", "Intro animat pentru video și reels", "Poză de profil și watermark"],
        uses: "Instagram, TikTok, YouTube, portofoliu, CV, semnătură de e-mail.",
        pack: "esential",
      },
      {
        key: "small",
        title: "Firme mici",
        who: "Cafenele, saloane, cabinete, ateliere, magazine de cartier.",
        gets: ["Logo complet, color și monocrom", "Variantă 3D pentru site și prezentări", "Animație scurtă pentru social media"],
        uses: "Firmă, vitrină, meniu, Google Business, site, facturi.",
        pack: "business",
      },
      {
        key: "medium",
        title: "Firme medii",
        who: "Clinici, firme de construcții, distribuitori, rețele de servicii.",
        gets: ["Sistem de variante (orizontal, vertical, simbol)", "Logo interactiv pe site", "Mini-ghid de utilizare pentru echipă"],
        uses: "Site, flotă auto, uniforme, târguri, prezentări pentru clienți.",
        pack: "business",
      },
      {
        key: "brand",
        title: "Branduri și companii mari",
        who: "Branduri de produs, lanțuri, companii cu mai multe canale.",
        gets: ["Sistem de mișcare complet", "Brandbook și fișiere sursă", "Randări și video 4K, format vertical"],
        uses: "Campanii, ecrane, evenimente, ambalaje, realitate augmentată.",
        pack: "brand",
      },
      {
        key: "startup",
        title: "Startupuri",
        who: "Aplicații, SaaS, fintech, produse aflate înainte de lansare sau de o rundă de finanțare.",
        gets: ["Identitate care se extinde odată cu produsul", "Icon de aplicație și animație de încărcare", "Logo pentru pitch deck și demo"],
        uses: "App Store, Google Play, landing page, investitori, lansare.",
        pack: "business",
      },
    ],
  },
  en: {
    title: "Who we work with",
    lead: "The same process, sized differently. Pick your situation to see what you get and where you use it.",
    recommended: "Suggested package",
    items: [
      {
        key: "personal",
        title: "Individuals and creators",
        who: "Photographers, consultants, coaches, artists, content creators, freelancers.",
        gets: ["Personal mark or monogram", "Animated intro for video and reels", "Profile picture and watermark"],
        uses: "Instagram, TikTok, YouTube, portfolio, CV, email signature.",
        pack: "esential",
      },
      {
        key: "small",
        title: "Small businesses",
        who: "Cafés, salons, practices, workshops, neighbourhood shops.",
        gets: ["Complete logo in colour and mono", "3D version for web and presentations", "Short animation for social media"],
        uses: "Signage, shop window, menu, Google Business, website, invoices.",
        pack: "business",
      },
      {
        key: "medium",
        title: "Mid-size companies",
        who: "Clinics, construction firms, distributors, service networks.",
        gets: ["A set of variants (horizontal, vertical, symbol)", "Interactive logo on the website", "Short usage guide for the team"],
        uses: "Website, vehicle fleet, uniforms, trade fairs, client presentations.",
        pack: "business",
      },
      {
        key: "brand",
        title: "Brands and large companies",
        who: "Product brands, chains, companies present on many channels.",
        gets: ["A complete motion system", "Brand book and source files", "4K renders and video, vertical format"],
        uses: "Campaigns, screens, events, packaging, augmented reality.",
        pack: "brand",
      },
      {
        key: "startup",
        title: "Startups",
        who: "Apps, SaaS, fintech, products before launch or before a funding round.",
        gets: ["An identity that grows with the product", "App icon and loading animation", "Logo for pitch deck and demo"],
        uses: "App Store, Google Play, landing page, investors, launch.",
        pack: "business",
      },
    ],
  },
};

export type Tier = {
  key: "esential" | "business" | "brand";
  name: string;
  priceRon: number;
  for: string;
  delivery: string;
  concepts: string;
  revisions: string;
  includes: string[];
  extras: string[];
  featured?: boolean;
};

export const LOGO3D_TIERS: L<Tier[]> = {
  ro: [
    {
      key: "esential",
      name: "Esențial",
      priceRon: 500,
      for: "Persoane fizice, creatori și firme la început de drum.",
      delivery: "5–7 zile lucrătoare",
      concepts: "2 concepte",
      revisions: "2 runde de revizie",
      includes: [
        "Logo original, vectorial: SVG, PDF, PNG transparent",
        "Variante color, alb și negru",
        "Versiune 3D randată în 2 materiale (4 imagini)",
        "Animație intro de 3–5 secunde: MP4 și WebM transparent",
        "Favicon și poză de profil pentru social media",
      ],
      extras: ["Drepturi de autor cedate integral", "Verificare de similaritate cu mărci cunoscute"],
    },
    {
      key: "business",
      name: "Business",
      priceRon: 800,
      for: "Firme mici și medii, startupuri, profesioniști cu mai multe canale.",
      delivery: "7–10 zile lucrătoare",
      concepts: "3 concepte",
      revisions: "3 runde de revizie",
      includes: [
        "Tot ce e în Esențial",
        "Model 3D pentru web (GLB) și pentru AR pe iPhone (USDZ)",
        "Logo interactiv pentru site: reacționează la cursor, sub 300 kB, cu variantă statică",
        "2 animații: intro și buclă, plus Lottie pentru site și aplicații",
        "Variante orizontală, verticală, simbol și monocrom",
        "Mini-ghid de utilizare: culori, fonturi, spațiu de protecție",
        "Mockup-uri realiste: carte de vizită, fațadă, ecran",
      ],
      extras: ["Integrare gratuită pe site-ul făcut de Avyron", "Recomandat pentru majoritatea firmelor"],
      featured: true,
    },
    {
      key: "brand",
      name: "Brand",
      priceRon: 1500,
      for: "Branduri, companii mari și lansări importante.",
      delivery: "10–15 zile lucrătoare",
      concepts: "4–5 concepte",
      revisions: "5 runde de revizie",
      includes: [
        "Tot ce e în Business",
        "Sistem de mișcare: intro, buclă, tranziție și final, cu reguli de folosire",
        "Brandbook: logo, culori, tipografie, iconografie, aplicații",
        "Randări și video 4K, plus format vertical 9:16 pentru reels",
        "Fișiere sursă: Figma, Blender, After Effects",
        "Verificare orientativă de anterioritate în bazele OSIM, EUIPO și TMview",
        "Implementare pe site-ul tău, oricine l-ar fi construit",
      ],
      extras: ["Prioritate în calendar", "Un interlocutor dedicat pe tot proiectul"],
    },
  ],
  en: [
    {
      key: "esential",
      name: "Essential",
      priceRon: 500,
      for: "Individuals, creators and businesses just starting out.",
      delivery: "5–7 working days",
      concepts: "2 concepts",
      revisions: "2 revision rounds",
      includes: [
        "Original vector logo: SVG, PDF, transparent PNG",
        "Colour, white and black versions",
        "3D version rendered in 2 materials (4 images)",
        "3–5 second intro animation: MP4 and transparent WebM",
        "Favicon and social media profile picture",
      ],
      extras: ["Full copyright transfer", "Similarity check against well-known marks"],
    },
    {
      key: "business",
      name: "Business",
      priceRon: 800,
      for: "Small and mid-size companies, startups, professionals on several channels.",
      delivery: "7–10 working days",
      concepts: "3 concepts",
      revisions: "3 revision rounds",
      includes: [
        "Everything in Essential",
        "3D model for the web (GLB) and for AR on iPhone (USDZ)",
        "Interactive website logo: follows the cursor, under 300 kB, with a static fallback",
        "2 animations: intro and loop, plus Lottie for websites and apps",
        "Horizontal, vertical, symbol and mono variants",
        "Short usage guide: colours, fonts, clear space",
        "Realistic mockups: business card, storefront, screen",
      ],
      extras: ["Free integration on an Avyron-built website", "Right for most businesses"],
      featured: true,
    },
    {
      key: "brand",
      name: "Brand",
      priceRon: 1500,
      for: "Brands, large companies and major launches.",
      delivery: "10–15 working days",
      concepts: "4–5 concepts",
      revisions: "5 revision rounds",
      includes: [
        "Everything in Business",
        "Motion system: intro, loop, transition and outro, with usage rules",
        "Brand book: logo, colours, typography, iconography, applications",
        "4K renders and video, plus 9:16 vertical for reels",
        "Source files: Figma, Blender, After Effects",
        "Indicative prior-mark search in the OSIM, EUIPO and TMview databases",
        "Implementation on your website, whoever built it",
      ],
      extras: ["Priority scheduling", "One dedicated contact for the whole project"],
    },
  ],
};

export const LOGO3D_PACKS_COPY: L<{
  title: string;
  lead: string;
  from: string;
  featured: string;
  delivery: string;
  plus: string;
  choose: (name: string) => string;
  whatsapp: (name: string) => string;
  addonsTitle: string;
  addons: string[];
  note: string;
}> = {
  ro: {
    title: "Pachete și prețuri",
    lead: "Prețuri de pornire. Prețul final îl fixăm în ofertă, înainte să începem, și nu se schimbă pe parcurs.",
    from: "de la",
    featured: "Cel mai ales",
    delivery: "Livrare",
    plus: "Plusuri",
    choose: (name) => `Aleg ${name}`,
    whatsapp: (name) => `Bună! Mă interesează pachetul ${name} pentru Logo Dinamic 3D.`,
    addonsTitle: "Opțiuni la cerere",
    addons: [
      "Logo sonor (2–3 secunde)",
      "Fișier STL pentru imprimare 3D",
      "Filtru AR pentru Instagram",
      "Animații suplimentare",
      "Livrare urgentă în 72 de ore",
      "Transformarea în 3D a unui logo existent",
    ],
    note: "Toate pachetele includ fișierele finale, dreptul de folosire comercială nelimitat și cesiunea drepturilor de autor prin contract.",
  },
  en: {
    title: "Packages and pricing",
    lead: "Starting prices. The final price is fixed in the quote before we begin and does not change along the way.",
    from: "from",
    featured: "Most chosen",
    delivery: "Delivery",
    plus: "Extras",
    choose: (name) => `Choose ${name}`,
    whatsapp: (name) => `Hi! I'm interested in the ${name} package for a Dynamic 3D Logo.`,
    addonsTitle: "On request",
    addons: [
      "Sonic logo (2–3 seconds)",
      "STL file for 3D printing",
      "Instagram AR filter",
      "Additional animations",
      "Rush delivery in 72 hours",
      "Turning an existing logo into 3D",
    ],
    note: "Every package includes the final files, unlimited commercial use and a copyright transfer by contract.",
  },
};

export const LOGO3D_FORMATS: L<{ title: string; lead: string; items: Array<{ ext: string; text: string }> }> = {
  ro: {
    title: "Ce fișiere primești",
    lead: "Fiecare format are un loc precis. Îți spunem în ghid ce folosești unde.",
    items: [
      { ext: "SVG · PDF", text: "Vector pentru print, fațadă, broderie și site." },
      { ext: "PNG", text: "Transparent, la rezoluții de la 64 la 4096 px." },
      { ext: "GLB", text: "Modelul 3D, gata pentru web și aplicații." },
      { ext: "USDZ", text: "Logo-ul în realitate augmentată, direct pe iPhone." },
      { ext: "Lottie", text: "Animație vectorială ușoară pentru site și aplicații." },
      { ext: "WebM · MOV", text: "Video cu fundal transparent, pentru editare." },
      { ext: "MP4", text: "Intro și buclă pentru reels, YouTube și prezentări." },
      { ext: "Favicon", text: "Iconul din tab, pregătit pentru toate browserele." },
      { ext: "Componentă web", text: "Logo interactiv pentru site, cu variantă statică." },
      { ext: "Ghid PDF", text: "Culori, fonturi, spațiu de protecție și greșeli de evitat." },
    ],
  },
  en: {
    title: "The files you get",
    lead: "Every format has a job. The guide tells you which one to use where.",
    items: [
      { ext: "SVG · PDF", text: "Vectors for print, signage, embroidery and web." },
      { ext: "PNG", text: "Transparent, from 64 to 4096 px." },
      { ext: "GLB", text: "The 3D model, ready for the web and apps." },
      { ext: "USDZ", text: "Your logo in augmented reality, straight on iPhone." },
      { ext: "Lottie", text: "Lightweight vector animation for websites and apps." },
      { ext: "WebM · MOV", text: "Video with a transparent background, for editing." },
      { ext: "MP4", text: "Intro and loop for reels, YouTube and presentations." },
      { ext: "Favicon", text: "The browser tab icon, prepared for every browser." },
      { ext: "Web component", text: "An interactive website logo with a static fallback." },
      { ext: "PDF guide", text: "Colours, fonts, clear space and mistakes to avoid." },
    ],
  },
};

export const LOGO3D_TOOLS: L<{
  title: string;
  lead: string;
  items: Array<{ name: string; text: string }>;
  promisesTitle: string;
  promises: string[];
}> = {
  ro: {
    title: "Tehnologii și instrumente",
    lead: "Folosim instrumentele standard ale industriei pentru design și un motor 3D propriu pentru web, scris ca să fie ușor.",
    items: [
      { name: "Figma și Illustrator", text: "Schițe, grilă de construcție și vectorul final." },
      { name: "Blender", text: "Modelare 3D, materiale, lumină și randări fotorealiste." },
      { name: "After Effects și Lottie", text: "Animațiile pentru video și varianta vectorială pentru web." },
      { name: "Rive", text: "Logo-uri interactive care reacționează la cursor sau la stări din aplicație." },
      { name: "WebGL2, motor Avyron", text: "Randarea live din această pagină: un singur canvas, fără biblioteci grele." },
      { name: "glTF, USDZ, Meshopt", text: "Formate 3D deschise, comprimate pentru încărcare rapidă." },
    ],
    promisesTitle: "Ce promitem pentru site-ul tău",
    promises: [
      "Logo-ul 3D se încarcă după conținutul principal, deci nu întârzie pagina.",
      "Sub 300 kB pentru varianta interactivă, cu imagine statică dacă dispozitivul nu poate reda 3D.",
      "Respectă setarea „mișcare redusă” și poate fi oprit cu un buton.",
      "Text alternativ și contrast verificat, ca logo-ul să fie accesibil și cititoarelor de ecran.",
    ],
  },
  en: {
    title: "Technology and tools",
    lead: "Industry-standard tools for design, and our own lightweight 3D engine for the web.",
    items: [
      { name: "Figma and Illustrator", text: "Sketches, construction grid and the final vector." },
      { name: "Blender", text: "3D modelling, materials, lighting and photorealistic renders." },
      { name: "After Effects and Lottie", text: "Video animation and the vector version for the web." },
      { name: "Rive", text: "Interactive logos that respond to the cursor or to app states." },
      { name: "WebGL2, Avyron engine", text: "The live rendering on this page: one canvas, no heavy libraries." },
      { name: "glTF, USDZ, Meshopt", text: "Open 3D formats, compressed for fast loading." },
    ],
    promisesTitle: "What we promise for your website",
    promises: [
      "The 3D logo loads after the main content, so it never delays the page.",
      "Under 300 kB for the interactive version, with a static image when a device cannot render 3D.",
      "Respects the reduced-motion setting and can be paused with a button.",
      "Alt text and checked contrast, so the logo stays accessible to screen readers.",
    ],
  },
};

export const LOGO3D_PROCESS: L<{ title: string; lead: string; steps: Array<{ title: string; text: string; time: string }> }> = {
  ro: {
    title: "Proces și termene",
    lead: "Cinci pași, cu o persoană de contact de la brief până la fișierele finale.",
    steps: [
      { title: "Brief", text: "O discuție de 15 minute sau un formular: ce faci, pentru cine, ce îți place și ce nu.", time: "ziua 1" },
      { title: "Concepte", text: "Primești conceptele în context: pe site, pe o carte de vizită, pe telefon.", time: "zilele 2–5" },
      { title: "Rafinare", text: "Alegi direcția, iar noi ajustăm forma, culorile și tipografia în rundele incluse.", time: "zilele 4–8" },
      { title: "3D și mișcare", text: "Modelăm, alegem materialul și animăm. Vezi totul într-o previzualizare privată.", time: "zilele 6–12" },
      { title: "Livrare", text: "Fișiere, ghid, contract de cesiune și, după pachet, integrarea pe site.", time: "zilele 5–15" },
    ],
  },
  en: {
    title: "Process and timing",
    lead: "Five steps, with one contact person from brief to final files.",
    steps: [
      { title: "Brief", text: "A 15-minute call or a form: what you do, who it is for, what you like and what you don't.", time: "day 1" },
      { title: "Concepts", text: "You see the concepts in context: on a website, a business card, a phone.", time: "days 2–5" },
      { title: "Refinement", text: "You pick a direction; we refine form, colour and type within the included rounds.", time: "days 4–8" },
      { title: "3D and motion", text: "We model, choose the material and animate. You review it all in a private preview.", time: "days 6–12" },
      { title: "Delivery", text: "Files, guide, copyright contract and, depending on the package, website integration.", time: "days 5–15" },
    ],
  },
};

export const LOGO3D_TRUST: L<Array<{ title: string; text: string }>> = {
  ro: [
    { title: "Drepturile sunt ale tale", text: "Cesiune integrală prin contract, pentru orice folosire comercială." },
    { title: "Original, desenat de noi", text: "Folosim AI doar la explorarea ideilor. Forma finală o construim vectorial, de mână." },
    { title: "Verificăm asemănările", text: "Comparăm logo-ul cu mărci cunoscute înainte de livrare. Nu e aviz juridic, dar evită surprizele." },
    { title: "Fișiere sursă la cerere", text: "Incluse în pachetul Brand, disponibile ca opțiune în celelalte." },
  ],
  en: [
    { title: "The rights are yours", text: "Full copyright transfer by contract, for any commercial use." },
    { title: "Original, drawn by us", text: "AI only helps us explore ideas. The final form is built as vectors, by hand." },
    { title: "We check for look-alikes", text: "We compare the logo with known marks before delivery. Not legal advice, but it avoids surprises." },
    { title: "Source files on request", text: "Included in Brand, available as an option in the other packages." },
  ],
};

export const LOGO3D_FAQ: L<Array<{ q: string; a: string }>> = {
  ro: [
    { q: "Ce este un logo dinamic 3D?", a: "Este un logo gândit pentru trei stări: static (vector pentru print), volum (model 3D cu material și lumină) și mișcare (animații pentru site, video și social media). Toate trei păstrează aceeași formă și aceeași idee." },
    { q: "Care e diferența față de un logo animat obișnuit?", a: "Un logo animat pornește de obicei de la un desen plat, căruia i se adaugă mișcare. Noi construim forma de la început ca să funcționeze și în 3D, deci primești și model 3D, variante pentru AR și un logo interactiv pentru site." },
    { q: "Cât costă un logo 3D?", a: "Pachetele pornesc de la 500 lei (Esențial), 800 lei (Business) și 1.500 lei (Brand). Prețul final se fixează în ofertă, înainte de începerea lucrului, și nu se modifică pe parcurs." },
    { q: "Cât durează?", a: "Între 5 și 15 zile lucrătoare, în funcție de pachet și de cât de repede ne dai feedback. Pentru urgențe avem livrare în 72 de ore, ca opțiune." },
    { q: "Am deja un logo. Îl puteți transforma în 3D?", a: "Da. Pornim de la fișierul vectorial (SVG, AI, PDF). Dacă ai doar o imagine, îl redesenăm întâi vectorial. Prețul se stabilește după complexitate, de obicei sub pachetul Business." },
    { q: "Logo-ul 3D încetinește site-ul?", a: "Nu, dacă e făcut corect. Varianta interactivă are sub 300 kB, se încarcă după conținutul principal și are o imagine statică pentru dispozitivele care nu pot reda 3D." },
    { q: "Ale cui sunt drepturile de autor?", a: "Ale tale. Semnăm un contract de cesiune a drepturilor patrimoniale, iar fișierele finale pot fi folosite nelimitat, comercial, pe orice suport." },
    { q: "Folosiți inteligență artificială?", a: "Doar în explorare, ca să testăm rapid direcții. Logo-ul final e desenat vectorial de designerii noștri și verificat pentru asemănări cu mărci cunoscute." },
    { q: "Pot înregistra logo-ul ca marcă la OSIM?", a: "Da. În pachetul Brand facem o verificare orientativă de anterioritate în bazele OSIM, EUIPO și TMview. Pentru înregistrare îți recomandăm un consilier în proprietate industrială." },
    { q: "Cum plătesc?", a: "Cu cardul, prin transfer bancar sau prin link de plată, pe bază de factură. Termenele de plată sunt trecute în ofertă." },
  ],
  en: [
    { q: "What is a dynamic 3D logo?", a: "A logo designed for three states: static (vectors for print), volume (a 3D model with material and light) and motion (animations for web, video and social media). All three keep the same form and idea." },
    { q: "How is it different from a regular animated logo?", a: "An animated logo usually starts from a flat drawing that gets motion added. We build the form to work in 3D from the start, so you also get a 3D model, AR versions and an interactive website logo." },
    { q: "How much does a 3D logo cost?", a: "Packages start at 500 lei (Essential), 800 lei (Business) and 1,500 lei (Brand). The final price is fixed in the quote before work starts and does not change along the way." },
    { q: "How long does it take?", a: "Between 5 and 15 working days, depending on the package and on how quickly you send feedback. Rush delivery in 72 hours is available as an option." },
    { q: "I already have a logo. Can you make it 3D?", a: "Yes. We start from the vector file (SVG, AI, PDF). If you only have an image, we redraw it as vectors first. Pricing depends on complexity, usually below the Business package." },
    { q: "Will a 3D logo slow down my website?", a: "Not when it's built properly. The interactive version is under 300 kB, loads after the main content and falls back to a static image on devices that cannot render 3D." },
    { q: "Who owns the copyright?", a: "You do. We sign a contract transferring the economic rights, and the final files can be used without limits, commercially, on any medium." },
    { q: "Do you use artificial intelligence?", a: "Only for exploration, to test directions quickly. The final logo is drawn as vectors by our designers and checked for similarity with known marks." },
    { q: "Can I register the logo as a trademark?", a: "Yes. In the Brand package we run an indicative prior-mark search in the OSIM, EUIPO and TMview databases. For the filing itself we recommend an IP attorney." },
    { q: "How do I pay?", a: "By card, bank transfer or payment link, against an invoice. Payment terms are set out in the quote." },
  ],
};

export const LOGO3D_CTA: L<{ title: string; text: string; primary: string; whatsapp: string; whatsappText: string; related: string }> = {
  ro: {
    title: "Hai să-i dăm volum brandului tău",
    text: "Spune-ne ce faci și pentru cine. Primești o previzualizare gratuită și o ofertă fixă, fără nicio obligație.",
    primary: "Cere previzualizarea gratuită",
    whatsapp: "Scrie-ne pe WhatsApp",
    whatsappText: "Bună! Aș vrea un Logo Dinamic 3D. Putem discuta?",
    related: "Merge bine împreună cu",
  },
  en: {
    title: "Let's give your brand some volume",
    text: "Tell us what you do and who it's for. You get a free preview and a fixed quote, with no obligation.",
    primary: "Request the free preview",
    whatsapp: "Message us on WhatsApp",
    whatsappText: "Hi! I'd like a Dynamic 3D Logo. Can we talk?",
    related: "Pairs well with",
  },
};

export const WHATSAPP_NUMBER = "40734605055";
export const whatsappUrl = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
