import type { ClientPayment } from "../../../../src/shared/clientPayments";

/** Read-only reconciliation over native receipts, provider confirmations and legacy paid orders. */
export async function clientPaymentHistory(
  db: D1Database,
  userId: string,
  limit: number,
  offset: number,
) {
  const rows = await db
    .prepare(
      `WITH visible_revenues AS (
    SELECT record.* FROM financial_revenues record
    WHERE record.archived_at IS NULL AND record.status NOT IN ('draft','archived','cancelled','refunded')
    AND EXISTS(SELECT 1 FROM client_account_access access WHERE access.client_id=record.client_id AND access.user_id=?1)
  ), own_linked_orders AS (
    SELECT f.order_id,r.id revenue_id FROM billing_order_fulfillments f JOIN visible_revenues r
    ON (f.provider='stripe' AND f.provider_reference=r.stripe_reference) OR (f.provider='revolut' AND f.provider_reference=r.revolut_reference)
    JOIN commerce_orders own_order ON own_order.id=f.order_id AND own_order.user_id=?1
  ), linked_paid_orders AS (
    SELECT DISTINCT f.order_id FROM billing_order_fulfillments f JOIN visible_revenues r
    ON (f.provider='stripe' AND f.provider_reference=r.stripe_reference) OR (f.provider='revolut' AND f.provider_reference=r.revolut_reference)
    WHERE (r.status='paid' AND r.gross_amount_minor>0) OR EXISTS(SELECT 1 FROM financial_receipts receipt WHERE receipt.revenue_id=r.id)
  ), history AS (
    SELECT 'receipt:'||receipt.id id,r.service_name title,receipt.amount_minor,receipt.currency,receipt.paid_at,'payment' date_kind,
    r.id invoice_id,r.invoice_number,(SELECT own.order_id FROM own_linked_orders own WHERE own.revenue_id=r.id LIMIT 1) order_id,r.payment_processor provider
    FROM financial_receipts receipt JOIN visible_revenues r ON r.id=receipt.revenue_id
    UNION ALL
    SELECT 'balance:'||r.id,r.service_name,r.gross_amount_minor,r.currency,coalesce(r.payment_date,r.updated_at),
    CASE WHEN r.payment_date IS NULL THEN 'confirmation' ELSE 'payment' END,r.id,r.invoice_number,(SELECT own.order_id FROM own_linked_orders own WHERE own.revenue_id=r.id LIMIT 1),r.payment_processor
    FROM visible_revenues r WHERE (r.status='paid' AND r.gross_amount_minor>0) AND NOT EXISTS(SELECT 1 FROM financial_receipts receipt WHERE receipt.revenue_id=r.id)
    UNION ALL
    SELECT 'online:'||s.id,coalesce(json_extract(o.items_json,'$[0].name'),'Comandă AVYRON'),s.amount_minor,s.currency,s.updated_at,'confirmation',NULL,NULL,o.id,s.provider
    FROM billing_checkout_sessions s JOIN commerce_orders o ON o.id=s.order_id AND o.user_id=?1
    WHERE s.user_id=?1 AND s.status='paid' AND s.mode!='setup' AND s.amount_minor>0
    AND o.status!='cancelled' AND NOT EXISTS(SELECT 1 FROM linked_paid_orders link WHERE link.order_id=o.id)
    UNION ALL
    SELECT 'order:'||o.id,coalesce(json_extract(o.items_json,'$[0].name'),'Comandă AVYRON'),o.total_cents,o.currency,o.updated_at,'confirmation',NULL,NULL,o.id,NULL
    FROM commerce_orders o WHERE o.user_id=?1 AND o.status='paid' AND o.total_cents>0
    AND NOT EXISTS(SELECT 1 FROM billing_checkout_sessions s WHERE s.order_id=o.id AND s.user_id=?1 AND s.status='paid' AND s.mode!='setup' AND s.amount_minor>0)
    AND NOT EXISTS(SELECT 1 FROM linked_paid_orders link WHERE link.order_id=o.id)
  ) SELECT history.*,EXISTS(SELECT 1 FROM financial_documents document WHERE document.revenue_id=history.invoice_id AND document.document_type='invoice' AND document.content_type='application/pdf' AND document.status='active') download_available FROM history ORDER BY paid_at DESC,id LIMIT ?2 OFFSET ?3`,
    )
    .bind(userId, limit + 1, offset)
    .all<ClientPayment>();
  return {
    data: rows.results.slice(0, limit),
    nextOffset: rows.results.length > limit ? offset + limit : null,
  };
}
