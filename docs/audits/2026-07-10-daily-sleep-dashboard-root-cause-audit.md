# Daily Sleep Dashboard Root-Cause Audit — Closure Gate

**Date:** 2026-07-10
**Branch:** `fix/dashboard-daily-sleep-data`
**Starting commit SHA:** `1ecfa0d97f4a7a6d55f48cb78164e34119f9a5b1`
**HEAD at closure:** `1ecfa0d97f4a7a6d55f48cb78164e34119f9a5b1` (uncommitted WIP)
**Package manager:** npm
**Evidence dir (ephemeral):** `/tmp/oli-audit-evidence-2026-07-10/` (`command-center-wip.patch`, `status.txt`) — not durable; non-sensitive command summaries copied below only.

---

## Verdict labels (closure)

| Finding | Label |
|---------|-------|
| Screenshot mismatch (empty Sleep + scored Readiness) | **CONFIRMED** — readiness fallback presented as today on Dash |
| Screenshot caused by wake-day rejecting a valid SleepNight | **NOT VERIFIED** — no privacy-safe affected-day SleepNight metadata captured for the screenshot UID/day |
| Wake-day UTC skew can reject a valid night on Dash | **LATENT DEFECT CONFIRMED** — deterministic fixture |
| Stale `lib/integrations/oura/*.js` as production source | **DISPROVED** (inactive) — deleted as dead duplicate; guard test added |
| Endpoint UID scoping | **CONFIRMED** — `authMiddleware` + `requireUid(req.uid)`; no caller-supplied UID |
| Full emulator/`npm test -- --ci` | **NOT VERIFIED** (agent env) until user re-runs |
| iOS simulator smoke A–G | **NOT VERIFIED** |
| `npx expo-doctor` | **NOT VERIFIED** |

**Do not collapse findings:** readiness honesty and wake-day skew are independent. The screenshot is explained by readiness fallback honesty without proving a SleepNight existed for that day.

---

## Working-tree snapshot (closure start)

```text
pwd → /Users/danielhendel/oli
branch → fix/dashboard-daily-sleep-data
HEAD → 1ecfa0d97f4a7a6d55f48cb78164e34119f9a5b1
```

Dirty tree includes Command Center Today-progress removal WIP **and** sleep/readiness repair. No reset/clean/stash performed.

---

## 1. Confirmed cause of the screenshot

**CONFIRMED (readiness honesty):** `GET /users/me/oura-readiness-view` can return `isFallback: true` / `resolvedDay !== requestedDay` (7-day window or last-resort latest doc). Pre-fix `buildDailyReadinessCardModel` ignored `isFallback` and showed the score as today’s readiness while Daily Sleep correctly refused non-attributed sleep → empty copy.

**NOT VERIFIED as wake-day for that screenshot:** Without a redacted SleepNight existence/attribution chain for the screenshot day, we cannot claim the Sleep card was wrong for that day. If no attributed SleepNight existed, empty Sleep was correct.

Canonical statement when SleepNight absent for screenshot day:

```text
The Daily Sleep empty state was correct for that day.
The visibly inconsistent readiness card was caused by fallback readiness being presented as current-day data.
The wake-day defect was a separate confirmed latent defect, not proven as the cause of the screenshot.
```

---

## 2. Confirmed latent sleep defect

**LATENT DEFECT CONFIRMED.**

Chain:

```text
Provider day differs from UTC-derived end day
→ writer stored incorrect wakeDay (UTC-only)
→ resolver returns latest_completed_prior_night
→ Dash refuses attribution
→ card renders empty
```

After repair:

```text
correct wakeDay (provider ≥ UTC(end) or coerce from anchor skew)
→ wake_day or exact_anchor
→ dashboard receives sleep
→ card renders success
```

Reproducers:

- `services/api/src/lib/__tests__/sleepNightRead.resolve.test.ts` — coerced UTC-skewed prior → `wake_day`
- `lib/data/dash/__tests__/dailySleepCardViewModel.test.ts` — pre-fix `latest_completed_prior_night` → `missing`; post-fix `wake_day` → `ready`
- `services/api/src/lib/oura/__tests__/resolveSleepNightWakeDay.test.ts` — truth table

---

## Runtime source resolution

