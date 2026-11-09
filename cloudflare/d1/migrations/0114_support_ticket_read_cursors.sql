-- Read positions for the existing support conversation store; no message copies.
CREATE TABLE support_ticket_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  message_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_baseline INTEGER NOT NULL DEFAULT 0 CHECK(is_baseline IN(0,1)),
  PRIMARY KEY(user_id,ticket_id)
);

-- Legacy reads were not tracked. Establish an explicit baseline for currently
-- authorized recipients without pretending these are historical read receipts.
WITH latest AS (
  SELECT id,ticket_id,created_at,
    ROW_NUMBER() OVER(PARTITION BY ticket_id ORDER BY created_at DESC,id DESC) position
  FROM support_messages
)
INSERT INTO support_ticket_reads(user_id,ticket_id,message_id,message_at,updated_at,is_baseline)
SELECT access.user_id,ticket.id,latest.id,latest.created_at,unixepoch()*1000,1
FROM latest JOIN support_tickets ticket ON ticket.id=latest.ticket_id
JOIN client_account_access access ON access.client_id=ticket.client_id
WHERE latest.position=1;
