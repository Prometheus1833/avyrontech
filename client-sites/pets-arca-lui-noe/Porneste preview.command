#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Instalează Node.js 22.13 sau o versiune mai nouă și deschide din nou acest fișier.'
  read -r -p 'Apasă Enter pentru a închide.'
  exit 1
fi
exec node server/start.mjs
