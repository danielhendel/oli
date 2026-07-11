# Appendix: Oura Daily Sleep Score — Release Verification Gate

**Date:** 2026-07-10  
**Parent audit:** `docs/audits/2026-07-10-daily-sleep-dashboard-root-cause-audit.md`  
**Working branch (dirty WIP preserved):** `fix/dashboard-daily-sleep-data` @ `1ecfa0d97f4a7a6d55f48cb78164e34119f9a5b1`  
**Release worktree:** `/Users/danielhendel/oli-release-oura-daily-sleep-score`  
**Release branch:** `release/oura-daily-sleep-score`  
**Release commit:** `93af6fef14111259d7670a1b2f28f302fd0d86f8` (`93af6fe`)  
**Release tree object:** `b1ec36dc552252a8845fc6f20a6949f08507b0bf`  
**Deployment authorization:** **GRANTED** for `oli-staging-fdbba` (2026-07-10) — Function + `oli-api` + bounded refresh + privacy-safe verify only.

---

## Before

```text
Live gateway response had no Sleep Score.
UI correctly rendered Sleep score unavailable.
Root cause: Oura /daily_sleep was never ingested; period /sleep supplied metrics only.
Serving API revision: oli-api-00223-lrg
Serving Function: onOuraPostRawRequested revision onourapostrawrequested-00051-fef (updated 2026-06-23)
Gateway config: oli-api-config-20260618-124147 (ACTIVE) — sleep-night + sleep-day-refresh already present; no gateway OpenAPI change required for this score pipeline.
```

---

## Immutable release (committed)

```text
Release commit SHA: 93af6fef14111259d7670a1b2f28f302fd0d86f8
Short SHA: 93af6fe
Release tree clean: yes
Git tree object: b1ec36dc552252a8845fc6f20a6949f08507b0bf
Base SHA: 1ecfa0d97f4a7a6d55f48cb78164e34119f9a5b1
Message: fix(oura): ingest and hydrate exact-day daily sleep scores
```

### Backend files included

- `lib/contracts/ouraVendor.ts` (`kind: daily_sleep`)
- Delete dual-source: `lib/integrations/oura/buildSleepNightFromOuraDocument.{js,d.ts}`, `resolveOuraSleepIngestBase.{js,d.ts}`
- `services/api/src/lib/ouraApi.ts` (`fetchOuraDailySleep` + pagination)
- `services/api/src/lib/oura/dailySleepScoreForSleepNight.ts` (+ tests)
- `services/api/src/lib/oura/resolveSleepNightWakeDay.ts` (+ tests; day-match prerequisite)
- `services/api/src/lib/oura/buildSleepNightFromOuraDocument.ts`
- `services/api/src/lib/oura/readinessForSleepNightMerge.ts`
- `services/api/src/lib/ouraVendorSnapshot.ts`
- `services/api/src/lib/ouraPostRawJob.ts`
- `services/api/src/lib/sleepNightRead.ts` / `sleepNightReadCoerce.ts` (+ hydrate/coerce/resolve/sleepNight tests)
- `services/api/src/routes/integrations/ouraPullNow.ts` (+ pull/backfill tests)
- `services/functions/src/oura/ouraPostRawHandler.ts`
- `services/functions/src/oura/onOuraPostRawRequested.ts`
- uniqueness + pagination tests

### Backend files excluded (remain in dirty main worktree)

- Command Center Today-progress deletions and dash composition
- Mobile Sleep/Readiness presentation, `DashMetricRow`, Oura rating UI helpers
- Audit docs (optional follow-up commit)

### Build artifact digests (local worktree build)

```text
services/api/dist/.../server.js sha256: fbcb06d5b95d0fc9ce556e8e32df4a7146de68ece9b94b7a93ff4d462b8250d8
services/functions/lib/index.js sha256: 058c431c0bb38546cdd63c8ae1dff55ee2bd84ac909c03483e1d6b3bd9c2d9b2
```

Cloud Run image digest is assigned only after `scripts/deploy/phase3a-withings-build-api-image.sh` against the committed SHA.

---

## Clean reproducibility gate (worktree after `npm ci`)

| Command | Exit |
|---------|------|
| `npm ci` | 0 |
| `npm run typecheck` | 0 |
| `npm run lint` | 0 |
| `npm test -- --ci --watchman=false` | 0 (775 suites / 4787 tests) |
| `git diff --check` | 0 |
| `npm run check:client-trust-boundary` | 0 |
| `npm --prefix services/api run build` | 0 |
| `npm --prefix services/functions run build` | 0 |
| `npx expo export --platform ios` | 0 |
| `npx expo-doctor` | 1 (pre-existing; see § Expo Doctor) |

Focused Oura suites (pagination, merge, hydrate, pull-now, post-raw): **pass**.

---

## Deployment truth (repository)

