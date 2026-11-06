import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DocumentReader from "@/features/documents/DocumentReader";
import { blankPayload } from "@/shared/documents/model";

describe("client document reader", () => {
  it("shows authorized content and variables as text without editing or external requests", () => {
    const payload = blankPayload("Ofertă {{client.name}}");
    payload.fields = { "client.name": "Cafenea SRL" };
    payload.body = { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "Beneficiar: {{client.name}} <script>alert(1)</script>", marks: [{ type: "bold" }] }] },
      { type: "image", attrs: { src: "https://external.test/tracker.png" } },
    ] };
    const { container } = render(<DocumentReader payload={payload} />);
    expect(screen.getByText("Ofertă Cafenea SRL")).toBeInTheDocument();
    expect(screen.getByText("Beneficiar: Cafenea SRL <script>alert(1)</script>")).toBeInTheDocument();
    expect(container.querySelector("script, img, input, textarea, [contenteditable]")).toBeNull();
    expect(payload.title).toBe("Ofertă {{client.name}}");
  });

  it("preserves table spans and totals each currency using the native VAT calculation", () => {
    const payload = blankPayload("Ofertă");
    payload.body = { type: "doc", content: [{ type: "table", content: [
      { type: "tableRow", content: [{ type: "tableHeader", attrs: { colspan: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Livrabile" }] }] }] },
      { type: "tableRow", content: ["Design", "Implementare"].map(text => ({ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text }] }] })) },
    ] }] };
    const base = { catalogId: "service", label: "Serviciu", sku: "WEB", quantity: 1, catalogPriceMinor: 10000, offeredPriceMinor: 10000, discountReason: "", currency: "RON", vatBasisPoints: 1900, taxVerified: true, billingCycle: "one_time", priceModel: "fixed", package: "" };
    payload.lines = [base, { ...base, currency: "EUR", offeredPriceMinor: 0 }];
    const { container } = render(<DocumentReader payload={payload} />);
    expect(screen.getByRole("columnheader", { name: "Livrabile" })).toHaveAttribute("colspan", "2");
    const totals = [...container.querySelectorAll("p")].filter(p => p.textContent?.startsWith("Total cu taxele înscrise"));
    expect(totals).toHaveLength(2);
    expect(totals[0].textContent).toMatch(/119,00.*RON/);
    expect(totals[1].textContent).toMatch(/0,00.*EUR/);
  });
});
