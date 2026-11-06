-- Extend the existing message store. Legacy team threads keep a NULL project_id.
ALTER TABLE staff_chat_messages ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT;
CREATE INDEX project_chat_recent ON staff_chat_messages(project_id,created_at DESC,id DESC) WHERE project_id IS NOT NULL;
CREATE TRIGGER project_chat_context_immutable BEFORE UPDATE OF project_id,recipient_id,channel,author_id ON staff_chat_messages BEGIN SELECT RAISE(ABORT,'chat_context_immutable'); END;
CREATE TRIGGER project_chat_room_scope BEFORE INSERT ON staff_chat_messages WHEN NEW.project_id IS NOT NULL AND (NEW.recipient_id IS NOT NEW.author_id OR NEW.channel<>'general') BEGIN SELECT RAISE(ABORT,'invalid_project_chat_scope'); END;
CREATE TRIGGER project_chat_beneficiary BEFORE UPDATE OF client_id ON projects WHEN NEW.client_id IS NOT OLD.client_id AND EXISTS(SELECT 1 FROM staff_chat_messages m WHERE m.project_id=OLD.id) BEGIN SELECT RAISE(ABORT,'project_chat_history'); END;
