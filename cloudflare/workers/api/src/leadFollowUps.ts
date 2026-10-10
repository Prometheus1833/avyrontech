import { AiCoreError, runAiCore } from "./aiCore";
import { now } from "./security";
import type { Env } from "./types";

const HOUR = 60 * 60 * 1_000;
const DAY = 24 * HOUR;
const FIRST_FOLLOW_UP_DELAY = 48 * HOUR;
const FINAL_FOLLOW_UP_DELAY = 7 * DAY;
const DRAFT_RETENTION = 14 * DAY;

type Candidate = {
  id: string;
  name: string | null;
  business: string | null;
  product: string | null;
  message: string | null;
  phone: string | null;
  email: string | null;
  first_response_at: number;
};

type DraftRow = Candidate & { draft_id: string; due_at: number; attempt_count: number; sequence: 1 | 2 };

type GeneratedDraft = { whatsappBody: string | null; emailSubject: string | null; emailBody: string | null };
export type FollowUpRevisionSection = "whatsapp" | "email";

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const shortName = (value: string | null) => value?.trim().split(/\s+/)[0]?.slice(0, 80) || "";
const safeProduct = (value: string | null) => value?.trim().slice(0, 160) || "serviciul solicitat";

function fallbackDraft(row: Candidate & { sequence?: 1 | 2 }): GeneratedDraft {
  const salutation = shortName(row.name) ? `Bună, ${shortName(row.name)}!` : "Bună!";
  const product = safeProduct(row.product);
  const intro = row.sequence === 2
    ? `Revin pentru ultima dată legat de solicitarea transmisă prin platforma Necesit pentru ${product}. Dacă proiectul nu mai este actual, este suficient să ne spuneți și închidem revenirea.`
    : `Revin legat de solicitarea transmisă prin platforma Necesit pentru ${product}. Vreau doar să verific dacă proiectul mai este actual, dacă solicitarea a fost trimisă din greșeală sau dacă ar fi utilă o explicație mai clară despre ce poate include serviciul.`;
  return {
    whatsappBody: row.phone ? [
      salutation,
      intro,
      "Doriți să vă explic pe scurt direcția potrivită pentru activitatea dumneavoastră?",
      "Cu drag,\nEchipa avyron.ro\n0734 605 055\navyrontech@gmail.com",
    ].join("\n\n") : null,
    emailSubject: row.email ? `Revenire solicitare Necesit – ${product}` : null,
    emailBody: row.email ? [
      salutation,
      intro,
      "Este posibil ca solicitarea să fi fost transmisă din greșeală sau ca serviciul să necesite câteva clarificări înainte de a decide dacă este potrivit. Putem contura concis obiectivul, structura și funcțiile relevante pentru activitatea dumneavoastră, fără a vă încărca cu detalii inutile.",
      "Doriți să vă trimitem o explicație scurtă, adaptată proiectului dumneavoastră?",
      "Cu drag,\nEchipa avyron.ro\n0734 605 055\navyrontech@gmail.com\nhttps://avyron.ro",
    ].join("\n\n") : null,
  };
}

function extractJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>; } catch { return null; }
  }
}

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) || null : null;

