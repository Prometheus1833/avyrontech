-- Extend the existing private inbox; no historical notices or entities are rewritten.
ALTER TABLE operation_notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'activity' CHECK(category IN('project','subscription','blog','document','activity'));
ALTER TABLE operation_notifications ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN('normal','important'));
ALTER TABLE operation_notifications ADD COLUMN resource_type TEXT CHECK(resource_type IN('project','project_staff','proposal','project_update','subscription','billing_subscription','blog'));
ALTER TABLE operation_notifications ADD COLUMN resource_id TEXT;
CREATE INDEX operation_notifications_unread ON operation_notifications(user_id,read_at,created_at DESC,id DESC);
CREATE INDEX operation_notifications_resource ON operation_notifications(resource_type,resource_id);
CREATE TABLE notification_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0,
 config_json TEXT NOT NULL CHECK(json_valid(config_json)), updated_by TEXT REFERENCES users(id), updated_at INTEGER NOT NULL
);
INSERT INTO notification_settings(id,config_json,updated_at) VALUES(1,'{}',0);
CREATE TABLE notification_settings_history (
 revision INTEGER PRIMARY KEY, config_json TEXT NOT NULL CHECK(json_valid(config_json)),
 actor_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL
);
CREATE TABLE notification_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 blog_enabled INTEGER NOT NULL DEFAULT 1 CHECK(blog_enabled IN(0,1)), updated_at INTEGER NOT NULL
);

