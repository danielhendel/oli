# Weekly Fitness v2 — End-to-End Architecture Audit

**Date:** 2026-07-12

**Branch:** `feat/weekly-fitness-v2`

**Worktree:** `/Users/danielhendel/oli-weekly-fitness-v2`

**Status:** Implementation complete locally — awaiting push review

**Decision:** Local implementation complete. Physical device / live Oura Stress remain honestly unverified.

This audit is privacy-safe. It contains no UIDs, emails, tokens, health magnitudes,
exact personal dates, raw provider payloads, or raw runtime logs.

---

## 1. Feature base and repository state

| Field | Value |
|---|---|
| Selected base ref | `origin/fix/pr180-runtime-privacy-bounded-sleep` (PR #182 head) |
| `FEATURE_BASE_SHA` | `59e3b20754f890a2005349d7c72f79a89796e34f` |
| Audit commit | `b604ab1` docs blockers (not amended) |
| Feature branch | `feat/weekly-fitness-v2` |
| Feature worktree | `/Users/danielhendel/oli-weekly-fitness-v2` |
| Local safety ref | `refs/safety/weekly-fitness-base-59e3b20` (not pushed) |
| PR #180 / #182 | Untouched |

### Roadmap / sprint

| Item | Repo truth |
|---|---|
| Roadmap phase | Command Center recovery / dashboard stabilization |
| Sprint / stream | Weekly Fitness v2 on PR #180/#182 stack |
| Command Center | Six Dash cards; Weekly Fitness first |
| Weekly Fitness ownership | `useWeeklyFitnessCard` → `buildWeeklyFitnessCardModel` → `WeeklyFitnessCard` |
| Known debt | Program document persistence pending; Nutrition adherence not in V1; Stress historical refresh deferred to deploy |

---

## 2. Locked final visual contract (implemented)

| Element | Status |
|---|---|
| Title `Weekly Fitness` | Implemented |
| `My goal` → `/(app)/fitness-goals` | Preserved + Body Composition Goal section |
| Two equal hero circles | `WeeklyFitnessHeroCircles` (128px / stroke 8) |
| Left subtitle `Weekly Progress` | Exact |
| Right subtitle `Body Composition Score` | Exact |
| Weekly Progress shows `%` | Yes |
| Body Composition Score no `%` | Yes |
| Old remaining/goal text removed | Yes (progress-to-goal column deleted from card) |
| `This week’s results` | Preserved |
| Rows Sleep→Readiness→Activity→Strength→Cardio→Nutrition→Stress | Exact |
| Daily Energy | Not on Weekly Fitness card |

---

## 3. Body Composition Score V1

| Item | Contract |
|---|---|
| Meaning | Progress toward selected primary body-composition goal |
| Metrics | `weight` \| `bodyFat` \| `leanMass` |
| Range | 0–100 inclusive; display without `%` |
| Formula | `round(clamp((latest-baseline)/(target-baseline),0,1)×100)` |
| Storage | Additive `preferences.bodyCompositionGoal` on `users/{uid}` |
| Units | Canonical kg (mass) / percent (body fat) |
| Baseline | Captured from latest trusted measurement on create; reset on metric/target change with confirmation |
| Freshness | Informational via `latestMeasurementAt` in a11y; no invented stale threshold |
| Unavailable | `—`; route → fitness-goals |
| Available route | Body module / fitness-goals per model |
| Weekly Progress | **Always excluded** |

---

## 4. Weekly Progress V1

| Item | Contract |
|---|---|
| Meaning | Weekly plan-completion progress |
| Contributors | Activity, Strength, Cardio, Sleep only |
| Exclusions | Readiness, Nutrition, Stress, Body Composition Score |
| Weights | Equal (1) among eligible |
| Minimum coverage | **2 of 4** else `—` |
| Missing / disconnected / error / no goal | Excluded |
| Trusted zero | Included as zero |
| Future days | Never reduce score |

---

## 5. Strength / Cardio missing-versus-zero

| Case | Display | Progress | Weekly Progress |
|---|---|---|---|
| Trusted zero | `0 workouts` / `0.0 miles` | 0 | Included when goal |
| Missing | `—` | null | Excluded |
| No goal + trusted | Show value | null | Excluded |
| Partial | Available total; coverage exposed | as computed | Only if trusted |

Missing days are **not** filled with zero.

---

## 6. Nutrition V1

Logging coverage only: `loggedDayCount / elapsedEligibleDayCount`.

Display: `N of M logged`. Accessibility says “logging coverage”.

**Excluded from Weekly Progress.** Missing/error → `—` (not zero).

---

## 7. Readiness V1

Exact current-week Oura readiness scores only (fallback / mismatched days excluded).

Weekly avg 0–100; progress = avg/100.

Bounded API: `GET /users/me/oura-readiness-range`.

States: Connect Oura / No data / Unavailable.

**Excluded from Weekly Progress.**

---

## 8. Oura Daily Stress V1

### Verified official provider

| Item | Verified |
|---|---|
| Endpoint | `GET /v2/usercollection/daily_stress` |
| Pagination | `next_token` |
| Fields | `day`, `day_summary`, `stress_high`, `recovery_high` |
| Enum | `restored` \| `normal` \| `stressful` |
| OAuth | Existing `daily` scope covers Daily Stress — **no reconnect required** for scope |

### Pipeline

```text
Oura daily_stress
→ fetchOuraDailyStress (paginated)
→ ouraVendorStress / post-raw dailyStressDocs
→ GET /users/me/oura-stress (sparse, max 90 days)
→ getOuraStressRange / useOuraStressRange
→ balanced-day weekly coverage
→ Stress row + /(app)/recovery/stress
```

Classification: **Oura compatibility read model** (not canonical DailyFacts; not an invented 0–100 score).

Weekly display: `N of M balanced` where balanced = restored|normal.

**Excluded from Weekly Progress.**

States: Connect Oura / Reconnect Oura (future scope gap path) / No data / Unavailable / partial.

Historical refresh: required after deploy for existing users — **not run in this task**.

---

## 9. Metric truth table

| Row | Source | Display | Progress | Target | Missing | Route | In Weekly Progress |
|---|---|---|---|---|---|---|---|
| Sleep | SleepNight range | duration avg | avg/goal | Pref hours | `—` | `/recovery/sleep` | Yes if eligible |
| Readiness | Oura readiness range | `N avg` | avg/100 | Provider 0–100 | Connect/No data | `/recovery/readiness` | **No** |
| Activity | Steps rollup | avg steps | avg/goal | Pref steps | exclude missing days | `/activity` | Yes if eligible |
| Strength | dailyFacts count | workouts | sum/goal | Pref workouts | `—` | `/workouts` | Yes if trusted+goal |
| Cardio | dailyFacts meters | miles | miles/goal | Pref miles | `—` | `/cardio` | Yes if trusted+goal |
| Nutrition | dailyFacts macros presence | `N of M logged` | coverage | Elapsed days | `—` | `/nutrition` | **No** |
| Stress | oura-stress range | `N of M balanced` | balanced/eligible | Eligible stress days | Connect/No data | `/recovery/stress` | **No** |

---

## 10. Request budget (designed)

Cold mount (authenticated): preferences + activity week keys + ≤7 daily-facts + 1 sleep-nights range + 1 readiness range + 1 stress range + body overview (shared).

No per-day Sleep fan-out; no year workout hydrate; no pull-now / sleep-day-refresh on render.

Rerender: no duplicate intentional fetch. User switch: auth-scoped cache identity.

---

## 11. Route map

| Surface | Destination |
|---|---|
| My goal | `/(app)/fitness-goals` |
| Weekly Progress | fitness-goals (no separate weekly detail) |
| Body Composition Score | Body detail when available; else fitness-goals |
| Sleep / Readiness / Activity / Strength / Cardio / Nutrition | Existing module routes |
| Stress | `/(app)/recovery/stress` |

---

## 12. Local commits (feature)

1. `b604ab1` — docs blockers (base audit)
2. `ec7da41` — feat(body): Body Composition Score v1
3. `540d9ec` — feat(oura): bounded Daily Stress
4. `3836522` — feat(dash): seven-domain model
5. `ee78758` — feat(dash): dual hero circles
6. (this docs finalize commit)

---

## 13. Code Check Gate / runtime

Gate results (feature worktree after `npm ci`):

| Command | Exit |
|---|---|
| npm ci | 0 |
| npm run typecheck | 0 |
| npm run lint | 0 |
| npm run check:client-trust-boundary | 0 |
| npm run check:invariants | 0 |
| npm test -- --ci --watchman=false | 0 (790 suites) |
| git diff --check | 0 |
| npm --prefix services/api run build | 0 |
| npm --prefix services/functions run build | 0 |
| npx expo export --platform ios | 0 |
| npx expo-doctor | 1 (pre-existing; identical 5 findings on PR #182 base) |

Physical device: `PHYSICAL DEVICE NOT VERIFIED`

Live Oura Stress: `LIVE OURA STRESS NOT VERIFIED — BACKEND DEPLOYMENT REQUIRED`

User isolation physical: `USER-ISOLATION PHYSICAL TEST NOT VERIFIED`

---

## 14. Deployment plan (do not execute)

1. Merge/backend deploy Functions post-raw with `dailyStressDocs`
2. Immutable Cloud Run API (oura-stress + readiness-range + prefs body goal)
3. Gateway OpenAPI attach for new routes
4. Bounded Oura Stress historical refresh (approved separately)
5. Mobile release

Resources: Cloud Run, API Gateway, Firebase Functions, mobile update.

Firestore rules/indexes: likely none for preferences field; vendor collection user-scoped.

Reconnect: not required for `daily` scope.

No live action in this task.

---

## 15. Remaining risks

1. Live Stress empty until deploy + bounded refresh.
2. Strength/Cardio depend on dailyFacts field presence for trusted zero.
3. Nutrition coverage uses macro rollup presence (not mealCount) — may under-count edge cases.
4. Weekly Progress circle routes to fitness-goals (no dedicated weekly detail).
5. Physical-device / VoiceOver evidence may be incomplete on this host.
6. `buildWeeklyFitnessProgressToGoalVm` remains in repo unused by the card (cleanup optional).

---

## 16. Actions not performed

No push, PR, merge, deploy, pull-now, backfill, Firestore patch, amend of `b604ab1`, or PR #180/#182 modification.
