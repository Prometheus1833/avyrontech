import type { OpportunityInput } from "../shared/agency/model";
export function newAgencyOpportunity(): OpportunityInput {
  return {
    platformId: "infinum",
    title: "Website B2B de test",
    clientName: "Business Test",
    clientId: null,
    email: "business@example.test",
    phone: "",
    serviceId: null,
    sourceUrl: "https://alliance.infinum.com/requests/test-1",
    sourceReference: "RFP-1",
    kind: "commercial",
    budgetMin: 100000,
    budgetMax: 200000,
    currency: "RON",
    deadline: "2026-12-01",
    ownerId: null,
    priority: "normal",
    stage: "identified",
    contractMinor: null,
    commissionBps: 0,
    estimatedCostMinor: null,
    nextAction: "Analizăm cerințele originale",
    summary: "Context sintetic pentru teste.",
    lossReason: "",
    commissionNote: "",
  };
}
