# Oura Refresh Telemetry Privacy Audit

**Date:** 2026-07-12  
**Base SHA:** `02a7b1b7d95027a0066eeee6527376cf3be312e0`  
**Base tree:** `ed46b86cf07d804747b0feb24cd663863c21e599`  
**Privacy branch:** `fix/pr183-oura-refresh-privacy`  
**Privacy worktree:** `/Users/danielhendel/oli-oura-refresh-privacy`  
**Safety ref:** `safety/weekly-fitness-before-oura-privacy-02a7b1b` → `02a7b1b7d95027a0066eeee6527376cf3be312e0`

## Original gate result

Weekly Fitness v2 final staging cutover was blocked by the mandatory refresh-path
privacy gate. Active Oura pull-now, backfill, provider-fetch, post-raw API, and
post-raw Function paths emitted prohibited user and health metadata.

No traffic shift, Gateway attach, Function rollback, or Oura refresh occurred
during the blocked cutover or this repair.

## Affected files

### API

- `services/api/src/routes/integrations/ouraPullNow.ts`
- `services/api/src/lib/ouraApi.ts`
- `services/api/src/lib/ouraVendorSnapshot.ts`
- `services/api/src/lib/ouraIngestWrite.ts`
- `services/api/src/lib/ouraTokenRefreshSingleFlight.ts`
- `services/api/src/lib/oura/ouraSleepPhysiology.ts` (unsafe debug permanently disabled)
- `services/api/src/lib/ouraRefreshTelemetry.ts` (new typed boundary)

### Functions

- `services/functions/src/oura/ouraPostRawHandler.ts`
- `services/functions/src/oura/onOuraPostRawRequested.ts`
- `services/functions/src/oura/ouraPostRawTelemetry.ts` (new typed boundary)

## Affected event names (before → after)

Prohibited-shaped legacy events (examples of names / shapes removed or replaced):

- `oura_pull_sleep_date_window` (`sleepStartStr` / `sleepEndStr` / `coreStartStr` / `coreEndStr`)
- `oura_pull_sleep_latest_wake` (`latestWakeIso` / `latestSleepId`)
- `[OURA_SLEEP_LATEST_AUDIT]` (env-gated health dates / scores)
- `[OURA_SLEEP_PHYSIOLOGY_DEBUG]` (env-gated uid / day / physiology)
- Provider fetch logs with `startDate` / `endDate` / `uid`
- Raw-event / post-raw / backfill logs with `uid`, `messageId`, `day`, `snapshotId`, raw `err`
- Function logs with `uid`, `day`, `anchorDay`, raw `err`

Replacement operations are closed typed strings such as:

- `oura_pull_window`, `oura_pull_sleep_summary`, `oura_pull_failed`
- `oura_provider_fetch_completed`, `oura_provider_fetch_page_capped`
- `oura_raw_event_persist_*`, `oura_raw_events_core_write_done`
- `oura_post_raw_enqueued`, `oura_post_raw_persist_*`
- `oura_backfill_*`
- `oura_vendor_snapshot_*`
- `oura_token_refresh_*`
- Function: `oura_post_raw_started` / `_completed` / `_rejected` / `_failed` / `_domain_*`

## Prohibited field names

Never accepted by typed telemetry helpers and rejected by the privacy assertion helper:

`uid`, `userId`, `email`, `day`, `date`, `start`, `end`, `startStr`, `endStr`,
`sleepStartStr`, `sleepEndStr`, `coreStartStr`, `coreEndStr`, `requestedDay`,
`resolvedDay`, `providerDay`, `latestWakeIso`, `latestSleepId`, `sleepId`,
`providerId`, `documentId`, `docId`, `rawEventId`, `messageId`, `score`,
`minutes`, `seconds`, `stressHigh`, `recoveryHigh`, `token`, `accessToken`,
`refreshToken`, `idempotencyKey`, `url`, `query`, `payload`, `response`,
`stack`, `errorMessage`, `err`, `sampleKeys`, `snapshotId`, `anchorDay`,
`waitedMs`

