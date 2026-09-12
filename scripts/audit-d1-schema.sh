#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
audit_directory=$(mktemp -d /tmp/avyron-d1-audit.XXXXXX)
audit_database="$audit_directory/avyron.db"
trap 'rm -rf "$audit_directory"' EXIT

for migration in "$repository_root"/cloudflare/d1/migrations/*.sql; do
  sqlite3 "$audit_database" < "$migration"
done

foreign_key_issues=$(sqlite3 "$audit_database" "SELECT COUNT(*) FROM pragma_foreign_key_check;")
integrity=$(sqlite3 "$audit_database" "PRAGMA integrity_check;")
legacy_ai_timestamps=$(sqlite3 "$audit_database" \
  "SELECT (SELECT COUNT(*) FROM ai_agents WHERE created_at < 100000000000)
        + (SELECT COUNT(*) FROM ai_knowledge WHERE created_at < 100000000000)
        + (SELECT COUNT(*) FROM ai_conversations WHERE created_at < 100000000000)
        + (SELECT COUNT(*) FROM ai_messages WHERE created_at < 100000000000)
        + (SELECT COUNT(*) FROM ai_learning_queue WHERE created_at < 100000000000);")
platform_owners=$(sqlite3 "$audit_database" \
  "SELECT COUNT(*) FROM platform_principals
    WHERE email = 'prometheus@avyron.ro' AND role = 'platform_owner' AND status = 'active';")
unsafe_social_sources=$(sqlite3 "$audit_database" \
  "SELECT COUNT(*) FROM knowledge_sources
    WHERE kind = 'social' AND status = 'active' AND trust_level <> 'verified';")
invalid_lead_state=$(sqlite3 "$audit_database" \
  "SELECT (SELECT COUNT(*) FROM lead_candidates WHERE status = 'promoted' AND promoted_lead_id IS NULL)
        + (SELECT COUNT(*) FROM leads WHERE lifecycle_stage = 'converted' AND converted_project_id IS NULL);")
unsafe_engine_state=$(sqlite3 "$audit_database" \
  "SELECT (SELECT COUNT(*) FROM engine_sources
            WHERE lifecycle_status = 'active'
              AND (security_status <> 'reviewed' OR robots_reviewed <> 1 OR terms_reviewed <> 1))
        + (SELECT COUNT(*) FROM engine_connectors WHERE status = 'active' AND approved_at IS NULL)
        + (SELECT COUNT(*) FROM engine_documents
            WHERE agent_usable = 1 AND (status <> 'approved' OR trust_level = 'untrusted'))
        + (SELECT COUNT(*) FROM engine_capabilities WHERE source_id = 'eng_src_uiprompts')
        + (SELECT COUNT(*) FROM engine_discovery_policies
            WHERE id = 'engine_policy_monthly' AND enabled <> 0);")

if [[ "$foreign_key_issues" != "0" || "$integrity" != "ok" || "$legacy_ai_timestamps" != "0" \
   || "$platform_owners" != "1" || "$unsafe_social_sources" != "0" || "$invalid_lead_state" != "0" \
   || "$unsafe_engine_state" != "0" ]]; then
  echo "D1 schema audit failed: foreign_keys=$foreign_key_issues integrity=$integrity legacy_ai_timestamps=$legacy_ai_timestamps platform_owners=$platform_owners unsafe_social_sources=$unsafe_social_sources invalid_lead_state=$invalid_lead_state unsafe_engine_state=$unsafe_engine_state" >&2
  exit 1
fi

sqlite3 -header -column "$audit_database" < "$repository_root/cloudflare/d1/checks/post-migration.sql"
