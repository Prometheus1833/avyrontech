-- Recorded receipts are distinct from invoiced revenue. No payment is initiated.
CREATE TABLE financial_receipts (
  id TEXT PRIMARY KEY,
  revenue_id TEXT NOT NULL REFERENCES financial_revenues(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0 AND amount_minor <= 9000000000000),
  currency TEXT NOT NULL CHECK(currency IN ('RON','EUR','USD','GBP','CHF')),
  amount_ron_minor INTEGER CHECK(amount_ron_minor IS NULL OR amount_ron_minor > 0),
  reference TEXT NOT NULL CHECK(length(reference) BETWEEN 1 AND 200),
  paid_at INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(revenue_id,reference)
);
CREATE INDEX idx_financial_receipts_date ON financial_receipts(paid_at,revenue_id);
CREATE TRIGGER financial_receipt_validate BEFORE INSERT ON financial_receipts BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM financial_revenues WHERE id=NEW.revenue_id AND archived_at IS NULL
    AND status IN ('invoiced','sent','partially_paid','overdue') AND currency=NEW.currency AND gross_amount_minor IS NOT NULL)
    THEN RAISE(ABORT,'receipt_revenue_not_payable') END;
  SELECT CASE WHEN NEW.amount_minor + COALESCE((SELECT SUM(amount_minor) FROM financial_receipts WHERE revenue_id=NEW.revenue_id),0)
    > (SELECT gross_amount_minor FROM financial_revenues WHERE id=NEW.revenue_id)
    THEN RAISE(ABORT,'receipt_exceeds_balance') END;
END;
CREATE TRIGGER financial_receipt_apply AFTER INSERT ON financial_receipts BEGIN
  UPDATE financial_revenues SET
    status=CASE WHEN (SELECT SUM(amount_minor) FROM financial_receipts WHERE revenue_id=NEW.revenue_id)=gross_amount_minor THEN 'paid' ELSE 'partially_paid' END,
    payment_date=(SELECT MAX(paid_at) FROM financial_receipts WHERE revenue_id=NEW.revenue_id),
    updated_at=NEW.created_at,updated_by=NEW.created_by
    WHERE id=NEW.revenue_id;
END;
CREATE TRIGGER financial_receipt_preserve_document BEFORE UPDATE OF currency,gross_amount_minor ON financial_revenues
  WHEN EXISTS(SELECT 1 FROM financial_receipts WHERE revenue_id=OLD.id)
    AND (NEW.currency IS NOT OLD.currency OR NEW.gross_amount_minor IS NOT OLD.gross_amount_minor)
  BEGIN SELECT RAISE(ABORT,'reconciled_document_amount_locked'); END;
-- Once money is recorded, document state/date follow the ledger. Refunds need
-- a separate reversal ledger; changing a dropdown must never erase a balance.
CREATE TRIGGER financial_receipt_preserve_state BEFORE UPDATE OF status,payment_date ON financial_revenues
  WHEN EXISTS(SELECT 1 FROM financial_receipts WHERE revenue_id=OLD.id)
    AND (NEW.status IS NOT CASE
      WHEN (SELECT SUM(amount_minor) FROM financial_receipts WHERE revenue_id=OLD.id)=NEW.gross_amount_minor
        THEN 'paid' ELSE 'partially_paid' END
      OR NEW.payment_date IS NOT (SELECT MAX(paid_at) FROM financial_receipts WHERE revenue_id=OLD.id))
  BEGIN SELECT RAISE(ABORT,'reconciled_document_state_locked'); END;
CREATE TRIGGER financial_receipt_no_update BEFORE UPDATE ON financial_receipts
  BEGIN SELECT RAISE(ABORT,'receipt_immutable'); END;
CREATE TRIGGER financial_receipt_no_delete BEFORE DELETE ON financial_receipts
  BEGIN SELECT RAISE(ABORT,'receipt_immutable'); END;
