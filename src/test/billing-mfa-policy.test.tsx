import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

it("runs read-only synchronization only on demand and displays the actual empty scope",async()=>{
 const state={runId:'synthetic',status:'complete' as const,checked:0,matched:0,issueCount:0,startedAt:1,finishedAt:2,lockedUntil:0,issues:[]};
 const status={providers:{},security:{mfaEnabled:false,mfaVerified:false,mfaSatisfied:true,canVerify:true},providerPlaybooks:[{provider:'stripe',title:'Stripe',purpose:'Încasări',phase:'connected_unsynced',loginUrl:'https://dashboard.stripe.com/login',authentication:'',intake:'',reconciliation:'',gate:'',cadence:'',sources:[]}],sessions:[],subscriptions:[],invoices:[],pendingInvoices:[],paymentsByCurrency:[],invoicesByCurrency:[],recentPayments:[],recentSubscriptions:[],recentInvoices:[],connectionRecords:[{provider:'stripe',status:'connected',last_sync_at:null,last_error_code:null}],recentFailures:[]} as BillingAdminStatus;
 vi.spyOn(billingApi,'adminStatus').mockResolvedValueOnce(status).mockResolvedValue({...status,connectionRecords:[{...status.connectionRecords[0],last_sync_at:2,sync:state}]});
 const sync=vi.spyOn(billingApi,'syncConnection').mockResolvedValue({state,scope:'native_avyron_references',moneyActions:false});
 render(<MemoryRouter><BillingOperationsPanel/></MemoryRouter>);
 const button=await screen.findByRole('button',{name:'Sincronizează',exact:true});expect(sync).not.toHaveBeenCalled();fireEvent.click(button);
 await waitFor(()=>expect(sync).toHaveBeenCalledWith('stripe'));expect(await screen.findByText(/0 referințe comparate · 0 concordante · 0 diferențe/)).toBeInTheDocument();
});

it.each(["verify", "sync"])("refreshes a failed %s and keeps the provider error visible even while approval is pending", async (operation) => {
  const status = { providers: {}, security: { mfaEnabled: false, mfaVerified: false, mfaSatisfied: true, canVerify: true }, providerPlaybooks: [{ provider: "oblio", title: "Oblio", purpose: "Facturare", phase: "awaiting_approval", authentication: "", intake: "", reconciliation: "", gate: "", cadence: "", sources: [] }], sessions: [], subscriptions: [], invoices: [], pendingInvoices: [], paymentsByCurrency: [], invoicesByCurrency: [], recentPayments: [], recentSubscriptions: [], recentInvoices: [], connectionRecords: [{ provider: "oblio", status: "connected", last_sync_at: null, last_error_code: null }], recentFailures: [] } as BillingAdminStatus;
  const refreshed = { ...status, connectionRecords: [{ ...status.connectionRecords[0], status: "error", last_error_code: "oblio_auth_unreachable" }] };
  const read = vi.spyOn(billingApi, "adminStatus").mockResolvedValueOnce(status).mockResolvedValue(refreshed);
  const action = operation === "verify" ? vi.spyOn(billingApi, "verifyConnection").mockRejectedValue(new Error("oblio_auth_unreachable")) : vi.spyOn(billingApi, "syncConnection").mockRejectedValue(new Error("oblio_auth_unreachable"));
  render(<MemoryRouter><BillingOperationsPanel /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: operation === "verify" ? "Verifică API" : "Sincronizează", exact: true }));
  await waitFor(() => expect(action).toHaveBeenCalledWith("oblio"));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole("alert")).toHaveTextContent("Furnizorul nu a putut fi contactat");
  expect(screen.getByRole("alert")).toHaveTextContent("oblio_auth_unreachable");
  expect(screen.getByText("Așteaptă aprobare")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Sincronizează", exact: true })).toBeNull();
});
