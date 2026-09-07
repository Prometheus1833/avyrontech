#!/usr/bin/env bash
# Creează / promovează cele două conturi de super admin AVYRON.
#
# Parola NU stă în cod: o dai prin variabile de mediu, o singură dată, din terminal.
#
#   export SEED_TOKEN='<tokenul SEED_TOKEN din Worker>'
#   export SUPERADMIN_PASSWORD='<parola dorită>'
#   bash cloudflare/scripts/seed-superadmins.sh
#
# Conturile primesc rolurile user + staff + admin (control total pe site și pe
# platforma internă) și nu li se cere schimbarea parolei la primul login.

set -euo pipefail

API_BASE="${API_BASE:-https://api.avyron.ro}"
: "${SEED_TOKEN:?Setează SEED_TOKEN}"
: "${SUPERADMIN_PASSWORD:?Setează SUPERADMIN_PASSWORD}"

payload=$(SUPERADMIN_PASSWORD="$SUPERADMIN_PASSWORD" python3 - <<'PY'
import json, os
pwd = os.environ["SUPERADMIN_PASSWORD"]
accounts = [
    ("prometheus@avyron.ro", "Prometheus"),
    ("avyrontech@gmail.com", "AVYRON Tech"),
]
print(json.dumps({"users": [
    {
        "email": email,
        "temporaryPassword": pwd,
        "displayName": name,
        "roles": ["user", "staff", "admin"],
        "forcePasswordChange": False,
        "updateExisting": True,
        "profile": {"staffRole": "dev", "pseudonym": name},
    }
    for email, name in accounts
]}))
PY
)

curl -sS -X POST "$API_BASE/api/admin/import-users" \
  -H "content-type: application/json" \
  -H "x-seed-token: $SEED_TOKEN" \
  --data "$payload"
echo
