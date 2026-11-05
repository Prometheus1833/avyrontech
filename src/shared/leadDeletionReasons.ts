export const LEAD_DELETION_REASONS = [
  {
    code: "changed_mind",
    label: "S-a răzgândit",
    hint: "Persoana nu mai dorește să continue solicitarea.",
  },
  {
    code: "unwilling_to_pay",
    label: "Nu dorește să plătească",
    hint: "Nu acceptă costurile comunicate pentru serviciile solicitate.",
  },
  {
    code: "requirements_not_met",
    label: "Nu îndeplinește condițiile",
    hint: "Solicitarea nu îndeplinește condițiile necesare colaborării.",
  },
  {
    code: "duplicate",
    label: "Înregistrare duplicată",
    hint: "Același contact există deja într-o fișă activă.",
  },
  {
    code: "spam",
    label: "Spam sau solicitare abuzivă",
    hint: "Mesaj automat, irelevant sau rău intenționat.",
  },
  {
    code: "test_entry",
    label: "Înregistrare de test",
    hint: "Date create doar pentru verificarea platformei.",
  },
  {
    code: "invalid_contact",
    label: "Date de contact nevalide",
    hint: "Contactul nu poate fi identificat sau verificat.",
  },
  {
    code: "withdrawn",
    label: "Solicitare retrasă",
    hint: "Persoana a cerut închiderea solicitării comerciale.",
  },
  {
    code: "outside_scope",
    label: "În afara serviciilor AVYRON",
    hint: "Cererea nu poate fi preluată în activitatea comercială.",
  },
  {
    code: "other",
    label: "Alt motiv",
    hint: "Descrie clar motivul pentru jurnalul de audit.",
  },
] as const;
export type LeadDeletionReasonCode =
  (typeof LEAD_DELETION_REASONS)[number]["code"];