Hashed or truncated forms of the above remain prohibited.

## Final allowlist

Operational metadata only, including:

`operation`, `status`, `durationMs`, `requestId`, `providerConnected`, `queued`,
`retryable`, `pageCount`, `chunkIndex`, `chunkCount`, `chunkDayCount`,
`windowDayCount`, `sleepStartOverlapDayCount`, `sleepEndOverlapDayCount`,
`providerItemCount`, `validatedItemCount`, `acceptedItemCount`,
`rejectedItemCount`, `duplicateCount`, `rawEventCreatedCount`,
`rawEventExistingCount`, domain `*DocumentCount` / `*Count` aggregates,
`writtenCount`, `failedCount`, `metadataWritten`, `safeErrorCode`, `domain`,
`dataset`, `hasSleepDocuments`, `backfillStatus` (lifecycle enum string only)

## Safe error-code list

API (`OuraSafeErrorCode`):

`NO_CONNECTION`, `TOKEN_UNAVAILABLE`, `PROVIDER_UNAUTHORIZED`,
`PROVIDER_RATE_LIMITED`, `PROVIDER_TIMEOUT`, `PROVIDER_NETWORK`,
`PROVIDER_SCHEMA_INVALID`, `RAW_EVENT_PERSIST_FAILED`,
`POST_RAW_PUBLISH_FAILED`, `POST_RAW_PERSIST_FAILED`,
`FUNCTION_PAYLOAD_INVALID`, `FUNCTION_PERSIST_FAILED`, `UNKNOWN`

Function (`OuraPostRawSafeErrorCode`):

`FUNCTION_PAYLOAD_INVALID`, `FUNCTION_PERSIST_FAILED`, `UNKNOWN`

Raw `Error.message` / stacks are never emitted. Categorization does not alter
HTTP status or retry control flow.

## requestId origin

- API middleware (`requestIdMiddleware`) may still echo a client `x-request-id`
  on the HTTP response for general request correlation.
- **Oura refresh telemetry and post-raw producer/consumer traces use Option B:**
  `sanitizeOuraTelemetryRequestId` / `sanitizeOuraPostRawRequestId` accept only
  RFC UUID form (max 36 chars). Invalid values are discarded and replaced with
  `crypto.randomUUID()` — never hashed, truncated, or encoded.
- Pull-now `getRequestId` sanitizes before telemetry, requestRecords correlation,
  and post-raw publish so the Function never receives an arbitrary client string.
- Function `onOuraPostRawRequested` sanitizes the producer `requestId` and never
  falls back to Pub/Sub `messageId` / `event.id`.
- Idempotency remains a separate `Idempotency-Key` header and is never used as
  `requestId`.

## API logger boundary

`services/api/src/lib/ouraRefreshTelemetry.ts`

- Closed discriminated union `OuraRefreshTelemetryEvent`
- `logOuraRefreshTelemetry(event)` only
- `categorizeOuraSafeError(err, hint?)` returns `{ safeErrorCode, retryable }`
- No `Record<string, unknown>` public API, no object spread from provider/request/error objects

## Function logger boundary

`services/functions/src/oura/ouraPostRawTelemetry.ts`

- Closed `OuraPostRawTelemetryEvent`
- `logOuraPostRawTelemetry(event)` only
- `categorizeOuraPostRawSafeError(err, hint?)`

## Unsafe audit removal

- `[OURA_SLEEP_LATEST_AUDIT]` removed from pull-now path.
- `[OURA_SLEEP_PHYSIOLOGY_DEBUG]` permanently disabled: `logOuraSleepPhysiologyDebugIfEnabled`
  is a no-op regardless of environment variables. Call sites may remain; nothing is emitted.

## Source guards

- `services/api/src/lib/__tests__/ouraRefreshTelemetrySourceGuard.test.ts`
  guards: pull-now, ouraApi, vendor snapshot, ingest write, token refresh single-flight
