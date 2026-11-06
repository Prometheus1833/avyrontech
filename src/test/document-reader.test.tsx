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

it("renders missing fields with human labels while preserving the editable source", () => {
  const payload = blankPayload("Ciornă");
  payload.labels["provider.registration_number"] = "Registrul Comerțului AVYRON";
  payload.body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ONRC {{provider.registration_number}}" }] }] };
  render(<DocumentReader payload={payload} />);
  expect(screen.getByText("De completat: Registrul Comerțului AVYRON")).toBeInTheDocument();
  expect(screen.queryByText("{{provider.registration_number}}", { exact: false })).not.toBeInTheDocument();
  expect(JSON.stringify(payload.body)).toContain("{{provider.registration_number}}");
});

it("does not present an unconfirmed quote or tax regime as a zero-priced final offer", () => {
  const payload = blankPayload("Deviz în lucru");
  payload.lines = [{ catalogId: "quote", label: "Serviciu la ofertare", sku: "DEMO", quantity: 1, catalogPriceMinor: null, offeredPriceMinor: 0, priceConfirmed: false, discountReason: "", currency: "RON", vatBasisPoints: 0, taxVerified: false, billingCycle: "monthly", priceModel: "quote", package: "" }];
  render(<DocumentReader payload={payload} />);
  expect(screen.getByText("De confirmat", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("De verificat", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Totalul se calculează după confirmarea prețurilor și a regimului fiscal.")).toBeInTheDocument();
  expect(screen.queryByText(/Total cu taxele înscrise/)).not.toBeInTheDocument();
});
