/** Original AVYRON convention from “Coduri SKU și articole contabile”.
 * Existing identifiers always win; article codes are not ledger accounts. */
export const SERVICE_IDENTITIES: Record<string, {
    sku: string;
    article: string;
}> = {
    'premium-website': { sku: 'AVY-SRV-WEB-001', article: 'AVS001' }, 'online-store': { sku: 'AVY-SRV-ECO-001', article: 'AVS002' },
    apps: { sku: 'AVY-SRV-APP-001', article: 'AVS003' }, 'ai-agent': { sku: 'AVY-SRV-AIA-001', article: 'AVS004' },
    'logo-3d': { sku: 'AVY-SRV-L3D-001', article: 'AVS005' }, 'blog-profesional': { sku: 'AVY-SRV-BLG-001', article: 'AVS006' },
    'social-identity': { sku: 'AVY-SRV-SOC-001', article: 'AVS007' }, 'qa-testing': { sku: 'AVY-SRV-QAT-001', article: 'AVS008' }, audit: { sku: 'AVY-SRV-AUD-001', article: 'AVS009' },
};
export const PRODUCT_CODE_FAMILIES: Record<string, string> = { component: 'CMP', section: 'SEC', template: 'TPL', effect: '3DE', tool: 'TOL', api: 'API', doc: 'DOC', logo: 'LGO' };
export type Identity = {
    sku: string | null;
    accounting_code: string | null;
};
export function nextCommercialIdentity(type: 'service' | 'product', key: string, category: string, known: Identity[], existing?: Identity): Identity {
    const usedSku = new Set(known.map(r => r.sku).filter(Boolean)), usedArticles = new Set(known.map(r => r.accounting_code).filter(Boolean));
    const prefix = type === 'product' ? 'AVD' : 'AVS', width = type === 'product' ? 4 : 3;
    let number = Math.max(type === 'service' ? 9 : 0, ...known.map(r => r.accounting_code?.match(new RegExp(`^${prefix}(\\d+)$`))).filter(Boolean).map(m => Number(m![1]))) + 1;
    const suggested = type === 'service' ? SERVICE_IDENTITIES[key] : null;
    let sku = existing?.sku || suggested?.sku, article = existing?.accounting_code || suggested?.article;
    if (!existing?.sku && sku && usedSku.has(sku))
        sku = undefined;
    if (!existing?.accounting_code && article && usedArticles.has(article))
        article = undefined;
    while (usedArticles.has(`${prefix}${String(number).padStart(width, '0')}`) || usedSku.has(type === 'product' ? `AVY-DIG-${PRODUCT_CODE_FAMILIES[category] || 'GEN'}-${String(number).padStart(4, '0')}` : `AVY-SRV-GEN-${String(number).padStart(3, '0')}`))
        number++;
    return { sku: sku || (type === 'product' ? `AVY-DIG-${PRODUCT_CODE_FAMILIES[category] || 'GEN'}-${String(number).padStart(4, '0')}` : `AVY-SRV-GEN-${String(number).padStart(3, '0')}`), accounting_code: article || `${prefix}${String(number).padStart(width, '0')}` };
}
