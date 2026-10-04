import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChefHat,
  Coffee,
  ConciergeBell,
  Dumbbell,
  GraduationCap,
  Hammer,
  HeartPulse,
  Hotel,
  Languages,
  MapPin,
  Menu,
  PackageCheck,
  PanelsTopLeft,
  Scissors,
  SearchCheck,
  Settings2,
  ShoppingBag,
  Smartphone,
  Store,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

export type Localized = { ro: string; en: string };

export type BusinessOption = {
  id: string;
  icon: LucideIcon;
  label: Localized;
  previewName: string;
  category: Localized;
  menu: [Localized, Localized];
};

export type GoalOption = {
  id: string;
  icon: LucideIcon;
  label: Localized;
  hint: Localized;
  cta: Localized;
};

export type StyleOption = {
  id: string;
  label: Localized;
  hint: Localized;
  swatches: [string, string, string];
  preview: string;
};

export type ConfiguratorChoice = {
  id: string;
  icon: LucideIcon;
  label: Localized;
  hint: Localized;
};

export const HORECA_BUSINESSES: BusinessOption[] = [
  {
    id: "restaurant",
    icon: UtensilsCrossed,
    label: { ro: "Restaurant", en: "Restaurant" },
    previewName: "Atelier 14",
    category: { ro: "Bucătărie contemporană", en: "Contemporary cuisine" },
    menu: [
      { ro: "Păstrăv, unt brun și ierburi", en: "Trout, brown butter and herbs" },
      { ro: "Legume coapte, cremă de brânză", en: "Roasted vegetables, cheese cream" },
    ],
  },
  {
    id: "bistro",
    icon: ConciergeBell,
    label: { ro: "Bistro", en: "Bistro" },
    previewName: "Grădina Mică",
    category: { ro: "Bistro urban de sezon", en: "Seasonal urban bistro" },
    menu: [
      { ro: "Pâine prăjită, ricotta și roșii", en: "Toast, ricotta and tomatoes" },
      { ro: "Gnocchi, salvie și parmezan", en: "Gnocchi, sage and parmesan" },
    ],
  },
  {
    id: "cafe",
    icon: Coffee,
    label: { ro: "Cafenea", en: "Coffee shop" },
    previewName: "NOD Café",
    category: { ro: "Cafea de specialitate", en: "Specialty coffee" },
    menu: [
      { ro: "Flat white · origine Brazilia", en: "Flat white · Brazil origin" },
      { ro: "Croissant cu fistic", en: "Pistachio croissant" },
    ],
  },
  {
    id: "bakery",
    icon: ChefHat,
    label: { ro: "Cofetărie", en: "Pastry shop" },
    previewName: "Miez & Vanilie",
    category: { ro: "Atelier de deserturi", en: "Dessert atelier" },
    menu: [
      { ro: "Tartă cu lămâie și bezea", en: "Lemon meringue tart" },
      { ro: "Entremet ciocolată și alune", en: "Chocolate and hazelnut entremet" },
    ],
  },
  {
    id: "hotel",
    icon: Hotel,
    label: { ro: "Pensiune / hotel", en: "Guesthouse / hotel" },
    previewName: "Casa Verde",
    category: { ro: "Ospitalitate în natură", en: "Hospitality in nature" },
    menu: [
      { ro: "Mic dejun local inclus", en: "Local breakfast included" },
      { ro: "Cină sezonieră la cerere", en: "Seasonal dinner on request" },
    ],
  },
  {
    id: "clinic",
    icon: HeartPulse,
    label: { ro: "Clinică / cabinet", en: "Clinic / practice" },
    previewName: "Clinica Nova",
    category: { ro: "Servicii medicale și programări", en: "Medical services and appointments" },
    menu: [
      { ro: "Servicii explicate clar", en: "Clearly explained services" },
      { ro: "Programare rapidă online", en: "Fast online appointments" },
    ],
  },
  {
    id: "beauty",
    icon: Scissors,
    label: { ro: "Salon / beauty", en: "Salon / beauty" },
    previewName: "Atelier Aura",
    category: { ro: "Frumusețe și programări", en: "Beauty and appointments" },
    menu: [
      { ro: "Galerie și servicii", en: "Gallery and services" },
      { ro: "Programare fără apel", en: "Book without a call" },
    ],
  },
  {
    id: "professional",
    icon: BriefcaseBusiness,
    label: { ro: "Consultanță / profesii", en: "Consulting / professionals" },
    previewName: "Nord Consult",
    category: { ro: "Expertiză și servicii profesionale", en: "Expertise and professional services" },
    menu: [
      { ro: "Expertiză și studii de caz", en: "Expertise and case studies" },
      { ro: "Solicitare de consultanță", en: "Consulting enquiry" },
    ],
  },
  {
    id: "construction",
    icon: Hammer,
    label: { ro: "Construcții / producție", en: "Construction / manufacturing" },
    previewName: "Structura Pro",
    category: { ro: "Portofoliu și cereri de ofertă", en: "Portfolio and quote requests" },
    menu: [
      { ro: "Proiecte și capacități", en: "Projects and capabilities" },
      { ro: "Cerere de ofertă structurată", en: "Structured quote request" },
    ],
  },
  {
    id: "real-estate",
    icon: Building2,
    label: { ro: "Imobiliare / cazare", en: "Real estate / accommodation" },
    previewName: "Habitat Urban",
    category: { ro: "Proprietăți, tururi și contacte", en: "Properties, tours and contacts" },
    menu: [
      { ro: "Proprietăți ușor de filtrat", en: "Easy-to-filter properties" },
      { ro: "Vizionări și solicitări", en: "Viewings and enquiries" },
    ],
  },
  {
    id: "education",
    icon: GraduationCap,
    label: { ro: "Educație / cursuri", en: "Education / courses" },
    previewName: "Academia Vector",
    category: { ro: "Programe, înscrieri și resurse", en: "Programs, enrolment and resources" },
    menu: [
      { ro: "Cursuri și calendar", en: "Courses and calendar" },
      { ro: "Înscriere și resurse", en: "Enrolment and resources" },
    ],
  },
  {
    id: "fitness",
    icon: Dumbbell,
    label: { ro: "Fitness / wellness", en: "Fitness / wellness" },
    previewName: "Core Studio",
    category: { ro: "Clase, abonamente și comunitate", en: "Classes, memberships and community" },
    menu: [
      { ro: "Programul claselor", en: "Class schedule" },
      { ro: "Abonamente și înscrieri", en: "Memberships and enrolment" },
    ],
  },
  {
    id: "retail",
    icon: Store,
    label: { ro: "Comerț / brand local", en: "Retail / local brand" },
    previewName: "Atelier Local",
    category: { ro: "Produse, poveste și vânzare", en: "Products, story and sales" },
    menu: [
      { ro: "Colecții și produse", en: "Collections and products" },
      { ro: "Comandă sau solicitare", en: "Order or enquiry" },
    ],
  },
];

