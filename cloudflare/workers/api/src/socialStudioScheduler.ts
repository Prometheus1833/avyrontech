import type { Env } from "./types";
import { reserveAiCost } from "./aiCostGuard";
import { resolveAgentModel } from "./agentRuntimePolicy";
import { contentExpiry, parseGeneratedContent } from "./aiProjectPolicy";
import { now } from "./security";
import { enqueueAudienceReviewRuns } from "./socialAudienceOptimizer";

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const DAY_MS = 86_400_000;

export type SocialPolicy = {
  project_id: string;
  timezone: string;
  daily_post_count: number;
  daily_image_count: number;
  reel_interval_days: number;
  weekly_article_weekday: number;
  weekly_article_hour: number;
  weekly_article_minute: number;
  engagement_interval_minutes: number;
  story_like_target: number;
  feed_like_target: number;
  time_slots_json: string;
  channel_priority_json: string;
  industry_rotation_json: string;
};

type LocalClock = {
  date: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
  minutes: number;
};

type PlannedJob = {
  key: string;
  kind: "daily_post" | "daily_image" | "story" | "reel" | "weekly_article" | "engagement_review";
  format: "post" | "story" | "reel" | "article" | "engagement";
  channel: "multi" | "instagram" | "tiktok" | "blog";
  topic: string;
  brief: Record<string, unknown>;
  dueAt: number;
};

type JobRow = {
  id: string;
  project_id: string;
  kind: PlannedJob["kind"];
  format: PlannedJob["format"];
  primary_channel: string;
  topic: string;
  brief_json: string;
  due_at: number;
};

type ProjectRow = {
  id: string;
  name: string;
  brand_tone: string;
  target_audience: string;
  core_offer: string;
  agent_instructions: string;
  content_retention_days: number;
};

type AgentRow = {
  slug: string;
  version_id: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  guardrails: string;
};

const safeJsonArray = (raw: string, fallback: string[]) => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : fallback;
  } catch {
    return fallback;
  }
};

const safeJsonObject = (raw: string) => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};

const localClock = (timestamp: number, timezone: string): LocalClock => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    year,
    month,
    day,
    weekday: weekdays[parts.weekday] || 1,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const slotMinutes = (slots: Record<string, unknown>, key: string, fallback: string) => {
  const raw = typeof slots[key] === "string" ? String(slots[key]) : fallback;
  const match = /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return slotMinutes({}, "", fallback);
  return Math.min(1_439, Number(match[1]) * 60 + Number(match[2]));
};

const industryForDay = (policy: SocialPolicy, clock: LocalClock) => {
  const industries = safeJsonArray(policy.industry_rotation_json, ["servicii-profesionale"]);
  const dayNumber = Math.floor(Date.UTC(clock.year, clock.month - 1, clock.day) / DAY_MS);
  return industries[Math.abs(dayNumber) % Math.max(1, industries.length)] || "servicii-profesionale";
};

const dueAtForSlot = (timestamp: number, currentMinutes: number, targetMinutes: number) =>
  timestamp - (currentMinutes - targetMinutes) * 60_000;

