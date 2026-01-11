#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-oli-staging-fdbba}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-oli-api}"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  SHA="$(git rev-parse --short HEAD)"
else
  SHA="$(date +%Y%m%d%H%M%S)"
fi

IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${SERVICE}:${SHA}"

echo "Deploying ${SERVICE}"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "  Image:   ${IMAGE}"
echo ""

gcloud builds submit \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --config cloudbuild.api.yaml \
  --substitutions "_IMAGE=${IMAGE}" \
  .

gcloud run deploy "${SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}"

echo ""
echo "✅ Deployed. Service URL:"
gcloud run services describe "${SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)'
