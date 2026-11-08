export const approvalSources = [
  "agent",
  "content",
  "operation",
  "template",
  "learning",
  "carousel",
] as const;
export type ApprovalSource = (typeof approvalSources)[number];
export type ApprovalItem = {
  id: string;
  source: ApprovalSource;
  title: string;
  summary: string;
  requestedAt: number;
  revision: number;
  href: string;
  canDecide: boolean;
  canReject: boolean;
  canWithdraw?: boolean;
};
export type ApprovalDetail = ApprovalItem & {
  contextId: string | null;
  detail: string;
};
export type ApprovalInbox = {
  generatedAt: number;
  data: ApprovalItem[];
  total: number;
  counts: Record<ApprovalSource, number>;
  nextCursor: string | null;
};
export const approvalLabels: Record<ApprovalSource, string> = {
  carousel: "Carusele exemple",
  agent: "Acțiuni AI",
  content: "Materiale",
  operation: "Contracte și modificări",
  template: "Modele de documente",
  learning: "Cunoaștere AVY",
};
