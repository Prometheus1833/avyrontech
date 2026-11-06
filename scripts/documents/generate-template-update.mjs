import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
const result = await build({ stdin: { contents: "export { DOCUMENT_TEMPLATES } from './src/shared/documents/templates.ts'", resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "esm" });
const { DOCUMENT_TEMPLATES } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const destination = "cloudflare/d1/migrations/0099_document_editorial_design.sql";
let sql = `-- Additive editorial release. Never update historical versions or customized masters.
-- Company identity remains the configured source of truth; no inferred fiscal data.
ALTER TABLE document_company_profile ADD COLUMN share_capital TEXT;
ALTER TABLE document_files ADD COLUMN renderer_version TEXT NOT NULL DEFAULT 'classic' CHECK(length(renderer_version) BETWEEN 1 AND 80);
DROP INDEX document_export_slot;
CREATE UNIQUE INDEX document_export_slot ON document_files(version_id,kind,(expires_at IS NULL),renderer_version) WHERE kind IN('pdf','docx') AND scan_status='clean_generated';
`;
for (const model of DOCUMENT_TEMPLATES) {
  sql += `INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,review_status,created_at)
SELECT ${quote(model.id + "_v2_avyron2026")},t.id,2,${quote(JSON.stringify(model.payload))},${quote(JSON.stringify(model.required))},'review_required',CAST(strftime('%s','now') AS INTEGER)*1000
FROM document_templates t JOIN document_template_versions v ON v.template_id=t.id AND v.id=${quote(model.id + "_v1")} AND v.version=1 AND v.review_status<>'retired'
WHERE t.id=${quote(model.id)} AND t.visibility='shared' AND NOT EXISTS (SELECT 1 FROM document_template_versions newer WHERE newer.template_id=t.id AND newer.version>1);
`;
}
if (process.argv.includes("--check")) {
  if (!existsSync(destination) || readFileSync(destination, "utf8") !== sql) throw new Error("Editorial migration does not match its reviewed source");
} else if (!existsSync(destination)) writeFileSync(destination, sql);
else if (readFileSync(destination, "utf8") !== sql) throw new Error("Refusing to overwrite an existing migration; create a new additive release instead");
console.log(`Verified ${DOCUMENT_TEMPLATES.length} modern template families; existing custom versions preserved.`);