export const HORECA_GOALS: GoalOption[] = [
  {
    id: "booking",
    icon: CalendarDays,
    label: { ro: "Mai multe rezervări", en: "More bookings" },
    hint: { ro: "Calendar clar și confirmare rapidă", en: "Clear calendar and fast confirmation" },
    cta: { ro: "Rezervă o masă", en: "Book a table" },
  },
  {
    id: "menu",
    icon: Menu,
    label: { ro: "Meniu ușor de explorat", en: "Easy-to-browse menu" },
    hint: { ro: "Categorii, alergeni și preparate vedetă", en: "Categories, allergens and signature dishes" },
    cta: { ro: "Explorează meniul", en: "Explore the menu" },
  },
  {
    id: "order",
    icon: ShoppingBag,
    label: { ro: "Comenzi directe", en: "Direct orders" },
    hint: { ro: "Ridicare sau livrare, fără pași inutili", en: "Pickup or delivery, without needless steps" },
    cta: { ro: "Comandă online", en: "Order online" },
  },
  {
    id: "events",
    icon: Wine,
    label: { ro: "Evenimente și experiențe", en: "Events and experiences" },
    hint: { ro: "Pachete private prezentate convingător", en: "Private packages presented persuasively" },
    cta: { ro: "Vezi experiențele", en: "View experiences" },
  },
];

export const HORECA_STYLES: StyleOption[] = [
  {
    id: "warm",
    label: { ro: "Cald & editorial", en: "Warm & editorial" },
    hint: { ro: "Tonuri naturale și tipografie elegantă", en: "Natural tones and elegant typography" },
    swatches: ["#192219", "#bf7449", "#f3ead8"],
    preview: "from-[#111b15]/95 via-[#111b15]/60 to-[#a95f39]/35",
  },
  {
    id: "minimal",
    label: { ro: "Luminos & minimalist", en: "Light & minimal" },
    hint: { ro: "Spațiu, claritate și accente discrete", en: "Space, clarity and discreet accents" },
    swatches: ["#182027", "#d8d0c1", "#faf8f2"],
    preview: "from-[#172027]/92 via-[#334049]/55 to-[#d8d0c1]/30",
  },
  {
    id: "bold",
    label: { ro: "Urban & expresiv", en: "Urban & expressive" },
    hint: { ro: "Contrast puternic și energie vizuală", en: "High contrast and visual energy" },
    swatches: ["#170f1f", "#d6533f", "#f2c14e"],
    preview: "from-[#160e1e]/95 via-[#351736]/55 to-[#d6533f]/40",
  },
];

