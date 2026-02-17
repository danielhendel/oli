# Phase 3 End-to-End Audit — 3A + 3B + 3B.1 Step 1

**Date:** 2026-02-17  
**Branch:** feat/phase3b1-weight-backfill (from git status)  
**Authority:** Repo-only; no web search; no production code changes.  
**Binding governance:** Phase 3A and Phase 3B.1 specs are in repo: `docs/00_truth/phase3/PHASE_3A_PASSIVE_DEVICE_INGESTION.md`, `docs/00_truth/phase3/PHASE_3B1_WEIGHT_MAGIC.md`. CI enforces presence via `scripts/ci/assert-phase3-specs.mjs`.

---

## 1) Executive Summary

**Overall Phase 3 (A+B) score: 7/10**

Phase 3A (Withings as first device) and Phase 3B (pull ingestion) are largely implemented and constitutionally aligned. Phase 3B.1 Step 1 (backfill engine + progress UI) is implemented with invoker-only backfill, cursor-based resume, and devices/weight UI. **10/10 is not assigned** because:

- **Phase 3A:** Provenance is stored (sourceType/sourceId) but the mobile “recent Withings data” check uses an invalid raw-event kind (`withings.body_measurement`); Withings weight is stored as `kind: "weight"`. One criterion is UNPROVEN (lineage/recent-data UI).
- **Phase 3B:** `withingsPull` uses `provider: "manual"` in RawEvent (comment suggests preferring `"withings"` if schema allows); otherwise pull is deterministic, idempotent, failure-visible, invoker-only.
- **Phase 3B.1 Step 1:** Backfill and UI are present; no scheduler or automatic “start/resume” trigger is evidenced in repo (UNPROVEN for “magic” automation).
- **Tests:** `npm test` failed in audit environment (Firestore emulator `listen EPERM` in sandbox); not treated as code defect but full test proof is UNPROVEN.

**Recommendation:** **Proceed to Phase 3B.1 Step 2 (Trends engine)** with one **Hold** item: fix the client “recent Withings data” filter (use `kinds: ["weight"]` and filter by `sourceId` or add provenance for Withings) so Devices and timeline reflect Withings-sourced weight correctly.

---

## 2) Evidence Table (Requirement → Proof)

| Requirement | Evidence |
|-------------|----------|
| Passive ingestion never overwrites | `withingsPull.ts` / `withingsBackfill.ts`: `docRef.create(validated.data)`; on conflict, `existing.exists` → count as alreadyExists; no `.set()` overwrite. |
| RawEvent doc id = idempotency key | `withingsMeasures.ts` `buildIdempotencyKey`; pull/backfill use `rawEventsCol.doc(s.idempotencyKey)` and `doc.id = s.idempotencyKey`. |
| Provenance first-class (storage) | RawEvent includes `sourceType`, `sourceId` (and backfill uses `provider: "withings"`). `lib/contracts/rawEvent.ts`: sourceId/sourceType in schema. |
| Provenance / recent-data (UI) | **UNPROVEN:** `useWithingsPresence.ts` calls `getRawEvents(..., kinds: ["withings.body_measurement"])`. RawEvent kind for Withings weight is `"weight"`, not `withings.body_measurement`. So “has recent Withings data” will not see backfilled/pull weight. |
| Failure memory on ingestion failures | `writeFailure` in `services/api/src/lib/writeFailure.ts`; pull/backfill call it on Withings API errors and schema/write failures. |
| UI connected vs error/backfill | `devices.tsx`: status line, backfill running/complete/error; `weight.tsx`: “Importing weight history…” banner when `backfill?.status === "running"`. |
| Timeline & library integrity | Weight flows via `onRawEventCreated` → fact-only weight → dailyFacts. Raw-events list supports kinds + provenance. Ordering: check-invariants + pipeline tests. |
| Multiple weights per day | `aggregateDailyFacts.ts` `buildBodyFacts`: uses “latest” by `start`; raw history not collapsed (all weight events in; one daily fact out). |
| /pull and /backfill invoker-only | `index.ts`: `app.use("/integrations/withings/pull", requireInvokerAuth, ...)` and same for backfill. `invokerAuth.ts`: production requires allowlist. |
| Tokens Secret Manager only | `withingsSecrets.ts`: get/set/delete refresh token and client secret via Secret Manager; no Firestore token writes. |
| No token logging | No `logger.*` with `access_token` or `refresh_token` in API/functions; `withingsMeasures.ts` comment: “Never logs refresh_token or access_token.” |
| Constitution checkers not weakened | `check-invariants.mjs` CHECK 3: exempt list for `withingsPull.ts` / `withingsBackfill.ts` with path constraints. |

