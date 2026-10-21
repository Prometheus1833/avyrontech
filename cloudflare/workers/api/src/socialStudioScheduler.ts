import type { Env } from "./types";
import { reserveAiCost } from "./aiCostGuard";
import { runAiCore } from "./aiCore";
import { resolveSocialModelRoute } from "./socialModelRouting";
import { contentExpiry, parseGeneratedContent } from "./aiProjectPolicy";
import { now } from "./security";
import { enqueueAudienceReviewRuns } from "./socialAudienceOptimizer";

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const DAY_MS = 86_400_000;
const SOCIAL_GENERATION_LEASE_MS = 15 * 60_000;
const SOCIAL_MAX_AUTOMATIC_ATTEMPTS = 3;
const DEFAULT_WEBSITE_SERVICE_URL = "https://avyron.ro/servicii/website-prezentare-profesional";
const ONLINE_STORE_SERVICE_URL = "https://avyron.ro/servicii/magazin-online";
const ONLINE_STORE_NICHES = ["producatori locali", "boutique retail", "handmade", "beauty", "HoReCa cu produse", "catalog B2B"];
const ONLINE_STORE_PROBLEMS = ["descoperirea produsului", "variantele", "stocul si livrarea", "filtrele", "cosul si checkout-ul", "confirmarea comenzii"];

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
  attempt_count: number;
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

const serviceFocusForDay = (clock: LocalClock, industry: string) => {
  const dayNumber = Math.floor(Date.UTC(clock.year, clock.month - 1, clock.day) / DAY_MS);
  if (dayNumber % 4 !== 0) return {
    key: "professional_website",
    label: "Website de prezentare",
    niche: industry,
    problem: "claritatea si increderea pe mobil",
    targetUrl: DEFAULT_WEBSITE_SERVICE_URL,
    cta: "Cere o cotație",
  };
  const niche = ONLINE_STORE_NICHES[Math.abs(dayNumber) % ONLINE_STORE_NICHES.length];
  const problem = ONLINE_STORE_PROBLEMS[Math.abs(dayNumber) % ONLINE_STORE_PROBLEMS.length];
  return {
    key: "online_store",
    label: "Magazin online",
    niche,
    problem,
    targetUrl: ONLINE_STORE_SERVICE_URL,
    cta: "Evaluează magazinul",
  };
};

const renderSpec = {
  preferredMasterPortrait: { width: 2160, height: 3840 },
  allow8kStillMasterOnlyWhenSourceSupports: true,
  nativeExport: { width: 1080, height: 1920 },
  forbidSyntheticUpscaleClaim: true,
  requiredMetadata: ["source_resolution", "master_resolution", "capture_or_generation_method", "native_export", "downsample_method", "compression", "fps", "artifact_verdict"],
};

const dueAtForSlot = (timestamp: number, currentMinutes: number, targetMinutes: number) =>
  timestamp - (currentMinutes - targetMinutes) * 60_000;

