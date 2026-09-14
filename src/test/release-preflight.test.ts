// @vitest-environment node
import { describe, expect, it } from 'vitest';
// Deployment script is also used directly by the Cloudflare build identity.
// @ts-expect-error the CLI is intentionally plain ESM
import { assertMigrationPrefix, releaseApi } from '../../scripts/release-api.mjs';

describe('Cloudflare release preflight', () => {
  const expected = ['0001.sql', '0002.sql'];
  function fixture(failure = '', preview = false) {
    const calls: string[][] = []; let migrated = false;
    const run = (args: string[]) => {
      calls.push(args);
      if (args.includes('apply')) { if (failure === 'migration') throw new Error('migration failed'); migrated = true; }
      const sql = args[args.indexOf('--command') + 1];
      let results: unknown[] = [];
      if (sql?.includes('d1_migrations')) results = (migrated && failure !== 'incomplete' ? expected : expected.slice(0, 1)).map(name => ({name}));
      if (sql === 'PRAGMA foreign_key_check' && failure === 'foreign_keys') results = [{table:'broken'}];
      if (sql === 'PRAGMA quick_check') results = [{quick_check: failure === 'integrity' ? 'broken' : 'ok'}];
      if (sql?.includes('MATCH') && failure === 'fts') throw new Error('FTS unavailable');
      return [{success: true, results}];
    };
    return {calls, release: () => releaseApi({run, preview, expected, checkAssets:false})};
  }
  it('rejects missing historical migrations, unknown migrations and reordered history', () => {
    for (const history of [['0002.sql'],['other.sql'],[...expected,'0003.sql']]) expect(() => assertMigrationPrefix(history, expected)).toThrow();
    expect(() => assertMigrationPrefix(expected.slice(0,1), expected)).not.toThrow();
  });
  it('captures recovery information, migrates and audits before deploying', () => {
    const f = fixture(); f.release();
    expect(f.calls.findIndex(args => args.includes('time-travel'))).toBeLessThan(f.calls.findIndex(args => args.includes('apply')));
    expect(f.calls.at(-1)).toEqual(['deploy','--config','wrangler.jsonc','--env=']);
    expect(f.calls.filter(args => args[0] === 'd1').every(args => args.includes('avyron-db'))).toBe(true);
  });
  it.each(['migration','incomplete','foreign_keys','integrity','fts'])('stops publication when %s fails', failure => {
    const f = fixture(failure); expect(f.release).toThrow();
    expect(f.calls.some(args => ['deploy','versions'].includes(args[0]))).toBe(false);
  });
  it('keeps preview migrations and upload isolated from production', () => {
    const f = fixture('', true); f.release();
    expect(f.calls.at(-1)).toEqual(['versions','upload','--config','wrangler.jsonc','--env','preview','--strict']);
    expect(f.calls.filter(args => args[0] === 'd1').every(args => args.includes('avyron-db-preview'))).toBe(true);
  });
  it('rejects CI name overrides before touching a database', () => {
    expect(() => releaseApi({preview:true, ciName:'avyrontech', checkAssets:false, run:() => {throw new Error('unexpected database access');}})).toThrow('refusing a CI Worker-name override');
  });
});
