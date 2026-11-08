export type SalesRow = {
    slug: string;
    name_ro: string;
    type: string;
    status: string;
    price_ron_cents: number | null;
    product_updated_at: number;
    catalog_id: string | null;
    sku: string | null;
    accounting_code: string | null;
    base_price_minor: number | null;
    currency: string | null;
    tax_status: string | null;
    price_model: string | null;
    billing_cycle: string | null;
    payment_status: string | null;
    preferred_payment_provider: string | null;
    active: number | null;
    invoice_provider: string | null;
    vat_basis_points: number | null;
    unit_label: string | null;
    code_updated_at: number | null;
    license_name: string | null;
    license_terms: string | null;
    license_approved: number | null;
    delivery_mode: string | null;
    delivery_instructions: string | null;
    profile_updated_at: number | null;
    version: string | null;
    sha256: string | null;
    bytes: number | null;
};
export function productSaleChecks(row: SalesRow) {
    return [
        { key: 'publication', label: 'Produs publicat', ok: row.status === 'live' },
        { key: 'identity', label: 'SKU și cod articol', ok: !!row.sku && !!row.accounting_code },
        { key: 'price', label: 'Preț fix RON sincronizat', ok: row.price_ron_cents !== null && row.price_ron_cents > 0 && row.base_price_minor === row.price_ron_cents && row.price_model === 'fixed' && row.currency === 'RON' && row.billing_cycle === 'one_time' },
        { key: 'tax', label: 'Fiscalitate confirmată', ok: row.tax_status === 'verified' },
        { key: 'invoice', label: 'Metodă de facturare aleasă', ok: row.invoice_provider === 'manual' || row.invoice_provider === 'oblio' },
        { key: 'license', label: 'Licență completată și confirmată', ok: row.license_approved === 1 && !!row.license_name && !!row.license_terms },
        { key: 'delivery', label: 'Livrare pregătită', ok: row.delivery_mode === 'assisted' ? row.slug === 'logo-studio-3d' && !!row.delivery_instructions : !!row.version && !!row.sha256 && Number(row.bytes) > 0 },
        { key: 'offer', label: 'Articol activ în catalog', ok: row.active === 1 },
    ];
}
export type ProductSalesDetail = {
    data: SalesRow;
    checks: ReturnType<typeof productSaleChecks>;
};