- `services/functions/src/oura/__tests__/ouraPostRawTelemetrySourceGuard.test.ts`
  guards: `ouraPostRawHandler`, `onOuraPostRawRequested`

Direct `logger.info|warn|error` / `console.log|warn|error` in those files fail the suite.

## Test matrix

| Area | Coverage |
|---|---|
| Telemetry unit | API + Function event serialization privacy |
| Safe error categorization | Status/code mapping; message never returned |
| Source guards | Active refresh files |
| Ingest write | Core write + deferred vendor detail; privacy assert on logs |
| Pull-now | Success / no-token / post-raw persist failure / enqueue |
| Backfill | Chunk success path + chunk failure continuation |
| Vendor snapshot | Write / drop paths |
| Post-raw Function | Absent/present `dailyStressDocs`, writes, privacy on captured logs |
| Forbidden keys / value patterns | Assertion helper unit coverage |

Synthetic sentinels only — no real user values.

## Functional parity evidence

Diff review limited telemetry / logging / console-guard allowlists / permanently
disabled physiology debug. Unchanged by design:

- Oura provider endpoints, OAuth scopes, date-window calculations, pagination
- Response validation, raw-event IDs, storage paths, vendor document IDs
- Daily Stress / Daily Sleep / Readiness / Sleep persistence
- Post-raw message schema including additive `dailyStressDocs`
- Idempotency / requestRecords / HTTP statuses / API DTOs
- OpenAPI, Firestore rules/indexes
- Weekly Fitness UI and scoring behavior

## OpenAPI hash result

```text
diff 02a7b1b..HEAD -- infra/gateway/openapi.yaml: empty
SHA-256: 35201567f39138c686cd33a7f89296ee12f172b5c03e28f9e1b3c14804281048
```

Existing unattached Gateway config
`oli-api-config-weekly-fitness-02a7b1b-20260712-181743` remains contract-compatible
by OpenAPI content hash. Its config ID embeds the older source SHA; a future
release may reuse it or create a provenance-clean replacement. Final cutover
authorization must state which choice is used.

## Artifact invalidation

Any source change makes prior preflight artifacts ineligible for final cutover.

```text
Superseded API preflight revision:
oli-api-00231-gul

Superseded API image digest:
sha256:16018a3f5e6820a4af5a68c0c7558c2190d3671d17269eff68b818d988e89889

Reason:
built before privacy repair

Current live normal API remains:
oli-api-00229-yaz

Current live Function needing replacement before refresh:
onourapostrawrequested-00053-bub

Reason:
packaged before privacy repair
```

Do not delete those artifacts. Do not roll the Function back during this repair
(prior revision may share unsafe logging and would remove `dailyStressDocs`
consumer support).

## Deployment re-preflight requirements

1. Push / review the privacy branch (separate authorization)
2. Obtain green CI
3. Build a new immutable API image
4. Deploy a corrected Function consumer
5. Deploy a new zero-traffic API revision
6. Rerun tagged smoke
7. Verify privacy-safe logs
8. Reuse or replace the unattached Gateway config based on OpenAPI hash
9. Obtain new final cutover authorization

This audit does **not** authorize push, deploy, traffic shift, Gateway attach,
or Oura refresh.

## Separate mobile telemetry debt

Out of scope for this branch:

- mobile Workout debug telemetry
- mobile Energy audit telemetry
- Apple Health backfill telemetry
- Weekly Fitness render-frequency telemetry
- full-year Activity/Workout transport
- sleep-day-refresh 500
- physical-device verification

## Remaining risks

- Global API access logs (`accessLogMiddleware`) still include `uid` for all
  routes; not part of the Oura refresh typed boundary in this repair.
- `onOuraPullScheduled` Function scheduler logs were not in the mandatory
  pull-now → post-raw inventory for this cutover gate; treat as follow-up if
  scheduled pull is re-enabled against staging.
- Client-supplied `x-request-id` remains a correlation id only; operators must
  not place health identifiers in that header.
