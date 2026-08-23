/**
 * Single source of truth for public company identity.
 * Set VITE_COMPANY_* in the deployment environment after the registered
 * entity, CUI and full address have been legally confirmed.
 */
export const COMPANY = {
  brand: "Avyron",
  legalName: import.meta.env.VITE_COMPANY_LEGAL_NAME || "S.C. Eco Tech Digital Solution S.R.L.",
  taxId: import.meta.env.VITE_COMPANY_TAX_ID || "",
  registeredAddress: import.meta.env.VITE_COMPANY_REGISTERED_ADDRESS || "Iași, România",
  email: "contact@avyron.ro",
  phone: "+40734605055",
} as const;
