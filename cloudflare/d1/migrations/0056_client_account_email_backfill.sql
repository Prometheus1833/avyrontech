-- Link existing verified accounts to client records with the same email so the
-- client portal (invoices, subscriptions, tickets) is not empty after 0020.
INSERT OR IGNORE INTO client_account_access (client_id, user_id, granted_by, created_at)
SELECT cl.id, u.id, u.id, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM users u
JOIN clients cl ON lower(trim(cl.email)) = lower(trim(u.email))
WHERE u.email_verified = 1;
