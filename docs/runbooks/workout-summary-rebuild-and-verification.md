# Workout summary rebuild, bundle safety, and staging verification

## Bundle artifact (drift control)

- **Source of truth** is the TypeScript entry `services/api/scripts/workout-day-summary-rebuild.entry.ts` and the shared app code it pulls in (e.g. `lib/data/workouts/workoutDaySummaryCompute`, `services/functions/src/workouts/recomputeWorkoutDaySummary.ts`).
- **Build** runs esbuild, then **writes the SHA-256 from the on-disk bundle** (same bytes copied to `dist/`), then `tsc`, then copy: `npm run -w api build`. (`bundle:workout-summary-rebuild` alone only produces the `.cjs`; use `bundle:workout-summary-rebuild:checksum` after it if you are not running a full build.)
- Generated **`services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs`** remains gitignored; **committed** `services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs.sha256` is a convenience fingerprint for review/diff — **Docker/CI always regenerate it during build** so it matches the Linux-built artifact (macOS vs Linux bundles differ).
- After changing bundled code paths, run a full API build and commit the updated fingerprint if you want the repo to reflect your machine’s hash:

```bash
npm run -w api build
git add services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs.sha256
```

- CI runs `npm run -w api build` then `npm run check:workout-summary-rebuild-bundle`, which verifies **`dist/src/lib/*.cjs` bytes match `dist/src/lib/*.sha256`** (same layout as Cloud Run), not a second esbuild pass.

## Recompute / backfill (Firestore only — existing collections)

All routes are **per authenticated user**, **idempotent** (re-run overwrites summaries with the same deterministic compute from raw events), and **additive** for schema.

| Endpoint | Purpose |
|----------|---------|
| `POST /users/me/workout-day-summaries/rebuild` | Body: `{ start, end }` day keys (YYYY-MM-DD), inclusive. Caps at **900** calendar days (`@oli/contracts` validation). Rewrites `workoutDaySummaries/{day}` and, for overview year days, kicks month recomputation inside the bundled implementation. |
| `POST /users/me/workout-month-summaries/rebuild` | Body: `{ year }`. Rewrites all **12** month docs for that calendar year. |
| `POST /users/me/workout-month-summaries/rebuild-range` | Body: `{ startMonthKey, endMonthKey }` (YYYY-MM). Inclusive span; max **24** months. Rewrites each `workoutMonthSummaries/{monthKey}` from raw truth only. |

Client helpers (optional): `postWorkoutDaySummariesRebuild`, `postWorkoutMonthSummariesRebuild`, `postWorkoutMonthSummariesRebuildRange` in `lib/api/usersMe.ts`.

## Staging verification (before / after)

1. **Snapshot before**: `GET /users/me/workout-day-summaries` and/or `GET /users/me/workout-month-summaries` for the range or year you will rebuild. Save JSON.
2. **Rebuild**: Call the appropriate `POST …/rebuild` or `POST …/rebuild-range`.
3. **Snapshot after**: Repeat GETs with the same query params.
4. **Analyze**: Use `verifyWorkoutDaySummaryRebuild` / `verifyWorkoutMonthSummaryRebuild` from `lib/data/workouts/workoutSummaryVerification.ts` in any TS harness (paste before/after item DTOs). These helpers flag regressions when tab session counts or taxonomy volume drop without treating `computedAt` changes as failures.

Legacy vs id-based strength rows: taxonomy aggregates appear only when ingest payloads parse to `exercises[].sets[]`; unchanged raw data yields the same deterministic taxonomy before and after rebuild.

## Operational risks (residual)

- **`computedAt` changes** every rebuild; comparisons should ignore it (verification helpers do).
- **Overview month linkage**: day rebuild triggers month refresh only when the calendar day participates in the fixed overview year logic inside `maybeRecomputeWorkoutMonthSummaryForUiDay`; use explicit **month rebuild** when you only need month rows refreshed.
- **Deployments** must run `npm run -w api build` (or equivalent) before shipping the API artifact; fingerprint CI catches source/hash drift but not a skipped build step in an unstandardized deploy script.

## PR 5 suggested review scope (hardening slice)

When isolating from unrelated branch work, prefer a commit that contains only:

- `services/api/scripts/workout-summary-rebuild-bundle-shared.mjs`, bundle/write/verify scripts, `*.sha256`
- `lib/contracts/workoutSummaryRebuildLimits.ts`, `lib/contracts/retrieval.ts` (range validation), `lib/contracts/index.ts`
- `lib/data/workouts/workoutSummaryRebuildPolicy.ts`, `lib/data/workouts/workoutSummaryVerification.ts`
- `services/functions/src/workouts/recomputeWorkoutMonthSummary.ts`, `services/api/scripts/workout-day-summary-rebuild.entry.ts`
- `services/api/src/routes/usersMe.ts`, `lib/api/usersMe.ts`
- Tests under `lib/contracts/__tests__/`, `lib/data/workouts/__tests__/`, `services/api/src/**/__tests__/`
- `.github/workflows/ci.yml`, `package.json` (root + `services/api/package.json`)
- This runbook
