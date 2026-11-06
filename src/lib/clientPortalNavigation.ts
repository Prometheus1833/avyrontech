import type { SectionId } from "./access";
export function clientSectionDestination(
  section: string,
): { section: SectionId; params: Record<string, string> } | null {
  if (section === "maintenance" || section === "client-maintenance")
    return {
      section: "subscriptions",
      params: { recurringView: "activities" },
    };
  if (section === "intern")
    return { section: "tickets", params: { supportView: "messages" } };
  if (section === "invoices")
    return { section: "payments", params: { billingView: "invoices" } };
  return null;
}
