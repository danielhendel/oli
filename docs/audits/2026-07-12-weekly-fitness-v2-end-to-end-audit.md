# Weekly Fitness v2 — End-to-End Architecture Audit

**Date:** 2026-07-12  
**Branch:** `feat/weekly-fitness-v2`  
**Worktree:** `/Users/danielhendel/oli-weekly-fitness-v2`  
**Decision:** `WEEKLY FITNESS FEATURE BLOCKED — ARCHITECTURE DECISION REQUIRED`

This audit is privacy-safe. It contains no UIDs, emails, tokens, health magnitudes,
exact personal dates, raw provider payloads, or raw runtime logs.

---

## 1. Feature base and repository state

| Field | Value |
|---|---|
| Selected base ref | `origin/fix/pr180-runtime-privacy-bounded-sleep` (PR #182 head) |
| `FEATURE_BASE_SHA` | `59e3b20754f890a2005349d7c72f79a89796e34f` |
| `FEATURE_BASE_TREE` | `fccea64b1ba06afc2454becb2676552be4e46065` |
| Feature branch | `feat/weekly-fitness-v2` |
| Feature worktree | `/Users/danielhendel/oli-weekly-fitness-v2` |
| Feature HEAD at audit | `59e3b20754f890a2005349d7c72f79a89796e34f` |
| Clean status | Clean at base selection; audit doc only thereafter |
| Local safety ref | `refs/safety/weekly-fitness-base-59e3b20` (not pushed) |
| `origin/main` | `e639903be17c99b1d0afd90e28c20e52347ee48e` |
| PR #180 | Draft, open, head `94ba880`, base `main` — **not modified** |
| PR #182 | Draft, open, head `59e3b20`, base PR #180 branch — **not modified** |

### Base selection rationale

1. PR #182 is open and contains the complete current dashboard stack, bounded
   SleepNight range client, and runtime privacy telemetry work.
2. Ancestry verified: contains `e639903` (SleepNight range on main), `94ba880`
   (PR #180), and `59e3b20` (PR #182).
3. Primary worktree was clean before branching.

### Current roadmap / sprint classification

| Item | Repo truth |
|---|---|
| Roadmap phase | Command Center recovery / dashboard stabilization after Today-progress regression repair |
| Sprint / stream | Stabilization of Dash composition + Sleep/Readiness privacy and bounded reads (PR #180 / #182 stack) |
| Command Center state | Six Dash cards after header: Weekly Fitness → Body Composition → Daily Energy → Daily Sleep → Oura Readiness → Daily Nutrition (`docs/20_architecture/SYSTEM_STATE.md`) |
| Weekly Fitness ownership | Dash card via `useWeeklyFitnessCard` + `WeeklyFitnessCard`; four goal-completion domains only |
| Known architecture debt | Nutrition target persistence pending; Program document persistence pending; daily workout schedule pending; Cardio daily target derived from weekly miles / 7; Weight target persistence pending |

---

## 2. Locked final visual contract (product requirement)

Approved design that this task must not reinterpret:

| Element | Required |
|---|---|
| Title | Exactly `Weekly Fitness` |
| Header action | `My goal` → existing `/(app)/fitness-goals` |
| Hero | Two equal circles side by side |
| Left subtitle | Exactly `Weekly Progress` |
| Right subtitle | Exactly `Body Composition Score` |
| Remove | Right-side remaining/goal text block |
| Rows | Full-width metric rows with horizontal progress bars |
| Section heading | `This week’s results` (current code) |
| Metric order | Sleep → Readiness → Activity → Strength → Cardio → Nutrition → Stress |
| Daily Energy | Not a Weekly Fitness row; sibling Dash card retained |

**Implementation status:** Not implemented. Blocked by missing authoritative
Body Composition Score and missing Oura Stress read-model contracts (below).

---

## 3. Original Weekly Fitness behavior (code truth)

### Active inventory

| Layer | Active file / function | Responsibility |
|---|---|---|
| Dash composition | `app/(app)/(tabs)/dash.tsx` → `DashScreen` | Mounts six cards; focus refetch for energy/readiness only |
| Card UI | `lib/ui/dash/WeeklyFitnessCard.tsx` | Title, My goal, one ring, progress-to-goal text, four rows |
| Data hook | `lib/data/dash/useWeeklyFitnessCard.ts` | Goals, week keys, rollups, combined %, progress VM |
| Combined score | `weeklyFitnessDashProgress.ts` → `computeWeeklyFitnessCombinedProgress` | Equal mean of enabled goal progress |
| Progress-to-goal VM | `buildWeeklyFitnessProgressToGoalVm.ts` | Remaining/goal narrative (old right column) |
| Sleep | `useWeeklyFitnessSleepRollupMap` + `computeWeeklyFitnessSleepMetrics` | Bounded sleep-nights range |
| Activity | `useActivityStepsRollupMap` + HK today overlay | Avg steps vs daily goal |
| Strength / Cardio | `useWeeklyFitnessDailyFactsRollup` + `*FromFacts` | Sums from dailyFacts |
| Routes | `weeklyFitnessRoutes.ts` | My goal + four metric routes |
| Body Composition | Sibling card only — **not** Weekly Fitness | Weight + BMI / Body Fat / Lean Mass bars |
| Stress | **None** | — |

### Original visual structure

1. Header: `Weekly Fitness` + `My goal`
2. Hero: **one** `CircularProgressRing` (156px) + right-side remaining/goal text
3. `This week’s results`
4. Rows in order: **Activity → Strength → Cardio → Sleep**

There is **no** product string `Weekly Progress` in the current UI. The ring
accessibility label is `Weekly Fitness score`.

### Dead / unused relative to live card

| Finding | Notes |
|---|---|
| Workout-calendar strength/cardio calculators | Still exported; live path uses `*FromFacts`; tests only |
| `DashRecapCard` | Exists; not mounted on Dash |
| Progress-to-goal `iconKey` | VM fields unused visually (empty icon slot padding) |
| Row `status` / `statusLabel` | Computed; not rendered |
| `cardioSessions` in facts rollup | Extracted; miles path used |
| `bodyCompositionScore` symbol | **Zero matches** repo-wide |

### Original request behavior

On mount / focus (`useWeeklyFitnessCard`):

1. Shared activity steps rollup (shell keys: today, yesterday, elapsed week — not full year for this card alone)
2. HealthKit today steps overlay (iOS)
3. Up to 7 parallel network-fresh `GET /users/me/daily-facts?day=…` for elapsed week
4. Bounded `GET /users/me/sleep-nights` range for elapsed week
5. Preferences (shared provider)

Intentionally **does not** call `useWorkoutsCalendarRange` or year-wide workout hydrate.

---

## 4. Data-lineage matrix

| Domain | Trusted source | Read model | API | Weekly rule (current) | Goal source | Route | Gap |
|---|---|---|---|---|---|---|---|
| Sleep | SleepNight pipeline | SleepNight range cells | `GET /users/me/sleep-nights` | Avg completed attributed nights; missing excluded; future not fetched | `sleepHoursPerNightGoal` | `/(app)/recovery/sleep` | Ready for Weekly Fitness reuse |
| Readiness | Oura daily_readiness | Sibling `useDailyReadinessCard` / readiness view | Existing readiness view APIs | **Not in Weekly Fitness** | N/A | `/(app)/recovery/readiness` | Needs weekly exact-day selector; fallback exclusion rules |
| Activity | `dailyFacts.activity.steps` (+ HK today) | Activity steps rollup | `GET /users/me/daily-facts` | Avg numeric elapsed days / daily goal | `activityStepsPerDayGoal` | `/(app)/activity` | Semantics OK if avg-vs-avg preserved |
| Strength | `dailyFacts.strength.workoutsCount` | Weekly facts cells | daily-facts per day | Sum week; missing → 0 | `strengthWorkoutsPerWeekGoal` | `/(app)/workouts` | Prefer planned Program truth when Program exists (not wired) |
| Cardio | `dailyFacts.cardio.distanceMeters` | Same | Same | Sum meters → miles | `cardioMilesPerWeekGoal` | `/(app)/cardio` | Unit locked to miles preference |
| Nutrition | Sibling daily nutrition card | Daily nutrition models | Nutrition APIs | **Not in Weekly Fitness** | Nutrition goals (separate) | `/(app)/nutrition` | No trusted weekly adherence score for WF |
| Stress | — | — | — | — | — | — | **No ingestion / read model** |
| Body Composition Score | — | Per-metric interpretation only | Body series / overview | n/a | Body settings | Body module routes | **No aggregate score contract** |

### Week / timezone behavior (current)

- Local **Sunday → Saturday** via `getWeekDaysForAnchor`
- Network keys: `networkDayKeysThroughToday` (no future days)
- Sleep uses completed attributed nights only (bounded range path from PR #182)

---

## 5. Weekly Progress contract (current authoritative formula)

There is no symbol named “Weekly Progress.” The current hero is
`computeWeeklyFitnessCombinedProgress`:

```text
activityProgress = clamp(avgSteps / stepGoal, 0, 1)
strengthProgress = clamp(strengthWorkouts / strengthGoal, 0, 1)
cardioProgress   = clamp(cardioMiles / cardioGoal, 0, 1)
sleepProgress    = clamp(avgSleepMinutes / goalMinutes, 0, 1)

combinedProgress = mean of progress values whose goal > 0
combinedPercent  = round(combinedProgress * 100)
```

| Topic | Contract |
|---|---|
| Meaning | Equal-weight **goal completion / adherence** across enabled categories — not a health-state index |
| Eligible metrics (current) | Activity, Strength, Cardio, Sleep when goal > 0 |
| Excluded (current) | Readiness, Nutrition, Stress, Body Composition (not in card) |
| Weights | Equal among enabled; goal 0 excluded |
| Target sources | Prefs via `resolveWeeklyFitnessGoals` or defaults (10k steps / 5 workouts / 10 mi / 8h) |
| Coverage threshold | `enabledCategoryCount > 0` to show ring value; else `—` |
| Future days | Not requested |
| Current / incomplete day | Included in elapsed network keys; sleep incomplete nights excluded from average |
| Missing data | Sleep excluded from avg; activity omits non-numeric from avg denom; strength/cardio missing → 0 |
| Disconnected | No distinct Oura-disconnected state on this card (Sleep may be empty) |
| Valid zero | Strength/cardio zero possible; combined can be 0% when enabled categories exist |
| Body Composition | Must remain **excluded** from any Weekly Progress formula |

### Contribution matrix for locked v2 product rows

| Metric | Displayed (required) | Numeric progress defined today | Included in current hero | Weight | Reason |
|---|---:|---:|---:|---:|---|
| Sleep | yes (row exists, wrong order) | yes | yes | equal | Goal completion |
| Readiness | required; not on card | sibling daily only | no | — | Needs week exact-day contract; exclude fallback |
| Activity | yes | yes | yes | equal | Goal completion |
| Strength | yes | yes (facts count) | yes | equal | Not Program planned sessions |
| Cardio | yes | yes (miles) | yes | equal | Miles goal |
| Nutrition | required; not on card | no WF adherence | no | — | Must not invent adherence |
| Stress | required; not on card | no | no | — | No pipeline; qualitative Oura only |
| Body Composition Score | hero required | **no score** | must exclude | n/a | **Blocker** |

**Product rule for v2:** when new visible metrics lack approved contribution
semantics, display the row but exclude from hero. Do not invent equal weights
for seven rows solely because seven rows are visible.

Any material scoring change must be an explicit product decision and commit.

---

## 6. Body Composition Score — blocker

### Finding

**There is no authoritative Body Composition Score in the repository.**

Repo-wide search for `bodyCompositionScore`, `Body Composition Score`, and
related aggregate score symbols returns **zero** matches.

### What exists instead

| Artifact | Role |
|---|---|
| `lib/body/bodyCompositionInterpretation.ts` | Per-metric `progress01` bars (weight, BMI, body fat, lean, RMR) |
| `lib/classifications/bodyComposition.ts` | Classification levels for BMI / body fat / WHtR — not a 0–100 composite |
| `buildBodyCompositionDashCardModel.ts` | Dash sibling card: weight primary + BMI / Body Fat / Lean Mass rows |
| Body routes | Settings / overview / metric explainers |

### Required hero contract vs truth

| Required | Actual |
|---|---|
| Trusted existing Body Composition Score | **Does not exist** |
| Same score as Body Composition system | System shows weight + interpretation bars, not a score |
| Preserve valid zero; show `—` when unavailable | No score field to surface |
| Exclude from Weekly Progress | N/A until score exists |
| Route to Body Composition analytics | Body module routes exist for metrics, not for a score |

### Forbidden fabrications (per task)

Do not invent a score from BMI alone, weight alone, body fat alone, lean mass
alone, or arbitrary combinations inside the card.

### Architecture decisions required

1. Define whether Body Composition Score is a product construct.
2. Specify formula, range (e.g. 0–100 vs non-percent), versioning, provenance,
   freshness, and authoritative storage/API.
3. Confirm display of `%` or not.
4. Confirm analytics route for the score.
5. Until decided, dual-hero Weekly Fitness v2 **must not ship**.

---

## 7. Oura Stress — blocker

### Official provider resource (verified at audit time)

| Item | Verified |
|---|---|
| Endpoint | `GET /v2/usercollection/daily_stress` |
| Fields | `day`, `stress_high` (seconds), `recovery_high` (seconds), `day_summary` |
| `day_summary` enum | `restored` \| `normal` \| `stressful` (nullable) |
| Numeric 0–100 stress score | **Not** in public daily_stress schema |

### Pipeline stage table

| Stage | Active file / function | Supported | Gap |
|---|---|---:|---|
| Oura fetch | `services/api/src/lib/ouraApi.ts` | No | No `fetchOuraDailyStress`; collections stop at sleep/readiness/activity/workout/session/tag/spo2/heartrate |
| OAuth scope | `OURA_SCOPE = "email personal daily heartrate workout tag session spo2Daily"` | Partial | `daily` may cover daily_stress; not proven in this repo; no stress-specific tests |
| Provider validation | — | No | No runtime schema |
| Provider / raw storage | — | No | No dedicated stress snapshot path |
| Canonical mapping | — | No | — |
| DailyFacts | — | No | No stress fields found for this domain |
| Authenticated read API | — | No | No `/users/me/*` stress range |
| OpenAPI / Gateway | — | No | — |
| Client parser | — | No | — |
| Weekly selector | — | No | — |
| Analytics route | — | No | No Stress analytics screen |

Product plan note: `docs/90_audits/OURA_PRODUCT_ALIGNED_PLAN.md` mentions
sessions as future stress/recovery history — not a DailyFacts stress contract.

### Score / status semantics constraint

Oura public daily stress is **qualitative** (`day_summary`) plus time-in-zone
seconds. Task forbids arbitrary category→percentage mappings in mobile.

Preference order cannot be satisfied today:

1. Existing trusted Oli normalized Stress score — **missing**
2. Direct provider numeric score explicitly defined as a score — **missing**
3. Existing versioned server-side Stress computation — **missing**
4. Qualitative state with `progress01: null` — requires approved storage/read model first

### Architecture decisions required

1. Approve storage / read-model location (prefer extending existing DailyFacts /
   vendor snapshot patterns — do not invent a conflicting Firestore path without review).
2. Approve whether Weekly Fitness Stress shows qualitative status only
   (`progress01: null`) vs a versioned server-normalized score.
3. Approve OAuth/scope verification and historical refresh plan.
4. Approve Stress analytics route under Recovery conventions.
5. Until decided and implemented, do not display fabricated Stress progress.

---

## 8. Metric rows — intended map vs current

| Row | Source today | Display | Progress | Target | Missing | Route |
|---|---|---|---|---|---|---|
| Sleep | SleepNight range | Weekly avg duration | Avg vs nightly goal | Pref hours | `—` / exclude from avg | `/(app)/recovery/sleep` |
| Readiness | Sibling daily only | N/A on WF | N/A | Provider 0–100 | Needs Connect Oura / No data | `/(app)/recovery/readiness` |
| Activity | Steps rollup | Avg steps | Avg / daily goal | Pref steps | Diluted avg if sparse | `/(app)/activity` |
| Strength | dailyFacts count | Workouts sum | Sum / weekly goal | Pref workouts | Missing days as 0 | `/(app)/workouts` |
| Cardio | dailyFacts meters | Miles sum | Miles / weekly goal | Pref miles | Missing days as 0 | `/(app)/cardio` |
| Nutrition | Sibling daily only | N/A on WF | Must not fake adherence | Nutrition goals | Coverage-only if approved | `/(app)/nutrition` |
| Stress | None | N/A | Forbidden without contract | — | Connect Oura / No data | Missing analytics |

Current card order is **Activity → Strength → Cardio → Sleep** (not the locked
seven-row order).

---

## 9. Request budget (current card)

| Scenario | Observed contract |
|---|---|
| Cold mount | Prefs + activity rollup keys + ≤7 daily-facts + 1 sleep-nights range + HK today (iOS) |
| Ordinary rerender | No intentional duplicate fetch (memoized hook outputs) |
| Warm return / focus | Focus effect cache-busts steps + sleep + dailyFacts |
| Pull-to-refresh | Dash-level; Weekly Fitness uses focus/refetch paths of its hooks |
| Background / resume | No WF-specific loop identified; Dash focus may refetch siblings |
| User switch | Auth-scoped hooks; no cross-user cache designed into WF hook |

Confirmations relative to recent debt:

- No year-wide workout hydrate from Weekly Fitness (regression-tested)
- Sleep uses bounded range (PR #182), not one-request-per-day fan-out
- Card does not call sleep-day-refresh / pull-now on render

**v2 risk:** naively adding Readiness + Nutrition + Stress as independent
historical hooks could reintroduce multi-wave fan-out. Any unblocked
implementation must keep a single typed presentation model and bounded
requests.

---

## 10. Route map (current + gaps)

| Surface | Destination | Status |
|---|---|---|
| My goal | `/(app)/fitness-goals` | Exists |
| Weekly Progress circle | None (ring not pressable today) | Needs destination decision |
| Body Composition Score circle | Body analytics | **Blocked** — no score route |
| Sleep | `/(app)/recovery/sleep` | Exists |
| Readiness | `/(app)/recovery/readiness` | Exists (sibling) |
| Activity | `/(app)/activity` | Exists |
| Strength | `/(app)/workouts` | Exists |
| Cardio | `/(app)/cardio` | Exists |
| Nutrition | `/(app)/nutrition` | Exists (sibling) |
| Stress | — | **Missing** |

---

## 11. State matrix (required; not implemented)

| State | Weekly circle | Body circle | Metric rows |
|---|---|---|---|
| Loading | stable placeholder | stable placeholder | stable placeholders |
| Ready | trusted % | trusted score | settled rows |
| Partial | coverage-gated or — | score or — | honest mix |
| Empty | — | — or independent | no fabricated zeros |
| Error | safe — / cache | independent | scoped |
| Oura disconnected | eligible unaffected | unaffected | Readiness + Stress connect states |
| Oura connected / no Stress | unaffected | unaffected | Stress no-data |
| Nutrition unlogged | no false failure | unaffected | coverage/no-data |
| Body stale | weekly unaffected | freshness in a11y | unaffected |

---

## 12. Accessibility / privacy / ownership requirements (unchanged)

These remain binding for any future implementation:

- VoiceOver labels for both circles and seven rows; unavailable = “Not available”
- Min 44pt row targets; Reduce Motion; Dynamic Type; scroll above tab bar
- No Firebase / provider / raw-event access in the card component
- No health magnitudes, exact dates, UIDs, tokens, raw payloads in telemetry
- UID from auth middleware only on backend; no cross-user cache; sign-out clears

---

## 13. Implementation status

| Phase | Status |
|---|---|
| A — Audit and contracts | Complete |
| B — Typed model / selectors / Stress path | **Not started** — blocked |
| C — Dual hero + seven rows UI | **Not started** — blocked |
| D — Tests beyond audit | **Not started** — blocked |
| E — Code Check Gate / physical device | **Not run** for unimplemented feature |

### Local commits

- Audit documentation commit only (this file). No UI/backend feature commits.

### Code Check Gate

Not executed for feature implementation (no feature code). Running the full
gate against unchanged base would not validate Weekly Fitness v2.

### Runtime smoke

```text
PHYSICAL DEVICE NOT VERIFIED
```

No feature UI to smoke. Host checklist retained for post-unblock work.

### Existing PRs

PR #180 and PR #182 were not modified, retargeted, marked ready, merged, or
closed.

### Actions not performed

No push, PR creation, merge, deployment, refresh, pull-now, backfill, Firestore
patch, test-user creation, branch/worktree deletion, or history rewrite.

---

## 14. Deployment and historical-data impact (if Stress later approved)

| Resource | Likely required? |
|---|---|
| Cloud Run (API) | Yes — ingest + bounded read |
| API Gateway / OpenAPI | Yes |
| Firebase Functions | Likely — post-raw / recompute path if following Oura pattern |
| Firestore rules / indexes | Possible if new collections/fields |
| Historical Oura Stress refresh | Yes for backfill after deploy — **do not run in this task** |
| Live action in this task | **None** |

---

## 15. Remaining risks / decisions

1. **Body Composition Score contract missing** — primary visual blocker.
2. **Oura Stress pipeline / storage / score semantics missing** — metric blocker.
3. Weekly Progress expansion for Readiness / Nutrition / Stress contribution
   rules not product-approved.
4. Nutrition adherence vs logging coverage labeling.
5. Strength/Cardio “missing → 0” vs “missing stays missing” may need product
   alignment with v2 honesty rules.
6. Dual-hero navigation destinations for Weekly Progress circle.
7. Request-budget risk if seven domains are wired as independent heavy hooks.
8. Sibling Dash cards (Body, Energy, Sleep, Readiness, Nutrition) overlap
   narrative with a seven-row Weekly Fitness card — product clarity needed.

---

## 16. Final decision

```text
WEEKLY FITNESS FEATURE BLOCKED — ARCHITECTURE DECISION REQUIRED
```

**Primary blockers:**

1. No authoritative Body Composition Score exists to power the right hero circle
   without fabrication.
2. No approved Oura Stress storage/read-model (and no trusted numeric stress
   score) exists for the Stress row without inventing architecture and/or
   forbidden percentage mappings.

After product/architecture approval of those contracts, resume from this base
(`feat/weekly-fitness-v2` @ documented SHA ancestry) and continue Phases B–E.
