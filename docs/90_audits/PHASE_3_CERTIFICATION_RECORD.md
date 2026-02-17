# Phase 3 Certification Record

**Purpose:** Runtime certification artifact for Phase 3 (3A + 3B + 3B.1 Step 1) Weight Magic readiness.  
**Scope:** Local proof only; no production deployment claimed.

---

## 1) Commit / Baseline

| Item | Value |
|------|--------|
| Commit (at certification run) | `4c5bb3b50219de836c0331466b1bdad344f4c47b` |
| Branch | feat/phase3b1-weight-backfill (or current) |

---

## 2) Commands Run and Outputs

### typecheck

```bash
npm run typecheck
```

**Result:** Exit 0. No errors.

### lint

```bash
npm run lint
```

**Result:** Exit 0. No errors.

### test

```bash
npm test
```

**Result:** Exit 0. Test Suites: 93 passed, 93 total. Tests: 372 passed.

(Includes: useWithingsPresence.withingsContract, integrations.withings, onWithingsBackfillScheduled, withings.backfill, withings.pull.)

### check-invariants

```bash
node scripts/ci/check-invariants.mjs
```

**Result:** Exit 0. All CHECKs 1–22 passed; client trust boundary passed; assert-phase3-specs passed.

### assert-api-routes

```bash
node scripts/ci/assert-api-routes.mjs
```

**Result:** Exit 0. ASSERT_API_ROUTES_OK.

### assert-phase3-specs

```bash
node scripts/ci/assert-phase3-specs.mjs
```

**Result:** Exit 0. ASSERT_PHASE3_SPECS_OK.

---

## 3) Deterministic Proof Procedure (Connect → Auto Backfill → Complete → Presence True)

**Local / emulator path (no real Withings OAuth):**

1. **Presence contract:** Run `npm test -- --testPathPattern="useWithingsPresence.withingsContract"`. Must pass: kind=weight, sourceId=withings; filtering yields only Withings events for latest/hasRecentData.
2. **Status autostart:** Run `npm test -- --testPathPattern="integrations.withings"`. Must pass: GET status with connected=true and no backfill triggers one ref.set with backfill.status=running and cursor fields; response includes backfill.
3. **Backfill resume:** Run `npm test -- --testPathPattern="withings.backfill"`. Must pass: resume mode processes only running/error; cursor progresses; create-only RawEvents; FailureEntry on failures.
4. **Scheduler:** Run `npm test -- --testPathPattern="onWithingsBackfillScheduled"`. Must pass: export exists and is a scheduled trigger (not HTTP-callable).

**Runtime path (manual; requires real Withings):**

1. Connect Withings via app (OAuth → callback sets connected + backfill running).
2. Or: GET /integrations/withings/status with valid JWT when connected and no backfill → one-time write of backfill running.
3. Scheduler (or manual POST to backfill with invoker auth) runs resume until status=complete.
4. GET /integrations/withings/status shows backfill.status=complete.
5. GET /users/me/raw-events?kinds=weight returns items with sourceId=withings; presence hasRecentData=true when such events exist in last 7 days.

---

## 4) Separation: Local Proof vs Runtime Proof

| Proof | Local (CI/emulator) | Runtime (production/staging) |
|-------|----------------------|------------------------------|
| Presence kind/sourceId | ✅ useWithingsPresence.withingsContract.test.ts | Manual: raw-events + Devices UI |
| Status autostart | ✅ integrations.withings.test.ts (mock ref.set) | Manual: status after connect |
| Backfill resume | ✅ withings.backfill.test.ts | Manual or scheduler run |
| Scheduler exists | ✅ onWithingsBackfillScheduled.test.ts | Deploy Functions; OLI_API_BASE_URL + invoker allowlist |

This artifact does **not** claim production deployment or live Withings OAuth; it certifies repo state and test evidence only.

---

## 5) Runtime Wiring + Proof

**Required API env (Cloud Run oli-api):**

| Variable | Purpose |
|----------|---------|
| `WITHINGS_PULL_INVOKER_EMAILS` | Comma-separated allowlist of invoker emails. In production at least one of EMAILS or SUBS must be set. |
| `WITHINGS_PULL_INVOKER_SUBS` | Comma-separated allowlist of token `sub` (subject) for SA tokens that omit `email`. Get `sub` from first 403 log line `invoker_auth_rejected` (field `sub`). |
| `INVOKER_TOKEN_AUDIENCE` | Exact audience for Bearer ID token (e.g. `https://oli-api-1010034434203.us-central1.run.app`). Required when scheduler uses Bearer path. |

**Required function env (scheduler):**

| Variable | Purpose |
|----------|---------|
| `OLI_API_BASE_URL` | Base URL of the API (e.g. `https://oli-api-1010034434203.us-central1.run.app`). Scheduler mints an ID token for `OLI_API_BASE_URL/integrations/withings/backfill`. |

**Required IAM:**

- Service account `oli-functions-runtime@...iam.gserviceaccount.com` must have `roles/run.invoker` on the Cloud Run service `oli-api` so the scheduler can call the API with a valid OIDC ID token.

**Verification commands (do not claim production proof unless logs show 200):**

1. **API backfill path returns 200 when called by scheduler:**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="oli-api" AND httpRequest.requestUrl=~"/integrations/withings/backfill"' --limit=20 --format="table(timestamp,httpRequest.status)"
   ```
   Expect `httpRequest.status` 200 for successful invoker-authenticated POSTs.

2. **Scheduler completes successfully:**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="onwithingsbackfillscheduled" AND textPayload=~"completed"' --limit=20 --format="table(timestamp,textPayload)"
   ```
   Expect log lines containing `completed ok:true`.

**Diagnostic:** On any 403 from invoker endpoints, API logs one line `invoker_auth_rejected` with `rid`, `branch`, `errorCode`, and (when Bearer path) `aud`, `emailPresent`, `subPresent`, `sub`, `verifyReason`. Use `rid` to correlate with Cloud Run request logs. See `docs/90_audits/PHASE_3_RUNTIME_AUTOMATION_ROOT_CAUSE.md`.

**Exact runtime verification (do not claim production proof unless both pass):**

1. **oli-api returns 200 for backfill from scheduler:**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="oli-api" AND httpRequest.requestUrl=~"/integrations/withings/backfill" AND httpRequest.requestMethod="POST"' --limit=20 --format=json | jq -r '.[] | "\(.timestamp) \(.httpRequest.status)"'
   ```
   Expect lines with status 200.

2. **Scheduler logs completed ok:true:**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="onwithingsbackfillscheduled" AND (textPayload=~"completed" OR jsonPayload.message=~"completed")' --limit=20 --format=json | jq -r '.[] | "\(.timestamp) \(.textPayload // .jsonPayload.message)"'
   ```
   Expect entries containing `completed` and `ok:true`.

If 401/403 persists, check API logs for `invoker_auth_rejected` and apply fix per root cause report (e.g. add `WITHINGS_PULL_INVOKER_SUBS` with the logged `sub`).

---

*End of Phase 3 Certification Record.*
