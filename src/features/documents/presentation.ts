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
    ...(b.permissions["documents.create"] ? ["generator" as const] : []),
    ...(b.staff ? ["templates" as const, "staff" as const] : []),
    ...(b.permissions["documents.company.owner"] ? ["company" as const] : []),
    "library",
    ...(b.staff ? ["hub" as const] : []),
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
  { group: string; description: string; use: string; stage: number; traits: string[] }
> = {
  brief: {
    stage: 1,
    traits: ["Obiective și public", "Cerințe prioritizate", "Materiale disponibile", "Buget și dependențe"],
    group: "Pregătire",
    description: "Obiective, cerințe și materiale, adaptate serviciilor alese.",
    use: "Înainte de ofertare",
  },
  audit: {
    stage: 1,
    traits: ["Perimetru autorizat", "Dovezi verificabile", "Severitate și impact", "Priorități de remediere"],
    group: "Pregătire",
    description: "Constatări, dovezi și recomandări prioritizate.",
    use: "Evaluare și îmbunătățire",
  },
  offer: {
    stage: 2,
    traits: ["Soluție și livrabile", "Deviz transparent", "Costuri recurente", "Valabilitate și acceptare"],
    group: "Comercial",
    description: "Soluție, livrabile, deviz și condiții comerciale.",
    use: "Ofertare și pregătirea facturării",
  },
  framework: {
    stage: 3,
    traits: ["Obligațiile părților", "Plată și termene", "Drepturi și licențe", "Răspundere și încetare"],
    group: "Juridic",
    description: "Cadrul contractual, obligațiile și condițiile colaborării.",
    use: "După acceptarea ofertei",
  },
  annex: {
    stage: 3,
    traits: ["Scop măsurabil", "Livrabile și excluderi", "Costuri pe serviciu", "Criterii de acceptare"],
    group: "Juridic",
    description: "Servicii, limite, costuri și criterii de acceptare.",
    use: "Definirea exactă a ariei",
  },
  access: {
    stage: 3,
    traits: ["Platforme autorizate", "Privilegii minime", "Operațiuni permise", "Durată și revocare"],
    group: "Juridic",
    description:
      "Mandatul de acces și administrare pentru platformele autorizate.",
    use: "Înainte de accesarea conturilor",
  },
  privacy: {
    stage: 3,
    traits: ["Informații protejate", "Rolurile privind datele", "DPA doar când se aplică", "Transferuri și ștergere"],
    group: "Juridic",
    description:
      "Confidențialitate și, numai când este necesar, prelucrarea datelor.",
    use: "În funcție de relația juridică",
  },
  implementation: {
    stage: 4,
    traits: ["Etape și termene", "Responsabili", "Dependențe și aprobări", "Dovezi de finalizare"],
    group: "Livrare",
    description: "Etape, responsabilități, dependențe și aprobări.",
    use: "Organizarea implementării",
  },
  report: {
    stage: 4,
    traits: ["Activități efectuate", "Indicatori și surse", "Rezultate și limite", "Acțiuni recomandate"],
    group: "Livrare",
    description: "Progres, rezultate, intervenții și următoarele acțiuni.",
    use: "Raportare și monitorizare",
  },
  handover: {
    stage: 4,
    traits: ["Inventarul livrării", "Verificări și observații", "Accesuri securizate", "Recepție și remedieri"],
    group: "Livrare",
    description: "Livrabile, verificări, recepție și eventuale remedieri.",
    use: "Predare și acceptanță",
  },
  sla: {
    stage: 5,
    traits: ["Servicii acoperite", "Suport și intervenții", "Backup și restaurare", "Tarif și reînnoire"],
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
  address: "Adresă AVYRON de activitate / corespondență",
  registered_address: "Sediu social conform înregistrării legale (distinct dacă diferă)",
  representative: "Reprezentant autorizat",
  contact_email: "E-mail de contact",
};
