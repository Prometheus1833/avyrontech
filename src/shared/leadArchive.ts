export const LEAD_ARCHIVE_REASONS = [
  { code: "postponed", label: "Proiect amânat de beneficiar" },
  { code: "no_response", label: "Nu răspunde la reveniri" },
  { code: "no_budget", label: "Buget indisponibil momentan" },
  { code: "not_interested", label: "Nu mai este interesat" },
  { code: "outside_scope", label: "Solicitare în afara serviciilor AVYRON" },
] as const;
export type LeadArchiveReason = typeof LEAD_ARCHIVE_REASONS[number]["code"];

/** Validate syntax only; availability of a WhatsApp account is not implied. */
export function leadWhatsAppUrl(phone: string | null | undefined, message = ""): string | null {
  if (!phone || !/^(?:\+|00)?[\d\s().-]+$/.test(phone.trim())) return null;
  const value = phone.trim();
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^0[2-9]\d{8}$/.test(digits)) digits = "40" + digits.slice(1);
  else if (!value.startsWith("+") && !/^40[2-9]\d{8}$/.test(digits)) return null;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ""}`;
}
