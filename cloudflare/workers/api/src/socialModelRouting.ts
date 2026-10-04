export type SocialRouteJobKind =
  | "daily_post"
  | "daily_image"
  | "story"
  | "reel"
  | "weekly_article"
  | "engagement_review";

export type SocialModelRoute = {
  route_key: string;
  provider: string;
  model_id: string;
  max_output_tokens: number;
  daily_unit_limit: number;
};

export const routeKeyForSocialJob = (kind: SocialRouteJobKind) =>
  kind === "weekly_article" || kind === "reel" ? "premium_editorial" : "routine_copy";

export async function resolveSocialModelRoute(
  db: D1Database,
  projectId: string,
  kind: SocialRouteJobKind,
): Promise<SocialModelRoute | null> {
  const routeKey = routeKeyForSocialJob(kind);
  const route = await db.prepare(
    `SELECT route_key,provider,model_id,max_output_tokens,daily_unit_limit
       FROM ai_social_model_routes
      WHERE project_id=? AND route_key=? AND execution_mode='remote_api'
        AND billing_mode='free_only' AND status='available' AND storage_policy='metadata_only'
      ORDER BY priority ASC LIMIT 1`,
  ).bind(projectId, routeKey).first<SocialModelRoute>();
  if (!route || route.provider !== "cloudflare_workers_ai" || !route.model_id.startsWith("@cf/")) return null;
  return route;
}