export function plannedSocialJobs(policy: SocialPolicy, timestamp = now()): PlannedJob[] {
  const clock = localClock(timestamp, policy.timezone);
  const slots = safeJsonObject(policy.time_slots_json);
  const industry = industryForDay(policy, clock);
  const jobs: PlannedJob[] = [];
  const append = (
    suffix: string,
    kind: PlannedJob["kind"],
    format: PlannedJob["format"],
    channel: PlannedJob["channel"],
    targetMinutes: number,
    topic: string,
    brief: Record<string, unknown>,
  ) => {
    if (clock.minutes < targetMinutes) return;
    jobs.push({
      key: `${policy.project_id}:${clock.date}:${suffix}`,
      kind,
      format,
      channel,
      topic,
      brief,
      dueAt: dueAtForSlot(timestamp, clock.minutes, targetMinutes),
    });
  };

  if (policy.daily_post_count > 0) append(
    "post", "daily_post", "post", "multi", slotMinutes(slots, "post", "10:15"),
    `Website de prezentare pentru ${industry}`,
    { industry, objective: "conversie si educatie", mediaRequired: true, platformVariants: true, websiteOfferVisible: true, linkRequired: true },
  );
  if (policy.daily_image_count > 0) append(
    "image", "daily_image", "post", "instagram", slotMinutes(slots, "image", "13:15"),
    `Concept vizual premium pentru ${industry}`,
    { industry, objective: "vizibilitate", mediaRequired: true, mediaKind: "image", visualStyle: "premium tech minimalist" },
  );
  append(
    "story", "story", "story", "instagram", slotMinutes(slots, "story", "20:15"),
    `Story scurt: o decizie digitala utila pentru ${industry}`,
    {
      industry, objective: "comunitate", shortCopy: true, mediaRequired: true,
      canvas: { width: 1080, height: 1920 },
      safeZone: { top: 180, bottom: 250, left: 72, right: 72 },
      nativeLinkPreferred: true, defaultLink: "https://avyron.ro",
      maxInteractiveElements: 1, maxSecondaryAccents: 1,
    },
  );

  const dayNumber = Math.floor(Date.UTC(clock.year, clock.month - 1, clock.day) / DAY_MS);
  if (dayNumber % policy.reel_interval_days === 0) append(
    "reel", "reel", "reel", "tiktok", slotMinutes(slots, "reel", "18:15"),
    `Reel: transformarea prezentei digitale pentru ${industry}`,
    { industry, objective: "reach si conversie", websiteOfferVisible: true, nativeEffectsReview: true, mobileFinishRequired: true, captionsRequired: true },
  );

  if (clock.weekday === policy.weekly_article_weekday) append(
    "article", "weekly_article", "article", "blog",
    policy.weekly_article_hour * 60 + policy.weekly_article_minute,
    "Articol editorial AVYRON despre activitatea agentiei si noutatile relevante din industrie",
    { objective: "trafic calificat si autoritate", recentSourcesRequired: true, journalistic: true, socialDistribution: true },
  );

  const interval = policy.engagement_interval_minutes;
  const bucket = Math.floor(clock.minutes / interval);
  const bucketStart = bucket * interval;
  append(
    `engagement-${bucket}`, "engagement_review", "engagement", "multi", bucketStart,
    "Revizuire oportunitati business din comentarii, story-uri si feed",
    {
      businessOnly: true,
      actionsAreProposals: true,
      storyLikeTarget: policy.story_like_target,
      feedLikeTarget: policy.feed_like_target,
      leadHandoff: true,
    },
  );

  return jobs;
}

async function enqueueDueJobs(env: Env, timestamp: number) {
  const policies = await env.DB.prepare(
    `SELECT policy.* FROM ai_social_policies policy
      JOIN ai_projects project ON project.id=policy.project_id
     WHERE policy.status='active' AND project.status='active'`,
  ).all<SocialPolicy>();
  let created = 0;
  for (const policy of policies.results) {
    const jobs = plannedSocialJobs(policy, timestamp);
    for (const job of jobs) {
      const result = await env.DB.prepare(
        `INSERT OR IGNORE INTO ai_social_jobs
          (id,project_id,schedule_key,kind,format,primary_channel,topic,brief_json,status,due_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?, 'queued',?,?,?)`,
      ).bind(
        identifier("asj"), policy.project_id, job.key, job.kind, job.format,
        job.channel, job.topic, JSON.stringify(job.brief), job.dueAt, timestamp, timestamp,
      ).run();
      created += Number(result.meta.changes || 0);
    }
    await env.DB.prepare("UPDATE ai_social_policies SET last_planned_at=?,updated_at=? WHERE project_id=?")
      .bind(timestamp, timestamp, policy.project_id).run();
  }
  return created;
}

const allowedChannels = new Set(["facebook", "instagram", "tiktok", "threads", "linkedin", "whatsapp", "messenger", "blog"]);
const DEFAULT_WEBSITE_SERVICE_URL = "https://avyron.ro/servicii/website-prezentare-profesional";
const FACEBOOK_URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;

export function canonicalAvyronConversionUrl(raw: unknown, fallback = DEFAULT_WEBSITE_SERVICE_URL) {
  const candidate = String(raw || "").trim();
  try {
    const url = new URL(candidate || fallback);
    if (!["avyron.ro", "www.avyron.ro"].includes(url.hostname.toLowerCase())) return fallback;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path.startsWith("/exemple") || path.startsWith("/examples")) return fallback;
    if (!["/", "/servicii", "/produse", "/blog"].some((root) => path === root || (root !== "/" && path.startsWith(`${root}/`)))) {
      return fallback;
    }
    return `https://avyron.ro${path}`;
  } catch {
    return fallback;
  }
}

