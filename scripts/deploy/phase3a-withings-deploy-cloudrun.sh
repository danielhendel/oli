#!/usr/bin/env bash
# Phase 3A — Deploy oli-api to Cloud Run (exact service account, image tag from arg or latest build).
# Preflight: gcloud project must be oli-staging-fdbba.
set -euo pipefail

PROJECT_ID="oli-staging-fdbba"
REGION="us-central1"
SERVICE="oli-api"
SA="oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com"

CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
  echo "Preflight failed: gcloud project is '$CURRENT_PROJECT', expected $PROJECT_ID."
  exit 1
fi

# Image tag: first arg, or SHORT_SHA from git.
TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo "12aaa43")}"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/oli-api:${TAG}"

echo "Deploying Cloud Run service..."
echo "  Project: $PROJECT_ID"
echo "  Region:  $REGION"
echo "  Service: $SERVICE"
echo "  Image:   $IMAGE"
echo "  SA:      $SA"
echo ""

gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE" \
  --service-account="$SA"

echo ""
echo "Service URL:"
gcloud run services describe "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.url)'
