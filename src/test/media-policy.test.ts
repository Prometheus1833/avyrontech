import { describe, expect, it } from "vitest";
import { inspectContactAttachment, inspectProjectMedia, projectMediaDisposition } from "../../cloudflare/workers/api/src/mediaPolicy";

const bytes = (value: string) => new TextEncoder().encode(value);

describe("uploaded media policy", () => {
  it("rejects content-type and extension spoofing", () => {
    expect(inspectProjectMedia("invoice.pdf", "application/pdf", bytes("<script>alert(1)</script>"))).toBe(false);
    expect(inspectProjectMedia("logo.svg", "image/svg+xml", bytes("<svg/>"))).toBe(false);
    expect(inspectContactAttachment("invoice.pdf", "application/pdf", bytes("<script>alert(1)</script>"))).toBe(false);
    expect(inspectContactAttachment("invoice.html", "text/plain", bytes("hello"))).toBe(false);
    expect(inspectContactAttachment("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes("not a ZIP"))).toBe(false);
  });

  it("preserves legitimate documents and serves them as downloads", () => {
    expect(inspectProjectMedia("invoice.pdf", "application/pdf", bytes("%PDF-1.7 synthetic"))).toBe(true);
    expect(inspectContactAttachment("note.txt", "text/plain", bytes("Bună ziua"))).toBe(true);
    expect(projectMediaDisposition("invoice.pdf", "application/pdf")).toContain("attachment;");
    expect(projectMediaDisposition("logo.png", "image/png")).toContain("inline;");
  });
});
