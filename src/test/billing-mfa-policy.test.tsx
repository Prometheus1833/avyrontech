import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingOperationsPanel } from "@/components/finance/BillingOperationsPanel";
import { billingApi, type BillingAdminStatus } from "@/lib/billingApi";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each([
  { mfaEnabled: false, mfaVerified: false, mfaSatisfied: true, enabled: true },
  { mfaEnabled: false, mfaVerified: false, mfaSatisfied: undefined, enabled: false },
  { mfaEnabled: true, mfaVerified: false, mfaSatisfied: false, enabled: false },
  { mfaEnabled: true, mfaVerified: true, mfaSatisfied: true, enabled: true },
])("uses the server policy without fabricating MFA verification: %j", async ({ enabled, ...security }) => {
  const provider = { configured: true, approved: true, enabled: true };
  vi.spyOn(billingApi, "adminStatus").mockResolvedValue({
    providers: { stripe: provider, revolut: provider, oblio: provider, netopia: provider },
    security: { ...security, canVerify: true },
    providerPlaybooks: [{ provider: "stripe", title: "Stripe", purpose: "Încasări", phase: "configuration_only", authentication: "Sesiune autorizată", intake: "Webhook", reconciliation: "Comenzi", gate: "Identitate verificată", cadence: "La evenimente", sources: [] }],
    sessions: [], subscriptions: [], invoices: [], pendingInvoices: [], paymentsByCurrency: [], invoicesByCurrency: [], recentPayments: [], recentSubscriptions: [], recentInvoices: [], connectionRecords: [], recentFailures: [],
  } as BillingAdminStatus);
  render(<MemoryRouter><BillingOperationsPanel /></MemoryRouter>);
  const button = await screen.findByRole("button", { name: "Verifică API", exact: true });
  if (enabled) expect(button).toBeEnabled();
  else expect(button).toBeDisabled();
  if (!security.mfaEnabled) expect(screen.queryByText("Confirmă MFA în Setări")).toBeNull();
});
