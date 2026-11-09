import type { CfProfile, CfUser } from "./cfAuth";

const meaningfulName = (value: string | null | undefined): string => {
  const name = (value ?? "").trim().replace(/^(?:client|customer|cont client)\s*[:·|]\s*/iu, "").trim();
  return /^(?:client|customer|utilizator|user|cont client|client avyron|client nou)[\s.…]*$/iu.test(name) ? "" : name;
};

/** Use only the signed-in account's existing identity, never another CRM entity. */
export function accountDisplayName(
  user: Pick<CfUser, "display_name" | "email" | "username">,
  profile: Pick<CfProfile, "display_name" | "company_name" | "entity_type" | "phone"> | null,
  fallback: string,
  isStaff = false,
): string {
  const company = meaningfulName(profile?.company_name);
  if (!isStaff && profile?.entity_type && profile.entity_type !== "individual" && company) return company;
  return meaningfulName(profile?.display_name)
    || meaningfulName(user.display_name)
    || company
    || meaningfulName(user.username)
    || user.email?.trim()
    || profile?.phone?.trim()
    || fallback;
}
