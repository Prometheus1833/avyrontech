-- Read-only, aggregate-only audit. An unlinked client/account can be intentional.
SELECT 'orphan_client_grants' check_name,count(*) issues FROM client_account_access a LEFT JOIN clients c ON c.id=a.client_id LEFT JOIN users u ON u.id=a.user_id WHERE c.id IS NULL OR u.id IS NULL;
SELECT 'orphan_project_assignments' check_name,count(*) issues FROM project_staff a LEFT JOIN projects p ON p.id=a.project_id LEFT JOIN users u ON u.id=a.user_id WHERE p.id IS NULL OR u.id IS NULL;
SELECT 'subscription_beneficiary_mismatch' check_name,count(*) issues FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id WHERE p.client_id IS NULL OR p.client_id<>s.client_id;
SELECT 'projects_without_client_optional' check_name,count(*) informational FROM projects WHERE client_id IS NULL;
SELECT 'clients_without_account_optional' check_name,count(*) informational FROM clients c WHERE NOT EXISTS(SELECT 1 FROM client_account_access a WHERE a.client_id=c.id);
