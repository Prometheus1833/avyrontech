-- Additive metadata only. No object moves, public buckets, provider activation or paid resources.
CREATE TABLE malware_storage_budget (
 id INTEGER PRIMARY KEY CHECK(id=1),
 held_bytes INTEGER NOT NULL DEFAULT 0 CHECK(held_bytes BETWEEN 0 AND 50000000)
);
INSERT INTO malware_storage_budget(id) VALUES(1);
CREATE TABLE malware_monthly_usage (
 period TEXT PRIMARY KEY,
 reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved BETWEEN 0 AND 500),
 provider_used INTEGER NOT NULL CHECK(provider_used BETWEEN 0 AND 500),
 provider_limit INTEGER NOT NULL CHECK(provider_limit BETWEEN 1 AND 500),
 checked_at INTEGER NOT NULL
);
CREATE TABLE malware_scan_jobs (
 id TEXT PRIMARY KEY,
 dedup_key TEXT NOT NULL UNIQUE,
 source TEXT NOT NULL CHECK(source IN('documents','visual_assets','project_media','survey','finance','engine','blog','avatar','contact','products','synthetic')),
 actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 sensitive INTEGER NOT NULL CHECK(sensitive IN(0,1)),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 25000000),
 mime_type TEXT NOT NULL,
 quarantine_key TEXT NOT NULL UNIQUE,
 quarantine_held INTEGER NOT NULL DEFAULT 1 CHECK(quarantine_held IN(0,1)),
 status TEXT NOT NULL CHECK(status IN('quarantined','submitting','pending','clean','malicious','suspicious','failed','unknown','purging','purged')),
 provider_scan_id TEXT UNIQUE,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
 revision INTEGER NOT NULL DEFAULT 1,
 reason TEXT,
 staged_at INTEGER,
 submitted_at INTEGER,
 checked_at INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX malware_pending ON malware_scan_jobs(status,checked_at,created_at);
CREATE TABLE malware_object_verdicts (
 id TEXT NOT NULL UNIQUE,
 bucket TEXT NOT NULL CHECK(bucket IN('FILES','MEDIA')),
 object_key TEXT NOT NULL,
 source TEXT NOT NULL,
 scan_id TEXT REFERENCES malware_scan_jobs(id) ON DELETE RESTRICT,
 etag TEXT,
 r2_version TEXT,
 size_bytes INTEGER NOT NULL DEFAULT 0,
 registered_at INTEGER NOT NULL,
 PRIMARY KEY(bucket,object_key)
);
CREATE INDEX malware_object_scan ON malware_object_verdicts(scan_id);
CREATE TABLE malware_audit_events (
 id TEXT PRIMARY KEY,
 scan_id TEXT REFERENCES malware_scan_jobs(id) ON DELETE RESTRICT,
 actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 source TEXT NOT NULL,
 action TEXT NOT NULL,
 code TEXT,
 provider_scan_id TEXT,
 created_at INTEGER NOT NULL
);
CREATE INDEX malware_audit_date ON malware_audit_events(created_at DESC);
-- Historical uploads remain unverified, never grandfathered CLEAN.
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',r2_key,'project_media',coalesce(size_bytes,0),created_at FROM project_media;
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',r2_object_key,'finance',size_bytes,created_at FROM financial_documents;
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',r2_object_key,'engine',size_bytes,created_at FROM engine_documents;
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',storage_key,'survey',size,created_at FROM survey_files;
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',object_key,'documents',size_bytes,created_at FROM document_files WHERE kind='import';
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',object_key,'visual_assets',size_bytes,created_at FROM visual_assets;
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'MEDIA','avatars/'||id,'avatar',0,created_at FROM users WHERE avatar_url LIKE '/api/profile/avatar/%';
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'MEDIA','blog/covers/'||substr(substr(cover_image_url,instr(cover_image_url,'/api/blog/media/')+16),1,instr(substr(cover_image_url,instr(cover_image_url,'/api/blog/media/')+16)||'?','?')-1),'blog',0,created_at
 FROM blog_posts WHERE cover_image_url LIKE '%/api/blog/media/%';

INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',r2_key,'products',bytes,created_at FROM product_versions;
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',r2_key,'documents',coalesce(size_bytes,0),created_at FROM hub_documents WHERE r2_key IS NOT NULL;
INSERT OR IGNORE INTO malware_object_verdicts(id,bucket,object_key,source,size_bytes,registered_at)
 SELECT lower(hex(randomblob(16))),'FILES',j.value,'contact',0,l.created_at FROM leads l,json_each(CASE WHEN json_valid(l.attachments_json) THEN l.attachments_json ELSE '[]' END) j WHERE j.type='text';
UPDATE document_files SET scan_status='quarantined',scanner_reference=NULL WHERE kind='import';
UPDATE visual_assets SET scan_status='quarantined';
-- Rotate URLs previously cached for a year; existing external copies cannot be revoked.
UPDATE users SET avatar_url=avatar_url||CASE WHEN instr(avatar_url,'?')>0 THEN '&av=20261106' ELSE '?av=20261106' END WHERE avatar_url LIKE '/api/profile/avatar/%';
UPDATE profiles SET avatar_url=avatar_url||CASE WHEN instr(avatar_url,'?')>0 THEN '&av=20261106' ELSE '?av=20261106' END WHERE avatar_url LIKE '/api/profile/avatar/%';
UPDATE blog_posts SET cover_image_url=cover_image_url||CASE WHEN instr(cover_image_url,'?')>0 THEN '&av=20261106' ELSE '?av=20261106' END WHERE cover_image_url LIKE '%/api/blog/media/%';
CREATE TABLE malware_inventory_cursors (source TEXT PRIMARY KEY,cursor TEXT,updated_at INTEGER NOT NULL);
CREATE INDEX malware_recent_jobs ON malware_scan_jobs(updated_at DESC,id);
