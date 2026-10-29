// @vitest-environment node
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from 'node:sqlite';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { isReservedPlatformEmail, platformRoleForUser } from '../../cloudflare/workers/api/src/authorization';
import { promotionsRouter } from '../../cloudflare/workers/api/src/promotions';
import { seedRouter } from '../../cloudflare/workers/api/src/seed';
import { workspaceRouter } from '../../cloudflare/workers/api/src/workspace';
import type { AppBindings } from '../../cloudflare/workers/api/src/types';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
const migrations = readdirSync('cloudflare/d1/migrations').filter((name) => name.endsWith('.sql')).sort();
const ownerEmails = ['prometheus@avyron.ro', 'avyrontech@gmail.com', 'anisoara@avyron.ro'];

class Statement {
  values: SQLInputValue[] = [];
  constructor(private readonly db: SqliteDatabase, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

function makeDatabase(withAnisoara = true, suspendAvyron = false, verifyAnisoara = true) {
  const db = new DatabaseSync(':memory:');
  for (const name of migrations.filter((name) => !name.startsWith('0073_'))) {
    db.exec(readFileSync(`cloudflare/d1/migrations/${name}`, 'utf8'));
  }
  const accounts = [
    ['prometheus', ownerEmails[0]],
    ['avyrontech', ownerEmails[1]],
    ...(withAnisoara ? [['anisoara', ownerEmails[2]]] : []),
    ['ordinary-admin', 'ordinary@example.test'],
  ];
  for (const [id, email] of accounts) {
    db.prepare('INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,?,1,1)')
      .run(id, email, 'fixture', id === 'anisoara' && !verifyAnisoara ? 0 : 1);
    db.prepare('INSERT INTO user_roles(user_id,role) VALUES (?,?)').run(id, id === 'anisoara' ? 'user' : 'admin');
  }
  if (suspendAvyron) db.exec("UPDATE platform_principals SET status='suspended' WHERE email='avyrontech@gmail.com'");
  db.exec(readFileSync('cloudflare/d1/migrations/0073_platform_owner_team.sql', 'utf8'));
  return db;
}

function binding(db: SqliteDatabase) {
  return {
    prepare: (sql: string) => new Statement(db, sql),
    batch: async (statements: Statement[]) => {
      db.exec('BEGIN');
      try {
        const result = statements.map((statement) => ({ meta: db.prepare(statement.sql).run(...statement.values) }));
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;
}

describe('designated platform owners', () => {
  let db: SqliteDatabase;
  beforeEach(() => { db = makeDatabase(); });

  it('promotes all three verified active identities, never an ordinary admin', async () => {
    const d1 = binding(db);
    for (const id of ['prometheus', 'avyrontech', 'anisoara']) {
      expect(await platformRoleForUser(d1, id)).toBe('platform_owner');
    }
    expect(db.prepare("SELECT role FROM user_roles WHERE user_id='anisoara' AND role='admin'").get()?.role).toBe('admin');
    expect(await platformRoleForUser(d1, 'ordinary-admin')).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM platform_principals WHERE role='platform_owner' AND status='active'").get()?.n).toBe(3);
  });

  it('fails closed for unverified, disabled, suspended and demoted accounts', async () => {
    const d1 = binding(db);
    db.exec("UPDATE users SET email_verified=0 WHERE id='anisoara'");
    expect(await platformRoleForUser(d1, 'anisoara')).toBeNull();
    db.exec("UPDATE users SET email_verified=1,disabled_at=1 WHERE id='anisoara'");
    expect(await platformRoleForUser(d1, 'anisoara')).toBeNull();
    db.exec("UPDATE users SET disabled_at=NULL WHERE id='anisoara'; UPDATE platform_principals SET status='suspended' WHERE email='anisoara@avyron.ro'");
    expect(await platformRoleForUser(d1, 'anisoara')).toBeNull();
    db.exec("UPDATE platform_principals SET status='active' WHERE email='anisoara@avyron.ro'; DELETE FROM user_roles WHERE user_id='anisoara' AND role='admin'");
    expect(await platformRoleForUser(d1, 'anisoara')).toBeNull();
    expect(await isReservedPlatformEmail(d1, ownerEmails[2].toUpperCase())).toBe(true);
  });

  it('does not create an account or a password for an absent owner', async () => {
    const withoutAccount = makeDatabase(false);
    expect(withoutAccount.prepare("SELECT COUNT(*) AS n FROM users WHERE email='anisoara@avyron.ro'").get()?.n).toBe(0);
    expect(withoutAccount.prepare("SELECT role FROM platform_principals WHERE email='anisoara@avyron.ro'").get()?.role).toBe('platform_owner');
    expect(await platformRoleForUser(binding(withoutAccount), 'anisoara')).toBeNull();
    withoutAccount.close();
  });

  it('preserves an existing suspension during the migration', async () => {
    const suspended = makeDatabase(true, true);
    expect(suspended.prepare("SELECT status,role FROM platform_principals WHERE email='avyrontech@gmail.com'").get())
      .toMatchObject({ status: 'suspended', role: 'superadmin' });
    expect(await platformRoleForUser(binding(suspended), 'avyrontech')).toBeNull();
    suspended.close();
  });

  it('does not auto-promote a pre-existing unverified owner email', async () => {
    const unverified = makeDatabase(true, false, false);
    expect(unverified.prepare("SELECT COUNT(*) AS n FROM user_roles WHERE user_id='anisoara' AND role='admin'").get()?.n).toBe(0);
    expect(await platformRoleForUser(binding(unverified), 'anisoara')).toBeNull();
    unverified.close();
  });

  it('allows each owner to manage promotions and rejects ordinary or unverified admins', async () => {
    let actor = 'prometheus';
    const app = new Hono<AppBindings>();
    app.use('*', async (c, next) => { c.set('userId', actor); c.set('roles', ['admin']); c.set('mfaVerified', true); await next(); });
    app.route('/', promotionsRouter);
    const env = { DB: binding(db) } as AppBindings['Bindings'];
    for (const id of ['prometheus', 'avyrontech', 'anisoara']) {
      actor = id;
      expect((await app.request('/api/promotions/admin', {}, env)).status).toBe(200);
    }
    actor = 'ordinary-admin';
    expect((await app.request('/api/promotions/admin', {}, env)).status).toBe(403);
    db.exec("UPDATE users SET email_verified=0 WHERE id='anisoara'");
    actor = 'anisoara';
    expect((await app.request('/api/promotions/admin', {}, env)).status).toBe(403);
  });

  it('does not let the legacy seed token reset or manufacture an owner account', async () => {
    const app = new Hono();
    app.route('/', seedRouter);
    const env = { DB: binding(db), SEED_TOKEN: 'fixture-seed-token' } as AppBindings['Bindings'];
    const before = db.prepare("SELECT password_hash FROM users WHERE id='avyrontech'").get()?.password_hash;
    const response = await app.request('/api/admin/import-users', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-seed-token': 'fixture-seed-token' },
      body: JSON.stringify({ users: [
        { email: ownerEmails[1], temporaryPassword: 'AnotherPassword123', roles: ['admin'], updateExisting: true },
        { email: ownerEmails[2], temporaryPassword: 'AnotherPassword123', roles: ['admin'], updateExisting: true },
      ] }),
    }, env);
    expect(response.status).toBe(201);
    const result = await response.json() as { report: Array<{ status: string }> };
    expect(result.report.map((entry) => entry.status)).toEqual(['invalid', 'invalid']);
    expect(db.prepare("SELECT password_hash FROM users WHERE id='avyrontech'").get()?.password_hash).toBe(before);
  });

  it('permits only an owner to promote a verified reserved account through workspace access', async () => {
    db.prepare('INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,?,1,1)')
      .run('delegated', 'delegated@example.test', 'fixture', 1);
    db.exec("INSERT INTO user_roles(user_id,role) VALUES ('delegated','admin'); INSERT INTO platform_principals(email,role,status,created_at,updated_at) VALUES ('delegated@example.test','superadmin','active',1,1)");
    db.exec("DELETE FROM user_roles WHERE user_id='anisoara' AND role='admin'; UPDATE users SET email_verified=0 WHERE id='anisoara'");
    let actor = 'prometheus';
    const app = new Hono<AppBindings>();
    app.use('*', async (c, next) => { c.set('userId', actor); c.set('roles', ['admin']); c.set('mfaVerified', true); await next(); });
    app.route('/', workspaceRouter);
    const env = { DB: binding(db) } as AppBindings['Bindings'];
    const request = () => app.request('/api/workspace/account-access/anisoara', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'owner-promotion-fixture-123' },
      body: JSON.stringify({ client_ids: [], access_level: 'admin' }),
    }, env);
    expect((await request()).status).toBe(409);
    db.exec("UPDATE users SET email_verified=1 WHERE id='anisoara'");
    actor = 'delegated';
    expect((await request()).status).toBe(403);
    actor = 'prometheus';
    expect((await request()).status).toBe(200);
    expect(await platformRoleForUser(env.DB, 'anisoara')).toBe('platform_owner');
  });
});
