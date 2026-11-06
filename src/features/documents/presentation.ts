import type { DocumentBootstrap, DocumentSummary } from "@/lib/documentsApi";
export type DocumentView =
  "library" | "company" | "staff" | "templates" | "generator" | "hub";
export const DOCUMENT_VIEWS: Record<
  DocumentView,
  { label: string; description: string }
> = {
  library: {
    label: "Bibliotecă Agenție",
    description: "Găsește, deschide și gestionează documentele autorizate.",
  },
  company: {
    label: "Documente SC",
    description: "Arhiva privată a societății, cu acces exclusiv autorizat.",
  },
  staff: {
    label: "Documente STAFF",
    description: "Documente interne și ghiduri pentru activitatea echipei.",
  },
  templates: {
    label: "Tipizate",
    description: "Modele reutilizabile, grupate după scop și activitate.",
  },
  generator: {
    label: "Generator",
    description:
      "Creează o instanță personalizată, cu datele firmei precompletate.",
  },
  hub: {
    label: "Documents Hub",
    description: "Înregistrările istorice, păstrate în sistemul existent.",
  },
};
export function allowedDocumentViews(b: DocumentBootstrap): DocumentView[] {
  return [
    "library",
    ...(b.permissions["documents.company.owner"] ? ["company" as const] : []),
    ...(b.staff
      ? ["staff" as const, "templates" as const, "hub" as const]
      : []),
    ...(b.permissions["documents.create"] ? ["generator" as const] : []),
  ];
}
export function documentState(item: DocumentSummary) {
  return item.archived_at
    ? "Arhivat"
    : item.published_version_id === item.current_version_id
      ? "Publicat"
      : item.approved
        ? "Aprobat"
        : "Ciornă";
}
export const TEMPLATE_META: Record<
  string,
  { group: string; description: string; use: string }
> = {
  brief: {
    group: "Pregătire",
    description: "Obiective, cerințe și materiale, adaptate serviciilor alese.",
    use: "Înainte de ofertare",
  },
  audit: {
    group: "Pregătire",
    description: "Constatări, dovezi și recomandări prioritizate.",
    use: "Evaluare și îmbunătățire",
  },
  offer: {
    group: "Comercial",
    description: "Soluție, livrabile, deviz și condiții comerciale.",
    use: "Ofertare și pregătirea facturării",
  },
  framework: {
    group: "Juridic",
    description: "Cadrul contractual, obligațiile și condițiile colaborării.",
    use: "După acceptarea ofertei",
  },
  annex: {
    group: "Juridic",
    description: "Servicii, limite, costuri și criterii de acceptare.",
    use: "Definirea exactă a ariei",
  },
  access: {
    group: "Juridic",
    description:
      "Mandatul de acces și administrare pentru platformele autorizate.",
    use: "Înainte de accesarea conturilor",
  },
  privacy: {
    group: "Juridic",
    description:
      "Confidențialitate și, numai când este necesar, prelucrarea datelor.",
    use: "În funcție de relația juridică",
  },
  implementation: {
    group: "Livrare",
    description: "Etape, responsabilități, dependențe și aprobări.",
    use: "Organizarea implementării",
  },
  report: {
    group: "Livrare",
    description: "Progres, rezultate, intervenții și următoarele acțiuni.",
    use: "Raportare și monitorizare",
  },
  handover: {
    group: "Livrare",
    description: "Livrabile, verificări, recepție și eventuale remedieri.",
    use: "Predare și acceptanță",
  },
  sla: {
    group: "Recurență",
    description: "Acoperire, niveluri de suport, limite și reînnoire.",
    use: "Mentenanță și abonamente",
  },
};
export const companyFieldLabels: Record<string, string> = {
  legal_name: "Denumire juridică",
  tax_id: "CUI / identificator fiscal",
  registration_number: "Registrul Comerțului",
  share_capital: "Capital social (valoare și monedă)",
  address: "Sediu social",
  representative: "Reprezentant autorizat",
  contact_email: "E-mail de contact",
};
