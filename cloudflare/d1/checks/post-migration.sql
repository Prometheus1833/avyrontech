PRAGMA foreign_key_check;
PRAGMA integrity_check;

SELECT 'application_tables' AS check_name, COUNT(*) AS value
  FROM sqlite_master
 WHERE type = 'table' AND name NOT LIKE 'sqlite_%';

SELECT 'application_indexes' AS check_name, COUNT(*) AS value
  FROM sqlite_master
 WHERE type = 'index' AND name NOT LIKE 'sqlite_%';

SELECT 'legacy_ai_second_timestamps' AS check_name,
       (SELECT COUNT(*) FROM ai_agents WHERE created_at < 100000000000)
     + (SELECT COUNT(*) FROM ai_knowledge WHERE created_at < 100000000000)
     + (SELECT COUNT(*) FROM ai_conversations WHERE created_at < 100000000000)
     + (SELECT COUNT(*) FROM ai_messages WHERE created_at < 100000000000)
     + (SELECT COUNT(*) FROM ai_learning_queue WHERE created_at < 100000000000)
       AS value;

SELECT 'platform_principals' AS check_name, COUNT(*) AS value
  FROM platform_principals WHERE status = 'active';

SELECT 'platform_owners' AS check_name, COUNT(*) AS value
  FROM platform_principals
 WHERE email = 'prometheus@avyron.ro' AND role = 'platform_owner' AND status = 'active';

SELECT 'agent_versions_without_agent' AS check_name, COUNT(*) AS value
  FROM ai_agent_versions AS version
  LEFT JOIN ai_agents AS agent ON agent.slug = version.agent_slug
 WHERE agent.slug IS NULL;

SELECT 'orphaned_memberships' AS check_name, COUNT(*) AS value
  FROM organization_memberships AS membership
  LEFT JOIN organizations AS organization ON organization.id = membership.organization_id
  LEFT JOIN users AS account ON account.id = membership.user_id
 WHERE organization.id IS NULL OR account.id IS NULL;

SELECT 'active_mfa_without_secret' AS check_name, COUNT(*) AS value
  FROM mfa_factors
 WHERE kind = 'totp' AND status = 'active'
   AND (secret_ciphertext IS NULL OR secret_ciphertext NOT LIKE 'v1.%');

SELECT 'reused_mfa_recovery_codes' AS check_name, COUNT(*) AS value
  FROM mfa_recovery_codes
 WHERE used_at IS NOT NULL AND used_at < created_at;

SELECT 'active_unverified_social_sources' AS check_name, COUNT(*) AS value
  FROM knowledge_sources
 WHERE kind = 'social' AND status = 'active' AND trust_level <> 'verified';

SELECT 'promoted_candidates_without_lead' AS check_name, COUNT(*) AS value
  FROM lead_candidates
 WHERE status = 'promoted' AND promoted_lead_id IS NULL;

SELECT 'converted_leads_without_project' AS check_name, COUNT(*) AS value
  FROM leads
 WHERE lifecycle_stage = 'converted' AND converted_project_id IS NULL;

SELECT 'unsafe_active_engine_sources' AS check_name, COUNT(*) AS value
  FROM engine_sources
 WHERE lifecycle_status = 'active'
   AND (security_status <> 'reviewed' OR robots_reviewed <> 1 OR terms_reviewed <> 1);

SELECT 'active_engine_connectors_without_approval' AS check_name, COUNT(*) AS value
  FROM engine_connectors
 WHERE status = 'active' AND approved_at IS NULL;

SELECT 'agent_usable_unapproved_engine_documents' AS check_name, COUNT(*) AS value
  FROM engine_documents
 WHERE agent_usable = 1 AND (status <> 'approved' OR trust_level = 'untrusted');

SELECT 'unverified_uiprompts_capabilities' AS check_name, COUNT(*) AS value
  FROM engine_capabilities
 WHERE source_id = 'eng_src_uiprompts';

SELECT 'enabled_engine_discovery_seed' AS check_name, COUNT(*) AS value
  FROM engine_discovery_policies
 WHERE id = 'engine_policy_monthly' AND enabled <> 0;
