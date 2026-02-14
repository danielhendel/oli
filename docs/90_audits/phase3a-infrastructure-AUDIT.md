# Phase 3A Infrastructure Audit — Oli Health OS

**Date:** 2026-02-14  
**Scope:** Structural audit only. No implementation. No assumptions.  
**Goal:** Map current repo reality before designing OAuth + external integration architecture.

---

## 1) Integration Surface

### 1.1 Existing integration directories
- **NOT PRESENT.** No directory named `integration` or `integrations` under the repo.
- **Evidence:** `Glob **/integration*` returned 0 files.

### 1.2 OAuth logic
- **OpenAPI (gateway):** `infra/gateway/openapi.yaml` lines 35–46 define `securityDefinitions.firebase` with `type: oauth2` (Firebase JWT validation for API Gateway), not provider OAuth.
- **Client API shape (planned):** `lib/api/withings.ts` line 34: comment `POST /integrations/withings/connect — returns OAuth URL for client to open.`; `lib/api/usersMe.ts` lines 161–176: `getWithingsStatus` calls `/integrations/withings/status`.
- **Backend:** No API route handlers for `/integrations/*` in `services/api`. No OAuth flow, token exchange, or redirect handler in repo.
- **Exact paths:** `infra/gateway/openapi.yaml`, `lib/api/withings.ts`, `lib/api/usersMe.ts`, `services/api/src/index.ts` (no mount for integrations).

### 1.3 Token storage patterns
- **NOT PRESENT.** No code path stores or retrieves OAuth refresh/access tokens.
- **Evidence:** Grep for `token.*storage`, `store.*token`, `tokenStorage` (case-insensitive) found only audit doc references (e.g. `phase15-sprint4-signal-layer-AUDIT.md` re: client using API, not tokens).
- **Exact paths:** N/A (no token storage).

---

## 2) Auth Boundary

### 2.1 How API auth is enforced
- **Middleware:** `services/api/src/middleware/auth.ts`: `authMiddleware` extracts Bearer token from `X-Forwarded-Authorization` (preferred) or `Authorization`, calls `admin.auth().verifyIdToken(token)`, sets `req.uid = decoded.uid`; on failure returns 401 with `UNAUTHORIZED`.
- **Mount points:** `services/api/src/index.ts`: `authMiddleware` applied to `/firebase`, `/ingest`, `/uploads`, `/preferences`, `/users/me`, and `/` (account). Health routes are unauthed.
- **Exact paths:** `services/api/src/middleware/auth.ts`, `services/api/src/index.ts`.

### 2.2 Middleware handling idToken / user context
- **Single source of user context:** `req.uid` set in `authMiddleware` after `verifyIdToken`. No separate “user context” object; routes use `req.uid` (e.g. `requireUid` in `services/api/src/routes/usersMe.ts`).
- **Exact paths:** `services/api/src/middleware/auth.ts` (lines 52–68), `services/api/src/routes/usersMe.ts` (e.g. `requireUid`), `services/api/src/routes/events.ts`, `services/api/src/routes/uploads.ts`, `services/api/src/routes/account.ts`, `services/api/src/preferences.ts`.

### 2.3 OAuth redirect handler
- **NOT PRESENT.** No route or handler for OAuth callback/redirect (e.g. `/auth/callback`, `/oauth/callback`). No matches for `redirect` + OAuth or `/oauth` in API or functions.
- **Exact paths:** N/A.

---

## 3) Secret Management

### 3.1 Google Secret Manager usage
- **API enabled only.** `infra/main.tf` line 24: `secretmanager.googleapis.com` is in the set of enabled project services. No Terraform or application code creates secrets, reads secrets, or references Secret Manager.
- **Evidence:** Grep for `secretmanager`, `SecretManager`, `getSecret`, `accessSecret` (case-insensitive) returns only `infra/main.tf` (enablement).
- **Exact paths:** `infra/main.tf`.

### 3.2 Encrypted token storage
- **NOT PRESENT.** No encrypted token storage; no code for “encrypted token” or “token encrypt”.
- **Exact paths:** N/A.

---

## 4) Firestore Rules

### 4.1 Rules for derived truth collections
- **File:** `services/functions/firestore.rules`.
- **Default:** `match /{document=**} { allow read, write: if false; }` (lines 13–15) — default deny.
- **Under `users/{userId}`:** Explicit read-only (for authenticated owner) for: `rawEvents`, `events`, `dailyFacts`, `insights`, `intelligenceContext`, `healthScores`, `healthSignals`, `failures`. All have `allow create, update, delete: if false`. User root doc: read/create/update allowed, delete disallowed.
- **Exact paths:** `services/functions/firestore.rules` (lines 19–133).

