export type DocumentCompanyProfile = Record<string, string | null>;
export const AVYRON_DOCUMENT_IDENTITY = {
  legal_name: "DIGITAL ECOTECH SOLUTIONS S.R.L.",
  tax_id: "55055976",
  registration_number: "J2026041938009",
  address: "Bd. Independenței nr. 20, mun. Iași, jud. Iași, România",
  contact_email: "contact@avyron.ro",
} as const;

export function documentCompanyIdentity(company: DocumentCompanyProfile): DocumentCompanyProfile {
  if (company.legal_name?.trim().toUpperCase() !== AVYRON_DOCUMENT_IDENTITY.legal_name) return company;
  return {
    ...company,
    ...Object.fromEntries(Object.entries(AVYRON_DOCUMENT_IDENTITY).map(([key, value]) =>
      [key, company[key]?.trim() || value],
    )),
  };
}
export type DocumentBeneficiary = {
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  entity_type?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
  registration_number?: string | null;
  address?: string | null;
  representative?: string | null;
};
export type SubscriptionBillingContext = {
  entity_type: string;
  legal_name: string;
  tax_id: string | null;
  billing_address: string;
  invoice_email: string;
  payment_terms_days: number;
};
export function automaticDocumentFields(
  company: DocumentCompanyProfile,
  client: DocumentBeneficiary | undefined,
  date: string,
  internal: boolean,
  billing?: SubscriptionBillingContext,
): Record<string, string> {
  company = documentCompanyIdentity(company);
  const entityType =
    client?.entity_type ||
    (
      {
        individual: "PF",
        company: "PJ",
        pfa: "PFA",
        ngo: "ONG",
        other: "Altă formă",
      } as Record<string, string>
    )[billing?.entity_type || ""] ||
    (internal ? "PJ" : "");
  const beneficiaryName =
    client?.legal_name ||
    billing?.legal_name ||
    client?.company_name ||
    (internal ? company.legal_name || "" : "");
  const tax =
      client?.tax_id ||
      billing?.tax_id ||
      (internal ? company.tax_id : "") ||
      "",
    address =
      client?.address ||
      billing?.billing_address ||
      (internal ? company.address : "") ||
      "";
  const representative =
    client?.representative || (internal ? company.representative : "") || "";
  return {
    date,
    "provider.legal_name": company.legal_name || "",
    "provider.tax_id": company.tax_id || "",
    "provider.address": company.address || "",
    "provider.registered_address": company.registered_address || "",
    "provider.registration_number": company.registration_number || "",
    "provider.representative": company.representative || "",
    "provider.share_capital": company.share_capital || "",
    "provider.contact_email": company.contact_email || "",
    "beneficiary.legal_name": beneficiaryName,
    "beneficiary.entity_type": entityType,
    "beneficiary.signatory": representative || (entityType === "PF" ? beneficiaryName : ""),
    "beneficiary.tax_id": tax,
    "beneficiary.address": address,
    "beneficiary.contact_email":
      billing?.invoice_email ||
      client?.email ||
      (internal ? company.contact_email : "") ||
      "",
    "beneficiary.summary": [
      entityType,
      entityType !== "PF" && tax ? `Cod fiscal: ${tax}` : "",
      entityType !== "PF" && client?.registration_number ? `Înregistrare: ${client.registration_number}` : "",
      address,
      billing?.invoice_email || client?.email,
    ].filter(Boolean).join("\n") || "Beneficiarul este identificat prin numele înscris mai sus.",
    "beneficiary.identification":
      entityType === "PF"
        ? "Persoană fizică identificată prin numele și adresa înscrise în document"
        : [
            tax ? `Cod fiscal: ${tax}` : "",
            client?.registration_number
              ? `Înregistrare: ${client.registration_number}`
              : "",
          ]
            .filter(Boolean)
            .join("; "),
    contacts: [client?.contact_name, client?.email].filter(Boolean).join(" · "),
    signatories:
      company.representative && (representative || (entityType === "PF" && beneficiaryName))
        ? `AVYRON: ${company.representative} · Beneficiar: ${representative || beneficiaryName}`
        : "",
    ...(billing
      ? {
          payment_terms: `Termen de plată: ${billing.payment_terms_days} zile de la data facturii, conform condițiilor confirmate pentru abonament.`,
        }
      : {}),
  };
}
export function consistentSubscriptionBilling(
  rows: SubscriptionBillingContext[],
): SubscriptionBillingContext | undefined {
  if (!rows.length) return undefined;
  const first = JSON.stringify(rows[0]);
  return rows.every((row) => JSON.stringify(row) === first)
    ? rows[0]
    : undefined;
}
