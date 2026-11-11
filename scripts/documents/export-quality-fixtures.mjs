// Exercises the application's actual exporters with synthetic content only.
// No API, remote storage, private company profile or recipient is involved.
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const output = process.argv[2];
if (!output || !path.isAbsolute(output)) throw new Error("Supply an absolute QA output directory");
await mkdir(output, { recursive: true });
const compiled = await build({
  stdin: { contents: `export { DOCUMENT_TEMPLATES, templateFields, applicableTemplatePayload } from './src/shared/documents/templates.ts'; export { replaceVariables, documentIssues } from './src/shared/documents/model.ts'; export { exportDocument } from './cloudflare/workers/api/src/documentExports.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "cjs",
});
const source = path.join(output, "exporter.cjs");
// CJS supports the exporters' existing npm dependencies without dynamic require shims.
await writeFile(source, compiled.outputFiles[0].contents);
const { DOCUMENT_TEMPLATES, templateFields, applicableTemplatePayload, replaceVariables, documentIssues, exportDocument } = await import(source);
const values = {
  contract_capacity: "B2B", cross_border: "", "provider.registered_address": "Sediu social demonstrativ, pentru verificarea formatării",
  "provider.legal_name": "Emitent demonstrativ S.R.L.", "provider.tax_id": "CUI-DEMO", "provider.registration_number": "ONRC-DEMO", "provider.address": "Adresă sintetică pentru verificarea aspectului documentului", "provider.share_capital": "500 RON (exemplu)", "provider.contact_email": "issuer@example.test", "beneficiary.legal_name": "Beneficiar demonstrativ S.R.L.", "beneficiary.entity_type": "PJ", "beneficiary.identification": "Identificare sintetică pentru testare", "beneficiary.summary": "PJ\nAdresă demonstrativă\nclient@example.test", "beneficiary.address": "Adresă demonstrativă", date: "06.11.2026", scope: "Website și activități digitale demonstrative", privacy_mode: "DPA", objectives: "Prezentarea clară a activității și simplificarea solicitărilor de contact.", solution: "Structură de conținut, interfață adaptată telefoanelor și instrumente de administrare conform perimetrului analizat.", deliverables: "Design și implementare demonstrative, documentație de administrare și verificarea traseelor agreate.", schedule: "Etapele și termenele acestui exemplu sunt sintetice și nu constituie un angajament de livrare.", optional_extras: "Serviciu suplimentar demonstrativ, care necesită o ofertă distinctă dacă este solicitat.", tax_regime: "Regim demonstrativ; valorile nu sunt utilizabile pentru facturare.", "provider.representative": "Alexandru Exemplu · administrator", "beneficiary.signatory": "Ioana Exemplu · reprezentant",
};
const manifest = [];
for (const [i, model] of DOCUMENT_TEMPLATES.entries()) {
  const fields = Object.fromEntries([...new Set([...model.required, ...templateFields(model.payload)])].map(key => [key, values[key] || "Condiție demonstrativă de completat și verificat înainte de utilizare."]));
  const payload = replaceVariables(applicableTemplatePayload(model.payload, model.id, fields), fields);
  if (model.id === "offer") payload.lines = [
    { catalogId: "demo-web", label: "Website demonstrativ", sku: "DEMO-WEB", quantity: 1, catalogPriceMinor: 100000, offeredPriceMinor: 90000, priceConfirmed: true, discountReason: "Reducere demonstrativă", currency: "RON", vatBasisPoints: 0, taxVerified: true, billingCycle: "one_time", priceModel: "fixed", package: "" },
    { catalogId: "demo-monthly", label: "Mentenanță demonstrativă", sku: "DEMO-MAINT", quantity: 1, catalogPriceMinor: 10000, offeredPriceMinor: 10000, priceConfirmed: true, discountReason: "", currency: "RON", vatBasisPoints: 0, taxVerified: true, billingCycle: "monthly", priceModel: "fixed", package: "" },
  ];
  const issues = documentIssues(payload, model.required);
  if (issues.length) throw new Error(`${model.id}: ${issues.join(", ")}`);
  for (const format of ["pdf", "docx"]) {
    const bytes = await exportDocument(payload, `DEMO-2026-${String(i+1).padStart(3,"0")}`, 1, format, true);
    const file = `${model.id}.${format}`;
    await writeFile(path.join(output, file), bytes);
    manifest.push({ family: model.id, format, bytes: bytes.length, file, synthetic: true });
  }
}
await writeFile(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${manifest.length} real synthetic PDF/DOCX exports in ${output}`);
