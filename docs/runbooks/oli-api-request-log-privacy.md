# Runbook: Oli API / Gateway request-log privacy control

## Purpose

Prevent future storage in the staging project `_Default` log bucket of
platform-generated and legacy application request records that may contain
health-range query values, exact health-day query values, Gateway consumer
keys, raw request URLs, concrete request identifiers, or authenticated-user
identifiers from the legacy access logger.

## Privacy threat

Cloud Run automatic request logs, API Gateway request logs, and the managed
API Gateway endpoints log store request URLs that can include query values.
The still-serving pre-repair API revision also emits a legacy generic
application access event (`jsonPayload.msg="request"`) with prohibited
request metadata. Application source for the corrected
`http_request_completed` event is already merged, but is not yet deployed.

## Exact source owner

- Management script:
  `scripts/deploy/logging/manage-oli-api-request-log-privacy.sh`
- Filter specification:
  `scripts/deploy/logging/oli-api-request-log-privacy.filter`
- Constants:
  `scripts/deploy/logging/oli-api-request-log-privacy.constants.sh`
- Tests:
  `scripts/deploy/logging/__tests__/manage-oli-api-request-log-privacy.test.ts`

Terraform does **not** own `_Default` for this release. Do not import the
system-created sink during feature stabilization.

## Exact project

```text
oli-staging-fdbba
```

## Exact sink

```text
_Default
```

## Exclusion name

```text
oli_api_request_metadata_privacy_v1
```

## Privacy-safe filter explanation

One atomic exclusion with four narrowly scoped OR clauses:

1. Cloud Run automatic request logs for service `oli-api` in `us-central1`
   (`LOG_ID("run.googleapis.com/requests")`).
2. API Gateway automatic request logs for gateway `oli-gateway` in
   `us-central1` (`LOG_ID("apigateway.googleapis.com/requests")`).
3. Managed-service endpoints log for the Oli staging API managed service
   (`…/endpoints_log`) scoped by `resource.type="api"` and the exact service
   label.
4. Transitional legacy application access event on `oli-api` only:
   `jsonPayload.msg="request"`.

Unrelated Cloud Run services, unrelated gateways, and the corrected
`http_request_completed` application telemetry are **not** excluded.

## Explicit guarantees

```text
Exclusions are forward-looking routing/storage controls.
They do not retroactively delete already stored entries.
```

```text
_Required is not modified.
```

```text
Application http_request_completed telemetry remains stored.
```

## Pre-change backup

Create a mode-700 directory outside the repository, then run `plan` (or let
`apply` create the backup):

```bash
set +x
umask 077
SINK_BACKUP_DIR="$(mktemp -d)"
chmod 700 "$SINK_BACKUP_DIR"

scripts/deploy/logging/manage-oli-api-request-log-privacy.sh \
  plan \
  --project oli-staging-fdbba \
  --backup-dir "$SINK_BACKUP_DIR"
```

The script writes mode-600 `_Default.pre.json` / `_Required.pre.json` and
SHA-256 sidecars. Preserve the backup until final backend cutover verification
completes. Do not commit it.

## Apply command

```bash
scripts/deploy/logging/manage-oli-api-request-log-privacy.sh \
  apply \
  --project oli-staging-fdbba \
  --backup-dir "$SINK_BACKUP_DIR"
```

Uses `--add-exclusion` only. Never `--clear-exclusions`. Never replaces the
sink destination or inclusion filter. Never disables the sink.

## Verification

```bash
scripts/deploy/logging/manage-oli-api-request-log-privacy.sh \
  verify \
  --project oli-staging-fdbba \
  --backup-dir "$SINK_BACKUP_DIR"
```

Confirm destination, inclusion filter, writer identity, disabled state, and
prior exclusions are unchanged; exactly the intended exclusion is present and
enabled; `_Required` is unchanged.

## Synthetic probe process

1. Generate one random non-user probe marker (do not print it in reports).
2. Issue one non-mutating Cloud Run `/health` probe with synthetic query
   metadata via a short-lived identity token.
3. Issue one non-mutating Gateway `/health` probe with synthetic query
   metadata and **no** real Gateway key / Firebase token / user data.
4. Wait up to 10 minutes (30s poll) for routing propagation.
5. Count-only query for the marker across excluded surfaces; require 0 matches
   for post-apply entries.
6. Confirm pre-change entries still exist (exclusion is not retroactive).

## Rollback

```bash
scripts/deploy/logging/manage-oli-api-request-log-privacy.sh \
  rollback \
  --project oli-staging-fdbba \
  --backup-dir "$SINK_BACKUP_DIR"
```

Equivalent underlying mutation:

```bash
gcloud logging sinks update _Default \
  --project=oli-staging-fdbba \
  --remove-exclusions=oli_api_request_metadata_privacy_v1
```

Verify normalized sink specification hash returns to the pre-change hash.

## Existing-log limitation

Exclusions are forward-looking only. Existing affected entries in `_Default`
are not deleted by this control.

## Retention behavior

- `_Default` retention remains 30 days (unchanged by this control).
- `_Required` retention remains 400 days and is untouched.
- Existing entries age out under current retention unless a separately
  approved remediation changes policy.

## Metrics / observability impact

- No dashboards, alerts, or log-based metrics were found that depend on the
  excluded request logs.
- Cloud Run request-count and latency metrics remain available independently
  of request-log storage.
- Privacy-safe application telemetry (`http_request_completed`) remains
  stored when emitted by a corrected API revision.
- Function and unrelated application logs remain routed.

## API-key follow-up

Move Gateway consumer key from query string to `x-api-key` header, or remove
the key after proving it is not required. Not performed by this control.

## Health-range transport follow-up

Move sensitive day/range criteria from GET query parameters to validated
read-only POST query bodies where architecture permits. Not performed by this
control.

## Access control

Maintain least-privilege Logging Viewer / sink admin access. Do not broaden
IAM as part of this control. Do not alter logging IAM here.

## Drift detection

Re-run `plan` / `verify`. Same-name/same-filter is idempotent.
Same-name/different-filter fails closed. Compare normalized filter hash and
full sink specification hash against the source-controlled filter file and the
pre-change backup.

## Emergency response

1. Run `rollback` with the preserved backup directory.
2. Confirm pre-change specification hash restored.
3. Confirm `_Required` unchanged.
4. Do not use `--clear-exclusions`.
5. Do not delete existing log entries.
6. Stop further backend cutover until the privacy control is re-verified.
