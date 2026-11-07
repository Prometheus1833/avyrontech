import { z } from 'zod';
import type { Context, Hono } from 'hono';
import type { AppBindings } from './types';
const account = z.object({
    name: z.string().trim().min(1).max(160), institution: z.string().trim().min(1).max(120),
    internalAlias: z.string().trim().min(1).max(100), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3,8}$/),
    accountType: z.enum(['bank', 'wallet', 'processor', 'cash', 'other']),
    ibanLast4: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,4}$/).nullable(), purpose: z.string().trim().max(300),
    status: z.enum(['active', 'inactive', 'needs_configuration', 'archived']),
    expectedUpdatedAt: z.number().int().nonnegative(), confirmed: z.literal(true),
}).strict();
const method = z.object({
    provider: z.string().trim().min(1).max(100), alias: z.string().trim().min(1).max(100),
    accountId: z.string().max(100).nullable(), last4: z.string().regex(/^\d{4}$/).nullable(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3,8}$/), purpose: z.string().trim().max(300),
    status: z.enum(['active', 'inactive', 'archived']), expectedUpdatedAt: z.number().int().nonnegative(), confirmed: z.literal(true),
}).strict();
type Allowed = (c: Context<AppBindings>, permission: 'finance.settings') => Promise<boolean>;
export function registerFinanceAccounts(router: Hono<AppBindings>, allowed: Allowed) {
    for (const kind of ['accounts', 'payment-methods'] as const)
        router.patch(`/api/finance/${kind}/:id`, async (c) => {
            if (!await allowed(c, 'finance.settings'))
                return c.json({ error: { code: 'forbidden' } }, 403);
            const parsed = (kind === 'accounts' ? account : method).safeParse(await c.req.json().catch(() => null));
            if (!parsed.success)
                return c.json({ error: { code: 'invalid_financial_configuration', message: 'Verifică datele, confirmarea și versiunea. Sunt acceptate numai date mascate.' } }, 400);
            const b = parsed.data, table = kind === 'accounts' ? 'financial_accounts' : 'financial_payment_methods';
            const before = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE id=? AND archived_at IS NULL`).bind(c.req.param('id')).first<Record<string, unknown>>();
            if (!before)
                return c.json({ error: { code: 'not_found' } }, 404);
            if (before.source && before.source !== 'manual')
                return c.json({ error: { code: 'provider_managed_account', message: 'Datele sincronizate se modifică la furnizor.' } }, 409);
            if (Number(before.updated_at) !== b.expectedUpdatedAt)
                return c.json({ error: { code: 'revision_conflict', message: 'Datele s-au modificat. Reîncarcă fișa.' } }, 409);
            if ('accountId' in b && b.accountId && !await c.env.DB.prepare("SELECT 1 FROM financial_accounts WHERE id=? AND archived_at IS NULL AND status!='inactive'").bind(b.accountId).first())
                return c.json({ error: { code: 'account_unavailable' } }, 409);
            const time = Math.max(Date.now(), b.expectedUpdatedAt + 1), auditId = `faud_${crypto.randomUUID()}`;
            const archived = b.status === 'archived' ? time : null;
            const update = 'internalAlias' in b
                ? c.env.DB.prepare(`UPDATE financial_accounts SET name=?,institution=?,internal_alias=?,currency=?,account_type=?,iban_last4=?,purpose=?,status=?,archived_at=?,updated_by=?,updated_at=? WHERE id=? AND updated_at=? AND archived_at IS NULL AND NOT EXISTS (SELECT 1 FROM financial_accounts other WHERE other.id!=? AND lower(other.internal_alias)=lower(?) AND other.archived_at IS NULL)`)
                    .bind(b.name, b.institution, b.internalAlias, b.currency, b.accountType, b.ibanLast4, b.purpose, b.status, archived, c.get('userId'), time, c.req.param('id'), b.expectedUpdatedAt, c.req.param('id'), b.internalAlias)
                : c.env.DB.prepare('UPDATE financial_payment_methods SET provider=?,alias=?,account_id=?,last4=?,currency=?,purpose=?,status=?,archived_at=?,updated_by=?,updated_at=? WHERE id=? AND updated_at=? AND archived_at IS NULL')
                    .bind(b.provider, b.alias, b.accountId, b.last4, b.currency, b.purpose, b.status, archived, c.get('userId'), time, c.req.param('id'), b.expectedUpdatedAt);
            // Conditional audit records only the exact version changed by this batch.
            const after = { ...b };
            delete (after as Partial<typeof after>).confirmed;
            try {
                const results = await c.env.DB.batch([update, c.env.DB.prepare(`INSERT INTO financial_audit_events(id,actor_user_id,action,resource_type,resource_id,before_json,after_json,source,request_id,created_at) SELECT ?,?,?,?,?,?,?,'manual',?,? WHERE EXISTS (SELECT 1 FROM ${table} WHERE id=? AND updated_at=? AND updated_by=?)`)
                        .bind(auditId, c.get('userId'), `finance.${kind}.update`, kind, c.req.param('id'), JSON.stringify(before), JSON.stringify(after), c.get('requestId') || null, time, c.req.param('id'), time, c.get('userId'))]);
                if (!Number(results[0].meta.changes))
                    return c.json({ error: { code: 'revision_or_alias_conflict', message: 'Datele sau aliasul s-au modificat. Reîncarcă fișa.' } }, 409);
            }
            catch (e) {
                if (/UNIQUE constraint/.test(String(e)))
                    return c.json({ error: { code: 'alias_exists' } }, 409);
                throw e;
            }
            return c.json({ ok: true, updatedAt: time });
        });
}
