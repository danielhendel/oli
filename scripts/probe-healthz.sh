#!/usr/bin/env bash
set -euo pipefail

: "${SERVICE_URL:?Set SERVICE_URL to your Cloud Run URL (e.g., https://...a.run.app)}"
AUDIENCE="${AUDIENCE:-$SERVICE_URL}"

echo "Fetching ID token for audience: $AUDIENCE"
# If your gcloud version errors on --audiences, try --audience (singular)
ID_TOKEN="$(gcloud auth print-identity-token --audiences="${AUDIENCE}")"

echo "Probing ${SERVICE_URL}/healthz ..."
code="$(curl -sS \
  --connect-timeout 5 \
  --max-time 10 \
  -o /dev/null \
  -w '%{http_code}' \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  "${SERVICE_URL}/healthz")"

echo "HTTP ${code}"
test "${code}" = "200"
echo "Health probe OK"
