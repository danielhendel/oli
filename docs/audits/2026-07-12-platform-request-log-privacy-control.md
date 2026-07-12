# Platform Request-Log Privacy Control Audit

**Date:** 2026-07-12
**Base feature SHA:** `77e4f46fea8f70adb8a2769ffc8316ad4b2d9daa`
**Base feature tree:** `28cd12a0e56c7c08ad1c6930eac40a4e64b0cde8`
**Platform branch:** `fix/pr183-platform-request-log-privacy`
**Platform worktree:** `/Users/danielhendel/oli-platform-request-log-privacy`
**Safety ref:** `safety/weekly-fitness-before-platform-log-control-77e4f46` (local only)

This audit is privacy-safe. It contains no UIDs, emails, IPs, tokens, keys,
exact health dates, query values, raw URLs, response bodies, or raw logs.

---

## 1. Live sink inventory (pre-apply)

| Sink | Role | Retention (verified earlier / rechecked) | Stores affected request logs? |
|---|---|---|---|
| `_Default` | project application / request logs | 30 days | yes (pre-exclusion) |
| `_Required` | audit-only | 400 days | no |

Folder/organization sinks: none observed for the authorized account and
current resource hierarchy.

No Terraform ownership of `_Default` exists in-repo. Source owner for this
release is the reviewed management script under `scripts/deploy/logging/`.

---

## 2. Affected log classes

| Class | Log ID | Resource scope |
|---|---|---|
| Cloud Run automatic request logs | `run.googleapis.com/requests` | `cloud_run_revision` + `service_name=oli-api` + `location=us-central1` |
| API Gateway request logs | `apigateway.googleapis.com/requests` | `apigateway.googleapis.com/Gateway` + `gateway_id=oli-gateway` + `location=us-central1` |
| Managed-service endpoints log | `oli-api-0drj1f1cbrv7k.apigateway.oli-staging-fdbba.cloud.goog/endpoints_log` | `resource.type=api` + exact managed service label |
| Legacy generic app access event | `run.googleapis.com/stdout` (app payload) | `oli-api` + `jsonPayload.msg="request"` |

Resource-label scoping derived from live metadata-only samples. Unscoped
`LOG_ID("apigateway.googleapis.com/requests")` alone is rejected.

---

## 3. Exclusion specification

- **Name:** `oli_api_request_metadata_privacy_v1`
- **Clause count:** 4
- **Normalized filter SHA-256:**
  `87f8c63c9889d5f094a5ad299355762a33773a147f35aca9802b895768983fa0`

### Legacy event decision

Include transitional exclusion for `jsonPayload.msg="request"` on `oli-api`
only. Live samples: emitted by `oli-api` stdout; no other services observed
with the same identifying fields in a 7-day window. Do **not** exclude
`jsonPayload.operation="http_request_completed"`.

---

## 4. Observability dependency result

| Dependency class | Result |
|---|---|
| Dashboards on request logs | none found |
| Alerts on request logs | none found |
| Log-based metrics on request logs | none found |
| Cloud Run request-count metrics | available independently |
| Cloud Run latency metrics | available independently |
| Privacy-safe app telemetry after corrected API deploy | sufficient for route-level ops |

---

## 5. Existing-log age / retention

- Affected bucket: `_Default`
- Retention: 30 days
- Selective deletion: **not performed** (not authorized)
- Retroactive deletion: **no**
- Approach: allow existing entries to expire under retention; maintain
  least-privilege logging access

---

## 6. Source-control owner / apply-rollback plan

| Action | Mechanism |
|---|---|
| Plan | backup + filter hash + intended action |
| Apply | `--add-exclusion` only |
| Verify | destination / inclusion filter / prior exclusions / `_Required` |
| Rollback | `--remove-exclusions=oli_api_request_metadata_privacy_v1` |

Never: `--clear-exclusions`, destination change, inclusion-filter replace,
sink disable, `_Required` mutation, retention/IAM change.

---

## 7. Verification plan

1. Pre-change sink backup (mode 600) + SHA-256.
2. Count-only candidate-filter scope checks before apply.
3. Apply + verify intended-only change.
4. Synthetic non-user probes (Cloud Run, Gateway, legacy event surface).
5. Bounded wait ≤10 minutes; require 0 stored marker matches on excluded
   surfaces after apply time.
6. Confirm unrelated / Function logs still route; Cloud Monitoring request
   metrics remain available.
7. Confirm future safe `http_request_completed` is not matched by the
   exclusion filter (retained when emitted).

---

## 8. Long-term follow-ups (not in this task)

- Gateway key transport: move query key to `x-api-key` or remove after proof.
- Health-range transport: move day/range criteria off GET query params where
  architecture permits.
- Evaluate formal Terraform ownership of logging sinks in a later platform
  sprint (do not import `_Default` during feature stabilization).
- Remaining mobile Workout/Energy/Apple Health telemetry debt remains outside
  this control.

---

## 9. Runtime impact of this change set

- No API / Function / OpenAPI / mobile runtime source changes.
- No backend image build, Cloud Run deploy, Function deploy, traffic shift,
  or Gateway attachment in this control.
- Function `onourapostrawrequested-00054-sen` remains release-eligible.
- Corrected API access-log runtime still requires a later immutable image
  build from the final feature head.
