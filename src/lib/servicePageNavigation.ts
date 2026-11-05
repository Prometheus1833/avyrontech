let guard: (() => Promise<boolean>) | null = null;
export const registerServicePageGuard = (next: () => Promise<boolean>) => {
  guard = next;
  return () => {
    if (guard === next) guard = null;
  };
};
export const flushServicePageEdits = () =>
  guard ? guard() : Promise.resolve(true);
import type { ServiceTextValues } from "@/shared/servicePagePolicy";
const drafts = new Map<
  string,
  { revision: number; values: ServiceTextValues }
>();
export const recoverServiceDraft = (identity: string) => drafts.get(identity);
export const rememberServiceDraft = (
  identity: string,
  revision: number,
  values: ServiceTextValues,
) => {
  drafts.set(identity, { revision, values });
  if (drafts.size > 12) drafts.delete(drafts.keys().next().value!);
};
export const forgetServiceDraft = (identity: string) => drafts.delete(identity);