---

## 3) Repo Truth Map (File Paths)

| Area | Path |
|------|------|
| Backend Withings OAuth + status | `services/api/src/routes/integrations.ts` |
| Withings pull (invoker-only) | `services/api/src/routes/withingsPull.ts` |
| Withings backfill (invoker-only) | `services/api/src/routes/withingsBackfill.ts` |
| Token custody | `services/api/src/lib/withingsSecrets.ts` |
| Withings measure fetch | `services/api/src/lib/withingsMeasures.ts` |
| API failure write | `services/api/src/lib/writeFailure.ts` |
| Invoker auth | `services/api/src/middleware/invokerAuth.ts` |
| API mount + middleware | `services/api/src/index.ts` |
| Gateway OpenAPI | `infra/gateway/openapi.yaml` (connect, status, callback, complete; pull/backfill not in OpenAPI — invoker-only) |
| RawEvent → canonical | `services/functions/src/normalization/onRawEventCreated.ts`, `mapRawEventToCanonical.ts` |
| Daily facts aggregation | `services/functions/src/dailyFacts/aggregateDailyFacts.ts` |
| Failure writer (functions) | `services/functions/src/failures/writeFailureImmutable.ts` |
| Mobile devices | `app/(app)/settings/devices.tsx` |
| Mobile weight | `app/(app)/body/weight.tsx` |
| Withings API client + status | `lib/api/usersMe.ts` |
| Withings presence hook | `lib/data/useWithingsPresence.ts` |
| Governance | `scripts/ci/check-invariants.mjs`, `scripts/ci/assert-api-routes.mjs` |

**Missing / different paths:** All mandatory B) paths exist. No `withingsPull.ts` typo; file is `withingsPull.ts`. OpenAPI does not define `/integrations/withings/pull` or `/integrations/withings/backfill` (invoker-only routes; not exposed on public gateway).

---

## 4) Done vs Missing

### Done

- OAuth connect, callback, complete, status, revoke; status returns backfill state.
- Token custody: Secret Manager only; no tokens in Firestore or logs.
- GET /integrations/withings/status (auth) with backfill payload.
- POST /integrations/withings/pull (invoker-only); POST /integrations/withings/backfill (invoker-only).
- Pull/backfill: deterministic idempotency key; `create()` only; FailureEntry on API/schema/write failures.
- Backfill: start/resume/stop; cursor on integration doc; resume-safe; status error + lastError on failure.
- Devices screen: Status (Connected/Not connected), backfill progress/complete/error.
- Weight screen: “Importing weight history…” banner when backfill running.
- Client does not call /pull or /backfill (no such fetch in app/lib).
- Invoker allowlist required in production (NODE_ENV).
- RawEvent: sourceType, sourceId; kind weight; optional bodyFatPercent.
- Pipeline: weight as fact-only kind; dailyFacts “latest” per day; no raw history collapse.
- Governance: check-invariants (incl. pull/backfill exemption), assert-api-routes (pull + backfill mounted with requireInvokerAuth).

### Missing / UNPROVEN

- **Client “recent Withings data”:** `useWithingsPresence` uses `kinds: ["withings.body_measurement"]`; backend writes `kind: "weight"`. So “has recent Withings data” / lastMeasurementAt will not reflect Withings weight. Fix: use `kinds: ["weight"]` and filter by sourceId/provenance or add provenance for Withings and filter by it.
- **Withings pull provider:** Code uses `provider: "manual"` with a comment to prefer `"withings"` if schema allows; backfill uses `provider: "withings"`. Optional alignment: use `provider: "withings"` in pull for consistency.
- **Scheduler / automatic backfill:** No Cloud Scheduler or trigger file found in repo for “start/resume” backfill; “magic moment” automation UNPROVEN.
- **Full npm test proof:** Tests not run successfully in audit (emulator EPERM); evidence from code and existing test files only.

