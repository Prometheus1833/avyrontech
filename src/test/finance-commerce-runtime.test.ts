// @vitest-environment node
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from 'node:sqlite';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it,vi } from 'vitest';
import { financeRouter } from '../../cloudflare/workers/api/src/finance';
import { catalogCodesRouter } from '../../cloudflare/workers/api/src/catalogCodes';
import { productSalesRouter } from '../../cloudflare/workers/api/src/productSales';
import { produseShopRouter } from '../../cloudflare/workers/api/src/produseShop';
import { produseCheckoutRouter } from '../../cloudflare/workers/api/src/produseCheckoutV2';
import { nextCommercialIdentity } from '@/shared/commercialIdentity';
import { billingConfiguration, billingRouter } from '../../cloudflare/workers/api/src/billing';
import type { Env } from '../../cloudflare/workers/api/src/types';
import {bouncerFixture,fixtureScannerSettings,malwareBucket} from './helpers/bouncerFixture';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
class Statement {
    values: SQLInputValue[] = [];
    constructor(readonly db: SqliteDatabase, readonly sql: string) { }
    bind(...v: SQLInputValue[]) { this.values = v; return this; }
    async first() { return this.db.prepare(this.sql).get(...this.values) || null; }
    async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
    async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}
describe('Financial configuration and product sales — actual handlers and all migrations', () => {
    let db: SqliteDatabase, app: Hono, actor: string, mfa: boolean, stamp: number;
    let mfaPolicy: string | undefined;
    let bucket:ReturnType<typeof malwareBucket>,scannerConfig:Record<string,string>;
    beforeEach(() => {
        db = new DatabaseSync(':memory:');
        for (const file of readdirSync('cloudflare/d1/migrations').filter(f => f.endsWith('.sql')).sort())
            db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, 'utf8'));
        stamp = Date.now();
        for (const [id, email] of [['owner', 'prometheus@avyron.ro'], ['super', 'superadmin@example.test'], ['staff', 'staff@example.test'], ['client', 'client@example.test']]) {
            db.prepare('INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(id, email, 'fixture', stamp, stamp);
            db.prepare('INSERT INTO user_roles VALUES(?,?)').run(id, ['owner', 'super'].includes(id) ? 'admin' : id === 'staff' ? 'staff' : 'user');
        }
        db.prepare("INSERT INTO platform_principals(email,role,status,created_at,updated_at) VALUES('superadmin@example.test','superadmin','active',?,?)").run(stamp,stamp);
        bucket=malwareBucket();scannerConfig={};
        actor = 'owner';
        mfa = true;
        mfaPolicy = undefined;
        const binding = { prepare: (sql: string) => new Statement(db, sql), batch: async (statements: Statement[]) => { db.exec('BEGIN'); try {
                const result = [];
                for (const s of statements)
                    result.push(await s.run());
                db.exec('COMMIT');
                return result;
            }
            catch (e) {
                db.exec('ROLLBACK');
                throw e;
            } } };
        app = new Hono();
        app.use('*', async (c, next) => { Object.assign(c.env, { DB: binding, FILES: bucket, ...scannerConfig, STRIPE_SECRET_KEY: 'sk_live_fixture', STRIPE_WEBHOOK_SECRET: 'fixture', STRIPE_ACCOUNT_ID: 'acct_fixture', APP_ENV: 'production', MFA_AUTH_ENABLED: mfaPolicy }); c.set('userId', actor); c.set('roles', actor === 'client' ? ['user'] : actor === 'staff' ? ['staff'] : ['admin']); c.set('mfaVerified', mfa); await next(); });
        app.onError(e => { throw e; });
        app.route('/', financeRouter);
        app.route('/', catalogCodesRouter);
        app.route('/', productSalesRouter);
        app.route('/', produseCheckoutRouter);
        app.route('/', produseShopRouter);
        app.route('/', billingRouter);
    });
    afterEach(() => {db.close();vi.unstubAllGlobals()});
    const request = (path: string, body: unknown, method = 'POST') => app.request(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, {});
    const account = () => ({ name: 'Cont RON', institution: 'Bancă', internalAlias: 'Operațional', currency: 'RON', accountType: 'bank', ibanLast4: 'AB12', purpose: 'Operațiuni', status: 'active', expectedUpdatedAt: stamp, confirmed: true });
    const seedAccount = () => db.prepare("INSERT INTO financial_accounts(id,name,institution,currency,account_type,internal_alias,status,source,created_at,updated_at) VALUES('fixture','Nume','Bancă','RON','bank','Alias','needs_configuration','manual',?,?)").run(stamp, stamp);
    const sync = () => request('/api/finance/commercial-codes/sync', {});
    async function seedSale() { await sync(); const slug = 'logo-studio-3d'; db.prepare("UPDATE commercial_catalog_codes SET active=1,base_price_minor=7500,currency='RON',tax_status='verified',price_model='fixed',billing_cycle='one_time',invoice_provider='manual',updated_at=? WHERE entity_type='product' AND entity_key=?").run(stamp, slug); db.prepare("INSERT INTO product_sales_profiles VALUES(?,'Licență','Condiții licență confirmate pentru produsul de test.',1,'assisted','Livrare în fluxul dedicat Logo Studio 3D.','owner',?)").run(slug, stamp); return slug; }
    const activate = (slug: string) => request(`/api/produse/admin/sales/${slug}/activate`, { confirmed: true, expectedProductAt: db.prepare('SELECT updated_at FROM product_items WHERE slug=?').get(slug)!.updated_at, expectedCodeAt: db.prepare("SELECT updated_at FROM commercial_catalog_codes WHERE entity_type='product' AND entity_key=?").get(slug)!.updated_at, expectedProfileAt: stamp });
    it('allows a platform Super Admin to configure and activate an internal account', async () => { seedAccount(); actor = 'super'; const res = await request('/api/finance/accounts/fixture', account(), 'PATCH'); expect(res.status).toBe(200); expect(db.prepare("SELECT status FROM financial_accounts WHERE id='fixture'").get()!.status).toBe('active'); expect(db.prepare("SELECT count(*) n FROM financial_audit_events WHERE action='finance.accounts.update'").get()!.n).toBe(1); });
    it.each(['staff', 'client'])('denies account and product mutations to %s', async (who) => { seedAccount(); actor = who; expect((await request('/api/finance/accounts/fixture', account(), 'PATCH')).status).toBe(403); expect((await request('/api/produse/admin/sales/logo-studio-3d', {}, 'PUT')).status).toBe(403); });
    it('keeps MFA required for financial and sales writes', async () => { seedAccount(); mfa = false; expect((await request('/api/finance/accounts/fixture', account(), 'PATCH')).status).toBe(403); expect((await request('/api/produse/admin/sales/logo-studio-3d', {}, 'PUT')).status).toBe(403); });
    it('honors the explicit MFA exception for authorized finance and sales while retaining RBAC', async () => {
      seedAccount(); mfa = false; mfaPolicy = 'false';
      expect((await request('/api/finance/accounts/fixture', account(), 'PATCH')).status).toBe(200);
      const slug = await seedSale();
      const body = { licenseName: 'Licență', licenseTerms: 'Condiții confirmate pentru produs, care păstrează drepturile terților.', licenseApproved: true, deliveryMode: 'assisted', deliveryInstructions: 'Livrare în fluxul dedicat pentru Logo Studio.', expectedUpdatedAt: stamp };
      expect((await request(`/api/produse/admin/sales/${slug}`, body, 'PUT')).status).toBe(200);
      actor = 'client';
      expect((await request('/api/finance/accounts/fixture', account(), 'PATCH')).status).toBe(403);
      expect((await request(`/api/produse/admin/sales/${slug}`, body, 'PUT')).status).toBe(403);
    });
    it('keeps billing verification fail-closed except for the explicit disabled policy, without external calls', async () => {
      mfa = false;
      for (const policy of [undefined, 'true', 'invalid']) {
        mfaPolicy = policy;
        expect((await request('/api/billing/admin/connections/unsupported/verify', {})).status).toBe(403);
      }
      mfaPolicy = 'false';
      expect((await request('/api/billing/admin/connections/unsupported/verify', {})).status).toBe(404);
      actor = 'client';
      expect((await request('/api/billing/admin/connections/unsupported/verify', {})).status).toBe(403);
    });
    it('requires granular billing permissions and observes their revocation immediately', async () => {
      mfa = false; mfaPolicy = 'false'; actor = 'staff';
      expect((await app.request('/api/billing/admin/status', {}, {})).status).toBe(403);
      expect((await request('/api/billing/admin/invoices/order-1/retry', {})).status).toBe(403);
      db.prepare("INSERT INTO user_capabilities(id,user_id,capability,reason,created_at) VALUES('billing-read','staff','finance.read','Release fixture',?),('billing-write','staff','finance.write','Release fixture',?)").run(stamp,stamp);
      const response = await app.request('/api/billing/admin/status', {}, {});
      expect(response.status).toBe(200);
      expect((await response.json()).security).toMatchObject({mfaVerified:false,mfaSatisfied:true,canVerify:false});
      expect((await request('/api/billing/admin/invoices/order-1/retry', {})).status).toBe(409);
      db.prepare("UPDATE user_capabilities SET revoked_at=? WHERE user_id='staff'").run(stamp);
      expect((await app.request('/api/billing/admin/status', {}, {})).status).toBe(403);
      expect((await request('/api/billing/admin/invoices/order-1/retry', {})).status).toBe(403);
    });
    it('rejects stale versions, duplicate aliases and secret/card fields without changing data', async () => { seedAccount(); expect((await request('/api/finance/accounts/fixture', { ...account(), expectedUpdatedAt: stamp - 1 }, 'PATCH')).status).toBe(409); expect((await request('/api/finance/accounts/fixture', { ...account(), cardNumber: '1234' }, 'PATCH')).status).toBe(400); expect((await request('/api/finance/accounts/fixture', { ...account(), internalAlias: 'AVYRON RON' }, 'PATCH')).status).toBe(409); expect(db.prepare("SELECT status FROM financial_accounts WHERE id='fixture'").get()!.status).toBe('needs_configuration'); });
    it('archives records while retaining transaction references and audit', async () => { seedAccount(); expect((await request('/api/finance/accounts/fixture', { ...account(), status: 'archived' }, 'PATCH')).status).toBe(200); expect(db.prepare("SELECT archived_at FROM financial_accounts WHERE id='fixture'").get()!.archived_at).toBeTruthy(); expect((await (await app.request('/api/finance/accounts', {}, {})).json()).accounts.some((r: {
        id: string;
    }) => r.id === 'fixture')).toBe(false); });
    it('completes missing identities idempotently without modifying reviewed codes or prices', async () => { expect((await sync()).status).toBe(200); const before = db.prepare('SELECT sku,accounting_code,base_price_minor FROM commercial_catalog_codes ORDER BY id').all(); const second = await (await sync()).json(); expect(second.created).toBe(0); expect(second.completed).toBe(0); expect(db.prepare('SELECT sku,accounting_code,base_price_minor FROM commercial_catalog_codes ORDER BY id').all()).toEqual(before); expect(db.prepare("SELECT accounting_code FROM commercial_catalog_codes WHERE entity_type='service' AND entity_key='premium-website'").get()!.accounting_code).toBe('AVS001'); expect(db.prepare("SELECT count(*) n FROM commercial_catalog_codes WHERE entity_type='product' AND accounting_code LIKE 'AVD%' AND sku IS NOT NULL").get()!.n).toBe(87); });
    it('keeps masked method identity and revision available for editing',async()=>{
      seedAccount();db.prepare("INSERT INTO financial_payment_methods(id,account_id,provider,alias,last4,currency,purpose,status,created_at,updated_at) VALUES('method','fixture','Bancă','Card','1234','RON','Operațiuni','inactive',?,?)").run(stamp,stamp);
      const response=await app.request('/api/finance/accounts',{},{}),body=await response.json();
      expect(body.methods[0]).toMatchObject({id:'method',status:'inactive',updated_at:stamp,last4:'1234',display:'•••• 1234'});
      expect((await request('/api/finance/payment-methods/method',{provider:'Bancă',alias:'Card',accountId:'fixture',last4:'1234',currency:'RON',purpose:'Operațiuni',status:'active',expectedUpdatedAt:stamp,confirmed:true},'PATCH')).status).toBe(200);
      expect(db.prepare("SELECT status FROM financial_payment_methods WHERE id='method'").get()!.status).toBe('active');
    });
    it('preserves existing SKU while filling an article code', async () => { await sync(); db.prepare("UPDATE commercial_catalog_codes SET accounting_code=NULL,sku='KEEP-LEGACY' WHERE entity_type='product' AND entity_key='logo-studio-3d'").run(); expect((await (await sync()).json()).completed).toBe(1); expect(db.prepare("SELECT sku,accounting_code FROM commercial_catalog_codes WHERE sku='KEEP-LEGACY'").get()).toMatchObject({ sku: 'KEEP-LEGACY', accounting_code: expect.stringMatching(/^AVD\d+$/) }); });
    it('reports actual missing conditions and exposes no R2 object keys', async () => { const response = await app.request('/api/produse/admin/sales/readiness', {}, {}), data = await response.json(); expect(response.status).toBe(200); expect(data.data).toHaveLength(87); expect(data.data.some((r: {
        checks: {
            ok: boolean;
        }[];
    }) => r.checks.every(c => c.ok))).toBe(false); expect(JSON.stringify(data)).not.toContain('r2_key'); });
    it('requires a verified real processor before activation', async () => { const slug = await seedSale(); const res = await activate(slug); expect(res.status).toBe(409); expect((await res.json()).error.code).toBe('verified_provider_required'); });
    it('activates complete assisted Logo Studio sales with a fresh provider record', async () => { const slug = await seedSale(); db.prepare("INSERT INTO financial_provider_connections(id,provider,status,capabilities_json,created_at,updated_at) VALUES('connection','stripe','connected','[]',?,?)").run(stamp, stamp); expect((await activate(slug)).status).toBe(200); expect(db.prepare("SELECT payment_status FROM commercial_catalog_codes WHERE entity_key=? AND entity_type='product'").get(slug)!.payment_status).toBe('active'); });
    it('rejects obsolete provider proof and download versions without verified objects', async () => { const slug = await seedSale(); db.prepare("INSERT INTO financial_provider_connections(id,provider,status,capabilities_json,created_at,updated_at) VALUES('connection','stripe','connected','[]',?,?)").run(stamp - 90000000, stamp - 90000000); expect((await activate(slug)).status).toBe(409); db.prepare("UPDATE financial_provider_connections SET updated_at=?").run(stamp); db.prepare("UPDATE product_sales_profiles SET delivery_mode='download'").run(); db.prepare("INSERT INTO product_versions VALUES('v',?,'1.0.0','private/key','hash',123,'',?)").run(slug, stamp); expect((await (await activate(slug)).json()).error.code).toBe('delivery_not_verified'); });
    it('editing licence revokes sale activation and enforces CAS', async () => { const slug = await seedSale(); db.prepare("UPDATE commercial_catalog_codes SET payment_status='active' WHERE entity_key=?").run(slug); const body = { licenseName: 'Licență', licenseTerms: 'Condiții confirmate pentru produs, care păstrează drepturile terților.', licenseApproved: true, deliveryMode: 'assisted', deliveryInstructions: 'Livrare în fluxul dedicat pentru Logo Studio.', expectedUpdatedAt: stamp }; expect((await request(`/api/produse/admin/sales/${slug}`, body, 'PUT')).status).toBe(200); expect(db.prepare("SELECT payment_status FROM commercial_catalog_codes WHERE entity_key=?").get(slug)!.payment_status).toBe('needs_configuration'); expect((await request(`/api/produse/admin/sales/${slug}`, body, 'PUT')).status).toBe(409); });
    it('verifies external packages before registration and activates only the clean real object',async()=>{
      const slug=await seedSale();scannerConfig={...fixtureScannerSettings};bouncerFixture();
      db.prepare("UPDATE product_sales_profiles SET delivery_mode='download' WHERE slug=?").run(slug);
      const form=new FormData();form.set('version','1.0.0');form.set('file',new File([new Uint8Array([0x50,0x4b,3,4,1,2,3,4])],'fixture.zip',{type:'application/zip'}));
      const response=await app.request(`/api/produse/admin/sales/${slug}/package`,{method:'POST',body:form},{});expect(response.status).toBe(200);
      expect(db.prepare('SELECT count(*) n FROM product_versions WHERE slug=?').get(slug)!.n).toBe(1);
      db.prepare("INSERT INTO financial_provider_connections(id,provider,status,capabilities_json,created_at,updated_at) VALUES('connection','stripe','connected','[]',?,?)").run(stamp,stamp);
      expect((await activate(slug)).status).toBe(200);
      db.prepare("INSERT INTO product_entitlements(id,user_id,slug,source,granted_at) VALUES('client-access','client',?,'grant',?)").run(slug,stamp);
      actor='client';const download=await app.request(`/api/produse/account/download/${slug}`,{},{});expect(download.status).toBe(200);expect(download.headers.get('cache-control')).toBe('private, no-store');expect(new Uint8Array(await download.arrayBuffer())).toEqual(new Uint8Array([0x50,0x4b,3,4,1,2,3,4]));
      db.prepare("UPDATE product_entitlements SET revoked_at=? WHERE id='client-access'").run(stamp);expect((await app.request(`/api/produse/account/download/${slug}`,{},{})).status).toBe(402);
    });
    it.each(['pending','malicious','suspicious'] as const)('never registers an external %s package',async verdict=>{
      const slug=await seedSale();scannerConfig={...fixtureScannerSettings};bouncerFixture(verdict);const form=new FormData();form.set('version','1.0.0');form.set('file',new File([new Uint8Array([0x50,0x4b,3,4,1])],'fixture.zip',{type:'application/zip'}));
      const response=await app.request(`/api/produse/admin/sales/${slug}/package`,{method:'POST',body:form},{});expect(response.status).not.toBe(200);expect(db.prepare('SELECT count(*) n FROM product_versions WHERE slug=?').get(slug)!.n).toBe(0);
    });
    it('legacy checkout cannot sell a draft or an unconfigured digital item', async () => { expect((await request('/api/produse/account/checkout', { kind: 'item', id: 'logo-studio-3d', provider: 'stripe' })).status).toBe(404); expect(db.prepare('SELECT count(*) n FROM commerce_orders').get()!.n).toBe(0); });
    it('configuration returns only field names and presence flags, never credentials', () => { const data = billingConfiguration({ STRIPE_SECRET_KEY: 'secret_value', STRIPE_ACCOUNT_ID: 'account_value' } as Env); expect(JSON.stringify(data)).not.toContain('secret_value'); expect(JSON.stringify(data)).not.toContain('account_value'); expect(data.stripe.fields.find(f => f.name === 'STRIPE_SECRET_KEY')?.configured).toBe(true); });
});
it('allocates new codes without renaming existing identities or colliding with used articles', () => { expect(nextCommercialIdentity('service', 'premium-website', 'presence', [])).toEqual({ sku: 'AVY-SRV-WEB-001', accounting_code: 'AVS001' }); expect(nextCommercialIdentity('product', 'new', 'effect', [{ sku: 'old', accounting_code: 'AVD0099' }])).toEqual({ sku: 'AVY-DIG-3DE-0100', accounting_code: 'AVD0100' }); });
