#!/usr/bin/env bash
set -euo pipefail

: "${GATEWAY:?Set GATEWAY}"
: "${API_KEY:?Set API_KEY}"
: "${FIREBASE_WEB_API_KEY:?Set FIREBASE_WEB_API_KEY}"
: "${EMAIL:?Set EMAIL}"
: "${PASSWORD:?Set PASSWORD}"

RESP="$(curl -sS -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"returnSecureToken\":true}")"

ID_TOKEN="$(echo "$RESP" | jq -r '.idToken // empty')"

if [[ -z "$ID_TOKEN" ]]; then
  echo "ERROR: Failed to mint idToken" >&2
  echo "$RESP" | jq . >&2
  exit 1
fi

LEN="${#ID_TOKEN}"
if (( LEN < 800 )); then
  echo "ERROR: idToken too short (${LEN})" >&2
  exit 1
fi

echo "OK minted idToken length=$LEN"

echo
echo "== /integrations/withings/status =="
curl -i "${GATEWAY}/integrations/withings/status?key=${API_KEY}" \
  -H "Authorization: Bearer ${ID_TOKEN}"

echo
echo "== /users/me/raw-events (weight, withings) =="
curl -i "${GATEWAY}/users/me/raw-events?kind=weight&sourceId=withings&key=${API_KEY}" \
  -H "Authorization: Bearer ${ID_TOKEN}"
