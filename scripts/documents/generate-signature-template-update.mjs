import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";

const directory = "cloudflare/d1/migrations";
const filename = "0119_document_signatures.sql";
const destination = `${directory}/${filename}`;
const compiled = await build({
  stdin: {
    contents: "export { DOCUMENT_TEMPLATES } from './src/shared/documents/templates.ts'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { DOCUMENT_TEMPLATES } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const db = new DatabaseSync(":memory:");
const statements = [
  "-- Append signature-ready editions only to unchanged, shared AVYRON masters.",
  "-- Previously issued documents, existing reviews, and customized models retain their versions.",
];
try {
  for (const file of readdirSync(directory).filter((f) => f.endsWith(".sql") && f < filename).sort()) {
    db.exec(readFileSync(`${directory}/${file}`, "utf8"));
  }

  for (const model of DOCUMENT_TEMPLATES) {
    const baseline = `${model.id}_v3_avyron_legal202611`;
    const previous = db.prepare("SELECT payload_json, required_fields_json FROM document_template_versions WHERE id=?").get(baseline);
    if (!previous) throw new Error(`Missing frozen v3 master: ${model.id}`);

    statements.push(`INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,review_status,created_at)
SELECT ${quote(`${model.id}_v4_avyron_signatures202611`)},t.id,4,${quote(JSON.stringify(model.payload))},${quote(JSON.stringify(model.required))},'review_required',CAST(strftime('%s','now') AS INTEGER)*1000
FROM document_templates t JOIN document_template_versions v ON v.template_id=t.id AND v.id=${quote(baseline)} AND v.version=3 AND v.review_status<>'retired'
WHERE t.id=${quote(model.id)} AND t.visibility='shared' AND v.payload_json=${quote(previous.payload_json)} AND v.required_fields_json=${quote(previous.required_fields_json)}
AND NOT EXISTS(SELECT 1 FROM document_template_versions newer WHERE newer.template_id=t.id AND newer.version>3);`);
  }
} finally {
  db.close();
}

const sql = statements.join("\n") + "\n";
if (existsSync(destination)) {
  if (readFileSync(destination, "utf8") !== sql) throw new Error("Frozen migration differs. Prepare an additive release.");
} else if (process.argv.includes("--check")) {
  throw new Error("Signature migration is missing");
} else {
  writeFileSync(destination, sql);
}
console.log(`Verified ${DOCUMENT_TEMPLATES.length} signature-edition masters.`);
