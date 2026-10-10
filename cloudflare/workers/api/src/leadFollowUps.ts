import { runAiCore } from "./aiCore";
import { now } from "./security";
import type { Env } from "./types";

const HOUR = 60 * 60 * 1_000;
const DAY = 24 * HOUR;
const FIRST_FOLLOW_UP_DELAY = 48 * HOUR;
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

type DraftRow = Candidate & { draft_id: string; due_at: number; attempt_count: number };

type GeneratedDraft = { whatsappBody: string | null; emailSubject: string | null; emailBody: string | null };

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const shortName = (value: string | null) => value?.trim().split(/\s+/)[0]?.slice(0, 80) || "";
const safeProduct = (value: string | null) => value?.trim().slice(0, 160) || "serviciul solicitat";

function fallbackDraft(row: Candidate): GeneratedDraft {
  const salutation = shortName(row.name) ? `Bună, ${shortName(row.name)}!` : "Bună!";
  const product = safeProduct(row.product);
  return {
    whatsappBody: row.phone ? [
      salutation,
      `Revin legat de solicitarea transmisă prin platforma Necesit pentru ${product}. Vreau doar să verific dacă proiectul mai este actual, dacă solicitarea a fost trimisă din greșeală sau dacă ar fi utilă o explicație mai clară despre ce poate include serviciul.`,
      "Doriți să vă explic pe scurt direcția potrivită pentru activitatea dumneavoastră?",
      "Cu drag,\nEchipa avyron.ro\n0734 605 055\navyrontech@gmail.com",
    ].join("\n\n") : null,
    emailSubject: row.email ? `Revenire solicitare Necesit – ${product}` : null,
    emailBody: row.email ? [
      salutation,
      `Revin în continuarea solicitării transmise prin platforma Necesit pentru ${product}. Ne dorim să verificăm dacă proiectul este încă actual și dacă mesajul nostru inițial a explicat suficient de clar cum vă putem ajuta.`,
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
  const prompt = [
    "Ești AVY Leads. Redactează prima revenire pentru un lead Necesit care nu a răspuns timp de 48 de ore.",
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
      operation: "necesit_follow_up_48h",
      idempotencyKey: `lead-follow-up:${row.draft_id}`,
      promptCharacters: prompt.length,
      tier: "default",
      requestedMaxTokens: 520,
      priority: "background",
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

async function enqueueDueDrafts(env: Env, timestamp: number) {
  const candidates = await env.DB.prepare(
    `SELECT lead.id,lead.name,lead.business,lead.product,lead.message,lead.phone,lead.email,lead.first_response_at
       FROM leads lead
      WHERE lead.deleted_at IS NULL
        AND lower(COALESCE(lead.source,'')) LIKE '%necesit%'
        AND lead.first_response_at IS NOT NULL
        AND lead.first_response_at <= ?
        AND lead.first_response_at >= ?
        AND lead.lifecycle_stage IN ('new_lead','contacted')
        AND lead.outreach_eligibility NOT IN ('do_not_contact','blocked')
        AND (lead.phone IS NOT NULL OR lead.email IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM lead_follow_up_drafts draft WHERE draft.lead_id=lead.id AND draft.sequence=1)
        AND NOT EXISTS (
          SELECT 1 FROM lead_activities activity
           WHERE activity.lead_id=lead.id AND activity.direction='inbound'
             AND activity.occurred_at>=lead.first_response_at
        )
      ORDER BY lead.first_response_at ASC LIMIT 3`,
  ).bind(timestamp - FIRST_FOLLOW_UP_DELAY, timestamp - 21 * DAY).all<Candidate>();
  for (const lead of candidates.results) {
    const dueAt = lead.first_response_at + FIRST_FOLLOW_UP_DELAY;
    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO lead_follow_up_drafts
          (id,lead_id,sequence,due_at,status,expires_at,created_at,updated_at)
         VALUES (?,?,1,?,'queued',?,?,?)`,
      ).bind(identifier("lfu"), lead.id, dueAt, dueAt + DRAFT_RETENTION, timestamp, timestamp),
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
  const summary = "Prima revenire Necesit (48h) a fost pregătită: WhatsApp și/sau e-mail distinct, cu verificarea politicoasă a actualității cererii. Trimiterea necesită conector oficial verificat și confirmare vizibilă în canal.";
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE lead_follow_up_drafts
          SET status='ready',whatsapp_body=?,email_subject=?,email_body=?,generated_by_model=?,
              generated_at=?,last_error_code=NULL,updated_at=? WHERE id=? AND status='generating'`,
    ).bind(generated.whatsappBody, generated.emailSubject, generated.emailBody, generated.model, completedAt, completedAt, draft.draft_id),
    env.DB.prepare(
      `INSERT OR IGNORE INTO lead_activities
        (id,lead_id,actor_agent_slug,kind,direction,outcome,content,occurred_at,created_at)
       VALUES (?,?,'leads','note','internal','follow_up_48h_ready',?,?,?)`,
    ).bind(`lead_activity_${draft.draft_id}`, draft.id, summary, completedAt, completedAt),
    env.DB.prepare(
      `INSERT OR IGNORE INTO lead_reminders
        (id,lead_id,assigned_to,due_at,note,status,created_by,created_at)
       SELECT ?,?,assignment.user_id,?,?,'pending',NULL,?
         FROM lead_assignments assignment
        WHERE assignment.lead_id=? AND assignment.assignment_role='owner'
        ORDER BY assignment.assigned_at LIMIT 1`,
    ).bind(`lead_reminder_${draft.draft_id}`, draft.id, completedAt, "Trimite revenirea Necesit de 48h din ciorna AVY Leads și confirmă separat WhatsApp/e-mail în istoric.", completedAt, draft.id),
    env.DB.prepare("UPDATE leads SET updated_at=? WHERE id=?").bind(completedAt, draft.id),
  ]);
  return "ready" as const;
}

export async function runLeadFollowUpScheduler(env: Env, timestamp = now()) {
  const enqueued = await enqueueDueDrafts(env, timestamp);
  const due = await env.DB.prepare(
    `SELECT draft.id draft_id,draft.due_at,draft.attempt_count,
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
