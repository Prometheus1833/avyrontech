-- Business relationships, distinct from product partnership_plans. Existing identity, CRM, documents and storage only.
CREATE TABLE agency_collaborators (
 id TEXT PRIMARY KEY,
 code TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN('legal','financial','economic','development','marketing','other')),
 relationship TEXT NOT NULL CHECK(relationship IN('partner','collaborator')),
 status TEXT NOT NULL CHECK(status IN('discussion','active','paused','closed')),
 contact_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
 specialization TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', terms TEXT NOT NULL DEFAULT '', internal_notes TEXT NOT NULL DEFAULT '',
 starts_on TEXT NOT NULL DEFAULT '', ends_on TEXT NOT NULL DEFAULT '',
 client_id TEXT REFERENCES clients(id) ON DELETE RESTRICT,
 account_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
 document_id TEXT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 archived_at INTEGER,
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX agency_collaborator_account ON agency_collaborators(account_user_id,archived_at,status);
CREATE INDEX agency_collaborator_client ON agency_collaborators(client_id);
CREATE INDEX agency_collaborator_list ON agency_collaborators(archived_at,updated_at DESC,id);
CREATE TABLE collaborator_documents (
 id TEXT PRIMARY KEY,
 collaborator_id TEXT NOT NULL REFERENCES agency_collaborators(id) ON DELETE RESTRICT,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
 document_file_id TEXT UNIQUE REFERENCES document_files(id) ON DELETE RESTRICT,
 file_name TEXT NOT NULL, content_type TEXT NOT NULL,
 size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 5000000),
 visible_to_partner INTEGER NOT NULL DEFAULT 0 CHECK(visible_to_partner IN(0,1)),
 uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 intent_key TEXT NOT NULL, request_hash TEXT NOT NULL,
 lease_token TEXT, lease_expires_at INTEGER,
 created_at INTEGER NOT NULL, removed_at INTEGER,
 UNIQUE(collaborator_id,uploaded_by,intent_key)
);
CREATE UNIQUE INDEX collaborator_three_document_slots ON collaborator_documents(collaborator_id,slot) WHERE removed_at IS NULL;
CREATE INDEX collaborator_documents_parent ON collaborator_documents(collaborator_id,removed_at,created_at);
CREATE TRIGGER collaborator_file_scope BEFORE UPDATE OF document_file_id ON collaborator_documents
 WHEN NEW.document_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM document_files f JOIN agency_collaborators c ON c.document_id=f.document_id WHERE f.id=NEW.document_file_id AND c.id=NEW.collaborator_id AND f.kind='import' AND f.size_bytes<=5000000)
 BEGIN SELECT RAISE(ABORT,'collaborator_file_scope'); END;