| Environment | Implementation executed |
|-------------|-------------------------|
| Jest / TypeScript tests | `services/api/src/lib/oura/buildSleepNightFromOuraDocument.ts` (+ `resolveSleepNightWakeDay.ts`) via TS/Jest |
| Local API `npm run dev` | `ts-node` on `services/api/src/server.ts` → same `.ts` sources |
| Compiled API `npm start` / Cloud Run | `services/api/dist/services/api/src/server.js` from `tsc` of `services/api` (`Dockerfile` `npm run build`); **gitignored** `dist/` |
| Mobile / Metro | Does **not** import SleepNight builders; uses `GET /users/me/sleep-night` HTTP only |
| Deleted dead copies | `lib/integrations/oura/buildSleepNightFromOuraDocument.{js,d.ts}`, `resolveOuraSleepIngestBase.{js,d.ts}` — **no imports**; classification **C. Dead duplicate** → deleted; guard `sleepNightBuilderSourceUniqueness.test.ts` |

**Severity of stale JS after proof:** P3 → closed (removed). Was never the Cloud Run source of truth.

---

## Endpoint lineage

| Layer | `/sleep-night` | `/oura-readiness-view` |
|------|----------------|------------------------|
| Route file | `services/api/src/routes/usersMe.ts` `GET /sleep-night` | same file `GET /oura-readiness-view` |
| Mount | `services/api/src/index.ts` `app.use("/users/me", authMiddleware, usersMeRoutes)` | same |
| Auth source | Firebase auth middleware → `req.uid` | same |
| UID scoping | `requireUid(req)` only; no query/body UID | same |
| Day parameter | `parseDay` → `day` query `YYYY-MM-DD` | same |
| Repository/service | `loadSleepNightView` / `sleepNightRead.ts` | inline Firestore queries in route |
| Storage path | `users/{uid}/sleepNights/{anchorDay}` | `users/{uid}/ouraVendorReadiness` (query by `day`) |
| Stored document type | SleepNight document (Zod `sleepNightDocumentSchema`) | Oura vendor readiness snapshot |
| Producer | Oura pull / vendor snapshot / backfill → `buildSleepNightFromOuraSleepDocument` | Oura pull → `ouraVendorSnapshot` readiness writes |
| Upstream raw/canonical | `ouraVendorSleep` (+ rawEvents ingest path) | Oura readiness API → vendor collection |
| Schema version | None on SleepNight docs today (structural Zod only) | DTO via `readinessViewDtoSchema` |
| Logic version | Route log `sleep-night-resolution-v2`; no stored logicVersion | Fallback window constant `OURA_VIEW_FALLBACK_DAYS = 7` |
| Reprocessing path | Admin backfill / `sleep-day-refresh`; read coerce for skew | Re-pull Oura; no Dash coerce |
| Cache/fallback behavior | Bounded lookback D, D−1, D−2; resolutions `exact_anchor` / `wake_day` / `latest_completed_prior_night`; physiology hydrate from readiness/dailyFacts | Exact day → 7-day window → last-resort latest doc; `isFallback` when `resolvedDay !== requestedDay` |

### Model classification

| Model | Class |
|-------|-------|
| SleepNight | **1. Canonical derived read model** (Oura sleep → `sleepNights`; Dash consumes via `/sleep-night`) |
| Oura readiness view | **3. Provider-specific derived model** (vendor snapshot side channel; not DailyFacts) |

**Architecture drift:** Sleep and readiness are **parallel provider-derived truths**, not one canonical day ledger. Drift did **not** invent the wake-day bug, but **did** enable the screenshot mismatch (different fallback policies). Severity: **P2** follow-up — document/product-align Dash readiness with Sleep attribution strictness (done for Dash card); optional later unify day semantics. No pipeline refactor in this closure.

---

## Wake-day contract

**Final rule** (`resolveSleepNightWakeDay`):

```text
After validating both as YYYY-MM-DD:
  if providerDay and utcEndDay: prefer the later (provider >= utc ? provider : utc)
  else providerDay ?? utcEndDay ?? null
Invalid/missing provider day → UTC(end) only.
Lexical >= only after strict day-key validation.
```

Read coerce (`repairWakeDayFromAnchorSkew`): if `anchorDay > utcEndDay`, set `wakeDay = anchorDay`; never move wake earlier; ignore invalid anchors.

### Truth table

