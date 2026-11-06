// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
const migration = readFileSync("cloudflare/d1/migrations/0091_optional_project_client.sql", "utf8");
const prepare = () => {
  const db = new DatabaseSync(":memory:");
  for (const f of readdirSync("cloudflare/d1/migrations").filter(f => f.endsWith(".sql") && f < "0091_").sort()) db.exec(readFileSync("cloudflare/d1/migrations/" + f, "utf8"));
  db.exec(`INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES('u','fixture@example.test','synthetic',1,1,1);
    INSERT INTO clients(id,company_name,email,created_at) VALUES('c','Client fixture','fixture@example.test',1);
    INSERT INTO projects(id,name,slug,client_id,created_at) VALUES('p','Proiect fixture','fixture','c',1);
    INSERT INTO project_staff(project_id,user_id,role,assigned_at) VALUES('p','u','owner',1);
    INSERT INTO project_logs(id,project_id,actor_id,action,created_at) VALUES('log','p','u','project.create',1);
    INSERT INTO services(id,project_id,service_name,price,billing_cycle) VALUES('s','p','Mentenanță',100,'monthly');
    INSERT INTO subscriptions(id,client_id,service_id,next_billing_date,status) VALUES('sub','c','s',2000000000000,'active');
    INSERT INTO staff_chat_messages(id,author_id,recipient_id,channel,content,created_at,project_id) VALUES('chat','u','u','general','Mesaj proiect',1,'p');
    INSERT INTO visual_assets(id,scope,client_id,project_id,title,category,object_key,file_name,content_type,size_bytes,sha256,created_by,created_at,updated_at) VALUES('asset','client','c','p','Logo','logo','opaque/key','logo.png','image/png',10,'checksum','u',1,1);
    INSERT INTO visual_asset_backups(id,asset_id,object_key,sha256,manifest_sha256,size_bytes,created_by,created_at) VALUES('backup','asset','opaque/backup','checksum','manifest',10,'u',1);
    INSERT INTO documents(id,number,scope,beneficiary_id,created_by,created_at,updated_at) VALUES('doc','fixture-001','client','c','u',1,1);
    INSERT INTO document_versions(id,document_id,version,payload_json,search_text,sha256,created_by,created_at) VALUES('ver','doc',1,'{}','Diacritice românești','checksum','u',1);
    UPDATE documents SET current_version_id='ver' WHERE id='doc';
    INSERT INTO document_assignments(id,document_id,project_id,created_by,created_at) VALUES('a-project','doc','p','u',1);
    INSERT INTO document_assignments(id,document_id,service_id,created_by,created_at) VALUES('a-service','doc','s','u',1);
    INSERT INTO document_assignments(id,document_id,subscription_id,created_by,created_at) VALUES('a-subscription','doc','sub','u',1);`);
  return db;
};
const snapshot = (db: DatabaseSync) => Object.fromEntries(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => [String(row.name), db.prepare(`SELECT * FROM "${row.name}"`).all().sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
describe("Optional beneficiary migration with enforced foreign keys", () => {
  it("preserves all rows, immutable documents, RESTRICT children, backup associations and schema protections", () => {
    const db = prepare(), before = snapshot(db);
    const objects = db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE type IN('index','trigger','view') ORDER BY name").all();
    db.exec("BEGIN;" + migration + "COMMIT;");
    expect(snapshot(db)).toEqual(before);
    expect(db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE type IN('index','trigger','view') AND name<>'project_client_cannot_clear' ORDER BY name").all()).toEqual(objects);
    expect(db.prepare("PRAGMA integrity_check").get()!.integrity_check).toBe("ok");
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(db.prepare("SELECT content FROM document_search_index WHERE document_search_index MATCH 'romanesti'").get()!.content).toBe("Diacritice românești");
    expect(() => db.exec("UPDATE document_versions SET search_text='changed' WHERE id='ver'")).toThrow(/immutable/);
    expect(() => db.exec("UPDATE visual_assets SET object_key='changed' WHERE id='asset'")).toThrow(/immutable/);
    expect(() => db.exec("UPDATE projects SET client_id=NULL WHERE id='p'")).toThrow(/client_workspace_client_required/);
    db.exec("INSERT INTO projects(id,name,slug,client_id,created_at) VALUES('unassigned','Unassigned','unassigned',NULL,1)");
    expect(() => db.exec("INSERT INTO projects(id,name,slug,client_id,created_at) VALUES('bad','Bad','bad','missing-client',1)")).toThrow(/FOREIGN KEY/);
    db.close();
  });
  it("rolls back a failed migration without losing data or leaving snapshot tables", () => {
    const db = prepare(), before = snapshot(db);
    db.exec("BEGIN");
    expect(() => db.exec(migration.replace("DROP TABLE _project_0091_assert;", "INSERT INTO _project_0091_assert VALUES(0);\nDROP TABLE _project_0091_assert;"))).toThrow(/CHECK/);
    db.exec("ROLLBACK");
    expect(snapshot(db)).toEqual(before);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
  });
});