---

## 5) Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Client kind filter wrong for Withings weight | Medium | Change `useWithingsPresence` to query `kinds: ["weight"]` and filter by `sourceId === "withings"` (or add provenance to Withings RawEvents and filter by provenance). |
| Pull uses provider "manual" | Low | Align with backfill: set `provider: "withings"` in pull if contracts allow. |
| No automated backfill trigger in repo | Low | Document or add scheduler/job definition for backfill start/resume if “magic” automation is required. |
| OpenAPI does not declare pull/backfill | Info | Intentional (invoker-only); gateway need not expose them. Ensure IAM and deploy docs are clear. |

---

## 6) PASS/FAIL Matrix

### Phase 3A (Withings as first device)

| Criterion | Result | Note |
|-----------|--------|------|
| Passive ingestion never overwrites | PASS | create() only; idempotency key as doc id. |
| Provenance first-class and visible | PARTIAL | Stored (sourceType/sourceId). UI “recent Withings data” uses invalid kind → UNPROVEN. |
| Vendor revisions additive | PASS | Stable idempotency key; alreadyExists path. |
| Absence explicit | PASS | writeFailure; failureState; UI status/error/backfill. |
| Timeline & library integrity | PASS | Weight in pipeline; deterministic ordering. |
| Multiple weights per day | PASS | buildBodyFacts “latest”; raw not collapsed. |

**Phase 3A score: 8/10** (one UNPROVEN for provenance/recent-data UI).

---

### Phase 3B (Withings pull ingestion)

| Criterion | Result | Note |
|-----------|--------|------|
| /integrations/withings/pull invoker-only | PASS | requireInvokerAuth. |
| Queries connected users correctly | PASS | collectionGroup integrations + doc id "withings". |
| Writes RawEvents (kind=weight, weightKg, bodyFat optional, deterministic id) | PASS | idempotencyKey; create(). |
| Never logs/stores tokens | PASS | withingsSecrets; no token in Firestore/logs. |
| Writes FailureEntry on API/schema failures | PASS | writeFailure in pull. |
| Constitution checkers (narrow exemption) | PASS | CHECK 3 exempt list documented. |

**Phase 3B score: 9/10** (provider "manual" vs "withings" minor).

---

### Phase 3B.1 Step 1 (Backfill engine + progress UI)

| Criterion | Result | Note |
|-----------|--------|------|
| /integrations/withings/backfill exists, invoker-only | PASS | index.ts; requireInvokerAuth. |
| start/resume/stop validated strictly | PASS | parseBody; 400 on invalid. |
| Chunking + cursor on integration doc | PASS | backfill.cursorStartSec, cursorEndSec, etc. |
| Resume-safe (cursor progresses, completes) | PASS | resume only when status running/error; cursor updated. |
| FailureEntry + status error on failures | PASS | writeFailure; status "error"; lastError. |
| Devices: status/progress/error | PASS | devices.tsx. |
| Weight: “Importing…” banner | PASS | weight.tsx when backfill running. |
| Client does NOT call invoker endpoints | PASS | No /pull or /backfill from app/lib. |
| No speculative Firestore index drift | PASS | Same rawEvents writes as existing; no new index required. |

**Phase 3B.1 Step 1 score: 9/10** (scheduler/automation not evidenced).

---

## 7) Route Truth (Mount + Middleware)

| Route | Mount | Middleware | Evidence |
|-------|--------|------------|----------|
| GET /integrations/withings/connect | app.use("/integrations", authMiddleware, integrationsRoutes); router.get("/withings/connect") | auth | index.ts L161; integrations.ts L205 |
| GET /integrations/withings/callback | app.get("/integrations/withings/callback", handleWithingsCallback) | none (public) | index.ts L124–126 |
| GET /integrations/withings/complete | app.get("/integrations/withings/complete", ...) | none (public) | index.ts L131–143 |
| GET /integrations/withings/status | app.use("/integrations", authMiddleware, integrationsRoutes); router.get("/withings/status") | auth | index.ts L161; integrations.ts L133 |
| POST /integrations/withings/pull | app.use("/integrations/withings/pull", requireInvokerAuth, withingsPullRouter) | requireInvokerAuth | index.ts L147–148 |
| POST /integrations/withings/backfill | app.use("/integrations/withings/backfill", requireInvokerAuth, withingsBackfillRouter) | requireInvokerAuth | index.ts L153–155 |