| Case | Provider day | End timestamp (UTC) | Local end day | UTC end day | Expected anchorDay | Expected wakeDay |
|------|--------------|---------------------|---------------|-------------|--------------------|------------------|
| Tokyo overnight | 2026-07-10 | 2026-07-09T21:30:00Z | 2026-07-10 (JST) | 2026-07-09 | 2026-07-10 | 2026-07-10 |
| Los Angeles overnight | 2026-07-10 | 2026-07-10T13:30:00Z | 2026-07-10 (PDT) | 2026-07-10 | 2026-07-10 | 2026-07-10 |
| London DST spring | 2026-03-29 | same calendar UTC morning | 2026-03-29 | 2026-03-29 | 2026-03-29 | 2026-03-29 |
| London DST fall | 2026-10-25 | same calendar UTC morning | 2026-10-25 | 2026-10-25 | 2026-10-25 | 2026-10-25 |
| Sleep crosses midnight | 2026-04-19 | 2026-04-19T11:00:00Z | 2026-04-19 | 2026-04-19 | 2026-04-19 | 2026-04-19 |
| Provider earlier than UTC end | 2026-07-09 | 2026-07-10T10:30:00Z | (varies) | 2026-07-10 | 2026-07-09 | 2026-07-10 |
| Provider later than UTC end | 2026-07-10 | 2026-07-09T21:30:00Z | 2026-07-10 | 2026-07-09 | 2026-07-10 | 2026-07-10 |
| Missing provider day | — | …T11:00:00Z | — | UTC slice | UTC-derived rollup | UTC end |
| Invalid provider day | `2026/07/10` | … | — | UTC | UTC rollup | UTC end |
| Main sleep + nap | nap lacks bed/wake → build null; primary long_sleep only | — | — | — | primary only | primary only |
| Bed-day source record | provider = bed day &lt; UTC end | morning UTC next day | — | later | bed day | UTC end |

---

## Coercion lifecycle

| Property | Result |
|----------|--------|
| Pure / deterministic / idempotent | **CONFIRMED** (tests) |
| No mutate stored object | **CONFIRMED** |
| Correct records unchanged | **CONFIRMED** |
| Invalid anchor / endedAt | Does not invent valid wake from garbage |
| Version fields | **None** on SleepNight (`schemaVersion` / `logicVersion` absent) — eligibility is structural |
| Eligible | Docs with valid day keys where `anchorDay > UTC(endedAt)` skew, or missing wake/ended inferable |
| Excluded | Invalid endedAt without inferable start+duration; cannot invent from untrusted earlier anchor alone |
| Bounded reprocess | Admin backfill / sleep-day-refresh rewriting via fixed builder |
| Removal condition | After backfill confirms wakeDay correct for active users; then delete skew branch |

Negative tests: `sleepNightRead.coerce.test.ts` (anchor earlier, invalid/absent anchor, invalid endedAt, already-correct, idempotent, no mutate, provenance, nap-type).

---

## Readiness behavior (Dash)

| Case | Result after fix |
|------|------------------|
| Exact current-day | Score + “Oura readiness score for today.” |
| Fallback prior-day | Pending empty — no score |
| Different resolvedDay | Pending empty |
| Stale / missing | Pending empty |
| Provider disconnected | “Oura not connected” |
| Query error | Handled upstream as error path (hook); model treats missing view as pending |
| Loading | Hook partial (unchanged) |
| Score 0 | Valid signal when current-day |
| User switch (mismatched requestedDay) | No signal |

Detail screen may still show dated fallback — unchanged API.

---

## Actual affected-case evidence

Production screenshot UID/day SleepNight chain: **NOT VERIFIED** (no safe read of production health docs in this closure).

Synthetic / fixture chain (privacy-safe):

| Field | Pre-fix | Post-fix |
|-------|-----------|------------|
| Requested day | 2026-07-10 | 2026-07-10 |
| endedAt UTC day | 2026-07-09 | 2026-07-09 |
| anchorDay | 2026-07-10 or D−1 doc | same |
| wakeDay | 2026-07-09 | 2026-07-10 |
| Resolution | `latest_completed_prior_night` | `wake_day` |
| Dash VM | `missing` | `ready` |

---

## Complete gate

| Command | Exit | Status |
|---------|------|--------|
| `npm run typecheck` | 0 | Pass |
| `npm run lint` | 0 | Pass |
| Focused Jest sleep/readiness (7 suites / 74 tests) | 0 | Pass |
| `npx jest --ci --watchman=false --testPathIgnorePatterns='phase1E2E\|firestore.rules.test'` | 0 | Pass — 810 suites / 4937 tests |
| `npm test -- --ci` (Firestore emulator wrapper) | 0 | Pass — includes `firestore.rules.test.ts`; 771 suites / 4759 tests (API routes run in-band then rest) |
| `git diff --check` | 0 | Pass |
| `npx expo export --platform ios` | 0 | Pass |
| `npm run check:client-trust-boundary` | 0 | Pass |
| `services/api` `npm run build` (dist parity) | 0 | Pass — dist requires `resolveSleepNightWakeDay` |
| `npx expo-doctor` | 1 | **Pre-existing** failures (see below); not introduced by this repair |
| iOS smoke A–G | — | **NOT VERIFIED** — simulator listable; interactive app session not run in agent |
| `npm ci` | — | **NOT RE-RUN** — existing lockfile install already used for all green gates above |

