ALTER TABLE ai_knowledge ADD COLUMN review_after INTEGER;
ALTER TABLE ai_runs ADD COLUMN usage_source TEXT NOT NULL DEFAULT 'estimated';
ALTER TABLE ai_runs ADD COLUMN actual_cost_micros INTEGER;
ALTER TABLE ai_approvals ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ai_approvals ADD COLUMN approved_revision INTEGER;
CREATE VIRTUAL TABLE ai_knowledge_fts USING fts5(question,answer,keywords,content='ai_knowledge',content_rowid='rowid',tokenize='unicode61 remove_diacritics 2');
INSERT INTO ai_knowledge_fts(ai_knowledge_fts) VALUES('rebuild');
CREATE TRIGGER ai_knowledge_fts_insert AFTER INSERT ON ai_knowledge BEGIN
 INSERT INTO ai_knowledge_fts(rowid,question,answer,keywords) VALUES(new.rowid,new.question,new.answer,new.keywords);
END;
CREATE TRIGGER ai_knowledge_fts_delete AFTER DELETE ON ai_knowledge BEGIN
 INSERT INTO ai_knowledge_fts(ai_knowledge_fts,rowid,question,answer,keywords) VALUES('delete',old.rowid,old.question,old.answer,old.keywords);
END;
CREATE TRIGGER ai_knowledge_fts_update AFTER UPDATE OF question,answer,keywords ON ai_knowledge BEGIN
 INSERT INTO ai_knowledge_fts(ai_knowledge_fts,rowid,question,answer,keywords) VALUES('delete',old.rowid,old.question,old.answer,old.keywords);
 INSERT INTO ai_knowledge_fts(rowid,question,answer,keywords) VALUES(new.rowid,new.question,new.answer,new.keywords);
END;
