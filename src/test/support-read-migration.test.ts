// @vitest-environment node
import{DatabaseSync}from'node:sqlite';import{readFileSync,readdirSync}from'node:fs';import{it,expect}from'vitest';
it('establishes a clearly labelled legacy baseline only for authorized recipients without changing messages',()=>{
 const db=new DatabaseSync(':memory:');try{
  for(const file of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')&&!f.startsWith('0114_')).sort())db.exec(readFileSync('cloudflare/d1/migrations/'+file,'utf8'));
  db.exec("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES('client','client@example.test','synthetic',1,1),('other','other@example.test','synthetic',1,1),('staff','staff@example.test','synthetic',1,1); INSERT INTO clients(id,company_name,email,created_at) VALUES('a','A','a@example.test',1),('b','B','b@example.test',1); INSERT INTO client_account_access VALUES('a','client','staff',1),('b','other','staff',1); INSERT INTO support_tickets(id,client_id,subject,created_at) VALUES('ta','a','A',1),('tb','b','B',1); INSERT INTO support_messages(id,ticket_id,author_id,content,is_staff_reply,created_at) VALUES('old-a','ta','staff','Kept',1,1),('last-a','ta','staff','Kept too',1,2),('last-b','tb','staff','Private B',1,3)");
  const before=db.prepare('SELECT * FROM support_messages ORDER BY id').all();
  db.exec(readFileSync('cloudflare/d1/migrations/0114_support_ticket_read_cursors.sql','utf8'));
  expect(db.prepare('SELECT user_id,ticket_id,message_id,is_baseline FROM support_ticket_reads ORDER BY user_id').all()).toEqual([{user_id:'client',ticket_id:'ta',message_id:'last-a',is_baseline:1},{user_id:'other',ticket_id:'tb',message_id:'last-b',is_baseline:1}]);
  expect(db.prepare('SELECT * FROM support_messages ORDER BY id').all()).toEqual(before);
  expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 }finally{db.close();}
});
