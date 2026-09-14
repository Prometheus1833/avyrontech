import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationNames = () => readdirSync(resolve(root, 'cloudflare/d1/migrations')).filter(name => name.endsWith('.sql')).sort();

export function assertMigrationPrefix(applied, expected) {
  if (!Array.isArray(applied) || applied.some((name, index) => name !== expected[index])) {
    throw new Error('D1 migration history differs from this release. Audit the database before deploying.');
  }
}

const cli = (args, json = false) => {
  const output = execFileSync(process.execPath, [resolve(root, 'node_modules/wrangler/bin/wrangler.js'), ...args], {
    cwd: root, encoding: 'utf8', stdio: json ? ['ignore', 'pipe', 'inherit'] : ['ignore', 'inherit', 'inherit'],
  });
  return json ? JSON.parse(output) : undefined;
};
const rows = result => {
  if (!Array.isArray(result) || result.some(query => query.success !== true || !Array.isArray(query.results))) {
    throw new Error('D1 preflight did not return a successful query.');
  }
  return result.flatMap(query => query.results);
};

/** Runs using the existing deployment identity. Never creates credentials or
 * changes token scopes. Every failed check stops before publishing code. */
export function releaseApi({ preview = false, run = cli, expected = migrationNames(), checkAssets = true, ciName = process.env.WRANGLER_CI_OVERRIDE_NAME } = {}) {
  if (checkAssets && !existsSync(resolve(root, 'dist/index.html'))) throw new Error('Run npm run build before release.');
  const worker = preview ? 'avyrontech-preview' : 'avyrontech';
  if (ciName && ciName !== worker) throw new Error(`Connect this build to ${worker}; refusing a CI Worker-name override.`);
  const env = preview ? ['--env', 'preview'] : ['--env='];
  const config = ['--config', 'wrangler.jsonc', ...env];
  const database = preview ? 'avyron-db-preview' : 'avyron-db';
  const query = sql => rows(run(['d1', 'execute', database, '--remote', ...config, '--command', sql, '--json'], true));
  const history = () => query('SELECT name FROM d1_migrations ORDER BY name').map(row => row.name);

  assertMigrationPrefix(history(), expected);
  // Keep the pre-migration recovery bookmark in the deployment log.
  run(['d1', 'time-travel', 'info', database, ...config]);
  run(['d1', 'migrations', 'apply', database, '--remote', ...config]);
  const applied = history();
  assertMigrationPrefix(applied, expected);
  if (applied.length !== expected.length) throw new Error('D1 migrations are incomplete.');
  if (query('PRAGMA foreign_key_check').length) throw new Error('D1 foreign key audit failed.');
  const integrity = query('PRAGMA quick_check');
  if (integrity.length !== 1 || integrity[0].quick_check !== 'ok') throw new Error('D1 integrity audit failed.');
  // Journal entries alone cannot prove the schema or FTS runtime is usable.
  query("SELECT r.reservation_mode,k.review_after,a.revision FROM financial_usage_events r JOIN ai_knowledge k ON 0 JOIN ai_approvals a ON 0 LIMIT 0");
  query("SELECT id FROM operation_records LIMIT 0");
  query("SELECT rowid FROM ai_knowledge_fts WHERE ai_knowledge_fts MATCH 'releasecheck' LIMIT 1");
  run(preview ? ['versions', 'upload', ...config, '--strict'] : ['deploy', ...config]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = process.argv.slice(2);
  if (options.some(option => option !== '--preview')) throw new Error('Only --preview is supported.');
  releaseApi({ preview: options.includes('--preview') });
}