export function sanitizeFacebookCaptionLinks(caption: string, rawLink: unknown, includeLink = true) {
  const canonicalLink = canonicalAvyronConversionUrl(rawLink);
  const cleanCaption = caption.replace(FACEBOOK_URL_PATTERN, "").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return includeLink ? `${cleanCaption}\n\n${canonicalLink}`.trim() : cleanCaption;
}

function parseVariants(raw: string, fallback: ReturnType<typeof parseGeneratedContent>) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(cleaned) as Record<string, unknown>; } catch { return []; }
  if (!Array.isArray(parsed.variants)) return [];
  return parsed.variants.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    const channel = String(item.channel || "").toLowerCase();
    if (!allowedChannels.has(channel)) return [];
    const hashtags = Array.isArray(item.hashtags)
      ? [...new Set(item.hashtags.filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().replace(/^#/, "").slice(0, 60)).filter(Boolean))].slice(0, 10)
      : fallback.hashtags.slice(0, 10);
    const nativeElements = Array.isArray(item.nativeElements)
      ? [...new Set(item.nativeElements.filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().slice(0, 80)).filter(Boolean))].slice(0, 8)
      : [];
    const linkStrategy = ["native_clickable", "profile_link", "first_comment", "visible_fallback", "none"]
      .includes(String(item.linkStrategy)) ? String(item.linkStrategy) : "visible_fallback";
    const requestedLink = String(item.linkUrl || "").trim().slice(0, 1_000) || null;
    let linkUrl = requestedLink;
    if (linkUrl) {
      try { if (!/^https?:$/.test(new URL(linkUrl).protocol)) linkUrl = null; } catch { linkUrl = null; }
    }
    const safeZone = item.safeZone && typeof item.safeZone === "object" && !Array.isArray(item.safeZone)
      ? item.safeZone as Record<string, unknown> : {};
    const linkIsExpected = linkStrategy !== "none" && Boolean(requestedLink);
    const caption = channel === "facebook"
      ? sanitizeFacebookCaptionLinks(String(item.caption || fallback.caption), requestedLink, linkIsExpected)
      : String(item.caption || fallback.caption).trim().slice(0, 8_000);
    if (channel === "facebook" && linkIsExpected) linkUrl = canonicalAvyronConversionUrl(requestedLink);
    return [{
      channel,
      caption: caption.slice(0, 8_000),
      hashtags,
      mediaBrief: String(item.mediaBrief || fallback.visualDirection).trim().slice(0, 2_000),
      altText: String(item.altText || "").trim().slice(0, 500),
      cta: String(item.cta || fallback.cta).trim().slice(0, 500),
      linkUrl,
      linkStrategy,
      nativeElements,
      safeZone,
      backgroundDirection: String(item.backgroundDirection || "").trim().slice(0, 1_000),
    }];
  });
}

