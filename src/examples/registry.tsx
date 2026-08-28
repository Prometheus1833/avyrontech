import type { ComponentType } from "react";
import CofetariaDulceDor from "./cofetariadulcedor";
import StudioMaraDesign from "./studiomaradesign";
import PensiuneaCerbul from "./pensiuneacerbul";

/**
 * REGISTRU DE EXEMPLE
 * -------------------
 * Fiecare intrare va fi disponibilă ca subpagină a site-ului Avyron:
 *   https://avyron.ro/examples/{slug}
 *
 * Cum adaugi un exemplu nou:
 * 1. Creează un fișier `src/examples/numeafacere.tsx` care exportă default
 *    o componentă React (poate fi orice — HTML curat, integrare cu alte
 *    tool-uri, iframe, etc.).
 * 2. Adaugă o intrare în array-ul `examples` de mai jos.
 * 3. Apare automat în lista de proiecte din /portofoliu
 *    și e accesibilă la /examples/{slug}.
 *
 * IMPORTANT: aici NU stocăm site-urile lansate live (clarlumanari.ro,
 * miago.ro etc.) — acelea rămân doar ca link-uri externe în lista de
 * proiecte reale. Folderul `examples` e exclusiv pentru pagini exemplu
 * găzduite sub domeniul Avyron.
 */

export type ExampleEntry = {
  /** slug folosit în URL — poate include .ro / .com pentru a părea un domeniu real */
  slug: string;
  /** numele afișat (de obicei identic cu slug) */
  domain: string;
  category: { ro: string; en: string };
  description: { ro: string; en: string };
  Component: ComponentType;
};

export const examples: ExampleEntry[] = [
  {
    slug: "cofetariadulcedor.ro",
    domain: "cofetariadulcedor.ro",
    category: { ro: "Cofetărie artizanală — Iași", en: "Artisan pastry — Iași" },
    description: {
      ro: "Website de prezentare pentru o cofetărie artizanală din Iași: meniu sezonier, torturi pe comandă, galerie deserturi și comenzi instant prin WhatsApp.",
      en: "Showcase website for an artisan pastry in Iași: seasonal menu, custom cakes, dessert gallery and instant WhatsApp orders.",
    },
    Component: CofetariaDulceDor,
  },
  {
    slug: "studiomaradesign.ro",
    domain: "studiomaradesign.ro",
    category: { ro: "Studio design interior — București", en: "Interior design studio — Bucharest" },
    description: {
      ro: "Website de portofoliu pentru un studio de design interior din București: proiecte rezidențiale și comerciale, proces de lucru transparent și formular dedicat de consultanță.",
      en: "Portfolio website for a Bucharest interior design studio: residential and commercial projects, transparent workflow and dedicated consultation form.",
    },
    Component: StudioMaraDesign,
  },
  {
    slug: "pensiuneacerbul.ro",
    domain: "pensiuneacerbul.ro",
    category: { ro: "Pensiune montană — Apuseni", en: "Mountain guesthouse — Apuseni" },
    description: {
      ro: "Website de prezentare pentru o pensiune montană din Apuseni: camere și cabane individuale, facilități, trasee marcate și rezervări directe prin telefon și WhatsApp.",
      en: "Showcase website for a mountain guesthouse in the Apuseni: rooms and private cabins, amenities, marked trails and direct phone/WhatsApp bookings.",
    },
    Component: PensiuneaCerbul,
  },
];

export const findExample = (slug: string) =>
  examples.find((e) => e.slug.toLowerCase() === slug.toLowerCase());