```text
API source workspace: services/api (monorepo root Docker context)
API build command: npm --prefix services/api run build  (image: scripts/deploy/phase3a-withings-build-api-image.sh)
API test command: npm test -- --ci (repo root; includes services/api)
Cloud Run service name: oli-api
Cloud Run project: oli-staging-fdbba
Cloud Run region: us-central1
Cloud Run deployment command: scripts/deploy/phase3a-withings-deploy-cloudrun.sh <commit_short_sha>
Post-raw Function source workspace: services/functions
Post-raw Function name: onOuraPostRawRequested
Functions project: oli-staging-fdbba
Functions region: us-central1
Functions deployment command: firebase deploy --only functions:onOuraPostRawRequested --project oli-staging-fdbba
Gateway service: oli-gateway (hostname oli-gateway-cw04f997.uc.gateway.dev)
Gateway config: infra/gateway/openapi.yaml via scripts/deploy/phase3a-withings-deploy-gateway.sh
Does the gateway config require an update?: NO (paths /users/me/sleep-night and /integrations/oura/sleep-day-refresh already present)
```

Runtime serves compiled `dist` / Functions `lib` (Dockerfile CMD `node dist/services/api/src/server.js`).

### Compatibility / order

1. Deploy Function first (accepts missing `dailySleepDocs` → `[]`).
2. Deploy API (produces `dailySleepDocs`; also runs in-process `performOuraPostRawPersistence`).
3. Bounded refresh.
4. Verify GET `/users/me/sleep-night`.

Rollback: redeploy prior Function revision / prior Cloud Run image tag `oli-api-00223-lrg` digest `sha256:4b3fdb8fe3fe2f6d65b2f6f004ee7c22a8c7032b3c8295ba1dcf4d475c8367b7`.

---

## Deployment (executed)

| Resource | Result |
|----------|--------|
| Function `onOuraPostRawRequested` | **PASS** — revision `onourapostrawrequested-00052-hik` (has `dailySleepDocs`) |
| Cloud Run `oli-api` (immutable `93af6fe`) | **PASS** — revision `oli-api-00224-t5k` @ digest `sha256:bfbc11e5…` |
| Gateway OpenAPI | **NOT DEPLOYED** (authorized exclusion; paths already present) |
| Other Functions / services | **NOT DEPLOYED** |

### Hotfix (post-gate)

Immutable `93af6fe` image failed `sleep-day-refresh` on a **pre-existing** recompute-bundle path mismatch (`loadRecomputeDerivedTruthForDay` → `…/dist/functions/lib/…` vs Dockerfile copy to `services/functions/lib`). Same mismatch exists on base `1ecfa0d`; rolling back would remove scores without fixing refresh.

| Hotfix | Result |
|---------|--------|
| Dockerfile dual-COPY of `recomputeForDayExport.js` (uncommitted in release worktree) | Image tag `93af6fe-recompute-path` digest `sha256:7135706d…` |
| Serving revision | **`oli-api-00225-vb2` @ 100%** |

Rollback targets (pre-authorized): API `oli-api-00223-lrg` / `sha256:4b3fdb8…`; Function zip gen `#1782225222802167`. Not used — score path healthy.

---

## Refresh

| Step | Result |
|------|--------|
| `POST …/sleep-day-refresh` day `2026-07-10` on `00224` | **FAIL** — `SLEEP_DAY_REFRESH_FAILED` missing recompute bundle (path bug) |
| `POST …/pull-now` (bounded; same approved user) | **PASS** — HTTP 202; vendor `daily_sleep` row present |
| `POST …/sleep-day-refresh` on `00225` (new Idempotency-Key) | **FAIL** — recompute loads; then **health score immutability** guard (pre-existing derived-truth write conflict). No score value / token logged. |
| `GET …/sleep-night?day=2026-07-10` | **PASS** — `exact_anchor`, `scorePresent=true`, `scoreFinite0to100=true`, duration present |

No global/multi-user backfill. No manual Firestore score edit.

---

## After (live staging)

```text
Live /sleep-night returns exact-day score (privacy-safe flags only).
Ingest path: daily_sleep vendor snapshot + hydrate/join.
Mobile binary / EAS: not redeployed (authorized exclusion).
Physical phone: restart Expo against live gateway; expect Sleep Score hero (UI already in dirty mobile WIP).
```

**Score pipeline status:** **VERIFIED** on live gateway (`oli-api-00225-vb2`).  
**Full sleep-day-refresh HTTP success:** **NOT VERIFIED** (immutability conflict after recompute path fix).
---

## Historical remediation

- Bounded per-user `sleep-day-refresh` / pull-now is sufficient for the visible test night.
- Broader date-range refresh may be recommended later for historical Dash days.
- No automatic global backfill from Cursor.
- Read-time `hydrateSleepNightDailyScore` remains temporarily necessary for legacy SleepNights until rewritten by sync.

---

## Expo Doctor

Pre-existing exit 1; not introduced by this backend release; not fixed in this release (would mix unrelated Expo dependency work). See final response table.
