#!/usr/bin/env bash
# Phase 3A — Build oli-api image via Cloud Build (repo root context, services/api/Dockerfile).
# Preflight: gcloud project must be oli-staging-fdbba.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$REPO_ROOT"

PROJECT_ID="oli-staging-fdbba"
CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
  echo "Preflight failed: gcloud project is '$CURRENT_PROJECT', expected $PROJECT_ID."
  exit 1
fi

SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "nobranch")"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/oli-api:${SHORT_SHA}"

echo "Building API image..."
echo "  Project: $PROJECT_ID"
echo "  Image:   $IMAGE"
echo ""

mkdir -p /tmp
cat > /tmp/cloudbuild-oli-api.yaml << EOF
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -f
      - services/api/Dockerfile
      - -t
      - "${IMAGE}"
      - .

images:
  - "${IMAGE}"
EOF

gcloud builds submit \
  --project="$PROJECT_ID" \
  --config=/tmp/cloudbuild-oli-api.yaml \
  .

echo ""
echo "Image built: $IMAGE"