### 4.2 Integration-related rules
- **NOT PRESENT.** No rules for integration tokens, OAuth state, or provider-specific collections. `sources` (lines 41–42) is the only user subcollection that is full CRUD for owner (e.g. “Apple Health source”, “Manual logging source”) — no integration token storage there.
- **Exact paths:** `services/functions/firestore.rules` (sources at 41–42).

### 4.3 Per-user metadata collections
- **Present:** `users/{userId}/sources/{sourceId}` — owner read/write. `users/{userId}` root doc (profile/settings) — owner read/create/update, no delete. No `users/{userId}/profile/{doc}` rule; profile at `users/{uid}/profile/general` is accessed by backend only (Admin SDK). No `derivedLedger` or `labResults` rule — those paths fall under default deny (backend-only via Admin SDK).
- **Exact paths:** `services/functions/firestore.rules`.

---

## 5) IAM + Service Accounts

### 5.1 Runtime service accounts

| Component | Service account | Where defined |
|-----------|-----------------|----------------|
| **API (Cloud Run)** | `google_service_account.api_sa.email` (Terraform: `healthos-api`) | `infra/cloudrun.tf` line 5; `infra/iam.tf` lines 2–17 |
| **Functions (Gen2)** | `oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com` | Hardcoded in each function options, e.g. `services/functions/src/index.ts` (setGlobalOptions), `onRawEventCreated.ts`, `onCanonicalEventCreated.ts`, `onAccountDeleteRequested.ts`, `onAccountExportRequested.ts`, `onDailyFactsRecomputeScheduled.ts`, `onInsightsRecomputeScheduled.ts`, `onDailyIntelligenceContextRecomputeScheduled.ts`, `recomputeDailyFactsAdminHttp.ts`, `recomputeInsightsAdminHttp.ts`, `recomputeDailyIntelligenceContextAdminHttp.ts` |
| **Functions (v1 auth)** | `oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com` | `services/functions/src/index.ts` (onAuthCreate runWith) |
| **Scheduler (Cloud Scheduler)** | Project-level agent: `service-1010034434203@gcp-sa-cloudscheduler.iam.gserviceaccount.com` | `docs/_snapshots/iam/project-iam-policy.snapshot.json` (roles/cloudscheduler.serviceAgent) |

- **Exact paths:** `infra/cloudrun.tf`, `infra/iam.tf`, `services/functions/src/index.ts`, `services/functions/src/normalization/onRawEventCreated.ts`, `services/functions/src/realtime/onCanonicalEventCreated.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`, `services/functions/src/account/onAccountExportRequested.ts`, `services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts`, `services/functions/src/insights/onInsightsRecomputeScheduled.ts`, `services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts`, `services/functions/src/http/recomputeDailyFactsAdminHttp.ts`, `recomputeInsightsAdminHttp.ts`, `recomputeDailyIntelligenceContextAdminHttp.ts`, `docs/_snapshots/iam/project-iam-policy.snapshot.json`.

### 5.2 Least-privilege posture
- **API SA:** Only `roles/pubsub.publisher` and `roles/storage.objectUser` granted in Terraform (`infra/iam.tf`). No Firestore, Secret Manager, or other roles in repo.
- **Functions:** Single runtime SA used for all; no per-function SA differentiation in code. IAM snapshot shows Pub/Sub and scheduler agents; no explicit least-privilege doc in repo for functions SA.
- **Exact paths:** `infra/iam.tf`, `docs/_snapshots/iam/project-iam-policy.snapshot.json`, `docs/_snapshots/iam/functions-v2-us-central1.snapshot.json`.

---

## 6) Background Jobs

### 6.1 PubSub usage
- **Topics (Terraform):** `infra/pubsub.tf`: `events_raw_v1`, `exports_requests_v1`, `account_delete_v1`, plus DLQ topics for each.
- **API publishes to:** `services/api/src/lib/pubsub.ts` — `PubSub` from `@google-cloud/pubsub`; `publishJSON(topic, payload)`. Used by `services/api/src/routes/account.ts` (export/delete requests).
- **Functions subscribe:** `onAccountExportRequested` → `exports.requests.v1`; `onAccountDeleteRequested` → `account.delete.v1`. Eventarc/PubSub for Firestore: `onRawEventCreated`, `onCanonicalEventCreated` (via Firestore triggers, not direct topic names in this audit).
- **Exact paths:** `infra/pubsub.tf`, `infra/cloudrun.tf` (env TOPIC_*), `services/api/src/lib/pubsub.ts`, `services/api/src/routes/account.ts`, `services/functions/src/account/onAccountExportRequested.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`, `docs/_snapshots/iam/functions-v2-us-central1.snapshot.json` (pubsubTopic refs).

