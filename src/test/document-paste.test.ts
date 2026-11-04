import { describe, it, expect } from "vitest";
import { sanitizeDocumentPaste } from "../features/documents/sanitizePaste";

describe("Document Center clipboard boundary", () => {
  it("removes executable HTML, trackers and unscanned images before insertion, preserving contract tables", () => {
    const html =
      '<script>alert(1)</script><iframe src="https://example.invalid"></iframe><img src="https://example.invalid/track"><img src="data:image/png;base64,iVBORw0KGgo="><svg onload="alert(1)"></svg><p onclick="alert(1)" style="color:red">Știință <strong>și obligații</strong><a href="javascript:alert(1)">text</a></p><table><tbody><tr><td colspan="2">Livrabil</td></tr></tbody></table>';
    const clean = sanitizeDocumentPaste(html);
    expect(clean).not.toMatch(
      /<script|<iframe|<img|<svg|onclick|style=|href=|src=|example\.invalid|data:image/,
    );
    expect(clean).toContain("<strong>și obligații</strong>");
    expect(clean).toContain('<td colspan="2">Livrabil</td>');
  });
});
