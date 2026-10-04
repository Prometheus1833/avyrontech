import type { Env } from "./types";
import { now } from "./security";

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

export type AudienceAccountPolicy = {
  id: string;
  project_id: string;
  provider: "facebook" | "instagram" | "tiktok";
  surface: "profile" | "page" | "professional" | "business" | "creator";
  connection_status: "disconnected" | "verifying" | "connected" | "error" | "paused";
  timezone: string;
  daily_review_hour: number;
  daily_review_minute: number;
  cleanup_limit: number;
  growth_limit: number;
};

export type AudienceProfile = {
  id: string;
  relationship: "friend" | "following" | "follower" | "mutual" | "requested" | "suggested";
  profileKind: "business" | "organization" | "creator" | "personal" | "unknown";
  websiteState: "none" | "weak" | "adequate" | "unknown";
  activityState: "active" | "inactive" | "unknown";
  followsBack: boolean | null;
  relevanceScore: number;
  intentScore: number;
  protections: string[];
};

export type AudienceProposal = {
  relationshipId: string;
  action: "unfollow" | "unfriend" | "follow" | "friend_request";
  score: number;
  reasons: string[];
};

const activeProtections = new Set(["conversation", "engagement", "contacted", "lead", "client", "partner", "manual", "do_not_contact"]);
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function proposeAudienceCandidates(
  profiles: AudienceProfile[],
  limits: { cleanup: number; growth: number },
): AudienceProposal[] {
  const protectedProfile = (profile: AudienceProfile) => profile.protections.some((item) => activeProtections.has(item));
  const cleanup = profiles.flatMap<AudienceProposal>((profile) => {
    if (protectedProfile(profile) || !["friend", "following", "mutual"].includes(profile.relationship)) return [];
    const reasons: string[] = [];
    let score = 0;
    if (profile.activityState === "inactive") { score += 40; reasons.push("activitate recentă absentă"); }
    if (profile.profileKind === "personal" || profile.profileKind === "unknown") { score += 30; reasons.push("fără relevanță comercială verificată"); }
    if (profile.relevanceScore < 30) { score += 35; reasons.push("relevanță redusă pentru serviciile AVYRON"); }
    if (profile.followsBack === false) { score += 20; reasons.push("nu urmărește contul înapoi"); }
    if (profile.websiteState === "adequate") { score += 8; reasons.push("prezență web deja matură"); }
    if (["business", "organization", "creator"].includes(profile.profileKind)
      && ["none", "weak"].includes(profile.websiteState) && profile.activityState === "active") score -= 45;
    if (score < 55) return [];
    return [{
      relationshipId: profile.id,
      action: profile.relationship === "friend" ? "unfriend" : "unfollow",
      score: clamp(score),
      reasons,
    }];
  }).sort((a, b) => b.score - a.score).slice(0, Math.min(25, Math.max(0, limits.cleanup)));

  const growth = profiles.flatMap<AudienceProposal>((profile) => {
    // Follow-back is an administrator-only decision. Followers remain read-only
    // observations and never enter the agent's approval or execution queue.
    if (protectedProfile(profile) || profile.relationship !== "suggested") return [];
    if (!["business", "organization", "creator"].includes(profile.profileKind) || profile.activityState !== "active") return [];
    if (profile.relevanceScore < 45 || !["none", "weak", "unknown"].includes(profile.websiteState)) return [];
    const reasons = ["activitate profesională relevantă"];
    let score = profile.relevanceScore * 0.55 + profile.intentScore * 0.3;
    if (profile.websiteState === "none") { score += 18; reasons.push("fără website identificat"); }
    else if (profile.websiteState === "weak") { score += 10; reasons.push("prezență web ce poate fi îmbunătățită"); }
    if (score < 55) return [];
    return [{
      relationshipId: profile.id,
      action: "friend_request",
      score: clamp(score),
      reasons,
    }];
  }).sort((a, b) => b.score - a.score).slice(0, Math.min(25, Math.max(0, limits.growth)));

  return [...cleanup, ...growth];
}

const localClock = (timestamp: number, timezone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

export function plannedAudienceRun(account: AudienceAccountPolicy, timestamp = now()) {
  const clock = localClock(timestamp, account.timezone);
  const targetMinutes = account.daily_review_hour * 60 + account.daily_review_minute;
  if (clock.minutes < targetMinutes) return null;
  return {
    scheduleKey: `${account.id}:${clock.date}:audience-review`,
    reviewDate: clock.date,
    dueAt: timestamp - (clock.minutes - targetMinutes) * 60_000,
    status: account.connection_status === "connected" ? "awaiting_data" as const : "awaiting_connection" as const,
  };
}

export async function enqueueAudienceReviewRuns(env: Env, timestamp = now()) {
  const accounts = await env.DB.prepare(
    `SELECT account.* FROM ai_social_accounts account
      JOIN ai_projects project ON project.id=account.project_id
     WHERE account.review_status='active' AND project.status='active'`,
  ).all<AudienceAccountPolicy>();
  let created = 0;
  for (const account of accounts.results) {
    const planned = plannedAudienceRun(account, timestamp);
    if (!planned) continue;
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO ai_social_audience_runs
        (id,account_id,schedule_key,review_date,status,cleanup_limit,growth_limit,due_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      identifier("aar"), account.id, planned.scheduleKey, planned.reviewDate, planned.status,
      account.cleanup_limit, account.growth_limit, planned.dueAt, timestamp, timestamp,
    ).run();
    created += Number(result.meta.changes || 0);
    if (result.meta.changes) {
      await env.DB.prepare(
        `INSERT INTO ai_social_audience_events (id,account_id,action,metadata_json,created_at)
         VALUES (?,?,'audience_review.scheduled',?,?)`,
      ).bind(identifier("aae"), account.id, JSON.stringify({ scheduleKey: planned.scheduleKey, status: planned.status }), timestamp).run();
    }
  }
  return created;
}