### expo-doctor failures (justified as pre-existing / out of scope)

1. `@types/react-native` installed directly
2. Missing peer `expo-constants` (expo-router)
3. non-CNG app.json vs ios/android folders
4. RN Directory metadata (`react-native-health`, firebase packages)
5. `@react-native-picker/picker` version skew vs Expo SDK

None are caused by sleep/readiness or Command Center WIP diffs.

### Firebase probe

`lib/dev/firebaseProbe.ts` is intentionally disabled (API-boundary staging posture). Connectivity is via Debug → Backend Health / API smoke — **NOT VERIFIED** as interactive debug session.

---

## Commit separation plan

### File ownership

| File | Command Center | Sleep/readiness | Shared | Unrelated |
|------|----------------|-----------------|--------|-----------|
| `app/(app)/(tabs)/dash.tsx` | ✓ | | | |
| `app/(app)/(tabs)/__tests__/dash-*.tsx` + `dash-composition.test.tsx` | ✓ | | | |
| Today* / SemiCircle / DashWeekly / buildTodayProgress* deletions | ✓ | | | |
| `lib/today/todayTargetRoutes.ts` | ✓ | | | |
| `lib/ui/dash/WeeklyFitnessCard.tsx` | ✓ | | | |
| `lib/hooks/useTodayHealthHero.ts` | ✓ | | | |
| `docs/20_architecture/SYSTEM_STATE.md`, `docs/SYSTEM_STATE.md` | ✓ | | | |
| `docs/audits/2026-07-10-oli-command-center-regression-audit.md` | ✓ | | | |
| `lib/data/dash/buildDailyReadinessCardModel.ts` + test | | ✓ | | |
| `lib/data/dash/__tests__/dailySleepCardViewModel.test.ts` | | ✓ | | |
| `services/api/src/lib/oura/buildSleepNightFromOuraDocument.ts` | | ✓ | | |
| `services/api/src/lib/oura/resolveSleepNightWakeDay.ts` | | ✓ | | |
| `services/api/src/lib/sleepNightReadCoerce.ts` | | ✓ | | |
| `services/api/src/lib/__tests__/sleepNight*.ts` + wakeDay + uniqueness | | ✓ | | |
| Delete `lib/integrations/oura/buildSleepNight*.{js,d.ts}` + resolve*.{js,d.ts} | | ✓ | | |
| `docs/audits/2026-07-10-daily-sleep-dashboard-root-cause-audit.md` | | ✓ | | |

**Mixed hunks:** none identified — files partition cleanly.

### Proposed commits (do not auto-commit)

1. `fix(command-center): remove today progress regression and restore dashboard cards`
2. `fix(sleep): restore canonical daily sleep attribution on dashboard`

---

## Clean-baseline decision

**NOT YET APPROVED AS CLEAN BASELINE**

Blockers:

1. Interactive iOS runtime smoke scenarios A–G **NOT VERIFIED**
2. Screenshot-day SleepNight existence chain **NOT VERIFIED** (does not block landing the readiness honesty + latent wake-day fixes, but blocks claiming the screenshot Sleep card was wrong)
3. `expo-doctor` exit 1 (pre-existing; justified above but not green)

Code gates that did pass: typecheck, lint, full emulator `npm test -- --ci`, focused sleep suites, trust boundary, `git diff --check`, `expo export --platform ios`, API dist rebuild with wake-day helper.

---

## Dashboard presentation follow-up (2026-07-10)

Separate UX enhancement (not a root-cause fix for the empty-sleep / fallback-readiness defect):

- Daily Sleep hero is Sleep Score; Duration is the first metric row; LHR/HRV removed from Dash presentation only.
- Oura Readiness adds five exact-day contributor rows (RHR, HRV balance, body temperature, recovery index, sleep balance).
- Exact-day / non-fallback readiness honesty is preserved.
- Proposed independent commit: `feat(dash): elevate sleep score and readiness contributors`
