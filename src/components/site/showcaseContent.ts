import restaurant from "@/assets/work-restaurant-new.jpg";
import travel from "@/assets/work-hotel-new.jpg";
import professional from "@/assets/work-lawyer-new.jpg";
import local from "@/assets/work-local-new.jpg";

export type AppMode = "app" | "game" | "crm" | "platform";
export type AutomationMode = "social" | "leads" | "chat" | "other";
export type DomainDetail = { title: string; description: string };
type Translation = [string, string];
type Detail = [Translation, Translation];
type DomainTheme = {
  accent: string;
  surface: string;
  ink: string;
  image?: string;
  brand: string;
  hero: Translation;
  intro: Translation;
  action: Translation;
  visual: "beauty" | "photo" | "civic" | "local" | "auto" | "shop" | "network" | "studio";
  details: Detail[];
};
const detail = (roTitle: string, enTitle: string, roDescription: string, enDescription: string): Detail =>
  [[roTitle, enTitle], [roDescription, enDescription]];

// These are interface examples, not customer results, availability or conversion claims.
const themes: Record<string, DomainTheme> = {
  beauty: {
    accent: "#b35348", surface: "#f7eee4", ink: "#392c29", brand: "ATELIER / BEAUTY", visual: "beauty",
    hero: ["Frumusețe, în ritmul tău.", "Beauty, at your own pace."],
    intro: ["Un ritual de îngrijire începe cu o alegere simplă.", "A care ritual starts with a simple choice."],
    action: ["Alege un tratament", "Choose a treatment"],
    details: [
      detail("Programări", "Bookings", "Serviciu, specialist și interval.", "Service, specialist and time."),
      detail("Tratamente", "Treatments", "Durată și preț, din prima.", "Duration and price, upfront."),
      detail("Portofoliu", "Portfolio", "Rezultate și stiluri de lucru.", "Results and individual styles."),
      detail("Vouchere", "Gift cards", "Cadouri și pachete de îngrijire.", "Gifts and care packages."),
      detail("Echipa", "The team", "Specialiști și calificări.", "Specialists and qualifications."),
      detail("Contact rapid", "Quick contact", "Locație, program și WhatsApp.", "Location, hours and WhatsApp."),
    ],
  },
  resto: {
    accent: "#e7b77a", surface: "#241e19", ink: "#fff3e3", image: restaurant, brand: "MAISON / TABLE", visual: "photo",
    hero: ["O masă bună. O seară de ținut minte.", "Good food. An evening to remember."],
    intro: ["Ingrediente de sezon, povești la aceeași masă.", "Seasonal ingredients, stories around one table."],
    action: ["Rezervă o masă", "Reserve a table"],
    details: [
      detail("Meniu digital", "Digital menu", "Preparatele, alergenii și prețurile.", "Dishes, allergens and prices."),
      detail("Rezervări", "Reservations", "Zi, oră și număr de persoane.", "Date, time and party size."),
      detail("Meniul zilei", "Daily menu", "Actualizat fără fișiere PDF.", "Updated without PDF files."),
      detail("Comenzi", "Orders", "Ridicare sau livrare, la alegere.", "Your choice of pickup or delivery."),
      detail("Atmosferă", "Atmosphere", "Spațiul și povestea bucătarului.", "The space and the chef's story."),
      detail("Cum ajungi", "Find us", "Hartă, orar și evenimente.", "Map, opening hours and events."),
    ],
  },
  public: {
    accent: "#2461ad", surface: "#edf3fa", ink: "#19314e", brand: "PORTAL / CETĂȚEAN", visual: "civic",
    hero: ["Mai puține drumuri. Mai multă claritate.", "Fewer trips. Greater clarity."],
    intro: ["Servicii, documente și informații într-un singur loc.", "Services, documents and information in one place."],
    action: ["Caută un serviciu", "Find a service"],
    details: [
      detail("Servicii", "Services", "Pași și documente necesare.", "Steps and required documents."),
      detail("Cereri online", "Online requests", "Formulare și număr de înregistrare.", "Forms and reference numbers."),
      detail("Programări", "Appointments", "Instituție, ghișeu și interval.", "Office, desk and time slot."),
      detail("Anunțuri", "Notices", "Noutăți cu dată și categorie.", "Updates by date and category."),
      detail("Transparență", "Transparency", "Bugete și documente publice.", "Budgets and public documents."),
      detail("Accesibilitate", "Accessibility", "Contrast, tastatură și text clar.", "Contrast, keyboard and clear text."),
    ],
  },
  turism: {
    accent: "#d4e5c1", surface: "#172b27", ink: "#f5f8ed", image: travel, brand: "NORD / RETREAT", visual: "photo",
    hero: ["Un loc în care timpul încetinește.", "A place where time slows down."],
    intro: ["Camere cu priveliște. Dimineți aproape de natură.", "Rooms with a view. Mornings close to nature."],
    action: ["Descoperă camerele", "Explore the rooms"],
    details: [
      detail("Rezervare directă", "Direct booking", "Perioadă, oaspeți și disponibilitate.", "Dates, guests and availability."),
      detail("Camere", "Rooms", "Fotografii, dotări și tarife.", "Photos, amenities and rates."),
      detail("Experiențe", "Experiences", "Trasee și activități din zonă.", "Local trails and activities."),
      detail("Pachete", "Packages", "Sejururi și oferte sezoniere.", "Stays and seasonal packages."),
      detail("Check-in", "Check-in", "Acces și instrucțiuni de sosire.", "Access and arrival instructions."),
      detail("Localizare", "Location", "Rută, parcare și repere.", "Directions, parking and landmarks."),
    ],
  },
  pro: {
    accent: "#d3b68a", surface: "#24221e", ink: "#f6f0e7", image: professional, brand: "CONSILIUM / EXPERTISE", visual: "photo",
    hero: ["Decizii informate. Încredere construită.", "Informed decisions. Earned trust."],
    intro: ["O perspectivă clară pentru situațiile care contează.", "A clear perspective for the matters that count."],
    action: ["Solicită o consultație", "Request a consultation"],
    details: [
      detail("Expertiză", "Expertise", "Arii de practică și specializări.", "Practice areas and specialisms."),
      detail("Consultații", "Consultations", "Programare și întrebări inițiale.", "Bookings and initial questions."),
      detail("Calificări", "Qualifications", "Experiență și acreditări reale.", "Experience and real credentials."),
      detail("Documente", "Documents", "Transmitere printr-un flux sigur.", "Submission through a secure flow."),
      detail("Resurse", "Resources", "Ghiduri clare pentru clienți.", "Clear guides for clients."),
      detail("Confidențialitate", "Confidentiality", "Date tratate cu discreție.", "Data handled with discretion."),
    ],
  },
  local: {
    accent: "#bade8d", surface: "#eef0e8", ink: "#263329", image: local, brand: "LOCAL / SERVICE", visual: "local",
    hero: ["Oameni pricepuți. Lucrări bine făcute.", "Skilled people. Work done right."],
    intro: ["Spune-ne ce ai nevoie. Găsim următorul pas.", "Tell us what you need. Find the next step."],
    action: ["Cere o estimare", "Request an estimate"],
    details: [
      detail("Servicii clare", "Clear services", "Lucrări și intervenții explicate.", "Jobs and repairs explained."),
      detail("Acoperire", "Coverage", "Localitățile în care intervenim.", "Areas served by the team."),
      detail("Ofertare", "Quotes", "Detalii și fotografii ale lucrării.", "Job details and photographs."),
      detail("Lucrări", "Projects", "Galerii relevante, pe categorii.", "Relevant galleries by category."),
      detail("Urgențe", "Urgent requests", "Apel direct și prioritizare.", "Direct calls and prioritisation."),
      detail("Program", "Hours", "Disponibilitate și date de contact.", "Opening hours and contact details."),
    ],
  },
  auto: {
    accent: "#ff784d", surface: "#1c2227", ink: "#f5f7f9", brand: "TORQUE / AUTO", visual: "auto",
    hero: ["Grijă pentru fiecare kilometru.", "Care for every kilometre."],
    intro: ["De la diagnoză la revizie. Totul explicat.", "From diagnostics to servicing. Clearly explained."],
    action: ["Programează service-ul", "Book a service"],
    details: [
      detail("Programare", "Booking", "Vehicul, operațiune și interval.", "Vehicle, service and time slot."),
      detail("Diagnoză", "Diagnostics", "Simptome descrise înainte de vizită.", "Describe symptoms before a visit."),
      detail("Deviz", "Estimate", "Costuri și operațiuni transparente.", "Clear costs and operations."),
      detail("Servicii", "Services", "Mecanică, electrică și detailing.", "Mechanical, electrical and detailing."),
      detail("Portofoliu", "Portfolio", "Intervenții și rezultate vizibile.", "Repairs and visible results."),
      detail("Asistență", "Support", "Localizare, apel și WhatsApp.", "Location, calls and WhatsApp."),
    ],
  },
  ecommerce: {
    accent: "#536b42", surface: "#f1f0e9", ink: "#273222", brand: "FORMA / OBJECTS", visual: "shop",
    hero: ["Obiecte alese. Pentru fiecare zi.", "Selected objects. For every day."],
    intro: ["Materiale naturale, forme simple, detalii care rămân.", "Natural materials, simple shapes, lasting details."],
    action: ["Explorează colecția", "Explore the collection"],
    details: [
      detail("Catalog", "Catalogue", "Colecții și pagini de produs.", "Collections and product pages."),
      detail("Filtre utile", "Useful filters", "Găsești după ce contează.", "Search by what matters."),
      detail("Checkout", "Checkout", "Pași clari și date strict necesare.", "Clear steps and essential data."),
      detail("Livrare", "Delivery", "Opțiuni și urmărirea comenzii.", "Options and order tracking."),
      detail("Cont client", "Customer account", "Favorite, comenzi și retururi.", "Favourites, orders and returns."),
      detail("Administrare", "Management", "Stocuri și prețuri într-un loc.", "Stock and prices in one place."),
    ],
  },
  national: {
    accent: "#93d8e9", surface: "#14242e", ink: "#eefaff", brand: "CONNECTED / NETWORK", visual: "network",
    hero: ["Un singur acces. Totul conectat.", "One sign-in. Everything connected."],
    intro: ["Utilizatori, parteneri și servicii în același ecosistem.", "Users, partners and services in one ecosystem."],
    action: ["Explorează platforma", "Explore the platform"],
    details: [
      detail("Conturi și roluri", "Accounts and roles", "Acces adaptat fiecărei echipe.", "Access tailored to each team."),
      detail("Hartă interactivă", "Interactive map", "Locații și servicii din rețea.", "Locations and network services."),
      detail("Integrări", "Integrations", "Date conectate prin API.", "Data connected through APIs."),
      detail("Panou partener", "Partner dashboard", "Operațiuni și cereri centralizate.", "Centralised requests and operations."),
      detail("Raportare", "Reporting", "Indicatori potriviți activității.", "Metrics matched to the activity."),
      detail("Extensibilitate", "Extensibility", "Funcții noi, dezvoltate etapizat.", "New features developed in stages."),
    ],
  },
  other: {
    accent: "#6c54a2", surface: "#f0edf5", ink: "#302541", brand: "STUDIO / YOUR IDEA", visual: "studio",
    hero: ["Ideea ta merită propria formă.", "Your idea deserves its own shape."],
    intro: ["Pornim de la activitatea ta. Construim în jurul ei.", "We start with your activity. We build around it."],
    action: ["Spune-ne ideea", "Tell us your idea"],
    details: [
      detail("Descoperire", "Discovery", "Public, obiective și context.", "Audience, goals and context."),
      detail("Structură", "Structure", "Un traseu ușor de înțeles.", "A journey that's easy to follow."),
      detail("Identitate", "Identity", "Design construit pentru brand.", "Design built for the brand."),
      detail("Funcții custom", "Custom features", "Ce are nevoie activitatea ta.", "What your activity needs."),
      detail("Integrări", "Integrations", "Conectăm instrumentele existente.", "Connect your existing tools."),
      detail("Evoluție", "Growth", "Lansare, feedback și îmbunătățiri.", "Launch, feedback and refinement."),
    ],
  },
};

export function domainContent(key: string, ro: boolean) {
  const theme = themes[key] ?? themes.other;
  const language = ro ? 0 : 1;
  return {
    ...theme,
    hero: theme.hero[language],
    intro: theme.intro[language],
    action: theme.action[language],
    details: theme.details.map(([title, description]) => ({ title: title[language], description: description[language] })),
  };
}

export const appModes: Array<{ key: AppMode; ro: string; en: string }> = [
  { key: "app", ro: "Web/Mobile App", en: "Web/Mobile App" },
  { key: "game", ro: "Joc", en: "Game" },
  { key: "crm", ro: "CRM", en: "CRM" },
  { key: "platform", ro: "Platformă", en: "Platform" },
];
export const automationModes: Array<{ key: AutomationMode; ro: string; en: string }> = [
  { key: "social", ro: "Agent AI Social Media", en: "Social Media AI Agent" },
  { key: "leads", ro: "Leads", en: "Leads" },
  { key: "chat", ro: "ChatBot AI web și WhatsApp", en: "Web & WhatsApp AI ChatBot" },
  { key: "other", ro: "Alte automatizări", en: "Other automations" },
];