async function generateDraft(env: Env, row: DraftRow): Promise<GeneratedDraft & { model: string }> {
  const fallback = fallbackDraft(row);
  const cadence = row.sequence === 2
    ? "Aceasta este ultima revenire permisă, în ziua 7. Spune clar și fără presiune că nu vom mai reveni dacă proiectul nu este actual."
    : "Aceasta este prima revenire permisă, la aproximativ 48 de ore.";
  const prompt = [
    `Ești AVY Leads. Redactează revenirea ${row.sequence} pentru un lead Necesit fără răspuns.`,
    cadence,
    "Returnează exclusiv JSON valid cu cheile whatsappBody, emailSubject și emailBody.",
    "Mesajele trebuie să continue natural contactul inițial, să menționeze platforma Necesit și să verifice politicos dacă proiectul mai este actual, dacă solicitarea a fost greșită sau dacă serviciul necesită clarificări.",
    "Folosește o singură întrebare principală pe canal. Nu comunica prețuri, reduceri, termene, contracte, garanții ori rezultate promise. Nu inventa detalii.",
    "WhatsApp: compact, uman, încheiat cu Cu drag, Echipa avyron.ro, 0734 605 055 și avyrontech@gmail.com.",
    "E-mail: subiect specific, paragrafe scurte, mai complet decât WhatsApp, o singură invitație la dialog și semnătura AVYRON cu https://avyron.ro.",
    `Nume verificat: ${row.name || "indisponibil"}. Afacere: ${row.business || "indisponibilă"}. Produs: ${safeProduct(row.product)}.`,
    row.message ? `Rezumatul cererii: ${row.message.slice(0, 600)}.` : "Nu există un rezumat suplimentar verificat.",
    `Canale disponibile: ${[row.phone ? "WhatsApp" : "", row.email ? "e-mail" : ""].filter(Boolean).join(", ")}.`,
  ].join("\n\n");
  try {
    const core = await runAiCore({
      env,
      agentSlug: "leads",
      operation: row.sequence === 1 ? "necesit_follow_up_48h" : "necesit_follow_up_day_7",
      idempotencyKey: `lead-follow-up:${row.draft_id}`,
      promptCharacters: prompt.length,
      tier: "default",
      requestedMaxTokens: 520,
      priority: "important",
      input: {
        temperature: 0.2,
        messages: [{ role: "system", content: prompt }, { role: "user", content: "Pregătește ciornele." }],
      },
    });
    const output = core.output as { response?: unknown };
    const parsed = extractJson(String(output?.response || ""));
    if (!parsed) throw new Error("invalid_model_output");
    return {
      whatsappBody: row.phone ? text(parsed.whatsappBody, 1200) || fallback.whatsappBody : null,
      emailSubject: row.email ? text(parsed.emailSubject, 200) || fallback.emailSubject : null,
      emailBody: row.email ? text(parsed.emailBody, 5000) || fallback.emailBody : null,
      model: core.model,
    };
  } catch {
    return { ...fallback, model: "deterministic_free_fallback" };
  }
}

export async function reviseLeadFollowUpSection(env: Env, input: {
  draftId: string;
  section: FollowUpRevisionSection;
  instruction: string;
  idempotencyKey: string;
  name: string | null;
  business: string | null;
  product: string | null;
  currentBody: string;
  currentSubject?: string | null;
}): Promise<{ body: string; subject: string | null; model: string }> {
  const outputShape = input.section === "whatsapp"
    ? "Returnează exclusiv JSON valid cu cheia body."
    : "Returnează exclusiv JSON valid cu cheile subject și body.";
  const prompt = [
    "Ești AVY Leads. Revizuiești o singură secțiune dintr-o ciornă internă deja existentă.",
    `Secțiunea selectată este ${input.section === "whatsapp" ? "WhatsApp" : "e-mail"}. Nu ai acces la cealaltă secțiune și nu trebuie să propui modificarea ei.`,
    outputShape,
    "Păstrează limba română cu diacritice, tonul profesionist și consultativ și o singură întrebare principală.",
    "Nu inventa informații și nu adăuga prețuri, reduceri, termene, contracte, garanții sau rezultate promise.",
    `Instrucțiunea membrului staff: ${input.instruction}`,
    `Nume verificat: ${input.name || "indisponibil"}. Afacere: ${input.business || "indisponibilă"}. Produs: ${safeProduct(input.product)}.`,
    input.currentSubject ? `Subiectul curent al secțiunii: ${input.currentSubject}` : null,
    `Textul curent al secțiunii:\n${input.currentBody}`,
  ].filter(Boolean).join("\n\n");
  const core = await runAiCore({
    env,
    agentSlug: "leads",
    operation: "lead_follow_up_section_revision",
    idempotencyKey: input.idempotencyKey,
    promptCharacters: prompt.length,
    tier: "normal",
    requestedMaxTokens: 700,
    priority: "user",
    input: {
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Aplică instrucțiunea exclusiv secțiunii selectate." },
      ],
    },
  });
  const output = core.output as { response?: unknown };
  const parsed = extractJson(String(output?.response || ""));
  if (!parsed) throw new AiCoreError("invalid_model_output");
  const body = text(parsed.body, input.section === "whatsapp" ? 1_200 : 5_000);
  const subject = input.section === "email" ? text(parsed.subject, 200) : null;
  if (!body || (input.section === "email" && !subject)) throw new AiCoreError("invalid_model_output");
  return { body, subject, model: core.model };
}

