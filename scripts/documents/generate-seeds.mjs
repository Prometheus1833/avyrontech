import { readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
const output = await build({
  stdin: {
    contents:
      "export { DOCUMENT_TEMPLATES } from './src/shared/documents/templates.ts'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { DOCUMENT_TEMPLATES } = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`
);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
let sql =
  "-- Reviewed source families; legal masters require a separate human approval.\n";
for (const template of DOCUMENT_TEMPLATES) {
  sql += `INSERT INTO document_templates(id,family,name,legal,created_at) VALUES (${quote(template.id)},${quote(template.id)},${quote(template.name)},${template.legal ? 1 : 0},0);\n`;
  sql += `INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,review_status,created_at) VALUES (${quote(template.id + "_v1")},${quote(template.id)},1,${quote(JSON.stringify(template.payload))},${quote(JSON.stringify(template.required))},'review_required',0);\n`;
}
writeFileSync(
  "cloudflare/d1/migrations/0076_document_template_families.sql",
  sql,
);
// Staff content was preserved separately from the client bundle during the migration.
const guides = JSON.parse(
  readFileSync("cloudflare/workers/api/src/documentStaffGuides.json", "utf8"),
);
if (guides.length !== 8)
  throw new Error("Reconcile staff guide inventory before regenerating.");
console.log(
  `Seeded ${DOCUMENT_TEMPLATES.length} families; preserved ${guides.length} staff guides.`,
);
