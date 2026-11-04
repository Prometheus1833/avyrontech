-- Document Center extends the existing CRM/RBAC. No legacy data is removed.
PRAGMA foreign_keys=ON;
ALTER TABLE services ADD COLUMN catalog_code_id TEXT REFERENCES commercial_catalog_codes(id) ON DELETE RESTRICT;
CREATE TABLE document_templates (
 id TEXT PRIMARY KEY, family TEXT NOT NULL, name TEXT NOT NULL,
 visibility TEXT NOT NULL DEFAULT 'shared' CHECK(visibility IN('shared','private_proposal')),
 source_document_id TEXT REFERENCES documents(id) ON DELETE RESTRICT,
 legal INTEGER NOT NULL DEFAULT 0 CHECK(legal IN(0,1)),
 created_at INTEGER NOT NULL
);
CREATE TABLE document_template_versions (
 id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES document_templates(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>0), payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 required_fields_json TEXT NOT NULL CHECK(json_valid(required_fields_json)),
 review_status TEXT NOT NULL DEFAULT 'review_required' CHECK(review_status IN('review_required','approved','retired')),
 reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT, reviewed_at INTEGER,
 created_at INTEGER NOT NULL, UNIQUE(template_id,version),
 CHECK(review_status<>'approved' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE TRIGGER document_template_content_immutable BEFORE UPDATE OF payload_json,required_fields_json,template_id,version ON document_template_versions BEGIN SELECT RAISE(ABORT,'template_version_immutable'); END;
CREATE TRIGGER document_template_no_delete BEFORE DELETE ON document_template_versions BEGIN SELECT RAISE(ABORT,'template_version_immutable'); END;
CREATE TABLE documents (
 id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE,
 scope TEXT NOT NULL CHECK(scope IN('client','internal','staff','company')),
 collection TEXT NOT NULL DEFAULT 'library' CHECK(collection IN('library','hub','staff')),
 beneficiary_id TEXT REFERENCES clients(id) ON DELETE RESTRICT,
 organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
 template_version_id TEXT REFERENCES document_template_versions(id) ON DELETE RESTRICT,
 legal INTEGER NOT NULL DEFAULT 0 CHECK(legal IN(0,1)),
 current_version_id TEXT REFERENCES document_versions(id) DEFERRABLE INITIALLY DEFERRED,
 published_version_id TEXT REFERENCES document_versions(id) DEFERRABLE INITIALLY DEFERRED,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 archived_at INTEGER, created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 CHECK(scope<>'client' OR beneficiary_id IS NOT NULL),
 CHECK(scope<>'company' OR (beneficiary_id IS NULL AND organization_id IS NULL AND collection='library'))
);
CREATE INDEX documents_beneficiary ON documents(beneficiary_id,archived_at,updated_at DESC,id);
CREATE INDEX documents_scope ON documents(scope,collection,archived_at,updated_at DESC,id);
CREATE TABLE document_versions (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>0),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), search_text TEXT NOT NULL,
 sha256 TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL, UNIQUE(document_id,version)
);
CREATE INDEX document_versions_parent ON document_versions(document_id,version DESC);
CREATE TRIGGER document_version_immutable BEFORE UPDATE ON document_versions BEGIN SELECT RAISE(ABORT,'document_version_immutable'); END;
CREATE TRIGGER document_version_no_delete BEFORE DELETE ON document_versions BEGIN SELECT RAISE(ABORT,'document_version_immutable'); END;
CREATE TRIGGER document_pointer_scope BEFORE UPDATE OF current_version_id,published_version_id ON documents
 WHEN (NEW.current_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM document_versions WHERE id=NEW.current_version_id AND document_id=NEW.id))
 OR (NEW.published_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM document_versions WHERE id=NEW.published_version_id AND document_id=NEW.id))
 BEGIN SELECT RAISE(ABORT,'document_version_scope'); END;