export const HORECA_MODULES: Array<{ id: string; icon: LucideIcon; label: Localized }> = [
  { id: "languages", icon: Languages, label: { ro: "RO / EN", en: "RO / EN" } },
  { id: "location", icon: MapPin, label: { ro: "Hartă și program", en: "Map and hours" } },
  { id: "confirmation", icon: PackageCheck, label: { ro: "Confirmări automate", en: "Automated confirmations" } },
];

export const AVYRON_SERVICE_OPTIONS: ConfiguratorChoice[] = [
  { id: "presentation", icon: PanelsTopLeft, label: { ro: "Site de prezentare", en: "Business website" }, hint: { ro: "Pagini clare, conversie, SEO și administrare simplă", en: "Clear pages, conversion, SEO and simple management" } },
  { id: "store", icon: ShoppingBag, label: { ro: "Magazin online", en: "Online store" }, hint: { ro: "Catalog, coș, plăți și livrare", en: "Catalog, cart, payments and delivery" } },
  { id: "application", icon: Smartphone, label: { ro: "Aplicație / platformă", en: "App / platform" }, hint: { ro: "Conturi, automatizări și fluxuri proprii", en: "Accounts, automations and custom flows" } },
  { id: "automation", icon: Bot, label: { ro: "Automatizări și AI", en: "Automation and AI" }, hint: { ro: "Procese repetitive, asistenți și integrări", en: "Repetitive processes, assistants and integrations" } },
  { id: "maintenance", icon: Settings2, label: { ro: "Mentenanță și abonament", en: "Maintenance and subscription" }, hint: { ro: "Actualizări, monitorizare și suport după lansare", en: "Updates, monitoring and post-launch support" } },
];

export const WEBSITE_FEATURE_OPTIONS: ConfiguratorChoice[] = [
  { id: "contact", icon: BriefcaseBusiness, label: { ro: "Formulare și leaduri", en: "Forms and leads" }, hint: { ro: "Solicitări salvate direct în AVYRON OS", en: "Enquiries saved directly in AVYRON OS" } },
  { id: "booking", icon: CalendarDays, label: { ro: "Programări / rezervări", en: "Appointments / bookings" }, hint: { ro: "Calendar, intervale și confirmări", en: "Calendar, slots and confirmations" } },
  { id: "multilingual", icon: Languages, label: { ro: "Mai multe limbi", en: "Multiple languages" }, hint: { ro: "Structură RO, EN sau alte piețe", en: "RO, EN or additional markets" } },
  { id: "local", icon: MapPin, label: { ro: "Hartă și prezență locală", en: "Map and local presence" }, hint: { ro: "Locații, program și acțiuni rapide", en: "Locations, hours and quick actions" } },
  { id: "seo", icon: SearchCheck, label: { ro: "SEO și măsurare", en: "SEO and measurement" }, hint: { ro: "Date structurate, conversii și rapoarte", en: "Structured data, conversions and reports" } },
  { id: "client-area", icon: PackageCheck, label: { ro: "Cont / zonă client", en: "Account / client area" }, hint: { ro: "Documente, comenzi, abonamente sau status", en: "Documents, orders, subscriptions or status" } },
];

export const DOMAIN_PREFERENCES: ConfiguratorChoice[] = [
  { id: "ro", icon: MapPin, label: { ro: ".ro — România", en: ".ro — Romania" }, hint: { ro: "Potrivit pentru publicul local", en: "A strong fit for a Romanian audience" } },
  { id: "com", icon: Building2, label: { ro: ".com — internațional", en: ".com — international" }, hint: { ro: "Recunoscut ușor pe mai multe piețe", en: "Easy to recognize across markets" } },
  { id: "eu", icon: Languages, label: { ro: ".eu — european", en: ".eu — European" }, hint: { ro: "Poziționare pentru clienți din UE", en: "Positioning for EU customers" } },
  { id: "tech", icon: Bot, label: { ro: ".io / .app — digital", en: ".io / .app — digital" }, hint: { ro: "Produse software și aplicații", en: "Software products and applications" } },
  { id: "shop", icon: ShoppingBag, label: { ro: ".store / .shop — comerț", en: ".store / .shop — commerce" }, hint: { ro: "Magazine și colecții de produse", en: "Stores and product collections" } },
];