OpenAPI (`infra/gateway/openapi.yaml`): defines connect (firebase), status (firebase), callback (public), complete (public text/html). Pull and backfill are not in OpenAPI (invoker-only, not gateway-facing).

---

## 8) Proof Pack (Commands + Outputs)

### Commands run

```bash
npm run typecheck   # exit 0
npm run lint       # exit 0
npm test           # exit 1 — Firestore emulator listen EPERM (sandbox)
node scripts/ci/check-invariants.mjs   # exit 0 — all CHECKs passed
node scripts/ci/assert-api-routes.mjs # exit 0 — ASSERT_API_ROUTES_OK
```

### Outputs (summarized)

- **typecheck:** Clean.
- **lint:** Clean.
- **test:** Failed in audit environment due to emulator bind (EPERM 127.0.0.1). Not interpreted as application defect; full test proof UNPROVEN in this run.
- **check-invariants:** CHECK 1–22 and client trust boundary passed; Withings pull/backfill exemption in CHECK 3 confirmed.
- **assert-api-routes:** Integrations mount, pull and backfill mounted with requireInvokerAuth, route files exist.

### Token / secret patterns (repo-only)

- `rg "refresh_token|access_token|Authorization: Bearer" services/api/src services/functions/src`: Matches only in (1) type/response shapes (e.g. `body?.refresh_token`), (2) withingsMeasures.ts usage for API call (no logging), (3) adminAuth.ts error message text. No logging of tokens.

---

## 9) “Magic Moment” Readiness (Product Vision)

- **Does connecting Withings result in “full history appears like magic” today?**  
  **Partially.** Backfill exists and is invoker-only; UI shows progress and completion. There is **no evidence in repo** of a scheduler or automatic trigger to start/resume backfill after connect; that automation is UNPROVEN.

- **Weight Magic DoD (from spec intent):**
  - Default chart (7-day avg + raw points): **MISSING** (Step 2 trends).
  - Range selector: **MISSING** (Step 2).
  - 3–5 insight cards: **MISSING** (Step 2).
  - Provenance tap details: **UNPROVEN** (sourceId/sourceType in raw-events; timeline/lineage not audited for tap-through; client recent-data filter wrong).

---

## 10) Security & IAM Audit

- **Tokens in Secret Manager only:** `withingsSecrets.ts`; no refresh_token or client secret in Firestore. **PASS.**
- **No tokens in Firestore:** Integrations doc holds only metadata (connected, scopes, connectedAt, failureState, backfill). **PASS.**
- **Invoker-only endpoints:** requireInvokerAuth; production requires WITHINGS_PULL_INVOKER_EMAILS allowlist. **PASS.**
- **No token logging:** No logger calls with access_token or refresh_token in API or functions. **PASS.**

---

## 11) Final Scores + Recommendation

| Phase | Score | Notes |
|-------|--------|------|
| Phase 3A (Withings) | 8/10 | One UNPROVEN: client “recent Withings data” kind filter. |
| Phase 3B (Pull) | 9/10 | Minor: pull uses provider "manual". |
| Phase 3B.1 Step 1 | 9/10 | Scheduler/automation not in repo. |
| **Overall Phase 3 (A+B)** | **7/10** | 10/10 only if every binary criterion proven; client filter + automation gaps prevent 10. |

**Recommendation:** **Proceed to Phase 3B.1 Step 2 (Trends engine).**  
**Hold (non-blocking):** Fix `useWithingsPresence` “recent Withings data” by querying weight with source/provenance so Withings-sourced weight is visible (e.g. `kinds: ["weight"]` and filter by `sourceId === "withings"` or add and filter by provenance).

---

*End of Phase 3 End-to-End Audit. All claims tied to repo evidence or commanded output; no assumptions; no production code changed except this audit file.*
