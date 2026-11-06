import type {
  ClientIdentity,
  ClientRecord,
  NewClientAccount,
} from "@/shared/clientWorkspace";
export const blankIdentity = (): ClientIdentity => ({
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  status: "active",
  entityType: "PJ",
  legalName: "",
  taxId: "",
  registrationNumber: "",
  address: "",
  representative: "",
  notes: "",
});
export const blankAccount = (): NewClientAccount => ({
  email: "",
  username: "",
  displayName: "",
  temporaryPassword: "",
});
export const identityOf = (c: ClientRecord): ClientIdentity => ({
  companyName: c.company_name,
  contactName: c.contact_name || "",
  email: c.email,
  phone: c.phone || "",
  status: c.status,
  entityType: c.entity_type || ("" as ClientIdentity["entityType"]),
  legalName: c.legal_name || c.company_name,
  taxId: c.tax_id || "",
  registrationNumber: c.registration_number || "",
  address: c.address || "",
  representative: c.representative || "",
  notes: c.notes || "",
});
export const statusName = (status: string) =>
  ({
    active: "Activ",
    paused: "În pauză",
    archived: "Arhivat",
    cancelled: "Anulat",
    in_progress: "În dezvoltare",
    done: "Finalizat",
    completed: "Finalizat",
    draft: "Ciornă",
    sent: "Emisă",
    paid: "Achitată",
    overdue: "Scadentă",
    void: "Anulată",
    partial: "Parțial achitată",
    partially_paid: "Parțial achitată",
    invoiced: "Facturată",
    refunded: "Rambursată",
    unpaid: "Neachitată",
  })[status] || status;
export const date = (value: number | null) =>
  value ? new Date(value).toLocaleDateString("ro-RO") : "Nespecificată";
export const money = (minor: number | null, currency: string) => {
  if (minor === null || !Number.isFinite(minor)) return "Valoare necompletată";
  try {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${currency}`;
  }
};
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Operațiunea nu a reușit. Reîncearcă.";