async function generateJobDraft(env: Env, job: JobRow, timestamp: number) {
  if (job.format === "engagement") {
    await env.DB.prepare("UPDATE ai_social_jobs SET status='awaiting_approval',updated_at=? WHERE id=?")
      .bind(timestamp, job.id).run();
    return;
  }
  if (!env.AI) {
    await env.DB.prepare("UPDATE ai_social_jobs SET status='failed',last_error_code='workers_ai_unavailable',updated_at=? WHERE id=?")
      .bind(timestamp, job.id).run();
    return;
  }
  const claimed = await env.DB.prepare(
    "UPDATE ai_social_jobs SET status='generating',attempt_count=attempt_count+1,updated_at=? WHERE id=? AND status='queued'",
  ).bind(timestamp, job.id).run();
  if (!claimed.meta.changes) return;

  const project = await env.DB.prepare(
    `SELECT id,name,brand_tone,target_audience,core_offer,agent_instructions,content_retention_days
       FROM ai_projects WHERE id=?`,
  ).bind(job.project_id).first<ProjectRow>();
  const agent = await env.DB.prepare(
    `SELECT registry.slug,version.id version_id,version.model,version.temperature,version.max_tokens,
            version.system_prompt,version.guardrails
       FROM ai_agents registry JOIN ai_agent_versions version
         ON version.agent_slug=registry.slug AND version.version=registry.current_version
      WHERE registry.slug='ai-prod-content' AND registry.status='active' AND version.status='approved'`,
  ).first<AgentRow>();
  if (!project || !agent) {
    await env.DB.prepare("UPDATE ai_social_jobs SET status='failed',last_error_code='agent_not_ready',updated_at=? WHERE id=?")
      .bind(timestamp, job.id).run();
    return;
  }

  const [sources, memories, policy, designProfile] = await Promise.all([
    env.DB.prepare(
      `SELECT kind,title,source_label,canonical_url,insight,evidence_json FROM ai_social_sources
        WHERE project_id=? AND status='approved' AND (expires_at IS NULL OR expires_at>?)
        ORDER BY observed_at DESC LIMIT 10`,
    ).bind(job.project_id, timestamp).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT kind,summary,source_url FROM ai_project_memories
        WHERE project_id=? AND status='approved' AND expires_at>?
        ORDER BY confidence DESC,observed_at DESC LIMIT 8`,
    ).bind(job.project_id, timestamp).all<Record<string, unknown>>(),
    env.DB.prepare("SELECT tag_min,tag_max,channel_priority_json FROM ai_social_policies WHERE project_id=?")
      .bind(job.project_id).first<{ tag_min: number; tag_max: number; channel_priority_json: string }>(),
    env.DB.prepare(
      "SELECT profile_json FROM ai_social_design_profiles WHERE project_id=? AND status='approved' ORDER BY version DESC LIMIT 1",
    ).bind(job.project_id).first<{ profile_json: string }>(),
  ]);
  const channels = job.primary_channel === "multi"
    ? safeJsonArray(policy?.channel_priority_json || "[]", ["instagram", "facebook", "linkedin", "threads"])
    : job.primary_channel === "blog"
      ? ["blog", "linkedin", "facebook", "threads"]
      : [job.primary_channel];
  const prompt = [
    agent.system_prompt,
    agent.guardrails,
    "Returneaza exclusiv JSON valid cu cheile title, caption, visualDirection, cta, hashtags si variants.",
    "variants este un array; fiecare element are channel, caption, hashtags, cta, mediaBrief, altText, linkUrl, linkStrategy, nativeElements, safeZone si backgroundDirection.",
    "linkStrategy este una dintre native_clickable, profile_link, first_comment, visible_fallback sau none. nativeElements descrie numai functii disponibile nativ pe canal.",
    "Pentru Facebook foloseste maximum un URL canonic, scurt, fara query, fragment sau UTM vizibil. Sunt permise numai avyron.ro, pagina serviciilor, serviciul exact, produsul exact sau articolul relevant. Nu folosi URL-uri de exemple/demo ori domenii externe ca destinatie de conversie. Daca nu exista o destinatie mai exacta, foloseste https://avyron.ro/servicii/website-prezentare-profesional.",
    `Proiect: ${project.name}. Ton: ${project.brand_tone}.`,
    `Audienta: ${project.target_audience}. Oferta: ${project.core_offer}.`,
    `Reguli proiect: ${project.agent_instructions}.`,
    `Job: ${job.kind}; format: ${job.format}; subiect: ${job.topic}; canale: ${channels.join(", ")}.`,
    `Brief: ${job.brief_json}.`,
    designProfile?.profile_json ? `Profil de design aprobat: ${designProfile.profile_json}.` : "Aplica design premium, minimalist si verificare mobila.",
    job.format === "story" ? "Textul Story trebuie sa fie scurt, tematic si usor de citit. Protejeaza zonele platformei si prefera stickerul nativ de link catre https://avyron.ro." : "",
    job.format === "article" ? "Scrie un articol original, editorial, jurnalistic si uman, cu titlu SEO, introducere, subtitluri, concluzie si CTA discret. Nu publica." : "",
    job.format === "post" || job.format === "reel" ? `Fiecare varianta de feed foloseste intre ${policy?.tag_min || 5} si ${policy?.tag_max || 10} hashtaguri relevante, fara umplutura.` : "",
    sources.results.length ? `Surse aprobate:\n${sources.results.map((source) => `- ${source.source_label}: ${source.title}; ${source.insight}; ${source.canonical_url || "fara URL"}`).join("\n")}` : "Surse aprobate: nu exista. Evita afirmatiile despre tendinte si performanta altora.",
    memories.results.length ? `Memorie aprobata:\n${memories.results.map((memory) => `- ${memory.kind}: ${memory.summary}`).join("\n")}` : "Memorie aprobata: indisponibila. Nu inventa date.",
  ].filter(Boolean).join("\n\n");

  const maxTokens = Math.max(400, Math.min(job.format === "article" ? 1_800 : 1_200, agent.max_tokens));
  const reservation = await reserveAiCost({
    db: env.DB,
    agentSlug: agent.slug,
    vendorId: "fin_vendor_cloudflare_ai",
    operation: "social_studio_scheduled_draft",
    requestedUnits: Math.max(1, Math.ceil(prompt.length / 4)) + maxTokens,
    estimatedCostMinor: 0,
    idempotencyKey: `social-job:${job.id}`,
    projectId: job.project_id,
  });
  if (reservation.decision !== "allowed") {
    await env.DB.prepare("UPDATE ai_social_jobs SET status='awaiting_budget',last_error_code=?,updated_at=? WHERE id=?")
      .bind(reservation.reason, now(), job.id).run();
    return;
  }

  try {
    const output = await env.AI.run(resolveAgentModel(agent.model), {
      max_tokens: maxTokens,
      temperature: Math.max(0, Math.min(0.7, agent.temperature || 0.4)),
      messages: [{ role: "system", content: prompt }, { role: "user", content: "Creeaza ciorna programata si variantele native." }],
    }) as { response?: string };
    const raw = String(output?.response || "").trim();
    if (!raw) throw new Error("empty_model_response");
    const generated = parseGeneratedContent(raw);
    if (!generated.caption) throw new Error("invalid_model_output");
    const variants = parseVariants(raw, generated);
    const contentId = identifier("aic");
    const completedAt = now();
    const format = job.format === "article" ? "article" : job.format === "story" ? "story" : job.format === "reel" ? "reel" : "post";
    const objective = job.kind === "weekly_article" ? "visibility" : job.kind === "story" ? "community" : "sales";
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO ai_content_items
          (id,project_id,generated_by_agent,format,objective,channels_json,title,caption,
           visual_direction,cta,hashtags_json,status,expires_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?)`,
      ).bind(
        contentId, job.project_id, agent.slug, format, objective, JSON.stringify(channels),
        generated.title, generated.caption, generated.visualDirection, generated.cta,
        JSON.stringify(generated.hashtags.slice(0, 10)), contentExpiry(completedAt, project.content_retention_days),
        completedAt, completedAt,
      ),
      ...variants.map((variant) => env.DB.prepare(
        `INSERT INTO ai_social_variants
          (id,content_id,channel,caption,hashtags_json,media_brief,accessibility_alt,cta,
           link_url,link_strategy,native_elements_json,safe_zone_json,background_direction,
           status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'draft',?,?)`,
      ).bind(
        identifier("asv"), contentId, variant.channel, variant.caption,
        JSON.stringify(variant.hashtags), variant.mediaBrief, variant.altText, variant.cta,
        variant.linkUrl, variant.linkStrategy, JSON.stringify(variant.nativeElements),
        JSON.stringify(variant.safeZone), variant.backgroundDirection,
        completedAt, completedAt,
      )),
      env.DB.prepare(
        "UPDATE ai_social_jobs SET status='draft_ready',content_id=?,last_error_code=NULL,updated_at=? WHERE id=?",
      ).bind(contentId, completedAt, job.id),
      env.DB.prepare(
        `INSERT INTO ai_project_events
          (id,project_id,action,target_type,target_id,metadata_json,created_at)
         VALUES (?,?,'social_studio.draft.generated','ai_content',?,?,?)`,
      ).bind(identifier("aipe"), job.project_id, contentId, JSON.stringify({ jobId: job.id, kind: job.kind }), completedAt),
    ]);
  } catch (error) {
    await env.DB.prepare("UPDATE ai_social_jobs SET status='failed',last_error_code=?,updated_at=? WHERE id=?")
      .bind(String((error as Error).message).slice(0, 120), now(), job.id).run();
  }
}

export async function runSocialStudioScheduler(env: Env, timestamp = now()) {
  const [created, audienceCreated] = await Promise.all([
    enqueueDueJobs(env, timestamp),
    enqueueAudienceReviewRuns(env, timestamp),
  ]);
  const due = await env.DB.prepare(
    `SELECT id,project_id,kind,format,primary_channel,topic,brief_json,due_at
       FROM ai_social_jobs WHERE status='queued' AND due_at<=?
      ORDER BY due_at ASC LIMIT 3`,
  ).bind(timestamp).all<JobRow>();
  for (const job of due.results) await generateJobDraft(env, job, timestamp);
  return { created, processed: due.results.length, audienceCreated };
}
