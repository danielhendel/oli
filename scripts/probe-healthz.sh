#!/usr/bin/env bash
set -euo pipefail

: "${SERVICE_URL:?Set SERVICE_URL to your Cloud Run URL (e.g., https://...a.run.app)}"
AUDIENCE="${AUDIENCE:-$SERVICE_URL}"
# CI will set this to your invoker SA; locally you can set it too.
IMPERSONATE_SA="${IMPERSONATE_SA:-}"

echo "Fetching ID token for audience: $AUDIENCE"

get_token() {
  if [[ -n "${IMPERSONATE_SA}" ]]; then
    # Always impersonate (works in CI WIF and locally)
    gcloud auth print-identity-token \
      --impersonate-service-account="$IMPERSONATE_SA" \
      --audiences="$AUDIENCE" 2>/dev/null \
    || gcloud auth print-identity-token \
      --impersonate-service-account="$IMPERSONATE_SA" \
      --audience="$AUDIENCE"
  else
    # Fallback path (may fail on user creds)
    gcloud auth print-identity-token --audiences="$AUDIENCE" 2>/dev/null \
    || gcloud auth print-identity-token --audience="$AUDIENCE"
  fi
}

ID_TOKEN="$(get_token || true)"
if [[ -z "${ID_TOKEN:-}" ]]; then
  echo "Failed to mint ID token for audience: $AUDIENCE"
  exit 2
fi

echo "Probing ${SERVICE_URL}/healthz ..."
code="$(curl -sS \
  --connect-timeout 5 \
  --max-time 10 \
  -o /dev/null \
  -w '%{http_code}' \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Accept: application/json" \
  "${SERVICE_URL}/healthz")"

echo "HTTP ${code}"
if [[ "${code}" != "200" ]]; then
  echo "Non-200 from /healthz — dumping response:"
  curl -sS \
    --connect-timeout 5 \
    --max-time 10 \
    -i \
    -H "Authorization: Bearer ${ID_TOKEN}" \
    -H "Accept: application/json" \
    "${SERVICE_URL}/healthz" || true
  exit 1
fi

echo "Health probe OK"
