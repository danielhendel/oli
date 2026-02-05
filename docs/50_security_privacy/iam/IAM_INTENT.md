# IAM Intent — Oli Health OS (Staging)

This document defines the allowed IAM state for the oli-staging-fdbba project.

## Hard Rules

1. roles/editor is forbidden for all members.
2. Default GCP service accounts must never hold runtime or admin roles:
   - PROJECT_NUMBER-compute@developer.gserviceaccount.com
   - PROJECT_ID@appspot.gserviceaccount.com
3. All compute workloads must use dedicated service accounts:
   - Cloud Functions Gen2 → oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com
   - Cloud Run API → oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com

## Allowed Elevated Accounts

| Service Account | Purpose |
|----------------|---------|
| oli-functions-runtime | All Gen2 Functions |
| oli-api-runtime | Cloud Run API |
| oli-eventarc-invoker | Eventarc trigger invocation |
| firebase-adminsdk-* | Firebase control plane only |

Any deviation from this document is a security regression and must fail CI.
