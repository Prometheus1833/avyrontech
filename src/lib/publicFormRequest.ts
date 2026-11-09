/** Bound the whole response, including its body. No automatic POST retries. */
export async function publicFormRequest<T>(url: string, init: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.json().catch(() => {
      throw new Error(controller.signal.aborted ? "request_timeout" : "invalid_response");
    }) as T;
    if (!body || typeof body !== "object") throw new Error("invalid_response");
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

export type ContactReceipt = { leadId?: string; saved?: boolean; delivered?: boolean; error?: string };
export const isSavedContact = (response: Response, body: ContactReceipt) =>
  typeof body.leadId === "string" && body.leadId.length > 0
  && body.saved === true && (response.ok || response.status === 502 || response.status === 503);
