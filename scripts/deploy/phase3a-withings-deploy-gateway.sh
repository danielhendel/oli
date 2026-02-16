#!/usr/bin/env bash
# Phase 3A — Create new API Gateway config from repo openapi and update gateway to use it.
# Preflight: gcloud project oli-staging-fdbba; gateway oli-gateway exists in us-central1.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$REPO_ROOT"

PROJECT_ID="oli-staging-fdbba"
LOCATION="us-central1"
GATEWAY="oli-gateway"
API="oli-api"
OPENAPI_SPEC="infra/gateway/openapi.yaml"

CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
  echo "Preflight failed: gcloud project is '$CURRENT_PROJECT', expected $PROJECT_ID."
  exit 1
fi

if ! gcloud api-gateway gateways describe "$GATEWAY" --location="$LOCATION" --project="$PROJECT_ID" &>/dev/null; then
  echo "Preflight failed: gateway '$GATEWAY' not found in location $LOCATION (project $PROJECT_ID)."
  exit 1
fi

CONFIG_ID="oli-api-config-$(date +%Y%m%d-%H%M%S)"
echo "Creating API config..."
echo "  Config ID: $CONFIG_ID"
echo "  OpenAPI:   $OPENAPI_SPEC"
echo ""

gcloud api-gateway api-configs create "$CONFIG_ID" \
  --api="$API" \
  --project="$PROJECT_ID" \
  --openapi-spec="$OPENAPI_SPEC"

# Config resource is in global; gateway is in us-central1.
CONFIG_RESOURCE="projects/1010034434203/locations/global/apis/$API/configs/$CONFIG_ID"
echo ""
echo "Updating gateway to use new config..."
gcloud api-gateway gateways update "$GATEWAY" \
  --api-config="$CONFIG_RESOURCE" \
  --location="$LOCATION" \
  --project="$PROJECT_ID"

echo ""
echo "Gateway updated. Active config: $CONFIG_RESOURCE"