CREATE TRIGGER notification_project_created AFTER INSERT ON projects
WHEN (1) AND coalesce((SELECT json_extract(config_json,'$.events.projects') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'project-created:'||NEW.id,'Proiect nou · '||NEW.name,'Un proiect nou este disponibil în AVYRON OS.','/intern/projects/'||(SELECT slug FROM projects WHERE id=NEW.id),NEW.created_at,'project','important','project',NEW.id
 FROM (SELECT u.id user_id FROM users u JOIN user_roles r ON r.user_id=u.id AND r.role='admin' JOIN platform_principals pp ON pp.email=u.email COLLATE NOCASE AND pp.status='active' UNION SELECT cap.user_id FROM user_capabilities cap JOIN staff_rank_assignments rank ON rank.user_id=cap.user_id WHERE cap.capability='projects.all' AND cap.revoked_at IS NULL AND cap.organization_id IS NULL AND (cap.expires_at IS NULL OR cap.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000) AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=cap.user_id AND r.role IN('staff','admin')) UNION SELECT ca.user_id FROM client_account_access ca WHERE ca.client_id=(SELECT client_id FROM projects WHERE id=NEW.id) UNION SELECT owner_user_id FROM projects WHERE id=NEW.id AND owner_user_id IS NOT NULL UNION SELECT m.user_id FROM organization_memberships m JOIN projects p ON p.organization_id=m.organization_id WHERE p.id=NEW.id AND m.status='active') recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NULL;
END;

CREATE TRIGGER notification_project_assignment AFTER INSERT ON project_staff
WHEN NOT EXISTS(SELECT 1 FROM operation_notifications n WHERE n.user_id=NEW.user_id AND n.deduplication_key='project-created:'||NEW.project_id AND n.created_at=NEW.assigned_at) AND coalesce((SELECT json_extract(config_json,'$.events.projects') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'project-assigned:'||NEW.project_id||':'||NEW.assigned_at,'Ai fost alocat unui proiect','Consultă proiectul și activitățile echipei.','/intern/projects/'||(SELECT slug FROM projects WHERE id=NEW.project_id),NEW.assigned_at,'project','important','project_staff',NEW.project_id
 FROM (SELECT NEW.user_id user_id WHERE EXISTS(SELECT 1 FROM user_roles WHERE user_id=NEW.user_id AND role IN('staff','admin'))) recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NULL;
END;

CREATE TRIGGER notification_project_proposal AFTER INSERT ON project_proposals
WHEN (1) AND coalesce((SELECT json_extract(config_json,'$.events.projects') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'proposal:'||NEW.id,'Propunere nouă · '||substr(NEW.title,1,160),'O propunere pentru proiectul în care ești implicat așteaptă verificarea echipei.','/intern/projects/'||(SELECT slug FROM projects WHERE id=NEW.project_id),NEW.created_at,'project','important','proposal',NEW.id
 FROM (SELECT ps.user_id FROM project_staff ps JOIN user_roles r ON r.user_id=ps.user_id AND r.role IN('staff','admin') WHERE ps.project_id=NEW.project_id) recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NEW.author_id;
END;

CREATE TRIGGER notification_project_update AFTER INSERT ON project_updates
WHEN (1) AND coalesce((SELECT json_extract(config_json,'$.events.projects') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'project-update:'||NEW.id,'Actualizare · '||substr(NEW.title,1,160),'Există o actualizare în jurnalul proiectului tău.','/intern/projects/'||(SELECT slug FROM projects WHERE id=NEW.project_id),NEW.created_at,'project','important','project_update',NEW.id
 FROM (SELECT ps.user_id FROM project_staff ps JOIN user_roles r ON r.user_id=ps.user_id AND r.role IN('staff','admin') WHERE ps.project_id=NEW.project_id UNION SELECT ca.user_id FROM client_account_access ca WHERE ca.client_id=(SELECT client_id FROM projects WHERE id=NEW.project_id) UNION SELECT owner_user_id FROM projects WHERE id=NEW.project_id AND owner_user_id IS NOT NULL UNION SELECT m.user_id FROM organization_memberships m JOIN projects p ON p.organization_id=m.organization_id WHERE p.id=NEW.project_id AND m.status='active') recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NEW.author_id;
END;

CREATE TRIGGER notification_project_stage AFTER UPDATE OF status,banner_status ON projects
WHEN (NEW.status IS NOT OLD.status OR NEW.banner_status IS NOT OLD.banner_status) AND coalesce((SELECT json_extract(config_json,'$.events.projects') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'project-stage:'||NEW.id||':'||NEW.updated_at||':'||NEW.status||':'||NEW.banner_status,'Etapă actualizată · '||NEW.name,'Stadiul proiectului a fost actualizat. Consultă detaliile și pașii următori.','/intern/projects/'||(SELECT slug FROM projects WHERE id=NEW.id),NEW.updated_at,'project','important','project',NEW.id
 FROM (SELECT ps.user_id FROM project_staff ps JOIN user_roles r ON r.user_id=ps.user_id AND r.role IN('staff','admin') WHERE ps.project_id=NEW.id UNION SELECT ca.user_id FROM client_account_access ca WHERE ca.client_id=(SELECT client_id FROM projects WHERE id=NEW.id) UNION SELECT owner_user_id FROM projects WHERE id=NEW.id AND owner_user_id IS NOT NULL UNION SELECT m.user_id FROM organization_memberships m JOIN projects p ON p.organization_id=m.organization_id WHERE p.id=NEW.id AND m.status='active') recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NULL;
END;

CREATE TRIGGER notification_subscription_created AFTER INSERT ON subscriptions
WHEN (1) AND coalesce((SELECT json_extract(config_json,'$.events.subscriptions') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'subscription-created:'||NEW.id,'Abonamentul tău · actualizare','Starea abonamentului sau următoarea dată de facturare a fost actualizată. Verifică detaliile din cont.','/profil?tab=subscriptions',CAST(strftime('%s','now') AS INTEGER)*1000+CAST(substr(strftime('%f','now'),4,3) AS INTEGER),'subscription','important','subscription',NEW.id
 FROM (SELECT ca.user_id FROM client_account_access ca WHERE ca.client_id=NEW.client_id UNION SELECT p.owner_user_id user_id FROM projects p JOIN services s ON s.project_id=p.id WHERE s.id=NEW.service_id AND p.client_id=NEW.client_id AND p.owner_user_id IS NOT NULL) recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NULL;
END;

CREATE TRIGGER notification_subscription_updated AFTER UPDATE OF status,next_billing_date ON subscriptions
WHEN (NEW.status IS NOT OLD.status OR NEW.next_billing_date IS NOT OLD.next_billing_date) AND coalesce((SELECT json_extract(config_json,'$.events.subscriptions') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'subscription-transition:'||NEW.id||':'||lower(hex(randomblob(16))),'Abonamentul tău · actualizare','Starea abonamentului sau următoarea dată de facturare a fost actualizată. Verifică detaliile din cont.','/profil?tab=subscriptions',CAST(strftime('%s','now') AS INTEGER)*1000+CAST(substr(strftime('%f','now'),4,3) AS INTEGER),'subscription','important','subscription',NEW.id
 FROM (SELECT ca.user_id FROM client_account_access ca WHERE ca.client_id=NEW.client_id UNION SELECT p.owner_user_id user_id FROM projects p JOIN services s ON s.project_id=p.id WHERE s.id=NEW.service_id AND p.client_id=NEW.client_id AND p.owner_user_id IS NOT NULL) recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NULL;
END;

CREATE TRIGGER notification_billing_subscription_created AFTER INSERT ON billing_subscriptions
WHEN (1) AND coalesce((SELECT json_extract(config_json,'$.events.subscriptions') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'billing-subscription-created:'||NEW.id,'Abonamentul de produs · actualizare','Există o modificare a abonamentului pentru produsul tău. Consultă situația în cont.','/profil?tab=payments',NEW.updated_at,'subscription','important','billing_subscription',NEW.id
 FROM (SELECT NEW.user_id user_id) recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NULL;
END;

CREATE TRIGGER notification_billing_subscription_updated AFTER UPDATE OF status,current_period_end,cancel_at_period_end ON billing_subscriptions
WHEN (NEW.status IS NOT OLD.status OR NEW.current_period_end IS NOT OLD.current_period_end OR NEW.cancel_at_period_end IS NOT OLD.cancel_at_period_end) AND coalesce((SELECT json_extract(config_json,'$.events.subscriptions') FROM notification_settings WHERE id=1),1)=1
BEGIN
 INSERT OR IGNORE INTO operation_notifications(id,user_id,deduplication_key,title,body,destination,created_at,category,priority,resource_type,resource_id)
 SELECT lower(hex(randomblob(16))),recipient.user_id,'billing-subscription-transition:'||NEW.id||':'||lower(hex(randomblob(16))),'Abonamentul de produs · actualizare','Există o modificare a abonamentului pentru produsul tău. Consultă situația în cont.','/profil?tab=payments',NEW.updated_at,'subscription','important','billing_subscription',NEW.id
 FROM (SELECT NEW.user_id user_id) recipient JOIN users u ON u.id=recipient.user_id AND u.disabled_at IS NULL AND u.email_verified=1
 WHERE recipient.user_id IS NOT NULL;
END;
