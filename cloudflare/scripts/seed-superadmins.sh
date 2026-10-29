#!/usr/bin/env bash
# Retired: the legacy importer set one shared password and treated possession
# of the seed token as proof of ownership of a platform email address.
# Platform owners now self-register, verify their email, and receive the admin
# role through the audited owner-only admin route after migration 0073.
set -euo pipefail
echo 'Legacy superadmin seeding is disabled. Follow docs/security/PLATFORM_OWNERS_2026-10-29.md.' >&2
exit 1