async function enqueueDueDrafts(env: Env, timestamp: number) {
  const candidates = await env.DB.prepare(
    `SELECT lead.id,lead.name,lead.business,lead.product,lead.message,lead.phone,lead.email,
            lead.first_response_at,1 AS sequence,lead.first_response_at+? AS due_at
       FROM leads lead
      WHERE lead.deleted_at IS NULL
        AND lower(COALESCE(lead.source,'')) LIKE '%necesit%'
        AND lead.first_response_at IS NOT NULL
        AND lead.first_response_at <= ? AND lead.first_response_at >= ?
        AND lead.lifecycle_stage IN ('new_lead','contacted')
        AND lead.outreach_eligibility NOT IN ('do_not_contact','blocked')
        AND (lead.phone IS NOT NULL OR lead.email IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM lead_follow_up_drafts draft WHERE draft.lead_id=lead.id AND draft.sequence=1)
        AND NOT EXISTS (
          SELECT 1 FROM lead_activities activity
           WHERE activity.lead_id=lead.id AND activity.direction='inbound'
             AND activity.occurred_at>=lead.first_response_at
        )
      UNION ALL
     SELECT lead.id,lead.name,lead.business,lead.product,lead.message,lead.phone,lead.email,
            lead.first_response_at,2 AS sequence,lead.first_response_at+? AS due_at
       FROM leads lead
      WHERE lead.deleted_at IS NULL
        AND lower(COALESCE(lead.source,'')) LIKE '%necesit%'
        AND lead.first_response_at IS NOT NULL
        AND lead.first_response_at <= ? AND lead.first_response_at >= ?
        AND lead.lifecycle_stage IN ('new_lead','contacted')
        AND lead.outreach_eligibility NOT IN ('do_not_contact','blocked')
        AND (lead.phone IS NOT NULL OR lead.email IS NOT NULL)
        AND EXISTS (
          SELECT 1 FROM lead_follow_up_drafts first_draft
           WHERE first_draft.lead_id=lead.id AND first_draft.sequence=1 AND first_draft.status='sent'
        )
        AND NOT EXISTS (SELECT 1 FROM lead_follow_up_drafts draft WHERE draft.lead_id=lead.id AND draft.sequence=2)
        AND NOT EXISTS (
          SELECT 1 FROM lead_activities activity
           WHERE activity.lead_id=lead.id AND activity.direction='inbound'
             AND activity.occurred_at>=lead.first_response_at
        )
      ORDER BY due_at ASC LIMIT 3`,
  ).bind(
    FIRST_FOLLOW_UP_DELAY, timestamp - FIRST_FOLLOW_UP_DELAY, timestamp - 21 * DAY,
    FINAL_FOLLOW_UP_DELAY, timestamp - FINAL_FOLLOW_UP_DELAY, timestamp - 21 * DAY,
  ).all<Candidate & { sequence: 1 | 2; due_at: number }>();
  for (const lead of candidates.results) {
    const dueAt = lead.due_at;
    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO lead_follow_up_drafts
          (id,lead_id,sequence,due_at,status,expires_at,created_at,updated_at)
         VALUES (?,?,?,?,'queued',?,?,?)`,
      ).bind(identifier("lfu"), lead.id, lead.sequence, dueAt, dueAt + DRAFT_RETENTION, timestamp, timestamp),
      env.DB.prepare(
        `UPDATE leads SET next_follow_up_at=COALESCE(next_follow_up_at,?),updated_at=?
          WHERE id=? AND deleted_at IS NULL`,
      ).bind(dueAt, timestamp, lead.id),
    ]);
  }
  return candidates.results.length;
}

async function processDraft(env: Env, draft: DraftRow, timestamp: number) {
  const stillEligible = await env.DB.prepare(
    `SELECT 1 FROM leads lead
      WHERE lead.id=? AND lead.deleted_at IS NULL
        AND lead.lifecycle_stage IN ('new_lead','contacted')
        AND lead.outreach_eligibility NOT IN ('do_not_contact','blocked')
        AND NOT EXISTS (
          SELECT 1 FROM lead_activities activity
           WHERE activity.lead_id=lead.id AND activity.direction='inbound'
             AND activity.occurred_at>=lead.first_response_at
        )`,
  ).bind(draft.id).first();
  if (!stillEligible) {
    await env.DB.prepare("UPDATE lead_follow_up_drafts SET status='cancelled',updated_at=? WHERE id=? AND status='queued'")
      .bind(timestamp, draft.draft_id).run();
    return "cancelled" as const;
  }
  const claimed = await env.DB.prepare(
    "UPDATE lead_follow_up_drafts SET status='generating',attempt_count=attempt_count+1,updated_at=? WHERE id=? AND status='queued'",
  ).bind(timestamp, draft.draft_id).run();
  if (!claimed.meta.changes) return "skipped" as const;
  const generated = await generateDraft(env, draft);
  const completedAt = now();
  const cadence = draft.sequence === 1 ? "48h" : "ziua 7";
  const summary = `Revenirea Necesit ${cadence} a fost pregătită pentru review de staff: WhatsApp și/sau e-mail distinct. Aprobarea ciornei nu execută trimiterea externă; aceasta necesită canal oficial și confirmare vizibilă.`;
  const completed = await env.DB.prepare(
    `UPDATE lead_follow_up_drafts
        SET status='ready',whatsapp_body=?,email_subject=?,email_body=?,generated_by_model=?,
            generated_at=?,last_error_code=NULL,updated_at=? WHERE id=? AND status='generating'`,
  ).bind(generated.whatsappBody, generated.emailSubject, generated.emailBody, generated.model, completedAt, completedAt, draft.draft_id).run();
  if (!completed.meta.changes) return "cancelled" as const;
  const followUpResults = await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO lead_activities
        (id,lead_id,actor_agent_slug,kind,direction,outcome,content,occurred_at,created_at)
       SELECT ?,?,'leads','note','internal',?,?,?,?
        WHERE EXISTS (SELECT 1 FROM lead_follow_up_drafts WHERE id=? AND status='ready')`,
    ).bind(`lead_activity_${draft.draft_id}`, draft.id, `follow_up_${draft.sequence === 1 ? "48h" : "day_7"}_ready`, summary, completedAt, completedAt, draft.draft_id),
    env.DB.prepare(
      `INSERT OR IGNORE INTO lead_reminders
        (id,lead_id,assigned_to,due_at,note,status,created_by,created_at)
       SELECT ?,?,assignment.user_id,?,?,'pending',NULL,?
         FROM lead_assignments assignment
        WHERE assignment.lead_id=? AND assignment.assignment_role='owner'
          AND EXISTS (SELECT 1 FROM lead_follow_up_drafts WHERE id=? AND status='ready')
        ORDER BY assignment.assigned_at LIMIT 1`,
    ).bind(`lead_reminder_${draft.draft_id}`, draft.id, completedAt, `Revizuiește și aprobă ciorna Necesit (${cadence}); după trimiterea manuală confirmă separat fiecare canal.`, completedAt, draft.id, draft.draft_id),
    env.DB.prepare("UPDATE leads SET updated_at=? WHERE id=?").bind(completedAt, draft.id),
  ]);
  return followUpResults[0].meta.changes ? "ready" as const : "cancelled" as const;
}