### 6.2 Cloud Scheduler usage
- **Scheduled functions (Firebase onSchedule):**  
  - `onDailyFactsRecomputeScheduled`: `schedule: "0 3 * * *"` — `services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts` line 59.  
  - `onInsightsRecomputeScheduled`: `schedule: "15 3 * * *"` — `services/functions/src/insights/onInsightsRecomputeScheduled.ts` line 96.  
  - `onDailyIntelligenceContextRecomputeScheduled`: `schedule: "30 3 * * *"` — `services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts` line 58.
- **Exact paths:** Above three files; `services/functions/src/index.ts` (exports).

### 6.3 Scheduled functions
- **List:** `onDailyFactsRecomputeScheduled`, `onInsightsRecomputeScheduled`, `onDailyIntelligenceContextRecomputeScheduled`. All use `onSchedule` from `firebase-functions/v2/scheduler`, region `us-central1`, SA `oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com`.
- **Exact paths:** `services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts`, `services/functions/src/insights/onInsightsRecomputeScheduled.ts`, `services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts`, `services/functions/src/index.ts`.

---

## 7) Derived Pipeline Extension Points

### 7.1 How recomputeForDay works
- **Entry:** `services/functions/src/pipeline/recomputeForDay.ts`: `recomputeDerivedTruthForDay(input)`.
- **Input:** `RecomputeForDayInput`: `db`, `userId`, `dayKey`, optional `factOnlyBody`, `trigger` (factOnly | realtime | admin).
- **Flow:** Loads `users/{userId}/events` for `day`, builds dailyFacts (aggregate + enrich with history from dailyFacts), writes dailyFacts, insights, intelligenceContext, healthScore, healthSignals; writes derived ledger run via `writeDerivedLedgerRun`. Idempotent overwrites.
- **Callers:** `services/functions/src/normalization/onRawEventCreated.ts` (after writing canonical event or fact-only path), `services/api/src/routes/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts` and `phase1E2E.replayImmutability.test.ts` (test harness), admin HTTP recompute functions (delegate to same pipeline).
- **Exact paths:** `services/functions/src/pipeline/recomputeForDay.ts`, `services/functions/src/normalization/onRawEventCreated.ts`, `services/functions/src/pipeline/derivedLedger.ts`, `services/functions/src/realtime/onCanonicalEventCreated.ts`.

### 7.2 How new data enters canonical pipeline
- **Single ingestion door:** Raw events written to `users/{userId}/rawEvents/{rawEventId}` via API (`POST /ingest` or `POST /uploads`) with `Idempotency-Key` as doc ID. Firestore trigger `onRawEventCreated` on `rawEvents` create → normalizes to canonical event (or fact-only path) → writes to `users/{userId}/events` and then calls `recomputeDerivedTruthForDay`. Core ingestion: `services/functions/src/ingestion/rawEvents.ts`; API routes: `services/api/src/routes/events.ts`, `services/api/src/routes/uploads.ts`.
- **Exact paths:** `services/functions/src/ingestion/rawEvents.ts`, `services/functions/src/normalization/onRawEventCreated.ts`, `services/functions/src/normalization/mapRawEventToCanonical.ts`, `services/api/src/routes/events.ts`, `services/api/src/routes/uploads.ts`.

### 7.3 Idempotency patterns
- **Ingest:** `Idempotency-Key` (or `X-Idempotency-Key`) required; used as Firestore doc ID for raw event (and uploads, lab results). Enforced in `services/api/src/routes/events.ts` (lines 133–157), `services/api/src/routes/uploads.ts` (lines 95–121), `services/api/src/routes/usersMe.ts` (labResults 1530–1561). CI check: `scripts/ci/check-invariants.mjs` (CHECK 3).
- **Export/Delete:** Per (uid, requestId) doc in `accountExports` / `accountDeletions` with status; idempotency guard on “completed” (e.g. `onAccountExportRequested.ts` lines 78–81, `onAccountDeleteRequested.ts` lines 86–90).
- **Pipeline:** Ledger run id from seed (`makeLedgerRunIdFromSeed`) for deterministic replay; overwrite semantics for derived docs.
- **Exact paths:** `services/api/src/routes/events.ts`, `services/api/src/routes/uploads.ts`, `services/api/src/routes/usersMe.ts`, `services/functions/src/account/onAccountExportRequested.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`, `services/functions/src/pipeline/derivedLedger.ts`, `scripts/ci/check-invariants.mjs`, `lib/api/http.ts` (idempotencyKey header), `lib/events/manualWeight.ts`, `lib/events/manualStrengthWorkout.ts`.

