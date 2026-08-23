import type { Lang } from "@/i18n/translations";

/**
 * Product catalog used by /costurisiproduse (summary cards) and the
 * dedicated product landing pages under /produse/* (RO) and /en/products/* (EN).
 *
 * Content is written for SEO: each product has a unique title, description,
 * intro copy, benefit blocks, a delivery process and an FAQ (rendered as FAQPage JSON-LD).
 */

export type ProductKey =
  | "premium-website"
  | "social-identity"
  | "online-store"
  | "apps"
  | "ai-agent"
  | "qa-testing"
  | "audit";

export type IconKey =
  | "globe"
  | "share"
  | "store"
  | "smartphone"
  | "cpu"
  | "scan"
  | "check"
  | "shield"
  | "zap"
  | "search"
  | "gauge"
  | "accessibility"
  | "chart"
  | "palette"
  | "code"
  | "cloud"
  | "users"
  | "bug"
  | "flask"
  | "clock";


export type ProductCopy = {
  name: string;
  kicker: string;
  subtitle: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroLead: string;
  intro: string[];
  highlights: Array<{ icon: IconKey; title: string; desc: string }>;
  deliverables: string[];
  process: Array<{ title: string; desc: string }>;
  faq: Array<{ q: string; a: string }>;
  ctaTitle: string;
  ctaDesc: string;
  ctaButton: string;
  whatsapp: string;
  /** Optional, page-specific enrichments (currently used by the premium website page). */
  heroStats?: Array<{ value: string; label: string }>;
  audiences?: {
    title: string;
    lead: string;
    items: Array<{ icon: IconKey; title: string; desc: string }>;
  };
  tech?: {
    title: string;
    lead: string;
    groups: Array<{ name: string; items: string[] }>;
  };
  examples?: {
    title: string;
    lead: string;
    items: Array<{ title: string; desc: string; result: string }>;
  };
  advice?: {
    title: string;
    lead: string;
    items: Array<{ title: string; desc: string }>;
  };
};


export type Product = {
  key: ProductKey;
  icon: IconKey;
  /** RO path (canonical) and EN path. */
  path: { ro: string; en: string };
  priceEur: number;
  /** Displayed as "de la X€" when true. */
  from: boolean;
  duration: { ro: string; en: string };
  /** Tailwind accent tokens for gradients/borders. */
  accent: {
    from: string;
    to: string;
    border: string;
    text: string;
    glow: string;
    chipBg: string;
    chipText: string;
  };
  copy: Record<Lang, ProductCopy>;
};