export function plannedSocialJobs(policy: SocialPolicy, timestamp = now()): PlannedJob[] {
  const clock = localClock(timestamp, policy.timezone);
  const slots = safeJsonObject(policy.time_slots_json);
  const industry = industryForDay(policy, clock);
  const service = serviceFocusForDay(clock, industry);
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
    `${service.label} pentru ${service.niche}: ${service.problem}`,
    {
      industry: service.niche, serviceFocus: service.key, businessProblem: service.problem,
      objective: "conversie si educatie", mediaRequired: true, platformVariants: true,
      serviceOfferVisible: true, websiteOfferVisible: service.key === "professional_website",
      linkRequired: true, targetUrl: service.targetUrl, conversionCta: service.cta,
      prohibitPrices: true, editorialMechanism: "information_gap",
      productionToolPlanRequired: true, realAssetsFirst: true, assetProvenanceRequired: true,
      visualQaPasses: ["editorial_factual", "visual_mobile", "native_conversion"],
      renderSpec,
    },
  );
  if (policy.daily_image_count > 0) append(
    "image", "daily_image", "post", "instagram", slotMinutes(slots, "image", "13:15"),
    `Concept vizual premium: ${service.label.toLowerCase()} pentru ${service.niche}`,
    {
      industry: service.niche, serviceFocus: service.key, businessProblem: service.problem,
      objective: "vizibilitate", mediaRequired: true, mediaKind: "image",
      visualStyle: "premium tech minimalist", productionToolPlanRequired: true,
      realAssetsFirst: true, criticalTextGeneratedInImage: false, assetProvenanceRequired: true,
      humanRealismChecks: ["anatomy", "hands", "reflections", "perspective", "screen_ui", "lighting"],
      outputQuality: "maximum_available", mobilePreviewRequired: true,
      renderSpec,
    },
  );
  append(
    "story", "story", "story", "instagram", slotMinutes(slots, "story", "20:15"),
    `Story scurt: ${service.problem} pentru ${service.niche}`,
    {
      industry: service.niche, serviceFocus: service.key, businessProblem: service.problem,
      objective: "comunitate", shortCopy: true, mediaRequired: true,
      canvas: { width: 1080, height: 1920 },
      safeZone: { top: 180, bottom: 250, left: 72, right: 72 },
      nativeLinkPreferred: true, defaultLink: service.targetUrl,
      targetUrl: service.targetUrl, frameCount: 3, storyMicrocopyRequired: true,
      storyCaptionRequiredWhenSupported: true, storyCaptionFallback: "unsupported",
      conversionFrameOptional: true, conversionCta: service.cta,
      conversionModes: ["native_organic_form", "verified_hosted_form", "link_sticker", "action_button"],
      formFields: ["name", "email"], formStatusRequired: true, privacyNoticeRequired: true,
      postStoryForm: true, actualFormOpensAfterTap: true, fakeInteractiveFieldsForbidden: true,
      formUx: { persistentLabels: true, minimumTouchTargetPx: 44, correctInputTypesAndAutocomplete: true, errorsAfterInteraction: true, loadingAndSuccessStates: true, doubleSubmitProtection: true, readBackTestRequired: true },
      survey: { eligibleIntents: ["diagnostic", "brief", "service_selection", "self_assessment"], publicRoot: "https://surveys.avyron.ro/", exactRouteAndSubmissionTestRequired: true, fallback: service.targetUrl },
      universalDomains: { allowedPatterns: ["*.test", "example.com", "example.org"], illustrativeOnly: true, neverConversionDestination: true },
      noLeadDataInCommentsPollsOrDm: true, freeOnly: true,
      productionToolPlanRequired: true, assetProvenanceRequired: true,
      maxInteractiveElements: 1, maxSecondaryAccents: 1,
      renderSpec,
    },
  );

  const dayNumber = Math.floor(Date.UTC(clock.year, clock.month - 1, clock.day) / DAY_MS);
  if (dayNumber % policy.reel_interval_days === 0) append(
    "reel", "reel", "reel", "tiktok", slotMinutes(slots, "reel", "18:15"),
    `Reel: ${service.problem} pentru ${service.niche}`,
    {
      industry: service.niche, serviceFocus: service.key, businessProblem: service.problem,
      targetUrl: service.targetUrl, conversionCta: service.cta,
      objective: "reach si conversie", serviceOfferVisible: true,
      websiteOfferVisible: service.key === "professional_website",
      nativeEffectsReview: true, mobileFinishRequired: true, captionsRequired: true,
      nativeVariants: ["instagram_reel", "facebook_reel", "tiktok"],
      productionToolPlanRequired: true, realAssetsFirst: true, assetProvenanceRequired: true,
      premiumTransitions: true, criticalTextGeneratedInImage: false,
      visualQaPasses: ["editorial_factual", "visual_mobile", "native_conversion"],
      renderSpec,
    },
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
const FACEBOOK_URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;
const PRICE_DETAIL_PATTERN = /(?:preț(?:ul|uri|urile)?|costă|\b(?:pret(?:ul|uri|urile)?|costa|costul|costuri|costurile|tarif(?:ul|e|ele)?|lei|ron|eur|usd)\b|[€$£]|\b\d[\d\s.,]*(?:lei|ron|eur|usd)\b)/iu;

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

export function removeSocialPriceDetails(caption: string) {
  return caption.split("\n").filter((line) => !PRICE_DETAIL_PATTERN.test(line))
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeInstagramCaptionLinks(caption: string, rawLink: unknown, includeLink = true) {
  const cleanCaption = caption.replace(FACEBOOK_URL_PATTERN, "").replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!includeLink) return cleanCaption;
  const canonicalLink = canonicalAvyronConversionUrl(rawLink);
  return `${cleanCaption}\n\nVezi serviciul: ${canonicalLink}\nLink în bio.`.trim();
}

const compactJson = (value: unknown, fallback: string, maxLength = 8_000) => {
  try {
    const encoded = JSON.stringify(value);
    return encoded.length <= maxLength ? encoded : fallback;
  } catch {
    return fallback;
  }
};

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
    let linkStrategy = ["native_clickable", "profile_link", "first_comment", "visible_fallback", "none"]
      .includes(String(item.linkStrategy)) ? String(item.linkStrategy) : "visible_fallback";
    const requestedLink = String(item.linkUrl || "").trim().slice(0, 1_000) || null;
    let linkUrl = requestedLink;
    if (linkUrl) {
      try { if (!/^https?:$/.test(new URL(linkUrl).protocol)) linkUrl = null; } catch { linkUrl = null; }
    }
    const safeZone = item.safeZone && typeof item.safeZone === "object" && !Array.isArray(item.safeZone)
      ? item.safeZone as Record<string, unknown> : {};
    const linkIsExpected = linkStrategy !== "none" && Boolean(requestedLink);
    const priceSafeCaption = removeSocialPriceDetails(String(item.caption || fallback.caption));
    const caption = channel === "facebook"
      ? sanitizeFacebookCaptionLinks(priceSafeCaption, requestedLink, linkIsExpected)
      : channel === "instagram"
        ? sanitizeInstagramCaptionLinks(priceSafeCaption, requestedLink, linkIsExpected)
        : priceSafeCaption.trim().slice(0, 8_000);
    if (linkIsExpected) linkUrl = canonicalAvyronConversionUrl(requestedLink);
    if (channel === "instagram" && linkIsExpected) linkStrategy = "profile_link";
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
      storyCaption: String(item.storyCaption || "").trim().slice(0, 1_200),
      toolPlanJson: compactJson(item.toolPlan, "[]"),
      assetProvenanceJson: compactJson(item.assetProvenance, "[]"),
      visualQaJson: compactJson(item.visualQa, "{}"),
      conversionJson: compactJson(item.conversion, "{}"),
      formUxJson: compactJson(item.formUx, "{}"),
      surveyJson: compactJson(item.survey, "{}"),
      renderSpecJson: compactJson(item.renderSpec, "{}"),
      universalDomainJson: compactJson(item.universalDomain, "{}"),
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
  const attemptNumber = Math.max(1, Number(job.attempt_count || 0) + 1);

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
  const jobBrief = safeJsonObject(job.brief_json);
  const targetUrl = canonicalAvyronConversionUrl(jobBrief.targetUrl || jobBrief.defaultLink);
  const prompt = [
    agent.system_prompt,
    agent.guardrails,
    "Returneaza exclusiv JSON valid cu cheile title, caption, visualDirection, cta, hashtags si variants.",
    "variants este un array; fiecare element are channel, caption, hashtags, cta, mediaBrief, altText, linkUrl, linkStrategy, nativeElements, safeZone, backgroundDirection, storyCaption, toolPlan, assetProvenance, visualQa, conversion, formUx, survey, renderSpec si universalDomain.",
    "toolPlan este o lista de etape cu stage, tool, purpose, input, output si fallback. Nu enumera instrumente fara rol real. assetProvenance declara provenienta fiecarui activ. visualQa consemneaza factualitatea, lizibilitatea mobila, safe-zone, anatomia, mainile, reflexiile, perspectiva, screen_ui, contrastul si verdictul.",
    "conversion declara mode, status, cta, fields, privacyNotice, targetUrl si separateApprovalRequired. Foloseste formularul scurt cu name si email numai daca este organic, gratuit si verificat; altfel status este unsupported sau awaiting_connection si folosesti linkul AVYRON verificat.",
    "formUx declara persistentLabels, inputTypes, autocomplete, touchTargetPx, validationTiming, loadingState, successState, doubleSubmitProtection, privacyUrl, submissionTest si readBackTest. Formularul real se deschide dupa tap; nu desena inputuri false in asset.",
    "survey declara eligibility, exactPublicUrl, questionCount, publicSessionTest, submissionTest si fallbackUrl. Foloseste https://surveys.avyron.ro/ numai pentru diagnostic, brief, selectie de serviciu sau autoevaluare si numai cu o ruta publica exacta verificata.",
    "renderSpec declara sourceResolution, masterResolution, captureOrGenerationMethod, nativeExport, downsampleMethod, compression, fps si artifactVerdict. 4K/8K inseamna master real; nu numi 4K/8K un upscale al unei surse slabe.",
    "universalDomain poate folosi numai un domeniu neutru .test sau example.com ca decor ilustrativ. Nu il prezenta drept client, proiect publicat ori destinatie de conversie.",
    "linkStrategy este una dintre native_clickable, profile_link, first_comment, visible_fallback sau none. nativeElements descrie numai functii disponibile nativ pe canal.",
    `Destinatia unica de conversie pentru acest job este ${targetUrl}. Nu folosi homepage-ul, un demo, preview sau un domeniu extern in locul paginii exacte.`,
    "Nu include preturi, tarife, reduceri, termene comerciale sau alte detalii de pret in descrieri.",
    "Pentru Facebook pune exact un singur URL canonic clicabil, pe linie separata, fara query, fragment sau UTM vizibil.",
    "Pentru Instagram afiseaza URL-ul exact in descriere si spune corect «Link în bio»; seteaza linkStrategy=profile_link si nu pretinde ca URL-ul din caption este clicabil.",
    `Proiect: ${project.name}. Ton: ${project.brand_tone}.`,
    `Audienta: ${project.target_audience}. Oferta: ${project.core_offer}.`,
    `Reguli proiect: ${project.agent_instructions}.`,
    `Job: ${job.kind}; format: ${job.format}; subiect: ${job.topic}; canale: ${channels.join(", ")}.`,
    `Brief: ${job.brief_json}.`,
    designProfile?.profile_json ? `Profil de design aprobat: ${designProfile.profile_json}.` : "Aplica design premium, minimalist si verificare mobila.",
    job.format === "story" ? `Livreaza trei cadre distincte cu story_microcopy separat: recunoastere, mecanism/dovada si actiune/conversie. Adauga storyCaption specific atunci cand canalul suporta descriere; altfel scrie exact unsupported. Protejeaza zonele platformei. Cadrul final poate promite un formular scurt name plus email, dar formularul real trebuie sa se deschida dupa tap prin sticker, action button sau ${targetUrl}; nu desena un formular fals si nu cere date in comentarii, poll sau DM. Aspectul unui formular dintr-un Story sponsorizat nu este dovada unei functii organice gratuite.` : "",
    job.format === "reel" ? "Livreaza variante native distincte pentru Instagram Reel, Facebook Reel si TikTok, cu 5-8 cadre pentru 15-30 secunde, capturi reale sau scene universale credibile, tranzitii fluide, subtitrari, coperta, audio nativ Business si finisare separata in fiecare platforma." : "",
    job.format === "article" ? "Scrie un articol original, editorial, jurnalistic si uman, cu titlu SEO, introducere, subtitluri, concluzie si CTA discret. Nu publica." : "",
    job.format === "post" || job.format === "reel" ? `Fiecare varianta de feed foloseste intre ${policy?.tag_min || 5} si ${policy?.tag_max || 10} hashtaguri relevante, fara umplutura.` : "",
    sources.results.length ? `Surse aprobate:\n${sources.results.map((source) => `- ${source.source_label}: ${source.title}; ${source.insight}; ${source.canonical_url || "fara URL"}`).join("\n")}` : "Surse aprobate: nu exista. Evita afirmatiile despre tendinte si performanta altora.",
    memories.results.length ? `Memorie aprobata:\n${memories.results.map((memory) => `- ${memory.kind}: ${memory.summary}`).join("\n")}` : "Memorie aprobata: indisponibila. Nu inventa date.",
  ].filter(Boolean).join("\n\n");

  const route = await resolveSocialModelRoute(env.DB, job.project_id, job.kind);
  if (!route) {
    await env.DB.prepare("UPDATE ai_social_jobs SET status='awaiting_budget',last_error_code='free_model_route_unavailable',updated_at=? WHERE id=?")
      .bind(now(), job.id).run();
    return;
  }
  const maxTokens = Math.max(400, Math.min(
    job.format === "article" ? 1_800 : 1_200,
    agent.max_tokens,
    route.max_output_tokens || agent.max_tokens,
  ));
  const reservation = await reserveAiCost({
    db: env.DB,
    agentSlug: agent.slug,
    vendorId: "fin_vendor_cloudflare_ai",
    operation: `social_model_${route.route_key}`,
    requestedUnits: Math.max(1, Math.ceil(prompt.length / 4)) + maxTokens,
    estimatedCostMinor: 0,
    idempotencyKey: `social-job:${job.id}:attempt:${attemptNumber}`,
    projectId: job.project_id,
  });
  if (reservation.decision !== "allowed") {
    await env.DB.prepare("UPDATE ai_social_jobs SET status='awaiting_budget',last_error_code=?,updated_at=? WHERE id=?")
      .bind(reservation.reason, now(), job.id).run();
    return;
  }

  try {
    const core = await runAiCore({
      env, agentSlug: agent.slug, operation: `social_model_${route.route_key}`,
      idempotencyKey: `social-job:${job.id}:attempt:${attemptNumber}`, projectId: job.project_id,
      promptCharacters: prompt.length + 50,
      tier: job.format === "article" ? "special" : "normal", requestedMaxTokens: maxTokens,
      financialReserved: true,
      priority: "background",
      input: {
        temperature: Math.max(0, Math.min(0.7, agent.temperature || 0.4)),
        messages: [{ role: "system", content: prompt }, { role: "user", content: "Creeaza ciorna programata si variantele native." }],
      },
    });
    const output = core.output as { response?: string };
    const raw = String(output?.response || "").trim();
    if (!raw) throw new Error("empty_model_response");
    const generated = parseGeneratedContent(raw);
    const priceSafeGenerated = { ...generated, caption: removeSocialPriceDetails(generated.caption) };
    if (!priceSafeGenerated.caption) throw new Error("invalid_model_output");
    const variants = parseVariants(raw, priceSafeGenerated);
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
        priceSafeGenerated.title, priceSafeGenerated.caption, priceSafeGenerated.visualDirection, priceSafeGenerated.cta,
        JSON.stringify(priceSafeGenerated.hashtags.slice(0, 10)), contentExpiry(completedAt, project.content_retention_days),
        completedAt, completedAt,
      ),
      ...variants.map((variant) => env.DB.prepare(
        `INSERT INTO ai_social_variants
          (id,content_id,channel,caption,hashtags_json,media_brief,accessibility_alt,cta,
           link_url,link_strategy,native_elements_json,safe_zone_json,background_direction,
           story_caption,tool_plan_json,asset_provenance_json,visual_qa_json,conversion_json,
           form_ux_json,survey_json,render_spec_json,universal_domain_json,
           status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'draft',?,?)`,
      ).bind(
        identifier("asv"), contentId, variant.channel, variant.caption,
        JSON.stringify(variant.hashtags), variant.mediaBrief, variant.altText, variant.cta,
        variant.linkUrl, variant.linkStrategy, JSON.stringify(variant.nativeElements),
        JSON.stringify(variant.safeZone), variant.backgroundDirection,
        variant.storyCaption, variant.toolPlanJson, variant.assetProvenanceJson,
        variant.visualQaJson, variant.conversionJson,
        variant.formUxJson, variant.surveyJson, variant.renderSpecJson, variant.universalDomainJson,
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

export async function recoverStaleSocialGenerationJobs(env: Pick<Env, "DB">, timestamp = now()) {
  const staleBefore = timestamp - SOCIAL_GENERATION_LEASE_MS;
  const failed = await env.DB.prepare(
    `UPDATE ai_social_jobs
        SET status='failed',last_error_code='stale_generation_attempts_exhausted',updated_at=?
      WHERE status='generating' AND updated_at<=? AND attempt_count>=?`,
  ).bind(timestamp, staleBefore, SOCIAL_MAX_AUTOMATIC_ATTEMPTS).run();
  const requeued = await env.DB.prepare(
    `UPDATE ai_social_jobs
        SET status='queued',last_error_code='stale_generation_requeued',updated_at=?
      WHERE status='generating' AND updated_at<=? AND attempt_count<?`,
  ).bind(timestamp, staleBefore, SOCIAL_MAX_AUTOMATIC_ATTEMPTS).run();
  return {
    requeued: Number(requeued.meta.changes || 0),
    failed: Number(failed.meta.changes || 0),
  };
}

export async function runSocialStudioScheduler(env: Env, timestamp = now()) {
  const [created, audienceCreated, recovered] = await Promise.all([
    enqueueDueJobs(env, timestamp),
    enqueueAudienceReviewRuns(env, timestamp),
    recoverStaleSocialGenerationJobs(env, timestamp),
  ]);
  const due = await env.DB.prepare(
    `SELECT id,project_id,kind,format,primary_channel,topic,brief_json,due_at,attempt_count
       FROM ai_social_jobs WHERE status='queued' AND due_at<=?
      ORDER BY due_at ASC LIMIT 3`,
  ).bind(timestamp).all<JobRow>();
  for (const job of due.results) await generateJobDraft(env, job, timestamp);
  return { created, processed: due.results.length, audienceCreated, recovered };
}
