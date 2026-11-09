/** Editorial portfolio. Public features observed on 2026-11-09; recommendations
 * are intentionally separate from delivered project features. No private CRM data. */
export type PortfolioCopy = { ro: string; en: string };
export type PortfolioSectorId =
  "wellness" | "marketing" | "servicii" | "juridic";
export type PortfolioProject = {
  id: string;
  sector: PortfolioSectorId;
  name: string;
  url: string;
  type: PortfolioCopy;
  description: PortfolioCopy;
  delivered: PortfolioCopy[];
  note?: PortfolioCopy;
};
const copy = (ro: string, en: string): PortfolioCopy => ({ ro, en });
export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: "flawlesstudio",
    sector: "wellness",
    name: "Flawless Studio",
    url: "https://www.flawlesstudio.ro/",
    type: copy("Estetică & îngrijire", "Beauty & skincare"),
    description: copy(
      "O prezență caldă și precisă pentru studioul din Breazu. Serviciile, tehnologia și drumul spre programare au fiecare locul lor.",
      "A warm, precise presence for the Breazu studio. Services, technology and the path to booking each have a clear place.",
    ),
    delivered: [
      copy(
        "Epilare laser și tratamente faciale, prezentate distinct",
        "Separate laser hair removal and facial treatment sections",
      ),
      copy(
        "Experiență în română și engleză",
        "Romanian and English experience",
      ),
      copy(
        "Video despre echipament, pornit la cerere",
        "Equipment video played on request",
      ),
      copy(
        "Formular care pregătește mesajul WhatsApp",
        "Form that prepares a WhatsApp message",
      ),
    ],
  },
  {
    id: "ruller",
    sector: "wellness",
    name: "Ruller",
    url: "https://ruller.eu/",
    type: copy("Barbershop & lifestyle", "Barbershop & lifestyle"),
    description: copy(
      "Identitate vizuală puternică pentru un barbershop din Iași. Fotografia salonului și serviciile sunt legate de o acțiune simplă: programarea.",
      "A strong visual identity for an Iași barbershop. Salon photography and services lead to one simple action: booking.",
    ),
    delivered: [
      copy(
        "Servicii cu durată, tarif și pagini de detaliu",
        "Services with duration, pricing and detail pages",
      ),
      copy(
        "Legături directe către programări Mero",
        "Direct links to Mero bookings",
      ),
      copy(
        "Secțiuni pentru echipă, salon și produse",
        "Team, salon and product sections",
      ),
      copy(
        "Galerii foto și contact telefonic direct",
        "Photo galleries and direct phone contact",
      ),
    ],
  },
  {
    id: "cutiutamagica",
    sector: "marketing",
    name: "Cutiuța Magică",
    url: "https://cutiutamagica.eu/",
    type: copy("Comerț electronic & cadouri", "E-commerce & gifts"),
    description: copy(
      "Un univers de brand pentru cutiuțe muzicale și cadouri cu poveste. Atmosfera vizuală conduce firesc către descoperirea produselor.",
      "A brand world for music boxes and meaningful gifts. The visual atmosphere naturally leads into product discovery.",
    ),
    delivered: [
      copy(
        "Catalog și categorii de produse",
        "Product catalogue and categories",
      ),
      copy(
        "Prezentări de cadouri și poveste de brand",
        "Gift presentations and brand storytelling",
      ),
      copy(
        "Acces la coș și contul de client",
        "Entry points to cart and customer account",
      ),
      copy(
        "Informații despre livrare și întrebări frecvente",
        "Delivery information and frequently asked questions",
      ),
    ],
  },
  {
    id: "clarlumanari",
    sector: "marketing",
    name: "CLAR Lumânări",
    url: "https://clarlumanari.ro/",
    type: copy(
      "Brand artizanal & prezentare de produs",
      "Artisan brand & product presentation",
    ),
    description: copy(
      "Fotografie de produs, ritm editorial și o identitate discretă pentru lumânări parfumate. De la povestea atelierului la alegerea unui cadou.",
      "Product photography, editorial rhythm and a restrained identity for scented candles. From the workshop story to choosing a gift.",
    ),
    delivered: [
      copy(
        "Variante de produs și pachete cadou",
        "Product variations and gift packages",
      ),
      copy(
        "Galerie cu produse și personalizări",
        "Product and personalisation gallery",
      ),
      copy(
        "Comenzi prin linkuri WhatsApp precompletate",
        "Ordering through prefilled WhatsApp links",
      ),
      copy(
        "Povestea atelierului și contact direct",
        "Workshop story and direct contact",
      ),
    ],
  },
  {
    id: "retuvo",
    sector: "servicii",
    name: "Retuvo",
    url: "https://retuvo.ro/",
    type: copy(
      "Platformă SGR • în evoluție",
      "Deposit-return platform • evolving",
    ),
    description: copy(
      "Un proiect care trece de la prezentare la ecosistem de servicii. Organizăm informația pentru utilizatori, colectori și companii, într-un context național.",
      "A project that moves from presentation to a service ecosystem. Information is organised for users, collectors and businesses in a national context.",
    ),
    delivered: [
      copy(
        "Landing cu explicații despre circuitul SGR",
        "Landing page explaining the deposit-return journey",
      ),
      copy(
        "Prezentări distincte pentru trei audiențe",
        "Separate presentations for three audiences",
      ),
      copy(
        "Acces în cont și centru de ajutor",
        "Account entry and help centre",
      ),
      copy(
        "Comunicarea stadiului funcțiilor viitoare",
        "Clear communication of upcoming features",
      ),
    ],
    note: copy(
      "Valorificarea bonurilor, retragerile și serviciile de colectare sunt prezentate ca fiind în pregătire. Prezentarea nu echivalează cu activarea tuturor operațiunilor.",
      "Voucher redemption, withdrawals and collection services are presented as being in preparation. The presentation does not imply that every operation is active.",
    ),
  },
  {
    id: "detectiv-icm",
    sector: "juridic",
    name: "Detectiv ICM",
    url: "https://detectiv-icm.avyron.eu/",
    type: copy(
      "Investigații private & criminologie",
      "Private investigation & criminology",
    ),
    description: copy(
      "O prezentare sobră pentru o activitate în care discreția contează. Informația este structurată în jurul serviciilor, metodei de lucru și contactului direct.",
      "A restrained presentation for a field where discretion matters. Information is structured around services, the working method and direct contact.",
    ),
    delivered: [
      copy(
        "Pagini și detalii pentru serviciile oferite",
        "Pages and details for the services offered",
      ),
      copy(
        "Secțiune dedicată consultanței criminologice",
        "Dedicated criminology consulting section",
      ),
      copy(
        "Proces de colaborare și întrebări frecvente",
        "Collaboration process and frequently asked questions",
      ),
      copy(
        "Apel și mesaje pentru o discuție confidențială",
        "Calls and messages for a confidential discussion",
      ),
    ],
  },
];
export const PORTFOLIO_SECTORS: {
  id: PortfolioSectorId;
  label: PortfolioCopy;
  headline: PortfolioCopy;
  description: PortfolioCopy;
  visual: PortfolioCopy;
  functions: PortfolioCopy[];
  accent: string;
}[] = [
  {
    id: "wellness",
    label: copy("Wellness & Beauty", "Wellness & Beauty"),
    accent: "#e6bca5",
    headline: copy(
      "Încrederea începe cu atmosfera.",
      "Trust starts with the atmosphere.",
    ),
    description: copy(
      "Pentru saloane, studiouri de estetică, spa și servicii de îngrijire, website-ul trebuie să transmită atenție și să facă următorul pas ușor.",
      "For salons, beauty studios, spas and personal care services, a website should convey care and make the next step effortless.",
    ),
    visual: copy(
      "Lumină caldă, imagini autentice, tranziții lente și profunzime discretă. Efectele pun în valoare spațiul și serviciul.",
      "Warm light, authentic imagery, gentle transitions and subtle depth. Effects highlight the space and the service.",
    ),
    functions: [
      copy(
        "Servicii explicate, cu informații utile înainte de vizită",
        "Services explained with useful information before a visit",
      ),
      copy(
        "Programări prin furnizorul ales sau contact asistat",
        "Bookings through the chosen provider or assisted contact",
      ),
      copy(
        "Galerie, echipă, localizare și experiență mobilă",
        "Gallery, team, location and mobile experience",
      ),
    ],
  },
  {
    id: "marketing",
    label: copy("Marketing & Comerț", "Marketing & Commerce"),
    accent: "#c5b5ff",
    headline: copy(
      "Un brand pe care îl descoperi. Un produs pe care îl înțelegi.",
      "A brand to discover. A product to understand.",
    ),
    description: copy(
      "De la un atelier la un catalog de produse, construim o poveste coerentă și o cale clară între interes, alegere și comandă.",
      "From a workshop to a product catalogue, we build a coherent story and a clear path from interest to selection and ordering.",
    ),
    visual: copy(
      "Cadre de produs cu lumină cinematică, carduri cu profunzime, detalii la hover și galerii care lasă produsul să vorbească.",
      "Cinematic product lighting, cards with depth, hover details and galleries that let the product speak.",
    ),
    functions: [
      copy(
        "Catalog structurat și variante de produs ușor de comparat",
        "Structured catalogue and easy-to-compare product variations",
      ),
      copy(
        "Coș sau comandă asistată, potrivit modelului afacerii",
        "Cart or assisted ordering suited to the business model",
      ),
      copy(
        "Campanii, conținut editorial și măsurare cu acord",
        "Campaigns, editorial content and consent-based measurement",
      ),
    ],
  },
  {
    id: "servicii",
    label: copy("Servicii & Platforme", "Services & Platforms"),
    accent: "#8edfd0",
    headline: copy(
      "O idee mare are nevoie de o structură clară.",
      "A big idea needs a clear structure.",
    ),
    description: copy(
      "Pentru servicii cu acoperire națională, proiectăm mai mult decât o primă pagină: audiențe distincte, parcursuri clare și extindere pe etape.",
      "For services with national reach, we design more than a homepage: distinct audiences, clear journeys and staged expansion.",
    ),
    visual: copy(
      "Scene care explică procesul, hărți și diagrame utile, interfețe coerente între website și cont. Mișcarea trebuie să orienteze utilizatorul.",
      "Scenes explaining the process, useful maps and diagrams, and consistent website-to-account interfaces. Motion should guide the user.",
    ),
    functions: [
      copy(
        "Conturi și roluri definite în jurul activității",
        "Accounts and roles defined around the activity",
      ),
      copy(
        "Fluxuri operaționale, integrări și stări explicite",
        "Operational flows, integrations and explicit statuses",
      ),
      copy(
        "Monitorizare și lansarea treptată a funcțiilor",
        "Monitoring and gradual feature rollout",
      ),
    ],
  },
  {
    id: "juridic",
    label: copy("Juridic & Încredere", "Legal & Trust"),
    accent: "#dcc58f",
    headline: copy(
      "Autoritate prin claritate. Discreție prin design.",
      "Authority through clarity. Discretion through design.",
    ),
    description: copy(
      "Pentru investigații private, avocați, notari și consultanță, punem în prim-plan competența, limitele serviciului și o comunicare directă.",
      "For private investigation, lawyers, notaries and consulting, we foreground expertise, the scope of the service and direct communication.",
    ),
    visual: copy(
      "Tipografie editorială, contrast atent, texturi închise și accente discrete. Animații reținute, cu lizibilitatea pe primul loc.",
      "Editorial typography, considered contrast, dark textures and subtle accents. Restrained animation, with readability first.",
    ),
    functions: [
      copy(
        "Arii de practică și servicii prezentate separat",
        "Separate practice areas and service presentations",
      ),
      copy(
        "Proces de colaborare, întrebări și documente necesare",
        "Collaboration process, questions and required documents",
      ),
      copy(
        "Contact discret și colectarea minimă a datelor",
        "Discreet contact and minimal data collection",
      ),
    ],
  },
];
export const PORTFOLIO_WORKFLOW = [
  {
    title: copy("Înțelegem", "Understand"),
    text: copy(
      "Activitate, public, obiectiv. Un brief scurt, cu întrebările potrivite.",
      "Business, audience, objective. A short brief with the right questions.",
    ),
  },
  {
    title: copy("Dăm formă", "Shape"),
    text: copy(
      "Direcție vizuală și exemplu concret, adaptate identității afacerii.",
      "Visual direction and a tangible example tailored to the business identity.",
    ),
  },
  {
    title: copy("Construim", "Build"),
    text: copy(
      "Conținut, pagini, integrări și funcții, dezvoltate pe etape.",
      "Content, pages, integrations and features developed in stages.",
    ),
  },
  {
    title: copy("Verificăm", "Validate"),
    text: copy(
      "Mobil, accesibilitate, viteză, securitate și traseele importante.",
      "Mobile, accessibility, speed, security and the important journeys.",
    ),
  },
  {
    title: copy("Lansăm & îngrijim", "Launch & care"),
    text: copy(
      "Domeniu, publicare, monitorizare și evoluție după lansare.",
      "Domain, publishing, monitoring and evolution after launch.",
    ),
  },
];
