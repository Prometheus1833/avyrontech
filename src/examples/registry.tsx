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
 * 3. Apare automat în lista "Exemple personalizate" din /despre#portofoliu
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
    category: { ro: "Cofetărie artizanală", en: "Artisan pastry" },
    description: {
      ro: "Exemplu de website pentru o cofetărie artizanală locală — meniu, comenzi pe WhatsApp și galerie produse.",
      en: "Example website for a local artisan pastry — menu, WhatsApp orders and product gallery.",
    },
    Component: CofetariaDulceDor,
  },
  {
    slug: "studiomaradesign.ro",
    domain: "studiomaradesign.ro",
    category: { ro: "Studio design interior", en: "Interior design studio" },
    description: {
      ro: "Portofoliu pentru un studio de design interior — proiecte, procesul de lucru și formular de contact.",
      en: "Portfolio for an interior design studio — projects, workflow and contact form.",
    },
    Component: StudioMaraDesign,
  },
  {
    slug: "pensiuneacerbul.ro",
    domain: "pensiuneacerbul.ro",
    category: { ro: "Pensiune montană", en: "Mountain guesthouse" },
    description: {
      ro: "Site de prezentare pentru o pensiune montană — camere, tarife, atracții locale și rezervări.",
      en: "Showcase site for a mountain guesthouse — rooms, rates, local attractions and bookings.",
    },
    Component: PensiuneaCerbul,
  },
];

export const findExample = (slug: string) =>
  examples.find((e) => e.slug.toLowerCase() === slug.toLowerCase());
