#!/usr/bin/env bash
set -euo pipefail

: "${SERVICE_URL:?Set SERVICE_URL to your Cloud Run URL (e.g., https://...a.run.app)}"

# Default probe path (override if you want)
PROBE_PATH="${PROBE_PATH:-/health}"

AUDIENCE="${AUDIENCE:-$SERVICE_URL}"
IMPERSONATE_SA="${IMPERSONATE_SA:-}"

echo "Fetching ID token for audience: $AUDIENCE"
if [[ -n "${IMPERSONATE_SA}" ]]; then
  echo "Impersonating: ${IMPERSONATE_SA}"
fi

get_token() {
  if [[ -n "${IMPERSONATE_SA}" ]]; then
    gcloud auth print-identity-token \
      --impersonate-service-account="$IMPERSONATE_SA" \
      --audiences="$AUDIENCE" 2>/dev/null \
    || gcloud auth print-identity-token \
      --impersonate-service-account="$IMPERSONATE_SA" \
      --audience="$AUDIENCE"
  else
    gcloud auth print-identity-token --audiences="$AUDIENCE" 2>/dev/null \
    || gcloud auth print-identity-token --audience="$AUDIENCE"
  fi
}

ID_TOKEN="$(get_token || true)"
if [[ -z "${ID_TOKEN:-}" ]]; then
  echo "Failed to mint ID token for audience: $AUDIENCE"
  exit 2
fi

URL="${SERVICE_URL%/}${PROBE_PATH}"

echo "Probing ${URL} ..."
code="$(curl -sS \
  --connect-timeout 5 \
  --max-time 10 \
  -o /dev/null \
  -w '%{http_code}' \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Accept: application/json" \
  "${URL}")"

echo "HTTP ${code}"
if [[ "${code}" != "200" ]]; then
  echo "Non-200 from ${PROBE_PATH} — dumping response:"
  curl -sS \
    --connect-timeout 5 \
    --max-time 10 \
    -i \
    -H "Authorization: Bearer ${ID_TOKEN}" \
    -H "Accept: application/json" \
    "${URL}" || true
  exit 1
fi

echo "Health probe OK"
