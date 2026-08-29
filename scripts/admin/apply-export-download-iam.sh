#!/usr/bin/env bash
# Apply staging IAM required for consumer export download (signed URL).
# Safe to re-run (gcloud add-iam-policy-binding / gsutil iam ch are idempotent).
#
# Required for Cloud Run ADC signing (no JSON key on the runtime SA):
#   - roles/iam.serviceAccountTokenCreator on oli-api-runtime → itself (signBlob)
#   - objectViewer on the private exports bucket (signed URL must authorize reads)
#
# Usage:
#   ./scripts/admin/apply-export-download-iam.sh [PROJECT_ID] [REGION]
#
# Defaults: oli-staging-fdbba us-central1
#
# Does NOT make the bucket public. Does NOT grant broader project TokenCreator.

set -euo pipefail

PROJECT_ID="${1:-oli-staging-fdbba}"
REGION="${2:-us-central1}"
API_SA="oli-api-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
EXPORTS_BUCKET="${PROJECT_ID}-staging-data-exports"

log() {
  printf '%s\n' "[apply-export-download-iam] $*"
}

log "project=${PROJECT_ID} region=${REGION}"
log "api_sa=${API_SA}"
log "exports_bucket=gs://${EXPORTS_BUCKET}"

log "binding TokenCreator on API SA → self (signBlob for getSignedUrl)"
gcloud iam service-accounts add-iam-policy-binding "${API_SA}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${API_SA}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --quiet

log "granting objectViewer on private exports bucket → API SA"
gsutil iam ch "serviceAccount:${API_SA}:objectViewer" "gs://${EXPORTS_BUCKET}"

log "done. Export download IAM applied (idempotent)."
