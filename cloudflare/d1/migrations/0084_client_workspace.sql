-- Extend the existing CRM. No account, project, subscription or financial record is recreated.
ALTER TABLE clients ADD COLUMN access_managed INTEGER NOT NULL DEFAULT 0 CHECK(access_managed IN(0,1));
ALTER TABLE clients ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE clients ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
UPDATE clients SET updated_at=created_at;
CREATE INDEX client_legal_identity_lookup ON client_legal_profiles(entity_type,upper(replace(tax_id,' ','')));
CREATE TRIGGER client_profile_revision AFTER UPDATE OF company_name,contact_name,email,phone,status,notes ON clients
WHEN NEW.revision=OLD.revision BEGIN
 UPDATE clients SET revision=OLD.revision+1,updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE id=NEW.id;
END;
CREATE TRIGGER client_legal_insert_revision AFTER INSERT ON client_legal_profiles BEGIN
 UPDATE clients SET revision=revision+1,updated_at=NEW.updated_at WHERE id=NEW.client_id;
END;
CREATE TRIGGER client_legal_update_revision AFTER UPDATE ON client_legal_profiles BEGIN
 UPDATE clients SET revision=revision+1,updated_at=NEW.updated_at WHERE id=NEW.client_id;
END;
-- Indexed history guards keep project reassignment checks bounded as the CRM grows.
CREATE INDEX IF NOT EXISTS idx_client_workspace_recent ON clients(updated_at DESC,created_at DESC,id);
CREATE INDEX IF NOT EXISTS idx_client_history_tickets_project ON support_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_client_history_allocations_project ON financial_expense_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_client_history_budgets_project ON financial_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_client_history_usage_project ON financial_usage_events(project_id);
CREATE INDEX IF NOT EXISTS idx_client_history_operations_project ON operation_records(project_id);
CREATE INDEX IF NOT EXISTS idx_client_history_centers_project ON os_center_records(project_id);
CREATE INDEX IF NOT EXISTS idx_client_history_hub_project ON hub_documents(project_id);
