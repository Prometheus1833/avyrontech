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
    id: "fv-tech-solutions",
    legalName: import.meta.env.VITE_FV_TECH_LEGAL_NAME || "FV Tech Solutions SRL",
    taxId: import.meta.env.VITE_FV_TECH_TAX_ID || "",
    registeredAddress:
      import.meta.env.VITE_FV_TECH_REGISTERED_ADDRESS ||
      "Municipiul Pașcani, județul Iași, România",
    addressLocality: "Pașcani",
    addressRegion: "Iași",
  },
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
] as const;

export const COMPANY = {
  brand: "Avyron",
  associationName: LEGAL_ENTITIES.map((entity) => entity.legalName).join(" și "),
  legalEntities: LEGAL_ENTITIES,
  legalDisclosure:
    "Avyron este dezvoltat și operat prin colaborarea dintre FV Tech Solutions SRL și DIGITAL ECOTECH SOLUTIONS S.R.L.",
  email: "contact@avyron.ro",
  phone: "+40734605055",
} as const;
