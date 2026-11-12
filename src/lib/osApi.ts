import { cfAuth } from "./cfAuth";
import type { ApprovalDetail, ApprovalInbox, ApprovalItem, ApprovalSource } from "@/shared/approvals";

export type OsAttention = {
  id: string;
  kind: "financiar" | "lead" | "proiect" | "suport" | "securitate";
  severity: "informare" | "atenție" | "critic";
  title: string;
  detail: string;
  destination: string;
};

export type OsApproval = {
  revision: number;
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
  agent_name?: string;
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
  checkedAt?: number;
  code?: string;
};

export type OsIntegration = {
  name: string;
  category: string;
  status: "conectat" | "în_verificare" | "eroare" | "oprit" | "neconfigurat";
  checkedAt: number | null;
  errorCode: string | null;
};

export type OsLeadStage = {
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  total: number;
};

export type OsActiveProject = {
  id: string;
  slug: string;
  name: string;
  status: string;
  bannerStatus: string;
  updatedAt: number;
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
  agents?: { slug: string; name: string; mission: string; last_run_status: string | null; last_run_at: number | null }[];
  health: OsHealth[];
  integrations: OsIntegration[];
  leadPipeline: OsLeadStage[];
  activeProjects: OsActiveProject[];
};

export const osApi = {
  attention: (id:string,offset=0)=>cfAuth.request<AttentionPage>(`/api/os/attention/${encodeURIComponent(id)}?offset=${offset}`),
  probeAi: (key:string)=>cfAuth.request<OsHealth>('/api/os/health/ai',{method:'POST',headers:{'Idempotency-Key':key},body:JSON.stringify({confirmed:true})}),
  withdrawItem: (item:ApprovalDetail,key:string)=>cfAuth.request(`/api/os/approval-center/${item.source}/${encodeURIComponent(item.id)}`,{method:'DELETE',headers:{'Idempotency-Key':key},body:JSON.stringify({confirmed:true,revision:item.revision})}),
  approvals: (source?: ApprovalSource, cursor?: string) => {
    const query = new URLSearchParams();
    if (source) query.set("source", source);
    if (cursor) query.set("cursor", cursor);
    return cfAuth.request<ApprovalInbox>(`/api/os/approval-center?${query}`);
  },
  approval: (item: ApprovalItem) => cfAuth.request<ApprovalDetail>(`/api/os/approval-center/${item.source}/${encodeURIComponent(item.id)}`),
  decideItem: (item: ApprovalDetail, decision: "approved" | "rejected", key: string) => {
    const path = item.source === "agent" ? `/api/os/approvals/${encodeURIComponent(item.id)}`
      : item.source === "operation" ? `/api/operations/records/${encodeURIComponent(item.id)}/approve`
      : item.source === "content" ? `/api/ai-projects/${encodeURIComponent(item.contextId!)}/content/${encodeURIComponent(item.id)}` : null;
    if (!path || !item.canDecide || (decision==="rejected" && !item.canReject)) throw new Error("Deschide modulul pentru revizuirea necesară.");
    return cfAuth.request(path, {method:item.source==="operation"?"POST":"PATCH",headers:{"Idempotency-Key":key},body:JSON.stringify(
      item.source==="agent" ? {decision,revision:item.revision}
        : item.source==="operation" ? {revision:item.revision} : {status:decision,expectedUpdatedAt:item.revision})});
  },
  overview: () => cfAuth.request<OsOverview>("/api/os/overview"),
  decideApproval: (id: string, decision: "approved" | "rejected", revision: number, note?: string) =>
    cfAuth.request<{ ok: true; status: string }>(`/api/os/approvals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ decision, note, revision }),
    }),
};

export type AttentionEvent={id:string;title:string;detail:string;status:string;created_at:number;href:string;action:'acknowledge'|'resolve'|null};
export type AttentionPage={data:AttentionEvent[];total:number;nextOffset:number|null};
