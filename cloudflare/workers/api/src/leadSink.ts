// Sincronizarea lead-urilor către un tabel extern (Airtable sau Google Sheets).
//
// Două moduri, alese automat după secretele configurate:
//  1) Airtable  — AIRTABLE_API_KEY + AIRTABLE_BASE_ID (+ AIRTABLE_TABLE, default "Leads")
//  2) Webhook   — LEAD_WEBHOOK_URL (ex: Google Apps Script Web App legat de un Sheet)
//                 opțional LEAD_WEBHOOK_SECRET → trimis ca header X-Webhook-Secret
//
// Nu aruncă niciodată: eșecul sincronizării nu trebuie să blocheze lead-ul.

export type LeadRecord = {
  leadId: string;
  submittedAt: string;
  name: string;
  business: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  files: string[];
  lang: string;
  source: string;
};

type SinkEnv = {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_TABLE?: string;
  LEAD_WEBHOOK_URL?: string;
  LEAD_WEBHOOK_SECRET?: string;
};

export type SinkResult = { target: "airtable" | "webhook" | "none"; ok: boolean; error?: string };

export async function syncLeadToTable(env: SinkEnv, lead: LeadRecord): Promise<SinkResult> {
  try {
    if (env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID) {
      const table = encodeURIComponent(env.AIRTABLE_TABLE || "Leads");
      const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          typecast: true,
          records: [
            {
              fields: {
                "Lead ID": lead.leadId,
                Data: lead.submittedAt,
                Nume: lead.name,
                Business: lead.business,
                Telefon: lead.phone,
                Email: lead.email,
                Website: lead.website,
                Descriere: lead.description,
                Fisiere: lead.files.join(", "),
                Limba: lead.lang,
                Sursa: lead.source,
              },
            },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`airtable lead sync failed [${res.status}]: ${body}`);
        return { target: "airtable", ok: false, error: `${res.status}` };
      }
      return { target: "airtable", ok: true };
    }

    if (env.LEAD_WEBHOOK_URL) {
      const res = await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.LEAD_WEBHOOK_SECRET ? { "X-Webhook-Secret": env.LEAD_WEBHOOK_SECRET } : {}),
        },
        body: JSON.stringify(lead),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`lead webhook sync failed [${res.status}]: ${body}`);
        return { target: "webhook", ok: false, error: `${res.status}` };
      }
      return { target: "webhook", ok: true };
    }
  } catch (e) {
    console.error("lead table sync error", e);
    return { target: env.AIRTABLE_API_KEY ? "airtable" : "webhook", ok: false, error: String(e) };
  }

  return { target: "none", ok: false, error: "not_configured" };
}
