import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChefHat,
  Coffee,
  ConciergeBell,
  Hotel,
  Languages,
  MapPin,
  Menu,
  PackageCheck,
  ShoppingBag,
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