---

## 8) Export/Delete

### 8.1 Export enumeration
- **File:** `services/functions/src/account/onAccountExportRequested.ts`.
- **Collections enumerated:** Line 109: `const collections = ["rawEvents", "events", "dailyFacts", "insights", "intelligenceContext", "healthScores", "healthSignals"]`. Profile read separately: `users/${uid}/profile/general` (line 105–106). Data read via `readCollectionAll(db, \`users/${uid}/${col}\`)`.
- **Not included:** `failures`, `sources`, `derivedLedger`, `labResults`, `profile` (only `profile/general` doc, not a collection).
- **Exact paths:** `services/functions/src/account/onAccountExportRequested.ts` (lines 105–116).

### 8.2 Delete enumeration
- **File:** `services/functions/src/account/onAccountDeleteRequested.ts`.
- **Collections enumerated:** Line 33: `const collections = ["profile", "rawEvents", "events", "dailyFacts", "insights", "intelligenceContext", "healthScores", "healthSignals", "accountDeletion"]`. Deletion: `db.recursiveDelete(userRef.collection(col))` then `userRef.delete()`.
- **Not included:** `failures`, `sources`, `derivedLedger`, `labResults`.
- **Exact paths:** `services/functions/src/account/onAccountDeleteRequested.ts` (lines 27–40).

---

## Repo Reality Map

| Area | Finding |
|------|--------|
| Integration dirs | None |
| OAuth | Gateway has Firebase oauth2 JWT only; client has Withings API shapes; no backend routes or redirect |
| Token storage | None |
| API auth | Bearer in X-Forwarded-Authorization/Authorization → verifyIdToken → req.uid |
| Secret Manager | API enabled in Terraform; no app usage |
| Encrypted tokens | None |
| Firestore rules | Default deny; per-user read-only for derived/raw/events/failures/sources; no integration rules |
| API SA | healthos-api (Terraform); pubsub publisher + storage.objectUser |
| Functions SA | oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com |
| PubSub | events_raw_v1, exports_requests_v1, account_delete_v1 + DLQs; API publishes; 2 functions consume (export, delete) |
| Scheduler | 3 scheduled functions (dailyFacts 0 3 * * *, insights 15 3 * * *, intelligenceContext 30 3 * * *) |
| Pipeline entry | rawEvents write → onRawEventCreated → canonical/fact-only → recomputeDerivedTruthForDay |
| Idempotency | Idempotency-Key as doc ID (ingest, uploads, labResults); export/delete by requestId status |
| Export list | rawEvents, events, dailyFacts, insights, intelligenceContext, healthScores, healthSignals + profile/general |
| Delete list | profile, rawEvents, events, dailyFacts, insights, intelligenceContext, healthScores, healthSignals, accountDeletion |

---

## Missing Capabilities

1. **Integration API routes** — Client calls `/integrations/withings/status`, `/integrations/withings/connect`, `/integrations/withings/pull` but no Express router or handlers; would 404.
2. **OAuth flow** — No redirect/callback handler, no token exchange, no state/CSRF handling.
3. **Token storage** — No place to store or retrieve OAuth refresh/access tokens (no Secret Manager usage, no Firestore collection for tokens).
4. **Firestore rules for integration data** — No rules for token or integration metadata collections (default deny suffices for backend-only if added).
5. **Export/delete coverage** — Export and delete omit: `failures`, `sources`, `derivedLedger`, `labResults`. derivedLedger and labResults are user data; failures and sources may be required for compliance.

---

## Risks

1. **Client calling non-existent endpoints** — `getWithingsStatus`, `withingsConnect`, `withingsPull` hit `/integrations/*` which is not mounted; 404 in production unless gateway or API is extended.
2. **Secret Manager enabled but unused** — No pattern yet for storing OAuth client secrets or user tokens; design must choose storage and IAM.
3. **Export/delete scope drift** — New collections (e.g. integration tokens, labResults, derivedLedger) not in export/delete lists; GDPR/export completeness and deletion completeness at risk.
4. **Single Functions SA** — All functions share one SA; adding integration pull jobs may require broader Firestore/Secret Manager access for all functions unless split SAs or scoped credentials.

