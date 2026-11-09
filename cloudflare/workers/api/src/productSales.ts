import { financialMfaSatisfied } from "./mfaPolicy";
import { productSaleChecks, type SalesRow } from "../../../../src/shared/productSales";
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings } from './types';
import { platformRoleForUser } from './authorization';
import { providerCapabilities } from './billing';
import { scanUpload, antivirusFailure, putScannedObject, getScannedObject, bytesHash } from './malware';
export const productSalesRouter = new Hono<AppBindings>();
export async function salesRows(db: D1Database, slug?: string) {
    return (await db.prepare(`SELECT p.slug,p.name_ro,p.type,p.status,p.price_ron_cents,p.updated_at product_updated_at,c.id catalog_id,c.sku,c.accounting_code,c.base_price_minor,c.currency,c.tax_status,c.price_model,c.billing_cycle,c.payment_status,c.preferred_payment_provider,c.active,c.invoice_provider,c.vat_basis_points,c.unit_label,c.updated_at code_updated_at,s.license_name,s.license_terms,s.license_approved,s.delivery_mode,s.delivery_instructions,s.updated_at profile_updated_at,v.version,v.sha256,v.bytes FROM product_items p LEFT JOIN commercial_catalog_codes c ON c.entity_type='product' AND c.entity_key=p.slug LEFT JOIN product_sales_profiles s ON s.slug=p.slug LEFT JOIN product_versions v ON v.id=(SELECT id FROM product_versions WHERE slug=p.slug ORDER BY created_at DESC,id DESC LIMIT 1) ${slug ? 'WHERE p.slug=?' : ''} ORDER BY p.slug`).bind(...(slug ? [slug] : [])).all<SalesRow>()).results;
}
productSalesRouter.use('/api/produse/admin/sales/*', async (c, next) => {
    if (!await platformRoleForUser(c.env.DB, c.get('userId')))
        return c.json({ error: { code: 'forbidden' } }, 403);
    if (c.req.method !== 'GET' && !(await financialMfaSatisfied(c)))
        return c.json({ error: { code: 'mfa_required' } }, 403);
    await next();
});
productSalesRouter.get('/api/produse/admin/sales/readiness', async (c) => {
    const rows = await salesRows(c.env.DB);
    return c.json({ data: rows.map(row => ({ ...row, license_terms: undefined, delivery_instructions: undefined, checks: productSaleChecks(row) })) });
});
productSalesRouter.get('/api/produse/admin/sales/:slug', async (c) => {
    const row = (await salesRows(c.env.DB, c.req.param('slug')))[0];
    if (!row)
        return c.json({ error: { code: 'not_found' } }, 404);
    return c.json({ data: row, checks: productSaleChecks(row) });
});
const profile = z.object({ licenseName: z.string().trim().min(2).max(160), licenseTerms: z.string().trim().min(40).max(12000), licenseApproved: z.boolean(), deliveryMode: z.enum(['download', 'assisted']), deliveryInstructions: z.string().trim().max(4000), expectedUpdatedAt: z.number().int().nonnegative().nullable() }).strict();
productSalesRouter.put('/api/produse/admin/sales/:slug', async (c) => {
    const parsed = profile.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
        return c.json({ error: { code: 'invalid_sales_profile' } }, 400);
    const slug = c.req.param('slug'), b = parsed.data, row = (await salesRows(c.env.DB, slug))[0];
    if (!row)
        return c.json({ error: { code: 'not_found' } }, 404);
    if (b.deliveryMode === 'assisted' && (slug !== 'logo-studio-3d' || b.deliveryInstructions.length < 20))
        return c.json({ error: { code: 'assisted_delivery_not_configured' } }, 400);
    if (row.profile_updated_at !== b.expectedUpdatedAt)
        return c.json({ error: { code: 'revision_conflict' } }, 409);
    const time = Math.max(Date.now(), (b.expectedUpdatedAt || 0) + 1), auditId = crypto.randomUUID();
    const result = await c.env.DB.batch([
        c.env.DB.prepare(`INSERT INTO product_sales_profiles(slug,license_name,license_terms,license_approved,delivery_mode,delivery_instructions,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET license_name=excluded.license_name,license_terms=excluded.license_terms,license_approved=excluded.license_approved,delivery_mode=excluded.delivery_mode,delivery_instructions=excluded.delivery_instructions,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE product_sales_profiles.updated_at=?`).bind(slug, b.licenseName, b.licenseTerms, b.licenseApproved ? 1 : 0, b.deliveryMode, b.deliveryInstructions, c.get('userId'), time, b.expectedUpdatedAt),
        c.env.DB.prepare("UPDATE commercial_catalog_codes SET payment_status='needs_configuration',updated_at=?,updated_by=? WHERE entity_type='product' AND entity_key=? AND EXISTS(SELECT 1 FROM product_sales_profiles WHERE slug=? AND updated_at=?)").bind(time, c.get('userId'), slug, slug, time),
        c.env.DB.prepare("INSERT INTO audit_log(user_id,action,meta_json,created_at) SELECT ?,'product.sales.profile',?,? WHERE EXISTS(SELECT 1 FROM product_sales_profiles WHERE slug=? AND updated_at=?)").bind(c.get('userId'), JSON.stringify({ id: auditId, slug, licenseApproved: b.licenseApproved, deliveryMode: b.deliveryMode }), time, slug, time),
    ]);
    if (!Number(result[0].meta.changes))
        return c.json({ error: { code: 'revision_conflict' } }, 409);
    return c.json({ ok: true });
});
const activate = z.object({ confirmed: z.literal(true), expectedProductAt: z.number().int(), expectedCodeAt: z.number().int(), expectedProfileAt: z.number().int() }).strict();
productSalesRouter.post('/api/produse/admin/sales/:slug/activate', async (c) => {
    const parsed = activate.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
        return c.json({ error: { code: 'confirmation_required' } }, 400);
    const row = (await salesRows(c.env.DB, c.req.param('slug')))[0];
    if (!row)
        return c.json({ error: { code: 'not_found' } }, 404);
    const b = parsed.data;
    if (row.product_updated_at !== b.expectedProductAt || row.code_updated_at !== b.expectedCodeAt || row.profile_updated_at !== b.expectedProfileAt)
        return c.json({ error: { code: 'revision_conflict' } }, 409);
    if (!row.price_ron_cents)
        return c.json({ error: { code: 'free_product_no_checkout' } }, 409);
    const missing = productSaleChecks(row).filter(c => !c.ok);
    if (missing.length)
        return c.json({ error: { code: 'product_not_ready', missing: missing.map(c => c.key) } }, 409);
    const provider = row.preferred_payment_provider === 'revolut' ? 'revolut_merchant' : 'stripe';
    if (row.preferred_payment_provider === 'netopia')
        return c.json({ error: { code: 'unsupported_provider' } }, 409);
    const connection = await c.env.DB.prepare("SELECT updated_at FROM financial_provider_connections WHERE provider=? AND status='connected' AND last_error_code IS NULL ORDER BY updated_at DESC LIMIT 1").bind(provider).first<{
        updated_at: number;
    }>();
    const configured = providerCapabilities(c.env)[provider === 'stripe' ? 'stripe' : 'revolut'].enabled;
    if (!configured || !connection || Date.now() - connection.updated_at > 86400000)
        return c.json({ error: { code: 'verified_provider_required', message: 'Verifică accesul API în Financiar → Conturi și facturare (dovadă de maximum 24 h).' } }, 409);
    if (row.invoice_provider === 'oblio') {
        const billing = providerCapabilities(c.env).oblio;
        if(!Number.isFinite(Number(c.env.OBLIO_VAT_PERCENTAGE))||Math.round(Number(c.env.OBLIO_VAT_PERCENTAGE)*100)!==row.vat_basis_points)return c.json({error:{code:'vat_configuration_mismatch',message:'Regimul TVA al articolului trebuie aliniat configurației Oblio confirmate.'}},409);
        const oblio = await c.env.DB.prepare("SELECT 1 FROM financial_provider_connections WHERE provider='oblio' AND status='connected' AND last_error_code IS NULL AND updated_at>? LIMIT 1").bind(Date.now() - 86400000).first();
        if (!billing.enabled || !oblio)
            return c.json({ error: { code: 'verified_invoicing_required', message: 'Verifică și autorizează facturarea Oblio sau selectează facturarea manuală.' } }, 409);
    }
    if (row.delivery_mode === 'download') {
        const version = await c.env.DB.prepare('SELECT r2_key FROM product_versions WHERE slug=? AND version=?').bind(row.slug, row.version).first<{
            r2_key: string;
        }>();
        const object = version ? await getScannedObject(c.env, 'FILES', version.r2_key) : null;
        if (!object)
            return c.json({ error: { code: 'delivery_not_verified' } }, 409);
        await object.body.cancel();
    }
    const time = Math.max(Date.now(), b.expectedCodeAt + 1);
    const result = await c.env.DB.batch([c.env.DB.prepare("UPDATE commercial_catalog_codes SET payment_status='active',updated_at=?,updated_by=? WHERE id=? AND updated_at=? AND EXISTS(SELECT 1 FROM product_items WHERE slug=? AND updated_at=?) AND EXISTS(SELECT 1 FROM product_sales_profiles WHERE slug=? AND updated_at=? AND license_approved=1)").bind(time, c.get('userId'), row.catalog_id, b.expectedCodeAt, row.slug, b.expectedProductAt, row.slug, b.expectedProfileAt), c.env.DB.prepare("INSERT INTO commercial_catalog_audit(id,catalog_id,actor_user_id,before_json,after_json,created_at) SELECT ?,?,?,?, ?,? WHERE EXISTS(SELECT 1 FROM commercial_catalog_codes WHERE id=? AND updated_at=?)").bind(crypto.randomUUID(), row.catalog_id, c.get('userId'), JSON.stringify({ paymentStatus: row.payment_status }), JSON.stringify({ paymentStatus: 'active', provider, providerVerifiedAt: connection.updated_at }), time, row.catalog_id, time)]);
    if (!Number(result[0].meta.changes))
        return c.json({ error: { code: 'revision_conflict' } }, 409);
    return c.json({ ok: true });
});
productSalesRouter.post('/api/produse/admin/sales/:slug/package', async (c) => {
    const slug = c.req.param('slug');
    if (!await c.env.DB.prepare('SELECT 1 FROM product_items WHERE slug=?').bind(slug).first())
        return c.json({ error: { code: 'not_found' } }, 404);
    const length = Number(c.req.header('content-length') || 0);
    if (length > 25001024)
        return c.json({ error: { code: 'file_too_large' } }, 413);
    const form = await c.req.formData().catch(() => null), file = form?.get('file'), version = String(form?.get('version') || '');
    if (!(file instanceof File) || file.size > 25000000 || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(version))
        return c.json({ error: { code: 'invalid_product_package' } }, 400);
    if (await c.env.DB.prepare('SELECT 1 FROM product_versions WHERE slug=? AND version=?').bind(slug, version).first())
        return c.json({ error: { code: 'version_exists' } }, 409);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4)
        return c.json({ error: { code: 'zip_required' } }, 400);
    const scan = await scanUpload(c.env, bytes, { source: 'products', scope: `product:${slug}`, mimeType: 'application/zip', actorId: c.get('userId') });
    if (scan.status !== 'clean')
        return antivirusFailure(c, scan);
    const id = crypto.randomUUID(), key = `products/versions/${id}`, time = Date.now();
    await putScannedObject(c.env, 'FILES', key, bytes, { httpMetadata: { contentType: 'application/zip' } }, scan);
    try {
        await c.env.DB.batch([c.env.DB.prepare('INSERT INTO product_versions(id,slug,version,r2_key,sha256,bytes,changelog,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id, slug, version, key, await bytesHash(bytes), bytes.length, String(form?.get('changelog') || '').slice(0, 2000), time), c.env.DB.prepare("UPDATE commercial_catalog_codes SET payment_status='needs_configuration',updated_by=?,updated_at=? WHERE entity_type='product' AND entity_key=?").bind(c.get('userId'), time, slug), c.env.DB.prepare("INSERT INTO audit_log(user_id,action,meta_json,created_at) VALUES(?,'product.package.upload',?,?)").bind(c.get('userId'), JSON.stringify({ slug, version, bytes: bytes.length }), time)]);
    }
    catch (e) {
        await c.env.FILES.delete(key);
        throw e;
    }
    return c.json({ ok: true, version });
});
