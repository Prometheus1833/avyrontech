CREATE TABLE IF NOT EXISTS account_service_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, service_key)
);
