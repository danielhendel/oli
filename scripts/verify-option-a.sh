#!/usr/bin/env bash
set -euo pipefail

: "${SERVICE_URL:?Set SERVICE_URL (Cloud Run direct OR Gateway URL)}"
: "${FIREBASE_ID_TOKEN:?Set FIREBASE_ID_TOKEN}"

rid() { echo "$1-$(date +%s)"; }

echo "== Build checks =="
npm ci
npm run -w @oli/contracts build
npm run -w api build
node scripts/ci/assert-api-routes.mjs
scripts/ci/guardrails.sh

echo "== Runtime checks ($SERVICE_URL) =="

# public health
curl -fsS "$SERVICE_URL/health" >/dev/null
curl -fsS "$SERVICE_URL/_healthz" >/dev/null
curl -fsS "$SERVICE_URL/ready" >/dev/null
curl -fsS "$SERVICE_URL/live" >/dev/null

# auth boundary: should be 200 with token
curl -fsS "$SERVICE_URL/health/auth" -H "Authorization: Bearer $FIREBASE_ID_TOKEN" >/dev/null

# preferences persistence smoke
prefRid="$(rid pref)"
curl -fsS "$SERVICE_URL/preferences" \
  -X PUT \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "x-request-id: $prefRid" \
  -H "content-type: application/json" \
  -d '{"units":{"mass":"lb"},"timezone":{"mode":"explicit","explicitIana":"America/New_York"}}' >/dev/null
curl -fsS "$SERVICE_URL/preferences" -H "Authorization: Bearer $FIREBASE_ID_TOKEN" >/dev/null

# account ops
curl -fsS "$SERVICE_URL/export" \
  -X POST \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "x-request-id: $(rid export)" >/dev/null

curl -fsS "$SERVICE_URL/account/delete" \
  -X POST \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "x-request-id: $(rid delete)" >/dev/null

echo "verify-option-a: OK"