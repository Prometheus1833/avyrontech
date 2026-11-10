import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
const destination = 'cloudflare/d1/migrations/0116_document_legal_financial_sync.sql';
const compiled = await build({ stdin: { contents: "export { DOCUMENT_TEMPLATES } from './src/shared/documents/templates.ts'", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm' });
const { DOCUMENT_TEMPLATES } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const db = new DatabaseSync(':memory:');
let sql = `-- Additive release: no historical document, export, approval or master is overwritten.
-- Registered office is separate from the user-confirmed activity/correspondence address.
ALTER TABLE document_company_profile ADD COLUMN registered_address TEXT;
ALTER TABLE financial_provider_connections ADD COLUMN sync_state_json TEXT CHECK(sync_state_json IS NULL OR json_valid(sync_state_json));
-- Official ANAF V9 lookup, 2026-11-10: exact company/CUI match; fill only a missing ONRC identifier.
UPDATE document_company_profile SET registration_number='J2026041938009'
WHERE legal_name='DIGITAL ECOTECH SOLUTIONS S.R.L.' AND tax_id='55055976'
AND (registration_number IS NULL OR trim(registration_number)='');
`;
try {
  for (const file of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')&&f<'0116_').sort()) db.exec(readFileSync(`cloudflare/d1/migrations/${file}`,'utf8'));
  for (const model of DOCUMENT_TEMPLATES) {
    const old = db.prepare('SELECT payload_json,required_fields_json FROM document_template_versions WHERE id=?').get(`${model.id}_v2_avyron2026`);
    if (!old) throw Error(`Missing frozen v2 baseline: ${model.id}`);
    sql += `INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,review_status,created_at)
SELECT ${quote(model.id+'_v3_avyron_legal202611')},t.id,3,${quote(JSON.stringify(model.payload))},${quote(JSON.stringify(model.required))},'review_required',CAST(strftime('%s','now') AS INTEGER)*1000
FROM document_templates t JOIN document_template_versions v ON v.template_id=t.id AND v.id=${quote(model.id+'_v2_avyron2026')} AND v.version=2 AND v.review_status<>'retired'
WHERE t.id=${quote(model.id)} AND t.visibility='shared' AND v.payload_json=${quote(old.payload_json)} AND v.required_fields_json=${quote(old.required_fields_json)}
AND NOT EXISTS(SELECT 1 FROM document_template_versions newer WHERE newer.template_id=t.id AND newer.version>2);
`;
  }
} finally {db.close();}
if (process.argv.includes('--check')) {
  if (!existsSync(destination)||readFileSync(destination,'utf8')!==sql) throw Error('Legal release differs from reviewed source');
} else if (!existsSync(destination)) writeFileSync(destination,sql);
else if (readFileSync(destination,'utf8')!==sql) throw Error('Refusing to overwrite an existing migration; prepare an additive release');
console.log(`Verified ${DOCUMENT_TEMPLATES.length} legal masters; historical/custom masters preserved.`);
