import { cfAuth } from './cfAuth';
import type { ProductSalesDetail, SalesRow } from '@/shared/productSales';
const base = '/api/produse/admin/sales';
export const productSalesApi = {
    readiness: () => cfAuth.request<{
        data: Array<SalesRow & {
            checks: ProductSalesDetail['checks'];
        }>;
    }>(`${base}/readiness`),
    detail: (slug: string) => cfAuth.request<ProductSalesDetail>(`${base}/${encodeURIComponent(slug)}`),
    save: (slug: string, body: {
        licenseName: string;
        licenseTerms: string;
        licenseApproved: boolean;
        deliveryMode: 'download' | 'assisted';
        deliveryInstructions: string;
        expectedUpdatedAt: number | null;
    }) => cfAuth.request<{
        ok: true;
    }>(`${base}/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(body) }),
    activate: (row: SalesRow) => cfAuth.request<{
        ok: true;
    }>(`${base}/${encodeURIComponent(row.slug)}/activate`, { method: 'POST', body: JSON.stringify({ confirmed: true, expectedProductAt: row.product_updated_at, expectedCodeAt: row.code_updated_at, expectedProfileAt: row.profile_updated_at }) }),
    upload: (slug: string, file: File, version: string) => { const form = new FormData(); form.set('file', file); form.set('version', version); return cfAuth.request<{
        ok: true;
    }>(`${base}/${encodeURIComponent(slug)}/package`, { method: 'POST', body: form }); },
};