---

## Extension Points

1. **API:** Mount an `integrationsRouter` under `/integrations` (or under `/users/me/integrations`) with `authMiddleware`, then add GET status, POST connect, POST pull; connect/pull will need OAuth URL generation and token storage.
2. **Pipeline:** New data can enter via same canonical door: write to `rawEvents` with appropriate `kind`/`provider`/`sourceType` (see `lib/contracts/rawEvent.ts`), then existing `onRawEventCreated` + `recomputeDerivedTruthForDay` apply; alternative is dedicated “integration ingest” that still writes rawEvents with Idempotency-Key.
3. **Secrets:** Use Secret Manager for app-level OAuth client secret(s); per-user tokens either Firestore (with rules) or Secret Manager (secret per user). No current code to extend; net-new.
4. **Auth:** Keep `authMiddleware`; add optional integration-specific checks (e.g. require claim or integration-linked user). No OAuth redirect route exists — add one and protect with state.
5. **Export/Delete:** Extend `collections` arrays in `onAccountExportRequested.ts` and `onAccountDeleteRequested.ts` to include `failures`, `sources`, `derivedLedger`, `labResults` when product/legal confirm; ensure order and recursiveDelete semantics for nested structures if any.

---

## Phase 3A Readiness Score: **3 / 10**

- **Rationale:** Firebase auth and API auth boundary are in place; pipeline and idempotency are clear; PubSub/Scheduler and IAM are present. No integration surface exists (no routes, no OAuth, no token storage), and export/delete omit several user collections. Score reflects “foundations present, integration layer absent and must be designed and built.”

---

## Exact File Paths (Summary)

- **Integration / OAuth:** `infra/gateway/openapi.yaml`, `lib/api/withings.ts`, `lib/api/usersMe.ts`, `services/api/src/index.ts`
- **Auth:** `services/api/src/middleware/auth.ts`, `services/api/src/index.ts`, `services/api/src/routes/usersMe.ts`, `services/api/src/routes/events.ts`, `services/api/src/routes/uploads.ts`, `services/api/src/routes/account.ts`, `services/api/src/preferences.ts`
- **Secrets:** `infra/main.tf`
- **Firestore rules:** `services/functions/firestore.rules`
- **IAM:** `infra/iam.tf`, `infra/cloudrun.tf`, `services/functions/src/index.ts`, `services/functions/src/normalization/onRawEventCreated.ts`, `services/functions/src/realtime/onCanonicalEventCreated.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`, `services/functions/src/account/onAccountExportRequested.ts`, `services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts`, `services/functions/src/insights/onInsightsRecomputeScheduled.ts`, `services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts`, `services/functions/src/http/recomputeDailyFactsAdminHttp.ts`, `recomputeInsightsAdminHttp.ts`, `recomputeDailyIntelligenceContextAdminHttp.ts`, `docs/_snapshots/iam/project-iam-policy.snapshot.json`, `docs/_snapshots/iam/functions-v2-us-central1.snapshot.json`
- **PubSub / Scheduler:** `infra/pubsub.tf`, `infra/cloudrun.tf`, `services/api/src/lib/pubsub.ts`, `services/api/src/routes/account.ts`, `services/functions/src/account/onAccountExportRequested.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`, `services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts`, `services/functions/src/insights/onInsightsRecomputeScheduled.ts`, `services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts`, `services/functions/src/index.ts`
- **Pipeline / Idempotency:** `services/functions/src/pipeline/recomputeForDay.ts`, `services/functions/src/pipeline/derivedLedger.ts`, `services/functions/src/normalization/onRawEventCreated.ts`, `services/functions/src/ingestion/rawEvents.ts`, `services/api/src/routes/events.ts`, `services/api/src/routes/uploads.ts`, `services/api/src/routes/usersMe.ts`, `services/functions/src/account/onAccountExportRequested.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`, `scripts/ci/check-invariants.mjs`, `lib/api/http.ts`, `lib/events/manualWeight.ts`, `lib/events/manualStrengthWorkout.ts`
- **Export/Delete:** `services/functions/src/account/onAccountExportRequested.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`

---

## CI Verification (2026-02-14)

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm test` | 86/87 suites pass; 1 failing: `scripts/ci/__tests__/phase2-pagination-stability-proof.test.ts` (TypeError: fetch failed / HTTPParserError: Response does not match the HTTP/1.1 protocol). Failure appears environment/emulator-related; no application or audit code changes in this run. |
