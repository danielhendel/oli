# Workout summary rebuild, bundle safety, and staging verification

## Bundle artifact (drift control)

- **Source of truth** is the TypeScript entry `services/api/scripts/workout-day-summary-rebuild.entry.ts` and the shared app code it pulls in (e.g. `lib/data/workouts/workoutDaySummaryCompute`, `services/functions/src/workouts/recomputeWorkoutDaySummary.ts`).
- **Why a checksum exists:** Cloud Run loads a generated CommonJS bundle for workout summary rebuild routes. The sidecar SHA-256 proves the on-disk bytes were not swapped or truncated. The **tracked** `services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs.sha256` is the **canonical Linux fingerprint** used by CI. A separate **runtime** sidecar is written beside the artifact that actually runs (dist in production; gitignored `*.runtime.sha256` for local `dev`).
- **Ordinary developer command:** `npm run -w api build`
  - Runs esbuild → `tsc` → copies the gitignored `.cjs` into `dist/` and writes a **runtime** `.sha256` beside the dist bundle from those bytes.
  - Does **not** rewrite the tracked canonical checksum (so macOS vs Linux esbuild differences do not leave unexplained git drift).
- **Read-only validation (local):** `npm run check:workout-summary-rebuild-bundle`
  Confirms the built dist (or src) bundle matches its adjacent runtime sidecar.
- **Canonical validation (CI / Linux truth):** `npm run check:workout-summary-rebuild-bundle:canonical`
  Also requires `sha256(built bundle) ===` tracked `src/lib/*.sha256`. GitHub Actions runs this after `npm run -w api build`.
- **Intentional canonical refresh** (after changing bundled sources; prefer Linux or CI):

```bash
npm run -w api bundle:workout-summary-rebuild
npm run -w api bundle:workout-summary-rebuild:checksum
git add services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs.sha256
```

- Generated **`services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs`** remains gitignored.
- Local **`*.bundled.cjs.runtime.sha256`** is gitignored (written by `npm run -w api dev` / `bundle:workout-summary-rebuild:runtime-checksum`).
- **Cross-platform note:** Prefer refreshing the canonical fingerprint from Linux/CI. Current Node 20 + esbuild 0.24.2 produced the **same** hash on macOS and GitHub `ubuntu-latest` for this artifact; the previous dirty-tree symptom was mainly a **stale committed fingerprint** being rewritten by ordinary builds. Still do not invent platform-specific expected hashes.
- **Interrupted build recovery:** delete `services/api/dist` if partially written, re-run `npm run -w api build`. If a tracked checksum was accidentally rewritten locally, restore it with
  `git restore --source=HEAD -- services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs.sha256`
  then refresh intentionally on Linux if sources actually changed.
- Docker/Cloud Run: `services/api/Dockerfile` runs `npm run build` on Linux and requires the dist bundle + runtime sidecar to exist. Production does not depend on the developer’s local macOS hash.

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
- **Deployments** must run `npm run -w api build` (or equivalent) before shipping the API artifact; CI canonical checksum catches source/hash drift on Linux but not a skipped build step in an unstandardized deploy script.

## PR 5 suggested review scope (hardening slice)

When isolating from unrelated branch work, prefer a commit that contains only:

- `services/api/scripts/workout-summary-rebuild-bundle-shared.mjs`, bundle/write/verify/copy scripts, checksum lib, `*.sha256`
- `lib/contracts/workoutSummaryRebuildLimits.ts`, `lib/contracts/retrieval.ts` (range validation), `lib/contracts/index.ts`
- `lib/data/workouts/workoutSummaryRebuildPolicy.ts`, `lib/data/workouts/workoutSummaryVerification.ts`
- `services/functions/src/workouts/recomputeWorkoutMonthSummary.ts`, `services/api/scripts/workout-day-summary-rebuild.entry.ts`
- `services/api/src/routes/usersMe.ts`, `lib/api/usersMe.ts`
- Tests under `lib/contracts/__tests__/`, `lib/data/workouts/__tests__/`, `services/api/src/**/__tests__/`
- `.github/workflows/ci.yml`, `package.json` (root + `services/api/package.json`)
- This runbook