-- Search is version-specific; the API applies the same resource visibility before returning any match/count.
CREATE VIRTUAL TABLE document_search_index USING fts5(version_id UNINDEXED,document_id UNINDEXED,content,tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER document_search_insert AFTER INSERT ON document_versions BEGIN INSERT INTO document_search_index(version_id,document_id,content) VALUES(NEW.id,NEW.document_id,NEW.search_text); END;
CREATE TABLE document_assignments (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 catalog_id TEXT REFERENCES commercial_catalog_codes(id) ON DELETE RESTRICT,
 project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
 service_id TEXT REFERENCES services(id) ON DELETE RESTRICT,
 subscription_id TEXT REFERENCES subscriptions(id) ON DELETE RESTRICT,
 billing_subscription_id TEXT REFERENCES billing_subscriptions(id) ON DELETE RESTRICT,
 product_slug TEXT REFERENCES product_items(slug) ON DELETE RESTRICT,
 order_id TEXT REFERENCES commerce_orders(id) ON DELETE RESTRICT,
 entitlement_id TEXT REFERENCES product_entitlements(id) ON DELETE RESTRICT,
 partner_client_id TEXT REFERENCES clients(id) ON DELETE RESTRICT,
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, created_at INTEGER NOT NULL,
 CHECK((project_id IS NOT NULL)+(service_id IS NOT NULL)+(subscription_id IS NOT NULL)+(billing_subscription_id IS NOT NULL)+(product_slug IS NOT NULL)+(order_id IS NOT NULL)+(entitlement_id IS NOT NULL)+(partner_client_id IS NOT NULL)+(catalog_id IS NOT NULL)=1)
);
CREATE INDEX document_assignments_project ON document_assignments(project_id,document_id);
CREATE INDEX document_assignments_service ON document_assignments(service_id,document_id);
CREATE INDEX document_assignments_subscription ON document_assignments(subscription_id,document_id);
CREATE UNIQUE INDEX document_assignment_unique ON document_assignments(document_id,coalesce(project_id,''),coalesce(service_id,''),coalesce(subscription_id,''),coalesce(billing_subscription_id,''),coalesce(product_slug,''),coalesce(order_id,''),coalesce(entitlement_id,''),coalesce(partner_client_id,''),coalesce(catalog_id,''));
CREATE TABLE document_access_policies (
 document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE RESTRICT,
 allow_attachments INTEGER NOT NULL DEFAULT 0 CHECK(allow_attachments IN(0,1)),
 allow_client_share INTEGER NOT NULL DEFAULT 0 CHECK(allow_client_share IN(0,1))
);
CREATE TABLE document_access_grants (
 document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 can_edit INTEGER NOT NULL DEFAULT 0 CHECK(can_edit IN(0,1)),
 can_share INTEGER NOT NULL DEFAULT 0 CHECK(can_share IN(0,1)),
 granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL, revoked_at INTEGER, PRIMARY KEY(document_id,user_id)
);
CREATE INDEX document_grants_user ON document_access_grants(user_id,revoked_at,document_id);
CREATE TABLE document_version_publications (
 document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL, PRIMARY KEY(version_id,user_id)
);
CREATE TRIGGER document_publication_parent BEFORE INSERT ON document_version_publications WHEN NOT EXISTS(SELECT 1 FROM document_versions WHERE id=NEW.version_id AND document_id=NEW.document_id) BEGIN SELECT RAISE(ABORT,'document_version_scope'); END;
CREATE TRIGGER document_publication_no_update BEFORE UPDATE ON document_version_publications BEGIN SELECT RAISE(ABORT,'document_publication_immutable'); END;
CREATE TRIGGER document_publication_no_delete BEFORE DELETE ON document_version_publications BEGIN SELECT RAISE(ABORT,'document_publication_immutable'); END;
CREATE TABLE document_approvals (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
 approved_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 legal_review_reference TEXT, created_at INTEGER NOT NULL, UNIQUE(version_id)
);
CREATE TABLE document_files (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN('import','pdf','docx','image')),
 object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL,
 sha256 TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 15728640),
 scan_status TEXT NOT NULL CHECK(scan_status IN('quarantined','clean_generated','clean_scanned','rejected')),
 scanner_reference TEXT, expires_at INTEGER, created_at INTEGER NOT NULL,
 CHECK(scan_status<>'clean_scanned' OR scanner_reference IS NOT NULL)
);
CREATE TRIGGER document_approval_no_update BEFORE UPDATE ON document_approvals BEGIN SELECT RAISE(ABORT,'document_approval_immutable'); END;
CREATE TRIGGER document_approval_no_delete BEFORE DELETE ON document_approvals BEGIN SELECT RAISE(ABORT,'document_approval_immutable'); END;
CREATE INDEX document_files_parent ON document_files(document_id,version_id,kind);
CREATE UNIQUE INDEX document_export_slot ON document_files(version_id,kind,(expires_at IS NULL)) WHERE kind IN('pdf','docx') AND scan_status='clean_generated';
CREATE TABLE document_shares (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 channel TEXT NOT NULL CHECK(channel IN('email','whatsapp','telegram','internal','link')),
 status TEXT NOT NULL CHECK(status IN('prepared','sending','sent','delivered','failed','unknown')),
 attachment INTEGER NOT NULL DEFAULT 0 CHECK(attachment IN(0,1)),
 provider_id TEXT, error_code TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX document_shares_parent ON document_shares(document_id,created_at DESC);
CREATE TABLE document_audit_events (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 action TEXT NOT NULL, version_id TEXT REFERENCES document_versions(id) ON DELETE RESTRICT,
 metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json)), created_at INTEGER NOT NULL
);
CREATE TRIGGER document_audit_no_update BEFORE UPDATE ON document_audit_events BEGIN SELECT RAISE(ABORT,'document_audit_immutable'); END;
CREATE TRIGGER document_audit_no_delete BEFORE DELETE ON document_audit_events BEGIN SELECT RAISE(ABORT,'document_audit_immutable'); END;
CREATE INDEX document_audit_parent ON document_audit_events(document_id,created_at DESC);
CREATE TABLE document_backup_records (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
 object_key TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL, size_bytes INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN('creating','verified','failed','restored')),
 separate_storage INTEGER NOT NULL DEFAULT 0 CHECK(separate_storage IN(0,1)),
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, created_at INTEGER NOT NULL,
 restored_at INTEGER, error_code TEXT
);
CREATE TABLE document_legacy_links (
 document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
 source_kind TEXT NOT NULL CHECK(source_kind IN('hub','staff','finance','survey')),
 source_id TEXT NOT NULL, PRIMARY KEY(source_kind,source_id)
);
-- Structured legal details extend clients, never account-level identity shared across firms.
CREATE TABLE client_legal_profiles (
 client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE RESTRICT,
 entity_type TEXT NOT NULL, legal_name TEXT NOT NULL, tax_id TEXT, registration_number TEXT,
 address TEXT, representative TEXT, updated_by TEXT NOT NULL REFERENCES users(id), updated_at INTEGER NOT NULL
);
CREATE TABLE document_company_profile (
 id TEXT PRIMARY KEY CHECK(id='avyron'), legal_name TEXT NOT NULL DEFAULT 'DIGITAL ECOTECH SOLUTIONS S.R.L.',
 tax_id TEXT, registration_number TEXT, address TEXT, representative TEXT, contact_email TEXT,
 updated_by TEXT REFERENCES users(id), updated_at INTEGER NOT NULL
);
INSERT INTO document_company_profile(id,updated_at) VALUES('avyron',0);
CREATE TABLE document_service_profiles (
 catalog_id TEXT PRIMARY KEY REFERENCES commercial_catalog_codes(id) ON DELETE RESTRICT,
 configuration_json TEXT NOT NULL CHECK(json_valid(configuration_json)), updated_by TEXT NOT NULL REFERENCES users(id), updated_at INTEGER NOT NULL
);
-- Defense in depth: associations cannot cross the document's beneficiary even outside the router.
CREATE TRIGGER document_assignment_beneficiary BEFORE INSERT ON document_assignments
 WHEN (NEW.project_id IS NOT NULL AND (SELECT client_id FROM projects WHERE id=NEW.project_id) IS NOT (SELECT beneficiary_id FROM documents WHERE id=NEW.document_id))
 OR (NEW.service_id IS NOT NULL AND (SELECT p.client_id FROM services s JOIN projects p ON p.id=s.project_id WHERE s.id=NEW.service_id) IS NOT (SELECT beneficiary_id FROM documents WHERE id=NEW.document_id))
 OR (NEW.subscription_id IS NOT NULL AND (SELECT client_id FROM subscriptions WHERE id=NEW.subscription_id) IS NOT (SELECT beneficiary_id FROM documents WHERE id=NEW.document_id))
 OR (NEW.partner_client_id IS NOT NULL AND NEW.partner_client_id IS NOT (SELECT beneficiary_id FROM documents WHERE id=NEW.document_id))
 BEGIN SELECT RAISE(ABORT,'document_beneficiary_mismatch'); END;
CREATE TRIGGER document_assignment_immutable BEFORE UPDATE ON document_assignments BEGIN SELECT RAISE(ABORT,'document_assignment_immutable'); END;
CREATE TRIGGER document_approval_version_scope BEFORE INSERT ON document_approvals WHEN NOT EXISTS(SELECT 1 FROM document_versions WHERE id=NEW.version_id AND document_id=NEW.document_id) BEGIN SELECT RAISE(ABORT,'document_version_scope'); END;
CREATE TRIGGER document_file_version_scope BEFORE INSERT ON document_files WHEN NOT EXISTS(SELECT 1 FROM document_versions WHERE id=NEW.version_id AND document_id=NEW.document_id) BEGIN SELECT RAISE(ABORT,'document_version_scope'); END;
CREATE TRIGGER document_share_version_scope BEFORE INSERT ON document_shares WHEN NOT EXISTS(SELECT 1 FROM document_versions WHERE id=NEW.version_id AND document_id=NEW.document_id) BEGIN SELECT RAISE(ABORT,'document_version_scope'); END;
