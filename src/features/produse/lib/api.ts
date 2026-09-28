import { apiUrl } from "@/lib/apiBase";

/**
 * Formularele paginii trimit spre Worker-ul Avyron, care salvează cererea în
 * D1 (tabelul `leads`, ca să apară în Leaduri & CRM din AVYRON OS) și o
 * livrează pe e-mailul agenției prin SMTP.
 */

export type RequestKind = "feature" | "brief";

export type ProductRequest = {
  kind: RequestKind;
  email: string;
  message: string;
  /** Produsele/serviciile bifate în selectorul universal, sau eticheta cererii. */
  selection?: string[];
  category?: string;
  urgency?: string;
  lang: "ro" | "en";
  turnstileToken?: string;
};

export type SubmitResult = { ok: true; id?: string } | { ok: false; error: string };

export async function submitProductRequest(payload: ProductRequest): Promise<SubmitResult> {
  try {
    const response = await fetch(apiUrl("/api/produse/requests"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as { requestId?: string };
      return { ok: true, id: data.requestId };
    }
    if (response.status === 429) return { ok: false, error: "rate_limited" };
    if (response.status === 403) return { ok: false, error: "captcha_failed" };
    return { ok: false, error: `http_${response.status}` };
  } catch {
    return { ok: false, error: "network" };
  }
}
