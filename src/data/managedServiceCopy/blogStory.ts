import {
  Building2,
  GraduationCap,
  Landmark,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Newspaper,
  PenLine,
  Search,
  Stethoscope,
  Target,
  UsersRound,
} from "lucide-react";
export const journey = {
  ro: {
    eyebrow: "Traseul conținutului",
    title: "De la o idee la un client",
    lead: "Un articol bun nu se termină la publicare. Îl construim ca pe un sistem: se scrie, se structurează, se indexează, se distribuie, se citește și se transformă în lead.",
    steps: [
      { icon: Lightbulb, t: "Idee", d: "Pornim de la întrebările reale ale clienților tăi." },
      { icon: PenLine, t: "Articol", d: "Structură editorială clară, ușor de scris și de actualizat." },
      { icon: Search, t: "Indexare", d: "Structuri semantice și date structurate pregătite pentru motoare." },
      { icon: Megaphone, t: "Distribuție", d: "Social, newsletter și linking intern automat." },
      { icon: UsersRound, t: "Lectură", d: "Experiență de citit rapidă, curată, plăcută pe mobil." },
      { icon: MousePointerClick, t: "Lead", d: "CTA contextual, formular scurt și urmărire în analytics." },
    ],
  },
  en: {
    eyebrow: "Content journey",
    title: "From an idea to a client",
    lead: "A good article does not end at publishing. We build it as a system: written, structured, indexed, distributed, read and turned into a lead.",
    steps: [
      { icon: Lightbulb, t: "Idea", d: "We start from the real questions your clients ask." },
      { icon: PenLine, t: "Article", d: "A clear editorial structure, easy to write and to update." },
      { icon: Search, t: "Indexing", d: "Semantic structure and structured data ready for engines." },
      { icon: Megaphone, t: "Distribution", d: "Social, newsletter and automated internal linking." },
      { icon: UsersRound, t: "Reading", d: "A fast, clean, genuinely pleasant mobile reading experience." },
      { icon: MousePointerClick, t: "Lead", d: "Contextual CTA, short form and analytics tracking." },
    ],
  },
} as const;
export const audiences = {
  ro: {
    eyebrow: "Pentru cine",
    title: "Blogul potrivit pentru fiecare tip de autoritate",
    lead: "Aceeași fundație tehnică, structuri editoriale diferite.",
    items: [
      { icon: Building2, t: "Blog de business", d: "Servicii, studii de caz și expertiză care aduc cereri de ofertă." },
      { icon: Target, t: "Blog de expert", d: "Brand personal, opinie și poziționare într-o nișă." },
      { icon: Landmark, t: "Content hub", d: "Ghiduri și resurse organizate pe categorii și niveluri." },
      { icon: Newspaper, t: "Publicație / newsroom", d: "Volum mare de articole, autori multipli, fluxuri redacționale." },
      { icon: Stethoscope, t: "Nișe reglementate", d: "Medical, juridic, financiar — conținut clar și responsabil." },
      { icon: GraduationCap, t: "Educație & training", d: "Cursuri, lecții și materiale descărcabile." },
    ],
  },
  en: {
    eyebrow: "Who it is for",
    title: "The right blog for every kind of authority",
    lead: "The same technical foundation, different editorial structures.",
    items: [
      { icon: Building2, t: "Business blog", d: "Services, case studies and expertise that generate enquiries." },
      { icon: Target, t: "Expert blog", d: "Personal brand, opinion and positioning inside a niche." },
      { icon: Landmark, t: "Content hub", d: "Guides and resources organised by category and level." },
      { icon: Newspaper, t: "Publication / newsroom", d: "High article volume, multiple authors, editorial workflows." },
      { icon: Stethoscope, t: "Regulated niches", d: "Medical, legal, financial — clear and responsible content." },
      { icon: GraduationCap, t: "Education & training", d: "Courses, lessons and downloadable material." },
    ],
  },
} as const;