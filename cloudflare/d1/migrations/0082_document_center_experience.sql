-- Public identity already configured in src/config/company.ts, reconciled on
-- https://avyron.ro/termeni and /gdpr on 2026-11-05. Preserve every configured value.
UPDATE document_company_profile SET
 tax_id=COALESCE(NULLIF(trim(tax_id),''),'55055976'),
 address=COALESCE(NULLIF(trim(address),''),'Municipiul Iași, Bd. Independenței nr. 20, județul Iași, România'),
 contact_email=COALESCE(NULLIF(trim(contact_email),''),'contact@avyron.ro')
WHERE id='avyron' AND upper(trim(legal_name))='DIGITAL ECOTECH SOLUTIONS S.R.L.';
-- One financial draft per approved document version; keep the existing ledger.
CREATE TABLE document_billing_preparations (
 version_id TEXT PRIMARY KEY REFERENCES document_versions(id) ON DELETE RESTRICT,
 document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
 revenue_id TEXT NOT NULL UNIQUE REFERENCES financial_revenues(id) ON DELETE RESTRICT,
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL
);
CREATE INDEX document_billing_document ON document_billing_preparations(document_id,created_at DESC);
CREATE TRIGGER document_billing_source_integrity BEFORE INSERT ON document_billing_preparations
WHEN NOT EXISTS(SELECT 1 FROM document_versions v JOIN documents d ON d.id=v.document_id JOIN document_approvals a ON a.version_id=v.id WHERE v.id=NEW.version_id AND d.id=NEW.document_id AND d.beneficiary_id=NEW.client_id AND d.scope='client' AND d.current_version_id=v.id AND d.archived_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM financial_revenues r WHERE r.id=NEW.revenue_id AND r.client_id=NEW.client_id AND r.status='draft')
BEGIN SELECT RAISE(ABORT,'document_billing_source_changed'); END;
CREATE TRIGGER document_billing_assignment_integrity BEFORE INSERT ON document_billing_preparations
WHEN EXISTS(SELECT 1 FROM document_assignments a LEFT JOIN projects p ON p.id=a.project_id LEFT JOIN services sv ON sv.id=a.service_id LEFT JOIN projects sp ON sp.id=sv.project_id LEFT JOIN subscriptions sub ON sub.id=a.subscription_id WHERE a.document_id=NEW.document_id AND ((a.project_id IS NOT NULL AND p.client_id IS NOT NEW.client_id) OR (a.service_id IS NOT NULL AND sp.client_id IS NOT NEW.client_id) OR (a.subscription_id IS NOT NULL AND sub.client_id IS NOT NEW.client_id)))
 OR EXISTS(SELECT 1 FROM financial_revenues r JOIN projects p ON p.id=r.project_id WHERE r.id=NEW.revenue_id AND p.client_id IS NOT NEW.client_id)
BEGIN SELECT RAISE(ABORT,'document_billing_source_changed'); END;
