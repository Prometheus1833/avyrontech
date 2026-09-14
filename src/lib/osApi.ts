import { cfAuth } from "./cfAuth";

export type OsAttention = {
  id: string;
  kind: "financiar" | "lead" | "proiect" | "suport" | "securitate";
  severity: "informare" | "atenție" | "critic";
  title: string;
  detail: string;
  destination: string;
};

export type OsApproval = {
  id: string;
  summary: string;
  action_class: "write" | "external" | "financial" | "publish";
  requested_at: number;
  expires_at: number;
  agent_slug: string;
  run_status: string;
};

export type OsAgentRun = {
  id: string;
  agent_slug: string;
  status: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_micros: number;
  steps: number;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
};

export type OsHealth = {
  id: string;
  label: string;
  status: "funcțional" | "configurat" | "atenție" | "eroare" | "neconfigurat";
  detail: string;
};

export type OsIntegration = {
  name: string;
  category: string;
  status: "conectat" | "în_verificare" | "eroare" | "oprit" | "neconfigurat";
  checkedAt: number | null;
  errorCode: string | null;
};

export type OsOverview = {
  generatedAt: number;
  role: "super_admin" | "staff" | "client";
  briefing: string;
  metrics: {
    projects: number;
    activeProjects: number;
    leads: number;
    openLeads: number;
    clients: number;
    visits: number;
    approvals: number;
    expensesMinor: number;
    revenuesMinor: number;
    criticalAlerts: number;
  };
  attention: OsAttention[];
  approvals: OsApproval[];
  agentRuns: OsAgentRun[];
  health: OsHealth[];
  integrations: OsIntegration[];
};

export const osApi = {
  overview: () => cfAuth.request<OsOverview>("/api/os/overview"),
  decideApproval: (id: string, decision: "approved" | "rejected", note?: string) =>
    cfAuth.request<{ ok: true; status: string }>(`/api/os/approvals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ decision, note }),
    }),
};
