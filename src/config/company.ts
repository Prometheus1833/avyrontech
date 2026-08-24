export type LegalEntity = {
  id: string;
  legalName: string;
  taxId: string;
  registeredAddress: string;
  addressLocality: string;
  addressRegion: string;
  streetAddress?: string;
};

/** Single source of truth for the legal entities collaborating under Avyron. */
export const LEGAL_ENTITIES: readonly LegalEntity[] = [
  {
    id: "digital-ecotech-solutions",
    legalName:
      import.meta.env.VITE_DIGITAL_ECOTECH_LEGAL_NAME ||
      "DIGITAL ECOTECH SOLUTIONS S.R.L.",
    taxId: import.meta.env.VITE_DIGITAL_ECOTECH_TAX_ID || "55055976",
    registeredAddress:
      import.meta.env.VITE_DIGITAL_ECOTECH_REGISTERED_ADDRESS ||
      "Municipiul Iași, Bd. Independenței nr. 20, județul Iași, România",
    addressLocality: "Iași",
    addressRegion: "Iași",
    streetAddress: "Bd. Independenței nr. 20",
  },
  {
    id: "fv-tech-solutions",
    legalName: import.meta.env.VITE_FV_TECH_LEGAL_NAME || "FV Tech Solutions SRL",
    taxId: import.meta.env.VITE_FV_TECH_TAX_ID || "",
    registeredAddress:
      import.meta.env.VITE_FV_TECH_REGISTERED_ADDRESS ||
      "Municipiul Pașcani, județul Iași, România",
    addressLocality: "Pașcani",
    addressRegion: "Iași",
  },
] as const;

export const COMPANY = {
  brand: "Avyron",
  primaryLegalEntity: LEGAL_ENTITIES[0],
  legalEntities: LEGAL_ENTITIES,
  legalDisclosure:
    "Operatorul principal al brandului Avyron este DIGITAL ECOTECH SOLUTIONS S.R.L.; alte entități pot participa în funcție de proiect și de documentele contractuale aplicabile.",
  email: "contact@avyron.ro",
  phone: "+40734605055",
} as const;