export async function runLeadFollowUpScheduler(env: Env, timestamp = now()) {
  const enqueued = await enqueueDueDrafts(env, timestamp);
  const due = await env.DB.prepare(
    `SELECT draft.id draft_id,draft.due_at,draft.attempt_count,draft.sequence,
            lead.id,lead.name,lead.business,lead.product,lead.message,lead.phone,lead.email,lead.first_response_at
       FROM lead_follow_up_drafts draft JOIN leads lead ON lead.id=draft.lead_id
      WHERE draft.status='queued' AND draft.due_at<=?
      ORDER BY draft.due_at ASC LIMIT 3`,
  ).bind(timestamp).all<DraftRow>();
  const results = await Promise.all(due.results.map((draft) => processDraft(env, draft, timestamp)));
  return { enqueued, processed: results.filter((result) => result === "ready").length, cancelled: results.filter((result) => result === "cancelled").length };
}

export async function cleanupLeadFollowUpDrafts(env: Env, timestamp = now()) {
  return env.DB.batch([
    env.DB.prepare(
      `DELETE FROM lead_follow_up_draft_revisions
        WHERE draft_id IN (SELECT id FROM lead_follow_up_drafts WHERE expires_at<?)`,
    ).bind(timestamp),
    env.DB.prepare(
      `UPDATE lead_follow_up_drafts
          SET whatsapp_body=NULL,email_subject=NULL,email_body=NULL,status='expired',updated_at=?
        WHERE expires_at<? AND status IN ('ready','sent','failed')`,
    ).bind(timestamp, timestamp),
    env.DB.prepare(
      `UPDATE lead_follow_up_drafts SET status='cancelled',updated_at=?
        WHERE status IN ('queued','generating') AND expires_at<?`,
    ).bind(timestamp, timestamp),
  ]);
}
