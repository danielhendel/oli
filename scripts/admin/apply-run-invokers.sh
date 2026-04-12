#!/usr/bin/env bash
# Re-apply Cloud Run invoker IAM for Gen2 Firestore triggers and admin HTTP functions.
# Safe to re-run (gcloud add-iam-policy-binding is idempotent for existing bindings).
#
# Usage:
#   ./scripts/admin/apply-run-invokers.sh [PROJECT_ID] [REGION] [USER_EMAIL]
#
# Defaults: oli-staging-fdbba us-central1 dhendel4@gmail.com
#
# Recommended after functions deploy:
#   firebase deploy --only functions --project oli-staging-fdbba && \
#     ./scripts/admin/apply-run-invokers.sh oli-staging-fdbba us-central1 dhendel4@gmail.com

set -euo pipefail

PROJECT_ID="${1:-oli-staging-fdbba}"
REGION="${2:-us-central1}"
USER_EMAIL="${3:-dhendel4@gmail.com}"

SERVICES=(
  "onraweventupdatedfornormalization"
  "recomputedailyfactsadminhttp"
)

log() {
  printf '%s\n' "[apply-run-invokers] $*"
}

log "project=${PROJECT_ID} region=${REGION} user=${USER_EMAIL}"

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
if [[ -z "${PROJECT_NUMBER}" ]]; then
  log "ERROR: could not resolve project number for ${PROJECT_ID}"
  exit 1
fi

EVENTARC_SA="service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com"
PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
FUNCTIONS_RUNTIME_SA="oli-functions-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

log "PROJECT_NUMBER=${PROJECT_NUMBER}"
log "EVENTARC_SA=${EVENTARC_SA}"
log "PUBSUB_SA=${PUBSUB_SA}"
log "FUNCTIONS_RUNTIME_SA=${FUNCTIONS_RUNTIME_SA}"

bind_invoker() {
  local service="$1"
  local member="$2"
  log "binding ${member} -> ${service}"
  gcloud run services add-iam-policy-binding "${service}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --member="${member}" \
    --role="roles/run.invoker" \
    --quiet
}

for svc in "${SERVICES[@]}"; do
  bind_invoker "${svc}" "serviceAccount:${EVENTARC_SA}"
  bind_invoker "${svc}" "serviceAccount:${PUBSUB_SA}"
  bind_invoker "${svc}" "serviceAccount:${FUNCTIONS_RUNTIME_SA}"
done

log "binding user:${USER_EMAIL} -> recomputedailyfactsadminhttp only"
gcloud run services add-iam-policy-binding "recomputedailyfactsadminhttp" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --member="user:${USER_EMAIL}" \
  --role="roles/run.invoker" \
  --quiet

log "done. IAM policy bindings applied (idempotent)."