const CATALOG: Product[] = [
  {
    key: "premium-website",
    icon: "globe",
    path: {
      ro: "/produse/website-prezentare-premium",
      en: "/en/products/premium-presentation-website",
    },
    priceEur: 300,
    from: true,
    duration: { ro: "2–5 zile", en: "2–5 days" },
    accent: {
      from: "from-cyan-400",
      to: "to-blue-600",
      border: "border-cyan-300/25",
      text: "text-cyan-300",
      glow: "bg-cyan-400/15",
      chipBg: "bg-cyan-300/10 border-cyan-300/30",
      chipText: "text-cyan-700 dark:text-cyan-200",
    },
    copy: {
      ro: {
        name: "Website Prezentare Premium",
        kicker: "Produs principal",
        subtitle: "Site de prezentare la cheie, optimizat pentru clienți",
        tagline: "Un site care vinde, nu doar arată bine.",
        metaTitle: "Website Prezentare Premium — site profesional de la 300€ | Avyron",
        metaDescription:
          "Site de prezentare premium, livrat la cheie într-un termen agreat: design custom, SEO tehnic, panou de administrare, email pe domeniu și suport definit în ofertă. De la 300€.",
        heroTitle: "Website Prezentare Premium",
        heroLead:
          "Site complet, construit de la zero pe identitatea afacerii tale — rapid, sigur, pregătit tehnic pentru indexare și pentru campanii de atragere a clienților după lansare.",
        intro: [
          "Un site de prezentare nu înseamnă doar câteva pagini frumoase. Înseamnă structura corectă pentru ceea ce caută clientul, obiective Core Web Vitals măsurate, texte care răspund la întrebările reale ale vizitatorului și trasee clare către telefon, WhatsApp sau formular.",
          "Fiecare proiect pornește de la activitatea ta: ce vinzi, cui, în ce zonă și ce te diferențiază de concurență. Construim arhitectura de pagini în jurul acestor răspunsuri, apoi scriem conținutul, pregătim imaginile, implementăm designul și testăm totul pe mobil, tabletă și desktop înainte de livrare.",
          "La final primești acces complet: panou de administrare, documentație, sesiune live de instruire și suport tehnic gratuit pe toată durata de viață a produsului. Site-ul rămâne al tău, fără dependențe ascunse.",
        ],
        highlights: [
          {
            icon: "palette",
            title: "Design custom, nu template",
            desc: "Interfață creată de la zero pe brandul tău: paletă, tipografie, fotografie și micro-interacțiuni coerente pe toate paginile.",
          },
          {
            icon: "search",
            title: "SEO tehnic complet",
            desc: "Titluri și descrieri unice, date structurate, sitemap, canonical, hreflang RO/EN și structură de linkuri gândită pentru indexare rapidă.",
          },
          {
            icon: "gauge",
            title: "Performanță reală",
            desc: "Scoruri Lighthouse înalte, imagini optimizate, cod livrat pe bucăți și încărcare progresivă — pentru vizitatori pe mobil, pe internet slab.",
          },
          {
            icon: "shield",
            title: "Securitate și GDPR",
            desc: "HTTPS, headere de securitate, protecție anti-spam pe formulare, banner de cookie-uri și pagină de politică de confidențialitate conformă.",
          },
          {
            icon: "users",
            title: "Panou de administrare",
            desc: "Modifici singur prețuri, texte, imagini și date de contact, fără să scrii o linie de cod și fără să ne suni de fiecare dată.",
          },
          {
            icon: "clock",
            title: "Livrare în 2–5 zile",
            desc: "Proces scurt, runde de revizie stabilite în ofertă și mediu de test unde vezi site-ul înainte să fie public.",
          },
        ],
        deliverables: [
          "Logo static creat împreună cu tine",
          "Structură de pagini gândită pe intenția de căutare",
          "Texte profesionale pentru servicii și produse",
          "Imagini optimizate și galerii vizuale",
          "SEO tehnic și on-page complet",
          "Integrare Google Analytics / Meta Pixel",
          "Formular de contact cu anti-spam",
          "Email profesional pe domeniul tău",
          "Certificat SSL și backup inițial",
          "Pagină GDPR și politică de cookie-uri",
          "Panou Administrator complet",
          "Ghid de administrare + sesiune live",
          "Suport tehnic gratuit pe viață",
        ],
        process: [
          {
            title: "Discuție și analiză",
            desc: "Aflăm ce faci, cine sunt clienții tăi și ce caută ei în Google. Analizăm 2–3 concurenți direcți.",
          },
          {
            title: "Structură și conținut",
            desc: "Propunem harta de pagini, textele și imaginile. Tu confirmi sau ceri modificări, fără limită.",
          },
          {
            title: "Design și dezvoltare",
            desc: "Construim interfața și codul pe identitatea ta, direct într-un mediu de test pe care îl poți vedea oricând.",
          },
          {
            title: "Testare",
            desc: "Verificăm viteza, securitatea, accesibilitatea și afișarea pe telefoane reale, tablete și desktop.",
          },
          {
            title: "Lansare și instruire",
            desc: "Punem site-ul pe domeniul tău, îl trimitem la indexare în Google și îți arătăm live cum îl administrezi.",
          },
        ],
        faq: [
          {
            q: "Cât costă un site de prezentare profesional?",
            a: "Pachetul Website Prezentare Premium pornește de la 300€ și include design custom, conținut, SEO tehnic, panou de administrare și email pe domeniu. Durata suportului și prețul final depind de numărul de pagini, funcționalități și oferta agreată.",
          },
          {
            q: "În cât timp este gata site-ul?",
            a: "În general 2–5 zile lucrătoare de la momentul în care avem informațiile și materialele necesare. Proiectele cu multe pagini sau integrări speciale pot dura mai mult, iar termenul exact ți-l comunicăm înainte de start.",
          },
          {
            q: "Trebuie să plătesc lunar ceva?",
            a: "Nu. După livrare nu ai nimic de plătit pentru o perioadă între 1 lună și 1 an, în funcție de configurația inițială. Ulterior poți alege un pachet de mentenanță sau poți administra singur site-ul.",
          },
          {
            q: "Pot modifica singur textele și prețurile?",
            a: "Da. Primești un panou de administrare complet, un ghid scris și o sesiune live în care îți arătăm exact cum se fac modificările.",
          },
          {
            q: "Site-ul apare în Google?",
            a: "Da. Implementăm SEO tehnic complet, trimitem sitemap-ul în Google Search Console și optimizăm fiecare pagină pentru cuvintele cheie relevante domeniului tău. Indexarea durează de obicei câteva zile până la câteva săptămâni.",
          },
        ],
        ctaTitle: "Vrei un site care aduce clienți?",
        ctaDesc:
          "Îți facem gratuit o propunere de structură și un exemplu vizual personalizat pe activitatea ta, înainte să plătești ceva.",
        ctaButton: "Vreau Website Prezentare Premium",
        whatsapp: "Bună! Sunt interesat de Website Prezentare Premium.",
        heroStats: [
          { value: "2–5", label: "zile până la lansare" },
          { value: "90+", label: "țintă Lighthouse" },
          { value: "RO/EN", label: "structură bilingvă" },
          { value: "SLA", label: "suport definit contractual" },
        ],
        audiences: {
          title: "Identitate online profesională, construită pe contextul tău",
          lead: "O afacere locală, un brand național și un cabinet de avocatură au nevoie de aceeași calitate tehnică, dar de structură, ton și dovezi complet diferite. Construim varianta potrivită pentru tine.",
          items: [
            {
              icon: "globe",
              title: "Afaceri locale",
              desc: "Construit în jurul orașului și al serviciilor căutate efectiv: pagini locale, aliniere cu Google Business Profile, hartă, program, indicații rutiere și buton de apel sau WhatsApp la o atingere.",
            },
            {
              icon: "chart",
              title: "Branduri naționale",
              desc: "Arhitectură de pagini scalabilă, sistem de brand coerent, structură bilingvă RO/EN, landing page-uri de campanie și analytics curat, ca bugetul de marketing să fie măsurabil.",
            },
            {
              icon: "shield",
              title: "Avocați și cabinete juridice",
              desc: "Design sobru și credibil, pagini pe arii de practică, prezentare profesională, logică de onorarii, formular securizat de contact și texte de confidențialitate aliniate deontologiei.",
            },
            {
              icon: "users",
              title: "Consultanți financiari și de business",
              desc: "Structură bazată pe poziționare: expertiză, metodă de lucru, studii de caz, resurse descărcabile și un formular de programare care filtrează cererile serioase.",
            },
            {
              icon: "accessibility",
              title: "Cabinete medicale și wellbeing",
              desc: "Pagini clare de servicii și tarife, credențialele echipei, tipografie accesibilă, cereri de programare și tratarea datelor de contact conform GDPR.",
            },
            {
              icon: "store",
              title: "Studiouri, agenții și creatori",
              desc: "Layout condus de portofoliu, livrare rapidă a imaginilor, povestea proiectelor și un traseu clar de contact — ca lucrările tale, nu interfața, să vorbească.",
            },
          ],
        },
        tech: {
          title: "Tehnologii moderne, de nivel profesionist",
          lead: "Folosim același stack ca produsele cu trafic mare: randare rapidă, livrare la edge și zero dependențe ascunse de furnizor.",
          groups: [
            {
              name: "Interfață",
              items: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "Design tokens & dark mode"],
            },
            {
              name: "Livrare și infrastructură",
              items: ["Rețea edge Cloudflare", "CDN global și cache", "HTTPS automat", "Imagini optimizate (WebP/AVIF)", "Backup zilnic"],
            },
            {
              name: "Căutare și date",
              items: ["SEO tehnic", "Date structurate Schema.org", "Google Search Console", "GA4 cu consent mode", "Sitemap și hreflang RO/EN"],
            },
            {
              name: "Calitate și securitate",
              items: ["Lighthouse și Core Web Vitals", "Verificări accesibilitate WCAG", "Headere de securitate și anti-spam", "Testare pe toate dispozitivele", "Monitorizare uptime"],
            },
          ],
        },
        examples: {
          title: "Exemple concrete de proiecte",
          lead: "Tipuri de site-uri livrate cu acest pachet — structura, conținutul și măsurarea sunt alese în funcție de obiectiv.",
          items: [
            {
              title: "Firmă de servicii locale",
              desc: "Șase pagini: acasă, două pagini de servicii, zona acoperită, despre și contact, cu recenzii și buton fix de apel pe mobil.",
              result: "Obiectiv: mai multe apeluri din căutările locale.",
            },
            {
              title: "Cabinet de avocatură",
              desc: "Pagini pe arii de practică, profiluri de avocați, logică de onorarii, secțiune de articole și formular confidențial de contact.",
              result: "Obiectiv: solicitări calificate și credibilitate profesională.",
            },
            {
              title: "Turism și ospitalitate",
              desc: "Design condus de galerie, pagini de camere sau meniu, cerere de disponibilitate, hartă și structură bilingvă RO/EN.",
              result: "Obiectiv: rezervări directe, fără comisioane către platforme.",
            },
            {
              title: "Consultant sau profesie liberală",
              desc: "O pagină narativă puternică, plus metodă de lucru, studii de caz și formular de programare conectat la calendarul tău.",
              result: "Obiectiv: mai puține discuții, dar mai bune.",
            },
          ],
        },
        advice: {
          title: "După lansare: consiliere, nu tăcere",
          lead: "Lansarea este începutul. Iată ce recomandăm în primele luni — și la ce te ajutăm gratuit, ca parte din suportul pe viață.",
          items: [
            {
              title: "Primele 7 zile — verifică și indexează",
              desc: "Trimitem sitemap-ul în Search Console, confirmăm evenimentele de analytics, testăm fiecare formular de pe un telefon real și verificăm ca datele firmei să fie identice peste tot online.",
            },
            {
              title: "Primele 30 de zile — hrănește site-ul",
              desc: "Adaugă fotografii reale, publică două-trei pagini sau articole utile care răspund la întrebările clienților și strânge primele recenzii autentice.",
            },
            {
              title: "Ritm de conținut",
              desc: "O actualizare relevantă pe lună valorează mai mult decât un redesign pe an. Ține la zi prețurile, serviciile și echipa; conținutul învechit costă încredere și poziții în Google.",
            },
            {
              title: "Măsoară ce contează",
              desc: "Urmărește apelurile, click-urile pe WhatsApp și formularele trimise, nu doar vizitele. Configurăm evenimentele ca să vezi exact ce pagini îți aduc lucrări.",
            },
            {
              title: "Protejează activul",
              desc: "Ține domeniul și conturile pe numele tău, păstrează backup-urile active și reînnoiește la timp. Documentăm totul, ca să nu depinzi niciodată de o singură persoană.",
            },
            {
              title: "Crește cu cap",
              desc: "Când traficul e stabil, extinde cu blog, sistem de programări, magazin online sau asistent AI. Îți spunem sincer ce merită făcut în etapa următoare și ce nu.",
            },
          ],
        },

      },
      en: {
        name: "Premium Presentation Website",
        kicker: "Main product",
        subtitle: "Turnkey presentation website, built to convert",
        tagline: "A website that sells, not just looks good.",
        metaTitle: "Premium Presentation Website — professional site from €300 | Avyron",
        metaDescription:
          "Turnkey premium presentation website delivered on an agreed schedule: custom design, technical SEO, admin panel, domain email and support defined in the proposal. From €300.",
        heroTitle: "Premium Presentation Website",
        heroLead:
          "A complete website built from scratch around your brand — fast, secure, properly indexed in Google and ready to bring clients from week one.",
        intro: [
          "A presentation website is more than a few nice pages. It's the right structure for what your client is looking for, sub-second loading, copy that answers real questions and clear paths to phone, WhatsApp or form. That's exactly what we deliver.",
          "Every project starts from your business: what you sell, to whom, where and what makes you different. We build the page architecture around those answers, then write the content, prepare the imagery, implement the design and test everything on mobile, tablet and desktop before launch.",
          "At handover you get full access: admin panel, documentation, a live training session and free technical support for the lifetime of the product. The site is yours, with no hidden dependencies.",
        ],
        highlights: [
          {
            icon: "palette",
            title: "Custom design, no templates",
            desc: "An interface built from scratch for your brand: palette, typography, photography and consistent micro-interactions across every page.",
          },
          {
            icon: "search",
            title: "Complete technical SEO",
            desc: "Unique titles and descriptions, structured data, sitemap, canonicals, RO/EN hreflang and an internal link structure designed for fast indexing.",
          },
          {
            icon: "gauge",
            title: "Real performance",
            desc: "High Lighthouse scores, optimized images, code splitting and progressive loading — for mobile visitors on weak connections.",
          },
          {
            icon: "shield",
            title: "Security and GDPR",
            desc: "HTTPS, security headers, anti-spam protection on forms, cookie banner and a compliant privacy policy page.",
          },
          {
            icon: "users",
            title: "Admin panel",
            desc: "Change prices, text, images and contact details yourself, without writing code or calling us every time.",
          },
          {
            icon: "clock",
            title: "Delivered in 2–5 days",
            desc: "A short process, revision rounds defined in the proposal and a staging environment where you see the site before it goes public.",
          },
        ],
        deliverables: [
          "Static logo crafted together with you",
          "Page structure built on search intent",
          "Professional copy for services and products",
          "Optimized images and visual galleries",
          "Complete technical and on-page SEO",
          "Google Analytics / Meta Pixel integration",
          "Contact form with anti-spam",
          "Professional email on your domain",
          "SSL certificate and initial backup",
          "GDPR page and cookie policy",
          "Full admin panel",
          "Admin guide + live session",
          "Free lifetime technical support",
        ],
        process: [
          {
            title: "Discovery",
            desc: "We learn what you do, who your clients are and what they search for. We analyse 2–3 direct competitors.",
          },
          {
            title: "Structure and content",
            desc: "We propose the sitemap, copy and imagery. You confirm or request changes, with no limit.",
          },
          {
            title: "Design and build",
            desc: "We build the interface and code around your identity, in a staging environment you can check anytime.",
          },
          {
            title: "Testing",
            desc: "We verify speed, security, accessibility and rendering on real phones, tablets and desktops.",
          },
          {
            title: "Launch and training",
            desc: "We publish on your domain, submit it for indexing and walk you through the admin panel live.",
          },
        ],
        faq: [
          {
            q: "How much does a professional presentation website cost?",
            a: "The Premium Presentation Website package starts at €300 and includes custom design, content, technical SEO, an admin panel and domain email. Support duration and final pricing depend on the agreed scope.",
          },
          {
            q: "How long does it take?",
            a: "Usually 2–5 working days from the moment we have the required information and materials. Larger projects or special integrations may take longer; we confirm the exact timeline before we start.",
          },
          {
            q: "Do I have to pay monthly?",
            a: "No. After delivery you owe nothing for a period between 1 month and 1 year, depending on the initial configuration. Afterwards you can choose a care plan or manage the site yourself.",
          },
          {
            q: "Can I edit text and prices myself?",
            a: "Yes. You get a full admin panel, a written guide and a live session showing exactly how to make changes.",
          },
          {
            q: "Will the site appear in Google?",
            a: "Yes. We implement full technical SEO, submit the sitemap to Google Search Console and optimize every page for the keywords relevant to your field. Indexing usually takes a few days to a few weeks.",
          },
        ],
        ctaTitle: "Want a website that brings clients?",
        ctaDesc:
          "We'll prepare a free structure proposal and a visual example tailored to your business before you pay anything.",
        ctaButton: "I want a Premium Presentation Website",
        whatsapp: "Hi! I'm interested in the Premium Presentation Website.",
        heroStats: [
          { value: "2–5", label: "days to launch" },
          { value: "90+", label: "Lighthouse target" },
          { value: "RO/EN", label: "bilingual ready" },
          { value: "SLA", label: "contract-defined support" },
        ],
        audiences: {
          title: "A professional online identity, built for your context",
          lead: "A local bakery, a national brand and a law firm need the same technical quality but very different structure, tone and proof. We build the version that fits you.",
          items: [
            {
              icon: "globe",
              title: "Local businesses",
              desc: "Built around the city and the services people actually search for: local pages, Google Business Profile alignment, map, opening hours, directions and one-tap call or WhatsApp.",
            },
            {
              icon: "chart",
              title: "National brands",
              desc: "Scalable page architecture, consistent brand system, bilingual RO/EN structure, campaign landing pages and clean analytics so marketing spend can be measured.",
            },
            {
              icon: "shield",
              title: "Lawyers & legal practices",
              desc: "Sober, credible design, practice-area pages, professional bio, published fee logic, secure contact form and privacy wording aligned with professional confidentiality.",
            },
            {
              icon: "users",
              title: "Financial & business consultants",
              desc: "Positioning-first structure: expertise, method, case studies, downloadable resources and a booking or qualification form that filters serious enquiries.",
            },
            {
              icon: "accessibility",
              title: "Medical & wellbeing practices",
              desc: "Clear service and pricing pages, team credentials, accessible typography, appointment requests and GDPR-safe handling of sensitive contact data.",
            },
            {
              icon: "store",
              title: "Studios, agencies & creators",
              desc: "Portfolio-led layout, fast media delivery, project storytelling and a clear enquiry path — designed so your work, not the interface, does the talking.",
            },
          ],
        },
        tech: {
          title: "Modern, professional technology",
          lead: "We use the same stack that powers high-traffic products: fast rendering, edge delivery and no hidden vendor lock-in.",
          groups: [
            {
              name: "Interface",
              items: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "Design tokens & dark mode"],
            },
            {
              name: "Delivery & infrastructure",
              items: ["Cloudflare edge network", "Global CDN & caching", "Automatic HTTPS", "Image optimization (WebP/AVIF)", "Daily backups"],
            },
            {
              name: "Search & data",
              items: ["Technical SEO", "Schema.org structured data", "Google Search Console", "GA4 with consent mode", "Sitemap & hreflang RO/EN"],
            },
            {
              name: "Quality & security",
              items: ["Lighthouse & Core Web Vitals", "WCAG accessibility checks", "Security headers & anti-spam", "Cross-device QA", "Uptime monitoring"],
            },
          ],
        },
        examples: {
          title: "Examples of what this looks like in practice",
          lead: "Typical builds we deliver with this package — structure, content and measurement chosen for the goal.",
          items: [
            {
              title: "Local services company",
              desc: "Six pages: home, two service pages, area covered, about and contact, with reviews and a sticky call button on mobile.",
              result: "Objective: more calls from local searches.",
            },
            {
              title: "Law firm",
              desc: "Practice-area pages, lawyer profiles, published fee logic, articles section and a confidential contact form.",
              result: "Objective: qualified enquiries and professional credibility.",
            },
            {
              title: "Hospitality & tourism",
              desc: "Gallery-first design, rooms or menu pages, availability enquiry, map and multilingual RO/EN structure.",
              result: "Objective: direct bookings instead of platform commissions.",
            },
            {
              title: "Consultant or independent professional",
              desc: "One strong narrative page plus method, case studies and a booking form connected to your calendar.",
              result: "Objective: fewer, better conversations.",
            },
          ],
        },
        advice: {
          title: "After launch: guidance, not silence",
          lead: "The launch is the beginning. Here is what we recommend in the first months — and what we help you with, free of charge, as part of lifetime support.",
          items: [
            {
              title: "First 7 days — verify and index",
              desc: "Submit the sitemap in Search Console, confirm analytics events, test every form from a real phone and check that your business details match everywhere online.",
            },
            {
              title: "First 30 days — feed the site",
              desc: "Add real photos, publish two or three useful pages or articles answering the questions clients actually ask, and collect your first genuine reviews.",
            },
            {
              title: "Content rhythm",
              desc: "One meaningful update per month beats a redesign per year. Keep prices, services and team information current; outdated content costs trust and rankings.",
            },
            {
              title: "Measure what matters",
              desc: "Track calls, WhatsApp taps and form submissions — not just visits. We set the events up so you can see which pages actually generate work.",
            },
            {
              title: "Protect the asset",
              desc: "Keep the domain and accounts in your own name, keep backups running and renew on time. We document everything so you are never dependent on a single person.",
            },
            {
              title: "Grow deliberately",
              desc: "When traffic is stable, extend with a blog, a booking flow, an online store or an AI assistant. We advise on what is worth doing next and what is not.",
            },
          ],
        },

      },
    },
  },
  {
    key: "social-identity",
    icon: "share",
    path: {
      ro: "/produse/identitate-social-media",
      en: "/en/products/social-media-identity",
    },
    priceEur: 250,
    from: true,
    duration: { ro: "2–5 zile", en: "2–5 days" },
    accent: {
      from: "from-pink-500",
      to: "to-purple-600",
      border: "border-pink-300/25",
      text: "text-pink-300",
      glow: "bg-pink-400/15",
      chipBg: "bg-pink-300/10 border-pink-300/30",
      chipText: "text-pink-700 dark:text-pink-200",
    },
    copy: {
      ro: {
        name: "Identitate Social Media",
        kicker: "Identitate digitală",
        subtitle: "Facebook · Instagram · TikTok",
        tagline: "Prezență socială coerentă, construită de la zero.",
        metaTitle: "Identitate Social Media — Facebook, Instagram, TikTok | Avyron",
        metaDescription:
          "Construim identitatea ta în social media de la zero: conturi business, bio optimizate, grid vizual coerent, 6–9 postări inițiale și calendar editorial 30 de zile. De la 250€.",
        heroTitle: "Identitate Social Media",
        heroLead:
          "Conturi profesionale pe Facebook, Instagram și TikTok, unite de aceeași identitate vizuală și pregătite să transforme urmăritorii în clienți.",
        intro: [
          "Majoritatea afacerilor mici pierd clienți nu pentru că nu sunt pe social media, ci pentru că prezența lor arată improvizat: bio incomplet, poze inconsistente, niciun buton de contact, postări fără direcție. Primul contact al clientului cu brandul tău se întâmplă adesea într-un feed — merită să arate bine.",
          "Construim identitatea completă: conturi business configurate corect, descrieri optimizate cu cuvintele pe care oamenii chiar le caută, un grid vizual coerent, butoane de comandă și contact, plus un pachet de postări inițiale care dau tonul.",
          "Totul se conectează cu website-ul tău și cu pixelurile de tracking, ca să știi exact de unde vin clienții și ce funcționează.",
        ],
        highlights: [
          {
            icon: "check",
            title: "Conturi business configurate",
            desc: "Facebook Page, Instagram Business și TikTok Business create și verificate corect, cu setări de siguranță și recuperare cont.",
          },
          {
            icon: "palette",
            title: "Identitate vizuală unitară",
            desc: "Poză de profil, cover și template-uri de postare care folosesc aceeași paletă și tipografie ca site-ul tău.",
          },
          {
            icon: "search",
            title: "Bio optimizate",
            desc: "Descrieri scrise cu cuvinte cheie locale, ca profilul tău să apară în căutările din aplicație și în Google.",
          },
          {
            icon: "zap",
            title: "Pachet de start",
            desc: "6–9 postări inițiale gândite ca un grid estetic, plus calendar editorial pentru primele 30 de zile.",
          },
          {
            icon: "share",
            title: "Butoane de acțiune",
            desc: "WhatsApp, Mesaj, Sună, Rezervă și link-in-bio unificat care duce vizitatorul direct la produs sau serviciu.",
          },
          {
            icon: "chart",
            title: "Tracking conectat",
            desc: "Meta Pixel și TikTok Pixel legate de site, ca să măsori exact ce conținut aduce trafic și conversii.",
          },
        ],
        deliverables: [
          "Creare conturi Facebook, Instagram și TikTok Business",
          "Descrieri (bio) profesionale optimizate cu cuvinte cheie",
          "Poză de profil, cover și template-uri vizuale de brand",
          "Pachet de 6–9 postări inițiale (grid estetic)",
          "Calendar editorial pentru primele 30 de zile",
          "Butoane de comenzi și contact configurate",
          "Sincronizare cu website-ul și pixelurile de tracking",
          "Link-in-bio unificat cu redirect către produse",
          "Recomandări de conținut TikTok pentru domeniul tău",
          "Setări de siguranță și recuperare cont",
        ],
        process: [
          { title: "Brief de brand", desc: "Stabilim tonul, publicul și mesajele principale ale afacerii tale." },
          { title: "Identitate vizuală", desc: "Pregătim paleta, template-urile și materialele grafice pentru toate platformele." },
          { title: "Configurare conturi", desc: "Creăm și securizăm conturile business, cu toate setările și integrările necesare." },
          { title: "Conținut inițial", desc: "Publicăm pachetul de postări și construim calendarul pe 30 de zile." },
          { title: "Predare", desc: "Îți dăm accesele, ghidul de postare și recomandările pentru lunile următoare." },
        ],
        faq: [
          {
            q: "Postați voi în continuare după livrare?",
            a: "Pachetul include configurarea și primele postări. Administrarea continuă (postări periodice, răspuns la mesaje, campanii) intră în pachetele de mentenanță Pro și Pro Activ.",
          },
          {
            q: "Am deja conturi. Le puteți îmbunătăți?",
            a: "Da. Facem un audit al conturilor existente, corectăm setările, rescriem bio-urile și aducem identitatea vizuală la același standard, fără să pierzi urmăritorii actuali.",
          },
          {
            q: "Ce se întâmplă dacă nu am fotografii?",
            a: "Putem crea materiale grafice, putem edita fotografiile pe care le ai sau putem folosi imagini licențiate. Discutăm opțiunile la brief.",
          },
          {
            q: "Se leagă de site-ul meu?",
            a: "Da. Conectăm conturile cu website-ul, instalăm pixelurile Meta și TikTok și configurăm link-in-bio, ca traficul social să ajungă direct în paginile care convertesc.",
          },
        ],
        ctaTitle: "Pornim identitatea ta socială?",
        ctaDesc: "Îți spunem gratuit ce lipsește acum din prezența ta online și ce ar aduce cel mai repede rezultate.",
        ctaButton: "Vreau Identitate Social Media",
        whatsapp: "Bună! Sunt interesat de pachetul Identitate Social Media (Facebook, Instagram, TikTok).",
      },
      en: {
        name: "Social Media Identity",
        kicker: "Digital identity",
        subtitle: "Facebook · Instagram · TikTok",
        tagline: "A coherent social presence, built from scratch.",
        metaTitle: "Social Media Identity — Facebook, Instagram, TikTok | Avyron",
        metaDescription:
          "We build your social media identity from scratch: business accounts, optimized bios, a coherent visual grid, 6–9 starter posts and a 30-day editorial calendar. From €250.",
        heroTitle: "Social Media Identity",
        heroLead:
          "Professional Facebook, Instagram and TikTok accounts, united by one visual identity and ready to turn followers into clients.",
        intro: [
          "Most small businesses lose clients not because they're missing from social media, but because their presence looks improvised: incomplete bios, inconsistent images, no contact buttons, posts without direction. The first contact with your brand often happens in a feed — it deserves to look good.",
          "We build the full identity: properly configured business accounts, bios optimized with the words people actually search, a coherent visual grid, order and contact buttons, plus a starter pack of posts that sets the tone.",
          "Everything connects to your website and tracking pixels, so you know exactly where clients come from and what works.",
        ],
        highlights: [
          { icon: "check", title: "Configured business accounts", desc: "Facebook Page, Instagram Business and TikTok Business created and verified properly, with safety and recovery settings." },
          { icon: "palette", title: "Unified visual identity", desc: "Profile picture, cover and post templates using the same palette and typography as your website." },
          { icon: "search", title: "Optimized bios", desc: "Descriptions written with local keywords so your profile appears in in-app and Google searches." },
          { icon: "zap", title: "Starter content pack", desc: "6–9 initial posts designed as an aesthetic grid, plus an editorial calendar for the first 30 days." },
          { icon: "share", title: "Action buttons", desc: "WhatsApp, Message, Call, Book and a unified link-in-bio that sends visitors straight to your product or service." },
          { icon: "chart", title: "Tracking connected", desc: "Meta and TikTok pixels linked to your site so you can measure which content drives traffic and conversions." },
        ],
        deliverables: [
          "Facebook, Instagram and TikTok Business account setup",
          "Professional keyword-optimized bios",
          "Profile picture, cover and brand visual templates",
          "Starter pack of 6–9 posts (aesthetic grid)",
          "30-day editorial calendar",
          "Order and contact buttons configured",
          "Sync with your website and tracking pixels",
          "Unified link-in-bio with product redirects",
          "TikTok content recommendations for your niche",
          "Safety and account recovery settings",
        ],
        process: [
          { title: "Brand brief", desc: "We define the tone, audience and key messages of your business." },
          { title: "Visual identity", desc: "We prepare the palette, templates and graphics for every platform." },
          { title: "Account setup", desc: "We create and secure the business accounts with all required settings and integrations." },
          { title: "Initial content", desc: "We publish the starter pack and build the 30-day calendar." },
          { title: "Handover", desc: "You receive the credentials, a posting guide and recommendations for the months ahead." },
        ],
        faq: [
          { q: "Do you keep posting after delivery?", a: "The package covers setup and the first posts. Ongoing management (regular posts, replies, campaigns) is part of the Pro and Pro Active care plans." },
          { q: "I already have accounts. Can you improve them?", a: "Yes. We audit the existing accounts, fix the settings, rewrite the bios and bring the visual identity to the same standard, without losing your current followers." },
          { q: "What if I have no photos?", a: "We can create graphics, edit the photos you already have or use licensed images. We discuss the options during the brief." },
          { q: "Does it connect to my website?", a: "Yes. We link the accounts to your site, install the Meta and TikTok pixels and configure link-in-bio so social traffic lands on pages that convert." },
        ],
        ctaTitle: "Ready to launch your social identity?",
        ctaDesc: "We'll tell you for free what's missing from your online presence and what would bring results fastest.",
        ctaButton: "I want the Social Identity pack",
        whatsapp: "Hi! I'm interested in the Social Media Identity pack.",
      },
    },
  },
  {
    key: "online-store",
    icon: "store",
    path: { ro: "/produse/magazin-online", en: "/en/products/online-store" },
    priceEur: 1000,
    from: true,
    duration: { ro: "7–21 zile", en: "7–21 days" },
    accent: {
      from: "from-emerald-500",
      to: "to-teal-600",
      border: "border-emerald-300/25",
      text: "text-emerald-300",
      glow: "bg-emerald-400/15",
      chipBg: "bg-emerald-300/10 border-emerald-300/30",
      chipText: "text-emerald-700 dark:text-emerald-200",
    },
    copy: {
      ro: {
        name: "Magazin Online",
        kicker: "eCommerce / Shopify",
        subtitle: "eCommerce · Shopify · WooCommerce · Custom",
        tagline: "Vinzi online, fără bătăi de cap tehnice.",
        metaTitle: "Magazin Online — eCommerce & Shopify de la 1000€ | Avyron",
        metaDescription:
          "Magazin online complet: catalog, checkout securizat, plăți card, integrare curieri și eMAG, facturare automată și SEO pe produs. Shopify sau custom. De la 1000€.",
        heroTitle: "Magazin Online",
        heroLead:
          "Magazin complet, optimizat pentru vânzări reale — catalog, coș, checkout securizat, plăți online, curieri și facturare, toate într-un singur panou.",
        intro: [
          "Un magazin online nu se termină la pagina de produs. Comanda trebuie să ajungă la curier, factura la client, stocul să se scadă automat, iar clientul care a abandonat coșul să primească un email. Construim tot lanțul, nu doar vitrina.",
          "Alegem platforma în funcție de scara ta: Shopify pentru lansare rapidă și operare simplă, WooCommerce pentru control asupra costurilor, sau un stack custom când ai nevoie de logică specifică (abonamente, configuratoare, B2B, prețuri pe client).",
          "Fiecare produs primește SEO propriu — titlu, descriere, date structurate cu preț și disponibilitate — ca să apară în Google Shopping și în rezultatele organice cu stele și preț.",
        ],
        highlights: [
          { icon: "store", title: "Catalog fără limite", desc: "Produse cu variante, stocuri, categorii, filtre și căutare rapidă, ușor de administrat de oricine din echipă." },
          { icon: "shield", title: "Checkout securizat", desc: "Plăți card, Apple Pay, Google Pay și ramburs, cu pagini de checkout optimizate pentru rata de finalizare." },
          { icon: "zap", title: "Curieri și AWB automat", desc: "Integrare FAN, Sameday, DPD și marketplace eMAG, cu generare automată de AWB și urmărire livrare." },
          { icon: "check", title: "Facturare conformă", desc: "SmartBill sau Oblio conectate, facturi emise automat la comandă și conformitate ANAF." },
          { icon: "search", title: "SEO pe fiecare produs", desc: "Date structurate Product/Offer, sitemap dinamic, URL-uri curate și pagini de categorie optimizate." },
          { icon: "chart", title: "Marketing automat", desc: "Emailuri de coș abandonat, coduri promo, bundle-uri, pixel Meta/TikTok și GA4 cu tracking complet de conversii." },
        ],
        deliverables: [
          "Catalog cu variante, stocuri și categorii nelimitate",
          "Coș și checkout securizat orientat spre conversie",
          "Plăți online (card, Apple Pay, Google Pay) + ramburs",
          "Integrare curieri (FAN, Sameday, DPD) cu AWB automat",
          "Integrare marketplace eMAG și livrare regională",
          "Facturare automată (SmartBill / Oblio)",
          "Coduri promo, reduceri, bundle-uri, campanii",
          "Pixel Meta / TikTok, GA4 și conversion tracking",
          "Multilingv, multi-monedă și SEO tehnic per produs",
          "Emailuri automate: comandă, expediere, coș abandonat",
          "GDPR, termeni & condiții, politici, backup zilnic",
        ],
        process: [
          { title: "Analiza catalogului", desc: "Vedem câte produse ai, ce variante, ce stocuri și cum arată fluxul actual de comenzi." },
          { title: "Alegerea platformei", desc: "Recomandăm Shopify, WooCommerce sau custom, cu costurile lunare reale puse pe masă." },
          { title: "Construcție și import", desc: "Implementăm designul, importăm produsele și configurăm categoriile, filtrele și prețurile." },
          { title: "Integrări", desc: "Conectăm plățile, curierii, facturarea, emailurile automate și tracking-ul." },
          { title: "Test și lansare", desc: "Rulăm comenzi de test end-to-end, apoi lansăm și monitorizăm primele zile de vânzări." },
        ],
        faq: [
          { q: "Shopify sau magazin custom?", a: "Shopify e ideal pentru lansare rapidă, operare simplă și scalare fără grijă tehnică, dar are abonament lunar și comisioane. Un magazin custom sau WooCommerce costă mai mult inițial, dar elimină abonamentul și permite logică de business specifică. Îți recomandăm varianta potrivită după ce vedem catalogul și volumul estimat." },
          { q: "Cât costă un magazin online?", a: "De la 1000€ pentru un magazin complet funcțional. Prețul crește cu numărul de integrări (eMAG, ERP, abonamente, B2B) și cu volumul de produse care trebuie importate și optimizate." },
          { q: "Se integrează cu eMAG?", a: "Da. Sincronizăm produsele, stocurile și comenzile cu marketplace-ul eMAG și configurăm livrarea prin Sameday în România, Ungaria și Bulgaria." },
          { q: "Pot administra singur produsele?", a: "Da. Primești un panou complet și instruire live: adaugi produse, modifici prețuri, gestionezi stocuri și vezi comenzile fără ajutor tehnic." },
          { q: "Facturile se emit automat?", a: "Da, prin integrare cu SmartBill sau Oblio. Factura se generează la plasarea comenzii și ajunge automat pe emailul clientului." },
        ],
        ctaTitle: "Începem magazinul tău online?",
        ctaDesc: "Analizăm gratuit catalogul și fluxul tău de comenzi și îți spunem exact ce platformă îți convine și de ce.",
        ctaButton: "Vreau magazin online",
        whatsapp: "Bună! Sunt interesat de un Magazin Online (eCommerce / Shopify).",
      },
      en: {
        name: "Online Store",
        kicker: "eCommerce / Shopify",
        subtitle: "eCommerce · Shopify · WooCommerce · Custom",
        tagline: "Sell online without the technical headaches.",
        metaTitle: "Online Store — eCommerce & Shopify from €1000 | Avyron",
        metaDescription:
          "A complete online store: catalog, secure checkout, card payments, courier and marketplace integrations, automated invoicing and per-product SEO. Shopify or custom. From €1000.",
        heroTitle: "Online Store",
        heroLead:
          "A complete store optimized for real sales — catalog, cart, secure checkout, online payments, couriers and invoicing, all in one panel.",
        intro: [
          "An online store doesn't end at the product page. The order must reach the courier, the invoice the customer, stock must update automatically and the shopper who abandoned the cart should get an email. We build the whole chain, not just the storefront.",
          "We pick the platform based on your scale: Shopify for a fast launch and simple operations, WooCommerce for cost control, or a custom stack when you need specific logic (subscriptions, configurators, B2B, per-client pricing).",
          "Every product gets its own SEO — title, description, structured data with price and availability — so it can appear in Google Shopping and in organic results with price and ratings.",
        ],
        highlights: [
          { icon: "store", title: "Unlimited catalog", desc: "Products with variants, stock, categories, filters and fast search, easy for anyone on your team to manage." },
          { icon: "shield", title: "Secure checkout", desc: "Card, Apple Pay, Google Pay and cash on delivery, with checkout pages optimized for completion rate." },
          { icon: "zap", title: "Couriers and automatic AWB", desc: "FAN, Sameday, DPD and eMAG marketplace integration with automatic AWB generation and delivery tracking." },
          { icon: "check", title: "Compliant invoicing", desc: "SmartBill or Oblio connected, invoices issued automatically on order and full tax compliance." },
          { icon: "search", title: "SEO on every product", desc: "Product/Offer structured data, dynamic sitemap, clean URLs and optimized category pages." },
          { icon: "chart", title: "Marketing automation", desc: "Abandoned cart emails, promo codes, bundles, Meta/TikTok pixels and GA4 with complete conversion tracking." },
        ],
        deliverables: [
          "Catalog with unlimited variants, stock and categories",
          "Cart and conversion-focused secure checkout",
          "Online payments (card, Apple Pay, Google Pay) + COD",
          "Courier integrations (FAN, Sameday, DPD) with automatic AWB",
          "eMAG marketplace integration and regional delivery",
          "Automated invoicing (SmartBill / Oblio)",
          "Promo codes, discounts, bundles, campaigns",
          "Meta / TikTok pixel, GA4 and conversion tracking",
          "Multilingual, multi-currency and per-product technical SEO",
          "Automated emails: order, shipping, abandoned cart",
          "GDPR, terms, policies, daily backups",
        ],
        process: [
          { title: "Catalog analysis", desc: "We review how many products you have, their variants, stock and your current order flow." },
          { title: "Platform choice", desc: "We recommend Shopify, WooCommerce or custom, with the real monthly costs on the table." },
          { title: "Build and import", desc: "We implement the design, import products and configure categories, filters and pricing." },
          { title: "Integrations", desc: "We connect payments, couriers, invoicing, automated emails and tracking." },
          { title: "Test and launch", desc: "We run end-to-end test orders, then launch and monitor the first days of sales." },
        ],
        faq: [
          { q: "Shopify or a custom store?", a: "Shopify is ideal for a fast launch, simple operations and worry-free scaling, but comes with a monthly fee and commissions. A custom store or WooCommerce costs more upfront but removes the subscription and allows specific business logic. We recommend the right option after reviewing your catalog and expected volume." },
          { q: "How much does an online store cost?", a: "From €1000 for a fully functional store. The price grows with the number of integrations (marketplaces, ERP, subscriptions, B2B) and the volume of products to import and optimize." },
          { q: "Does it integrate with marketplaces?", a: "Yes. We sync products, stock and orders with the eMAG marketplace and configure Sameday delivery across Romania, Hungary and Bulgaria." },
          { q: "Can I manage products myself?", a: "Yes. You get a full admin panel and live training: add products, change prices, manage stock and view orders without technical help." },
          { q: "Are invoices issued automatically?", a: "Yes, through SmartBill or Oblio integration. The invoice is generated when the order is placed and sent automatically to the customer." },
        ],
        ctaTitle: "Ready to start your online store?",
        ctaDesc: "We'll analyse your catalog and order flow for free and tell you exactly which platform fits and why.",
        ctaButton: "I want an online store",
        whatsapp: "Hi! I'm interested in an Online Store (eCommerce / Shopify).",
      },
    },
  },
  {
    key: "apps",
    icon: "smartphone",
    path: { ro: "/produse/aplicatii-web-si-mobile", en: "/en/products/web-and-mobile-apps" },
    priceEur: 1500,
    from: true,
    duration: { ro: "7–30 zile", en: "7–30 days" },
    accent: {
      from: "from-indigo-500",
      to: "to-violet-600",
      border: "border-indigo-300/25",
      text: "text-indigo-300",
      glow: "bg-indigo-400/15",
      chipBg: "bg-indigo-300/10 border-indigo-300/30",
      chipText: "text-indigo-700 dark:text-indigo-200",
    },
    copy: {
      ro: {
        name: "Aplicații Web și Mobile",
        kicker: "Produs dedicat",
        subtitle: "iOS · Android · PWA · SaaS",
        tagline: "De la idee la aplicație publicată.",
        metaTitle: "Aplicații Web și Mobile — dezvoltare iOS, Android, PWA | Avyron",
        metaDescription:
          "Dezvoltare aplicații mobile și web custom: prototip, design UX/UI, backend securizat, publicare în App Store și Google Play, notificări push și mentenanță. De la 1500€.",
        heroTitle: "Aplicații Web și Mobile",
        heroLead:
          "Construim aplicații custom care rezolvă o problemă reală din afacerea ta — de la prototip și UX până la publicare în App Store, Google Play sau pe domeniul tău.",
        intro: [
          "O aplicație are sens când automatizează ceva ce faci manual: programări, comenzi recurente, evidența unei echipe pe teren, fidelizare, raportări. Pornim mereu de la fluxul real, nu de la o listă de funcționalități.",
          "Lucrăm cu tehnologii moderne — React, React Native, Node și baze de date gestionate — care îți dau viteză de dezvoltare, scalare reală și un cost de mentenanță previzibil. Nu te legăm de o platformă proprietară pe care nu o poți părăsi.",
          "Primești cod curat, documentat, cu mediu de test separat, versionare și un roadmap pe minimum 12 luni, ca să știi ce urmează și cât costă.",
        ],
        highlights: [
          { icon: "palette", title: "Prototip înainte de cod", desc: "Sesiune de discovery, wireframe-uri și prototip Figma pe care îl poți testa înainte să investim o zi de dezvoltare." },
          { icon: "smartphone", title: "iOS, Android și web", desc: "O singură bază de cod React Native sau o PWA rapidă, în funcție de public și de bugetul tău." },
          { icon: "cloud", title: "Backend securizat", desc: "Bază de date, autentificare, roluri de utilizator și API-uri protejate, cu backup automat și monitorizare." },
          { icon: "zap", title: "Notificări și onboarding", desc: "Push notifications, deep links și un flux de onboarding gândit ca utilizatorul să înțeleagă aplicația în primul minut." },
          { icon: "chart", title: "Analytics și crash reporting", desc: "Vezi ce ecrane sunt folosite, unde renunță utilizatorii și ce erori apar în producție, în timp real." },
          { icon: "shield", title: "Securitate și GDPR", desc: "Criptare, roluri, jurnalizare, audit de securitate și conformitate cu cerințele de protecție a datelor." },
        ],
        deliverables: [
          "Sesiune de discovery, wireframe-uri și prototip Figma",
          "Design UX/UI custom, sistem de componente și dark mode",
          "Cod React Native (mobil) sau Web App / PWA",
          "Publicare în App Store și Google Play",
          "Backend, bază de date, autentificare și API-uri securizate",
          "Notificări push, deep links și onboarding utilizator",
          "Analytics, crash reporting și A/B testing",
          "Integrări AI și API-uri externe (plăți, hărți, OCR, chat)",
          "GDPR, criptare, roluri și audit de securitate",
          "Update-uri OTA, versionare și roadmap 12+ luni",
        ],
        process: [
          { title: "Discovery", desc: "Definim problema, utilizatorii și fluxul principal. Stabilim ce intră în prima versiune și ce amânăm." },
          { title: "Prototip", desc: "Construim wireframe-uri și un prototip clicabil pe care îl testezi înainte de dezvoltare." },
          { title: "Dezvoltare pe sprinturi", desc: "Livrăm versiuni intermediare la 1–2 săptămâni, pe care le poți instala și încerca." },
          { title: "Testare și securitate", desc: "Testăm pe dispozitive reale, verificăm performanța, securitatea și conformitatea GDPR." },
          { title: "Publicare și evoluție", desc: "Ne ocupăm de conturile de developer, build-uri și review, apoi de update-uri și roadmap." },
        ],
        faq: [
          { q: "Cât costă o aplicație mobilă?", a: "De la 1500€ pentru o primă versiune funcțională cu un flux principal bine definit. Aplicațiile cu mai multe roluri, plăți, integrări externe sau backend complex se estimează individual, după sesiunea de discovery." },
          { q: "Aplicație nativă sau PWA?", a: "PWA e mai ieftină, se lansează instant și funcționează în browser. Aplicația nativă (React Native) e necesară când ai nevoie de notificări push fiabile, acces la hardware sau prezență în magazinele de aplicații. Recomandăm după ce înțelegem publicul tău." },
          { q: "Vă ocupați de publicarea în App Store și Google Play?", a: "Da. Configurăm conturile de developer, pregătim materialele de listare, generăm build-urile și gestionăm procesul de review până la aprobare." },
          { q: "Ce se întâmplă după lansare?", a: "Primești un roadmap pe minimum 12 luni, update-uri, monitorizare și suport. Poți alege un pachet de mentenanță sau plăti intervențiile punctual." },
          { q: "Codul îmi aparține?", a: "Da. Primești codul sursă complet și accesele la infrastructură. Nu lucrăm cu platforme închise din care nu poți pleca." },
        ],
        ctaTitle: "Ai o idee de aplicație?",
        ctaDesc: "Îți facem gratuit o estimare de buget și un plan de primă versiune, după o discuție de 30 de minute.",
        ctaButton: "Vreau aplicație Mobile / Web",
        whatsapp: "Bună! Sunt interesat de o aplicație mobilă sau web (iOS / Android / PWA).",
      },
      en: {
        name: "Web and Mobile Apps",
        kicker: "Dedicated product",
        subtitle: "iOS · Android · PWA · SaaS",
        tagline: "From idea to published app.",
        metaTitle: "Web and Mobile Apps — iOS, Android and PWA development | Avyron",
        metaDescription:
          "Custom mobile and web app development: prototype, UX/UI design, secure backend, App Store and Google Play publishing, push notifications and maintenance. From €1500.",
        heroTitle: "Web and Mobile Apps",
        heroLead:
          "We build custom apps that solve a real problem in your business — from prototype and UX to publishing on the App Store, Google Play or your own domain.",
        intro: [
          "An app makes sense when it automates something you do manually: bookings, recurring orders, field team tracking, loyalty, reporting. We always start from the real workflow, not from a feature list.",
          "We work with modern technologies — React, React Native, Node and managed databases — that deliver development speed, real scalability and predictable maintenance costs. We never lock you into a proprietary platform.",
          "You get clean, documented code with a separate staging environment, versioning and a roadmap covering at least 12 months, so you know what's next and what it costs.",
        ],
        highlights: [
          { icon: "palette", title: "Prototype before code", desc: "A discovery session, wireframes and a Figma prototype you can test before we invest a day of development." },
          { icon: "smartphone", title: "iOS, Android and web", desc: "A single React Native codebase or a fast PWA, depending on your audience and budget." },
          { icon: "cloud", title: "Secure backend", desc: "Database, authentication, user roles and protected APIs, with automated backups and monitoring." },
          { icon: "zap", title: "Notifications and onboarding", desc: "Push notifications, deep links and an onboarding flow designed so users understand the app in the first minute." },
          { icon: "chart", title: "Analytics and crash reporting", desc: "See which screens are used, where users drop off and what errors occur in production, in real time." },
          { icon: "shield", title: "Security and GDPR", desc: "Encryption, roles, logging, security audit and compliance with data protection requirements." },
        ],
        deliverables: [
          "Discovery session, wireframes and Figma prototype",
          "Custom UX/UI design, component system and dark mode",
          "React Native code (mobile) or Web App / PWA",
          "App Store and Google Play publishing",
          "Backend, database, authentication and secure APIs",
          "Push notifications, deep links and user onboarding",
          "Analytics, crash reporting and A/B testing",
          "AI integrations and external APIs (payments, maps, OCR, chat)",
          "GDPR, encryption, roles and security audit",
          "OTA updates, versioning and a 12+ month roadmap",
        ],
        process: [
          { title: "Discovery", desc: "We define the problem, the users and the core flow. We decide what ships in v1 and what waits." },
          { title: "Prototype", desc: "We build wireframes and a clickable prototype you test before development starts." },
          { title: "Sprint development", desc: "We ship intermediate builds every 1–2 weeks that you can install and try." },
          { title: "Testing and security", desc: "We test on real devices and verify performance, security and GDPR compliance." },
          { title: "Publishing and growth", desc: "We handle developer accounts, builds and review, then updates and the roadmap." },
        ],
        faq: [
          { q: "How much does a mobile app cost?", a: "From €1500 for a functional first version with one well-defined core flow. Apps with multiple roles, payments, external integrations or a complex backend are estimated individually after the discovery session." },
          { q: "Native app or PWA?", a: "A PWA is cheaper, launches instantly and runs in the browser. A native app (React Native) is needed for reliable push notifications, hardware access or presence in the app stores. We recommend once we understand your audience." },
          { q: "Do you handle App Store and Google Play publishing?", a: "Yes. We set up developer accounts, prepare the store listing assets, generate builds and manage the review process through to approval." },
          { q: "What happens after launch?", a: "You get a 12+ month roadmap, updates, monitoring and support. You can pick a care plan or pay per intervention." },
          { q: "Do I own the code?", a: "Yes. You receive the full source code and infrastructure access. We don't work with closed platforms you can't leave." },
        ],
        ctaTitle: "Have an app idea?",
        ctaDesc: "We'll prepare a free budget estimate and a v1 plan after a 30-minute conversation.",
        ctaButton: "I want a Mobile / Web app",
        whatsapp: "Hi! I'm interested in a mobile or web app (iOS / Android / PWA).",
      },
    },
  },
  {
    key: "ai-agent",
    icon: "cpu",
    path: { ro: "/produse/agent-ai-personalizat", en: "/en/products/personalized-ai-agent" },
    priceEur: 500,
    from: true,
    duration: { ro: "5–14 zile", en: "5–14 days" },
    accent: {
      from: "from-fuchsia-500",
      to: "to-purple-600",
      border: "border-fuchsia-300/25",
      text: "text-fuchsia-300",
      glow: "bg-fuchsia-400/15",
      chipBg: "bg-fuchsia-300/10 border-fuchsia-300/30",
      chipText: "text-fuchsia-700 dark:text-fuchsia-200",
    },
    copy: {
      ro: {
        name: "Agentul tău AI personalizat",
        kicker: "Serviciu AI dedicat",
        subtitle: "Chat pe site · WhatsApp · Automatizări",
        tagline: "Un coleg digital care nu doarme niciodată.",
        metaTitle: "Agent AI personalizat pentru afacerea ta — chatbot 24/7 | Avyron",
        metaDescription:
          "Asistent AI antrenat pe produsele, prețurile și tonul brandului tău: răspunde 24/7 pe site și WhatsApp, preia comenzi, face programări și automatizează sarcini. De la 500€.",
        heroTitle: "Agentul tău AI personalizat",
        heroLead:
          "Un asistent antrenat pe datele afacerii tale, care răspunde clienților non-stop, preia comenzi, face programări și predă conversația echipei când e nevoie de om.",
        intro: [
          "Cele mai multe vânzări se pierd în intervalul dintre întrebarea clientului și răspunsul tău. Un agent AI bine configurat acoperă exact acest interval: răspunde în câteva secunde, la orice oră, cu informații corecte din propria ta bază de date.",
          "Nu este un chatbot generic. Îl antrenăm pe produsele, prețurile, politicile și tonul tău, îi stabilim limite clare (ce are voie să promită și ce nu) și îi dăm acces la acțiuni reale: creare lead, programare, plasare comandă, trimitere ofertă.",
          "Când clientul cere un om sau întrebarea iese din aria de competență, agentul predă conversația echipei, cu tot contextul deja rezumat.",
        ],
        highlights: [
          { icon: "cpu", title: "Antrenat pe datele tale", desc: "Bază de cunoștințe privată cu produsele, prețurile, programul și politicile tale, actualizabilă oricând." },
          { icon: "share", title: "Site și WhatsApp", desc: "Același agent, același ton, în widgetul de pe site și pe WhatsApp Business — o singură conversație pentru client." },
          { icon: "zap", title: "Automatizări reale", desc: "Preia comenzi, face programări, colectează lead-uri și trimite follow-up, nu doar răspunde la întrebări." },
          { icon: "users", title: "Predare către om", desc: "Notificare instant către echipă când clientul cere un operator, cu rezumatul conversației atașat." },
          { icon: "chart", title: "Dashboard de conversații", desc: "Vezi ce întreabă oamenii, unde se blochează și ce subiecte apar cel mai des — informație directă pentru business." },
          { icon: "shield", title: "GDPR și control", desc: "Loguri criptate, control complet asupra datelor pe care le învață și posibilitatea de a șterge orice conversație." },
        ],
        deliverables: [
          "Chat AI interactiv pe site, integrabil în orice pagină",
          "Integrare WhatsApp Business cu același agent",
          "Bază de date privată cu produse, prețuri și politici",
          "Personalitate, ton și răspunsuri pe brandul tău",
          "Automatizări: comenzi, programări, lead-uri, follow-up",
          "Notificări către echipă la cerere de intervenție umană",
          "Dashboard cu conversații, conversii și subiecte frecvente",
          "GDPR-friendly, loguri criptate, control pe datele de antrenare",
          "Multilingv (RO / EN și altele)",
          "Reantrenare periodică pe informațiile noi din afacere",
        ],
        process: [
          { title: "Colectarea cunoștințelor", desc: "Adunăm produsele, prețurile, întrebările frecvente și regulile tale de business." },
          { title: "Configurarea agentului", desc: "Stabilim personalitatea, tonul, limitele și acțiunile pe care are voie să le execute." },
          { title: "Integrare", desc: "Îl punem pe site și pe WhatsApp, conectat la formularele și sistemele tale existente." },
          { title: "Testare cu scenarii reale", desc: "Rulăm zeci de conversații de test, inclusiv cazuri dificile, și corectăm răspunsurile." },
          { title: "Monitorizare și reantrenare", desc: "Urmărim conversațiile reale în primele săptămâni și îmbunătățim continuu baza de cunoștințe." },
        ],
        faq: [
          { q: "Ce face concret un agent AI pentru afacerea mea?", a: "Răspunde la întrebări despre produse, prețuri, program și livrare, preia comenzi și programări, colectează datele de contact ale clienților interesați și trimite conversația către echipă când e nevoie de un om." },
          { q: "Poate inventa informații?", a: "Îl configurăm strict pe baza ta de cunoștințe, cu instrucțiuni clare să spună „nu știu, te pun în legătură cu un coleg” în locul unei presupuneri. Testăm intens exact acest comportament înainte de lansare." },
          { q: "Ce costuri lunare are?", a: "Implementarea pornește de la 500€. Costul lunar depinde de volumul de conversații și de modelul folosit; îți prezentăm o estimare clară înainte de start, iar tu poți seta un plafon." },
          { q: "Funcționează în română?", a: "Da, nativ în română și engleză, iar la cerere în alte limbi. Tonul se adaptează brandului tău." },
          { q: "Se poate integra cu sistemele mele actuale?", a: "Da. Îl putem conecta la magazinul online, la sistemul de programări, la CRM sau la orice serviciu care expune un API." },
        ],
        ctaTitle: "Vrei un agent AI antrenat pe afacerea ta?",
        ctaDesc: "Îți arătăm gratuit o demonstrație cu întrebările reale pe care le primești de la clienți.",
        ctaButton: "Vreau un Agent AI",
        whatsapp: "Bună! Sunt interesat de un Agent AI personalizat pentru afacerea mea.",
      },
      en: {
        name: "Your personalized AI Agent",
        kicker: "Dedicated AI service",
        subtitle: "Site chat · WhatsApp · Automations",
        tagline: "A digital teammate that never sleeps.",
        metaTitle: "Personalized AI Agent for your business — 24/7 chatbot | Avyron",
        metaDescription:
          "An AI assistant trained on your products, prices and brand voice: replies 24/7 on your site and WhatsApp, takes orders, books appointments and automates tasks. From €500.",
        heroTitle: "Your personalized AI Agent",
        heroLead:
          "An assistant trained on your business data that answers clients around the clock, takes orders, books appointments and hands the conversation to your team when a human is needed.",
        intro: [
          "Most sales are lost in the gap between the customer's question and your answer. A well-configured AI agent covers exactly that gap: it replies within seconds, at any hour, with correct information from your own knowledge base.",
          "This is not a generic chatbot. We train it on your products, prices, policies and tone, set clear boundaries on what it may promise, and give it access to real actions: create a lead, book an appointment, place an order, send a quote.",
          "When the customer asks for a human or the question falls outside its scope, the agent hands over to your team with the context already summarized.",
        ],
        highlights: [
          { icon: "cpu", title: "Trained on your data", desc: "A private knowledge base with your products, prices, schedule and policies, updatable at any time." },
          { icon: "share", title: "Site and WhatsApp", desc: "The same agent and voice in the site widget and on WhatsApp Business — one continuous conversation for the customer." },
          { icon: "zap", title: "Real automations", desc: "It takes orders, books appointments, captures leads and sends follow-ups, not just answers questions." },
          { icon: "users", title: "Human handoff", desc: "Instant team notification when a customer asks for an operator, with the conversation summary attached." },
          { icon: "chart", title: "Conversation dashboard", desc: "See what people ask, where they get stuck and which topics recur — direct business insight." },
          { icon: "shield", title: "GDPR and control", desc: "Encrypted logs, full control over the data it learns from and the ability to delete any conversation." },
        ],
        deliverables: [
          "Interactive AI chat on your site, embeddable anywhere",
          "WhatsApp Business integration with the same agent",
          "Private knowledge base with products, prices and policies",
          "Personality, tone and replies tuned to your brand",
          "Automations: orders, bookings, leads, follow-ups",
          "Team notifications on human handoff requests",
          "Dashboard with conversations, conversions and hot topics",
          "GDPR-friendly, encrypted logs, control over training data",
          "Multilingual (EN / RO and more)",
          "Periodic retraining on new business information",
        ],
        process: [
          { title: "Knowledge gathering", desc: "We collect your products, prices, frequent questions and business rules." },
          { title: "Agent configuration", desc: "We define personality, tone, boundaries and the actions it's allowed to perform." },
          { title: "Integration", desc: "We deploy it on your site and WhatsApp, connected to your existing forms and systems." },
          { title: "Real-scenario testing", desc: "We run dozens of test conversations, including hard cases, and refine the answers." },
          { title: "Monitoring and retraining", desc: "We review real conversations in the first weeks and continuously improve the knowledge base." },
        ],
        faq: [
          { q: "What does an AI agent actually do for my business?", a: "It answers questions about products, prices, schedule and delivery, takes orders and bookings, captures contact details of interested clients and routes the conversation to your team when a human is needed." },
          { q: "Can it invent information?", a: "We configure it strictly against your knowledge base, with clear instructions to say \"I don't know, let me connect you with a colleague\" instead of guessing. We test this behaviour heavily before launch." },
          { q: "What are the monthly costs?", a: "Implementation starts at €500. The monthly cost depends on conversation volume and the model used; we present a clear estimate before starting and you can set a cap." },
          { q: "Does it work in multiple languages?", a: "Yes, natively in English and Romanian, and in other languages on request. The tone adapts to your brand." },
          { q: "Can it integrate with my current systems?", a: "Yes. We can connect it to your online store, booking system, CRM or any service that exposes an API." },
        ],
        ctaTitle: "Want an AI agent trained on your business?",
        ctaDesc: "We'll show you a free demo using the real questions your clients ask.",
        ctaButton: "I want an AI Agent",
        whatsapp: "Hi! I'm interested in a personalized AI Agent for my business.",
      },
    },
  },
  {
    key: "audit",
    icon: "scan",
    path: { ro: "/produse/audit-website", en: "/en/products/website-audit" },
    priceEur: 0,
    from: false,
    duration: { ro: "2–4 zile", en: "2–4 days" },
    accent: {
      from: "from-amber-400",
      to: "to-orange-600",
      border: "border-amber-300/25",
      text: "text-amber-300",
      glow: "bg-amber-400/15",
      chipBg: "bg-amber-300/10 border-amber-300/30",
      chipText: "text-amber-700 dark:text-amber-200",
    },
    copy: {
      ro: {
        name: "Audit Website / Soft Actual",
        kicker: "Raport complet",
        subtitle: "Securitate · Performanță · SEO · Accesibilitate · UI/UX",
        tagline: "Aflăm exact ce te costă site-ul actual.",
        metaTitle: "Audit Website și Software — raport complet SEO, securitate, UX | Avyron",
        metaDescription:
          "Audit complet al website-ului sau aplicației tale: securitate, performanță, SEO tehnic, accesibilitate WCAG, UI/UX și testare în condiții reale. Raport cu priorități și recomandări.",
        heroTitle: "Audit Website / Soft Actual",
        heroLead:
          "Un raport complet și onest despre produsul digital pe care îl ai deja: ce funcționează, ce te costă clienți și ce trebuie reparat, în ordinea impactului.",
        intro: [
          "Multe afaceri plătesc lunar pentru un site care nu aduce nimic — nu pentru că e „urât”, ci pentru că se încarcă în 6 secunde pe mobil, nu e indexat corect, are formulare care nu ajung nicăieri sau vulnerabilități pe care nu le vede nimeni până când e prea târziu.",
          "Auditul Avyron trece produsul tău prin cinci filtre: securitate, performanță, SEO tehnic, accesibilitate și UI/UX, plus o testare în condiții reale (mobil pe rețea slabă, browsere diferite, ecrane mari și mici). Adăugăm o analiză scurtă a pieței și a concurenților direcți din nișa ta.",
          "Rezultatul nu e o listă de erori tehnice pe care nu o înțelege nimeni. Este un raport structurat pe priorități, cu impact estimat, efort estimat și recomandări concrete — pe care le poți implementa singur, cu dezvoltatorul tău actual sau cu noi.",
        ],
        highlights: [
          { icon: "shield", title: "Securitate", desc: "Verificăm HTTPS și certificatul, headerele de securitate, expunerea datelor, protecția formularelor, versiunile de dependențe cu vulnerabilități cunoscute și configurările de acces." },
          { icon: "gauge", title: "Performanță", desc: "Core Web Vitals (LCP, INP, CLS), greutatea paginilor, imaginile neoptimizate, scripturile care blochează randarea și comportamentul pe conexiuni lente." },
          { icon: "search", title: "SEO tehnic", desc: "Indexare, robots.txt, sitemap, canonical, hreflang, titluri și meta descrieri duplicate, date structurate, structura de headinguri și linkurile interne rupte." },
          { icon: "accessibility", title: "Accesibilitate", desc: "Contrast, navigare din tastatură, etichete pentru cititoare de ecran, focus vizibil, texte alternative la imagini și conformitate cu criteriile WCAG." },
          { icon: "palette", title: "UI/UX", desc: "Claritatea mesajului, ierarhia vizuală, traseul până la conversie, formulare, comportamentul pe mobil și punctele unde vizitatorul ezită sau abandonează." },
          { icon: "chart", title: "Analiză de piață", desc: "Comparație cu 2–3 concurenți din nișa ta: ce cuvinte cheie acoperă, cum arată prezența lor și unde ai un avantaj de exploatat." },
        ],
        deliverables: [
          "Raport PDF structurat pe priorități (critic / important / recomandat)",
          "Scoruri măsurate pentru performanță, SEO, accesibilitate și best practices",
          "Listă de vulnerabilități de securitate cu nivel de risc",
          "Testare pe dispozitive și browsere reale, cu capturi de ecran",
          "Verificarea formularelor, a emailurilor și a fluxului de conversie",
          "Audit de indexare în Google și cauzele paginilor neindexate",
          "Analiza a 2–3 concurenți direcți din nișa ta",
          "Recomandări concrete cu impact și efort estimat",
          "Plan de acțiune pe 30 / 90 de zile",
          "Ședință de prezentare a raportului (30 de minute)",
        ],
        process: [
          { title: "Acces și context", desc: "Ne spui ce produs auditam, ce obiective ai și ce te nemulțumește. Nu avem nevoie de parole pentru partea publică." },
          { title: "Scanare tehnică", desc: "Rulăm testele automate de performanță, securitate, accesibilitate și SEO pe paginile principale." },
          { title: "Testare manuală", desc: "Parcurgem fluxurile reale pe telefon, tabletă și desktop: căutare, formulare, comandă, contact." },
          { title: "Analiză de piață", desc: "Comparăm rezultatele cu concurenții direcți și identificăm oportunitățile din nișă." },
          { title: "Raport și prezentare", desc: "Primești raportul structurat pe priorități și îl parcurgem împreună într-o ședință de 30 de minute." },
        ],
        faq: [
          { q: "Auditul este cu adevărat gratuit?", a: "Da, auditul de bază este gratuit pentru orice site sau aplicație și include verificările esențiale de performanță, SEO, securitate și UX, plus recomandările prioritare. Pentru platforme complexe (magazine mari, aplicații cu backend, sisteme B2B) putem propune un audit extins, contra cost, pe care ți-l cotăm transparent înainte." },
          { q: "Trebuie să lucrez cu voi după audit?", a: "Nu. Raportul este al tău și îl poți implementa singur sau cu echipa ta actuală. Multe recomandări pot fi aplicate fără ajutorul nostru." },
          { q: "Ce înseamnă testare în condiții reale?", a: "Testăm pe dispozitive fizice și pe conexiuni simulate lente (3G/4G), în browsere diferite, cu și fără cache, inclusiv scenarii de eroare: link rupt, formular trimis greșit, produs indisponibil." },
          { q: "De ce contează accesibilitatea?", a: "Pentru că un site inaccesibil pierde clienți reali (persoane cu deficiențe de vedere, utilizatori pe tastatură, vârstnici) și, în plus, criteriile de accesibilitate se suprapun în mare parte cu semnalele de calitate folosite de Google." },
          { q: "Cât durează?", a: "În general 2–4 zile lucrătoare de la momentul în care primim accesul și contextul necesar." },
        ],
        ctaTitle: "Vrei să știi exact unde stai?",
        ctaDesc: "Trimite-ne adresa site-ului sau a aplicației și primești raportul complet, fără obligații.",
        ctaButton: "Vreau auditul gratuit",
        whatsapp: "Bună! Aș dori un audit complet pentru website-ul / aplicația mea.",
      },
      en: {
        name: "Website / Software Audit",
        kicker: "Complete report",
        subtitle: "Security · Performance · SEO · Accessibility · UI/UX",
        tagline: "Find out exactly what your current site is costing you.",
        metaTitle: "Website & Software Audit — full SEO, security and UX report | Avyron",
        metaDescription:
          "A complete audit of your website or app: security, performance, technical SEO, WCAG accessibility, UI/UX and real-world testing. A prioritized report with concrete recommendations.",
        heroTitle: "Website / Software Audit",
        heroLead:
          "A complete, honest report on the digital product you already have: what works, what costs you clients and what must be fixed, ordered by impact.",
        intro: [
          "Many businesses pay monthly for a site that brings nothing — not because it's \"ugly\", but because it loads in 6 seconds on mobile, isn't indexed properly, has forms that go nowhere or vulnerabilities nobody notices until it's too late.",
          "The Avyron audit puts your product through five filters: security, performance, technical SEO, accessibility and UI/UX, plus real-world testing (mobile on a weak network, different browsers, large and small screens). We add a short market and competitor analysis for your niche.",
          "The result isn't a list of technical errors nobody understands. It's a prioritized report with estimated impact, estimated effort and concrete recommendations — which you can implement yourself, with your current developer or with us.",
        ],
        highlights: [
          { icon: "shield", title: "Security", desc: "We check HTTPS and certificates, security headers, data exposure, form protection, dependency versions with known vulnerabilities and access configuration." },
          { icon: "gauge", title: "Performance", desc: "Core Web Vitals (LCP, INP, CLS), page weight, unoptimized images, render-blocking scripts and behaviour on slow connections." },
          { icon: "search", title: "Technical SEO", desc: "Indexing, robots.txt, sitemap, canonicals, hreflang, duplicate titles and meta descriptions, structured data, heading structure and broken internal links." },
          { icon: "accessibility", title: "Accessibility", desc: "Contrast, keyboard navigation, screen reader labels, visible focus, image alt text and compliance with WCAG criteria." },
          { icon: "palette", title: "UI/UX", desc: "Message clarity, visual hierarchy, the path to conversion, forms, mobile behaviour and the points where visitors hesitate or drop off." },
          { icon: "chart", title: "Market analysis", desc: "A comparison with 2–3 competitors in your niche: which keywords they cover, how their presence looks and where you hold an advantage." },
        ],
        deliverables: [
          "Prioritized PDF report (critical / important / recommended)",
          "Measured scores for performance, SEO, accessibility and best practices",
          "Security vulnerability list with risk levels",
          "Testing on real devices and browsers, with screenshots",
          "Verification of forms, emails and the conversion flow",
          "Google indexing audit and causes of unindexed pages",
          "Analysis of 2–3 direct competitors in your niche",
          "Concrete recommendations with estimated impact and effort",
          "A 30 / 90-day action plan",
          "A 30-minute report walkthrough session",
        ],
        process: [
          { title: "Access and context", desc: "You tell us which product we audit, your goals and what bothers you. No passwords needed for the public side." },
          { title: "Technical scan", desc: "We run automated performance, security, accessibility and SEO tests on the main pages." },
          { title: "Manual testing", desc: "We walk the real flows on phone, tablet and desktop: search, forms, checkout, contact." },
          { title: "Market analysis", desc: "We compare the results with direct competitors and identify niche opportunities." },
          { title: "Report and walkthrough", desc: "You receive the prioritized report and we go through it together in a 30-minute session." },
        ],
        faq: [
          { q: "Is the audit really free?", a: "Yes, the base audit is free for any site or app and covers the essential performance, SEO, security and UX checks plus prioritized recommendations. For complex platforms (large stores, apps with a backend, B2B systems) we may propose an extended paid audit, quoted transparently upfront." },
          { q: "Do I have to work with you afterwards?", a: "No. The report is yours and you can implement it yourself or with your current team. Many recommendations can be applied without our help." },
          { q: "What is real-world testing?", a: "We test on physical devices and simulated slow connections (3G/4G), across browsers, with and without cache, including error scenarios: broken links, mis-submitted forms, out-of-stock products." },
          { q: "Why does accessibility matter?", a: "Because an inaccessible site loses real customers (people with visual impairments, keyboard users, older visitors) and accessibility criteria largely overlap with the quality signals Google uses." },
          { q: "How long does it take?", a: "Usually 2–4 working days from the moment we receive access and the necessary context." },
        ],
        ctaTitle: "Want to know exactly where you stand?",
        ctaDesc: "Send us your site or app address and receive the full report, with no obligations.",
        ctaButton: "I want the free audit",
        whatsapp: "Hi! I'd like a complete audit for my website / app.",
      },
    },
  },
  {
    key: "qa-testing",
    icon: "bug",
    path: { ro: "/produse/testare-qa-web-mobile", en: "/en/products/qa-testing-web-mobile" },
    priceEur: 300,
    from: true,
    duration: { ro: "3–10 zile", en: "3–10 days" },
    accent: {
      from: "from-lime-400",
      to: "to-emerald-600",
      border: "border-lime-300/25",
      text: "text-lime-400",
      glow: "bg-lime-400/15",
      chipBg: "bg-lime-300/10 border-lime-300/30",
      chipText: "text-lime-700 dark:text-lime-200",
    },
    copy: {
      ro: {
        name: "Testare QA Web & Mobile",
        kicker: "Calitate garantată",
        subtitle: "Funcțional · Regresie · Performanță · Securitate · Mobil",
        tagline: "Găsim bug-urile înaintea clienților tăi.",
        metaTitle: "Testare QA Web & Mobile — servicii de testare software de la 300€ | Avyron",
        metaDescription:
          "Servicii profesionale de testare QA pentru site-uri, magazine online și aplicații mobile: testare funcțională, regresie, performanță, securitate și compatibilitate. De la 300€.",
        heroTitle: "Testare QA Web & Mobile",
        heroLead:
          "Testăm site-ul, magazinul sau aplicația ta exact cum o face un client real — pe telefoane, tablete și desktop — și îți livrăm un raport clar cu fiecare defect, reprodus pas cu pas.",
        intro: [
          "Un bug găsit înainte de lansare costă de zece ori mai puțin decât unul descoperit de client. Testarea QA nu este un lux rezervat companiilor mari: este pasul care oprește comenzile pierdute, formularele care nu trimit nimic și ecranele care se rup pe un telefon vechi.",
          "Lucrăm pe scenarii reale construite din fluxurile tale de business: înregistrare, autentificare, căutare, adăugare în coș, plată, facturare, notificări, upload de fișiere. Fiecare scenariu este rulat manual pe dispozitive și browsere diferite și, unde are sens, automatizat pentru a putea fi repetat la fiecare actualizare.",
          "Primești un raport structurat pe severitate, cu pași de reproducere, capturi de ecran sau înregistrări video și recomandarea de remediere. Poți da raportul direct echipei tale de dezvoltare sau ne poți lăsa pe noi să reparăm defectele găsite.",
        ],
        highlights: [
          { icon: "check", title: "Testare funcțională", desc: "Verificăm fiecare flux critic: cont, căutare, coș, checkout, plată, formulare, emailuri și zona de administrare." },
          { icon: "smartphone", title: "Compatibilitate reală", desc: "Testăm pe telefoane Android și iOS, tablete și desktop, în Chrome, Safari, Firefox și Edge, la rezoluții diferite." },
          { icon: "flask", title: "Testare automată", desc: "Suite de teste end-to-end (Playwright) care rulează la fiecare actualizare și prind regresiile înainte să ajungă în producție." },
          { icon: "gauge", title: "Performanță și stres", desc: "Timpi de răspuns, Core Web Vitals, comportament pe internet lent și sub trafic simultan crescut." },
          { icon: "shield", title: "Securitate de bază", desc: "Validări de input, protecția formularelor, controlul accesului pe roluri, expunerea datelor și configurările de sesiune." },
          { icon: "accessibility", title: "Accesibilitate", desc: "Navigare din tastatură, contrast, etichete pentru cititoare de ecran și criteriile WCAG relevante pentru produsul tău." },
        ],
        deliverables: [
          "Plan de testare adaptat fluxurilor tale de business",
          "Scenarii de test documentate (test cases) pe care le păstrezi",
          "Testare manuală pe dispozitive și browsere reale",
          "Raport de defecte cu severitate, pași de reproducere și capturi",
          "Testare de regresie după fiecare rundă de remedieri",
          "Suită de teste automate end-to-end (opțional, la cerere)",
          "Verificare performanță, securitate de bază și accesibilitate",
          "Testare a fluxului de plată și a emailurilor tranzacționale",
          "Recomandări de prevenire pentru viitoarele lansări",
          "Ședință de prezentare a rezultatelor (30 de minute)",
        ],
        process: [
          { title: "Analiză și plan", desc: "Stabilim ce testăm, pe ce dispozitive și care sunt fluxurile critice pentru afacerea ta." },
          { title: "Scenarii de test", desc: "Scriem cazurile de test, inclusiv scenariile negative: date greșite, conexiune pierdută, stoc epuizat." },
          { title: "Execuție", desc: "Rulăm testele manual pe dispozitive reale și automatizat acolo unde repetabilitatea aduce valoare." },
          { title: "Raportare", desc: "Documentăm fiecare defect cu severitate, pași de reproducere, capturi și impactul asupra utilizatorului." },
          { title: "Retestare", desc: "După remedieri retestăm defectele și rulăm o rundă de regresie pentru zonele afectate." },
        ],
        faq: [
          { q: "Cu ce diferă de audit?", a: "Auditul este o evaluare generală, gratuită, a stării produsului. Testarea QA este un proces detaliat, pe scenarii, care caută defecte concrete în fluxurile tale și le documentează pentru remediere." },
          { q: "Testați și aplicații mobile native?", a: "Da. Testăm aplicații Android și iOS, native sau hibride, inclusiv build-uri de test din TestFlight sau Google Play Internal Testing." },
          { q: "Ce înseamnă testare automată?", a: "Scriem teste end-to-end care simulează un utilizator real și pot fi rulate oricând, automat, la fiecare modificare de cod — astfel prinzi regresiile imediat." },
          { q: "Reparați și defectele găsite?", a: "Putem. Remedierea se cotează separat, în funcție de complexitate, iar dacă lucrezi cu altă echipă raportul nostru este suficient de detaliat pentru ca ei să intervină direct." },
          { q: "Cât costă?", a: "De la 300€ pentru un site de prezentare. Pentru magazine online și aplicații complexe cotăm în funcție de numărul de fluxuri și de dispozitivele acoperite." },
        ],
        ctaTitle: "Lansezi în curând sau ai deja probleme raportate?",
        ctaDesc: "Spune-ne ce produs ai și primești un plan de testare și o cotație clară în 24 de ore.",
        ctaButton: "Vreau testare QA",
        whatsapp: "Bună! Aș dori o ofertă de testare QA pentru produsul meu web / mobil.",
      },
      en: {
        name: "QA Testing Web & Mobile",
        kicker: "Guaranteed quality",
        subtitle: "Functional · Regression · Performance · Security · Mobile",
        tagline: "We find the bugs before your customers do.",
        metaTitle: "QA Testing Web & Mobile — software testing services from €300 | Avyron",
        metaDescription:
          "Professional QA testing for websites, online stores and mobile apps: functional testing, regression, performance, security and compatibility. From €300.",
        heroTitle: "QA Testing Web & Mobile",
        heroLead:
          "We test your site, store or app exactly the way a real customer would — on phones, tablets and desktop — and deliver a clear report with every defect reproduced step by step.",
        intro: [
          "A bug found before launch costs ten times less than one discovered by a customer. QA testing isn't a luxury reserved for large companies: it's the step that stops lost orders, forms that send nothing and screens that break on an older phone.",
          "We work with real scenarios built from your business flows: sign-up, login, search, add to cart, checkout, invoicing, notifications, file uploads. Every scenario runs manually across devices and browsers and, where it makes sense, is automated so it can be repeated on every release.",
          "You receive a report structured by severity, with reproduction steps, screenshots or video recordings and a fix recommendation. Hand it to your development team, or let us fix the defects we found.",
        ],
        highlights: [
          { icon: "check", title: "Functional testing", desc: "We verify every critical flow: account, search, cart, checkout, payment, forms, emails and the admin area." },
          { icon: "smartphone", title: "Real compatibility", desc: "Testing on Android and iOS phones, tablets and desktop, across Chrome, Safari, Firefox and Edge at different resolutions." },
          { icon: "flask", title: "Automated testing", desc: "End-to-end suites (Playwright) that run on every release and catch regressions before they reach production." },
          { icon: "gauge", title: "Performance and stress", desc: "Response times, Core Web Vitals, behaviour on slow networks and under increased concurrent traffic." },
          { icon: "shield", title: "Baseline security", desc: "Input validation, form protection, role-based access control, data exposure and session configuration." },
          { icon: "accessibility", title: "Accessibility", desc: "Keyboard navigation, contrast, screen reader labels and the WCAG criteria relevant to your product." },
        ],
        deliverables: [
          "A test plan tailored to your business flows",
          "Documented test cases that stay with you",
          "Manual testing on real devices and browsers",
          "Defect report with severity, reproduction steps and screenshots",
          "Regression testing after each round of fixes",
          "End-to-end automated test suite (optional, on request)",
          "Performance, baseline security and accessibility checks",
          "Payment flow and transactional email verification",
          "Prevention recommendations for future releases",
          "A 30-minute results walkthrough session",
        ],
        process: [
          { title: "Analysis and plan", desc: "We agree what to test, on which devices and which flows are critical for your business." },
          { title: "Test scenarios", desc: "We write the test cases, including negative scenarios: wrong data, lost connection, out-of-stock products." },
          { title: "Execution", desc: "We run tests manually on real devices and automate wherever repeatability adds value." },
          { title: "Reporting", desc: "Every defect is documented with severity, reproduction steps, screenshots and user impact." },
          { title: "Retesting", desc: "After fixes we retest the defects and run a regression round across the affected areas." },
        ],
        faq: [
          { q: "How is this different from the audit?", a: "The audit is a general, free assessment of your product's state. QA testing is a detailed, scenario-driven process that hunts concrete defects in your flows and documents them for fixing." },
          { q: "Do you test native mobile apps?", a: "Yes. We test Android and iOS apps, native or hybrid, including test builds from TestFlight or Google Play Internal Testing." },
          { q: "What does automated testing mean?", a: "We write end-to-end tests that simulate a real user and can run automatically on every code change — so regressions surface immediately." },
          { q: "Do you also fix the defects?", a: "We can. Fixes are quoted separately based on complexity, and if you work with another team our report is detailed enough for them to act on directly." },
          { q: "How much does it cost?", a: "From €300 for a presentation website. For online stores and complex apps we quote based on the number of flows and the devices covered." },
        ],
        ctaTitle: "Launching soon, or already getting bug reports?",
        ctaDesc: "Tell us what product you have and receive a test plan and a clear quote within 24 hours.",
        ctaButton: "I want QA testing",
        whatsapp: "Hi! I'd like a QA testing quote for my web / mobile product.",
      },
    },
  },
];

/** Display order: the audit (free entry point) first, then paid products. */
const ORDER: ProductKey[] = [
  "audit",
  "premium-website",
  "social-identity",
  "online-store",
  "apps",
  "ai-agent",
  "qa-testing",
];

export const PRODUCTS: Product[] = ORDER.map(
  (k) => CATALOG.find((p) => p.key === k)!,
);


export function getProductByPath(pathname: string): Product | undefined {
  return PRODUCTS.find((p) => p.path.ro === pathname || p.path.en === pathname);
}

export function getProduct(key: ProductKey): Product {
  return PRODUCTS.find((p) => p.key === key)!;
}
