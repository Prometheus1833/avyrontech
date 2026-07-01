// Emailuri Avyron rutate prin Cloudflare Email Routing → avyrontech@gmail.com.
// Adresa avyrontech@gmail.com este cea a adminului principal (pentru contact).

export const AVYRON_ADMIN_EMAIL = "avyrontech@gmail.com";

export const AVYRON_CONTACT_EMAILS = [
  { address: "contact@avyron.ro",     label: "Contact general", topic: "Întrebări generale, colaborări" },
  { address: "office@avyron.ro",      label: "Office",          topic: "Facturare, contracte, administrare" },
  { address: "development@avyron.ro", label: "Development",     topic: "Suport tehnic, dezvoltare, bug-uri" },
  { address: "design@avyron.ro",      label: "Design",          topic: "Feedback vizual, propuneri design" },
] as const;

export type AvyronContactEmail = (typeof AVYRON_CONTACT_EMAILS)[number];
