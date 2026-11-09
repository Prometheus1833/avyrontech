import { afterEach, describe, expect, it, vi } from "vitest";
import { isSavedContact, publicFormRequest } from "@/lib/publicFormRequest";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("public form receipts", () => {
  it("rejects an HTML response even when the HTTP status is successful", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Fallback</html>")));
    await expect(publicFormRequest("/api/contact/demo", { method: "POST" })).rejects.toThrow();
  });
  it("never accepts an empty success body or an unsaved failure as a CRM receipt", () => {
    expect(isSavedContact(new Response("{}"), {})).toBe(false);
    expect(isSavedContact(new Response("", { status: 500 }), { leadId: "id" })).toBe(false);
    expect(isSavedContact(new Response("", { status: 503 }), { leadId: "id", saved: true, delivered: false })).toBe(true);
  });
  it("aborts a stalled response body and performs no automatic retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => Promise.resolve({ json: () => new Promise((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }) }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = publicFormRequest("/api/contact/demo", { method: "POST" }, 100);
    const rejected = expect(pending).rejects.toThrow("request_timeout");
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("returns the genuine saved receipt despite an email provider failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true, leadId: "receipt", delivered: false }), { status: 503 })));
    const { response, body } = await publicFormRequest<{ saved: boolean; leadId: string }>("/api/contact/demo", { method: "POST" });
    expect(isSavedContact(response, body)).toBe(true);
  });
});
