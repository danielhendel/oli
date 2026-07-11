# Oli Command Center Regression Audit — Clean Baseline Restoration

**Date:** 2026-07-10
**Branch:** `fix/command-center-clean-baseline`
**Starting commit:** `1ecfa0d97f4a7a6d55f48cb78164e34119f9a5b1` (`Feat/today command center (#177)`)
**Working-tree at start:** clean (no uncommitted user changes)
**Package manager:** npm (`package-lock.json` present)
**Mobile package location:** repository root (Expo app; workspaces: `lib/contracts`, `services/api`, `services/functions`, `apps/professional`)
**Current roadmap sprint (repo truth):** recovery/stabilization gate after `#177` Today Command Center; architecture doc updated from “Today Command Center (Dash)” to “Dash home (Oli Fitness)” in `docs/20_architecture/SYSTEM_STATE.md`. No separate Repo-Truth Progress Map file exists beyond `docs/90_audits/OLI_REPO_AUDIT_CURRENT_TRUTH.md` (stale relative to current Dash cards) and `SYSTEM_STATE.md`.

---

## Baseline

### Initial command results

| Command | Result |
|---------|--------|
| `node --version` | `v20.19.5` |
| `git status` | clean on `main` @ `1ecfa0d` |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm ci` | **Not run** — `node_modules` already present; lockfile-aligned install deferred to avoid unnecessary churn |
| Runtime | Dash rendered Today semi-circle + “Today’s Progress” under `DashScreenHeader` before Weekly Fitness (code evidence in `app/(app)/(tabs)/dash.tsx` pre-repair) |

### Initial runtime symptoms (code-level reproduction)

Active home route: `app/(app)/(tabs)/dash.tsx`.

Pre-repair composition:

1. `DashScreenHeader` (“Oli Fitness”)
2. `TodayHealthHero` (greeting)
3. `TodayCommandSection` → `TodaySemiCircleProgress` + `TodayReadinessSummary` + `TodayProgressCard`
4. `DashWeeklySection` wrapper (“This week” / “separate from today's plan”)
5. Weekly Fitness → Body → Energy → **Readiness before Sleep** → Nutrition

Product requirement: remove Today progress experience; Weekly Fitness first; Sleep before Readiness.

---

## Regression analysis

### Root cause

PR/commit **`1ecfa0d` / `#177` Feat/today command center** introduced the Dash Today Command Center (semi-circle completion %, readiness narrative, “Today’s Progress” card with My Program CTA and metric rows) and demoted Weekly Fitness under a section label. That is the regression relative to the required clean Command Center home.

### Candidate last-known-clean commit

**`00b943d`** (`feat(pro): refine workout studio builder and exercise media pipeline (#176)`) — parent of `#177`.

Parent `dash.tsx` already had Weekly Fitness first among cards (after greeting hero), without Today Command Section / Progress card / Oura Readiness card. Wholesale revert of `#177` was **not** appropriate because `#177` also delivered retained value:

- `DashScreenHeader` (Oli Fitness + manage menu + avatar)
- `DailyReadinessCard` / `useDailyReadinessCard`
- Program category cards, manage menu chrome, date helpers, weekly fitness rollup fixes, etc.

Repair approach: surgically remove Dash-only Today progress UI and exclusive dead code; keep Timeline/Program shared `TodayCommandModel` pipeline; keep readiness card; fix card order.

### Component dependency map (classification)

| Item | Active consumer(s) | Exclusive to removed Dash experience? | Shared? | Action |
|------|---------------------|----------------------------------------|---------|--------|
| `TodayCommandSection` | Dash only | Yes | No | Deleted |
| `TodaySemiCircleProgress` | Command section | Yes | No | Deleted |
| `SemiCircleProgressRing` | Semi-circle only | Yes | No | Deleted |
| `TodayProgressCard` / `Row` | Command section | Yes | No | Deleted |
| `TodayReadinessSummary` | Command section | Yes | No | Deleted |
| `buildTodayProgressCardRows` + a11y helper | Progress card | Yes | No | Deleted |
| `DashWeeklySection` | Dash only | Yes (demotion UI) | No | Deleted |
| `TodayHealthHero` UI | Dash only | Yes (greeting hero) | No | Deleted |
| `TodayTargetProgressList` | none | Dead | No | Deleted |
| `useTodayCommand` / `buildTodayCommandModel` / types / defaults / calorieProgress / normalize readiness / target routes+a11y / `TodayTargetProgressRow` | Timeline plan-vs-actual; Program defaults | No | Yes | **Preserved** |
| `useTodayHealthHero` | Dash energy + sleep | No (data hook) | Yes | **Preserved** (no longer renders hero) |
| `CircularProgressRing` | Weekly Fitness | No | Yes | **Preserved** |
| `DailyReadinessCard` | Dash | No | Retained product | **Preserved** |
| Program tab / `OLI_TAB_ROUTES.program` | Program tab; was also My Program CTA | No | Yes | **Preserved** |

---

## Findings

| Severity | Area | Finding | Evidence | Affected files | Action | Status |
|----------|------|---------|----------|----------------|--------|--------|
| P1 | UX / Dash | Today semi-circle + Progress card regress clean home | `#177`, `TodayCommandSection` | `dash.tsx`, `lib/ui/today/*` | Remove render path + exclusive code | Fixed |
| P2 | UX | Card order had Readiness before Sleep | pre-repair `dash.tsx` | `dash.tsx` | Reorder Sleep → Readiness | Fixed |
| P2 | UX | `DashWeeklySection` orphan heading after Today removal | `DashWeeklySection.tsx` | same | Delete wrapper | Fixed |
| P3 | Docs | SYSTEM_STATE described Today Command Center on Dash | `docs/20_architecture/SYSTEM_STATE.md` | docs | Update to Dash home baseline | Fixed |
| P3 | Maintainability | Greeting VM still built though unused on Dash | `useTodayHealthHero` | hook | Comment update only; keep API for energy/sleep | Accepted |
| P3 | Tooling | `@types/react-native` / missing `expo-constants` peer (pre-existing) | `expo-doctor` | package.json | Document; out of repair scope | Open |
| P2 | Env | Firestore emulator Java bind fails in agent sandbox (`SocketException: Operation not permitted`) | `firestore-debug.log` | test runner | Blocked full `npm test` + rules probe | Open / Not Verified here |
| P2 | Env | iOS Simulator / CoreSimulator unavailable in agent environment | `simctl` errors | runtime smoke | Manual device smoke required | Open / Not Verified here |

---

## Implemented repair

### Removed UI

- Greeting `TodayHealthHero`
- Semi-circle completion %, date line under score, readiness narrative under score
- Entire “Today’s Progress” card (heading, My Program CTA, activity/workout/cardio/calories/protein/sleep/readiness rows)
- `DashWeeklySection` (“This week” demotion copy)

### Deleted exclusive code

See **Files deleted** in completion response. Post-delete search shows no remaining imports of deleted symbols (only intentional `useTodayHealthHero` / greeting builder retention).

### Shared code deliberately preserved

- `lib/today/buildTodayCommandModel.ts` and supporting types/helpers (Timeline)
- `lib/hooks/useTodayCommand.ts` (Timeline)
- `lib/ui/today/TodayTargetProgressRow.tsx` (Timeline)
- `lib/today/defaults.ts` (Program)
- `CircularProgressRing`, readiness/sleep/nutrition/body/weekly hooks and cards
- Program route and tab

### Layout

- Weekly Fitness `marginTop: 12` to match sibling card rhythm after header
- Card order: Weekly → Body → Energy → Sleep → Oura Readiness → Nutrition

### Tests

- Added `dash-composition.test.tsx` (absence + order + uniqueness)
- Updated `dash-accessibility`, `dash-recap`, `dash-provenance` for new composition

### Persistence

- No Zustand/AsyncStorage Today-only keys found exclusive to removed UI; no migration required

---

## Retained-card matrix

| Card | Data source | Loading | Success | Empty | Error | Navigation | Accessibility | Result |
|------|-------------|---------|---------|-------|-------|------------|---------------|--------|
| Weekly Fitness | `useWeeklyFitnessCard` → dailyFacts rollup + prefs | Yes | Yes | Goal-not-set / empty week | Inline error | Metric routes + goals | Labels present | Pass (unit) |
| Body Composition | `useBodyCompositionDashCard` | Yes | Yes | No-data built states | Error prop | Body settings/goals | Card a11y | Pass (unit) |
| Daily Energy | `useTodayHealthHero` → `useDailyFacts`.energy | Yes | Yes | “Not enough data…” | Error prop | Card press patterns | “Daily energy card” | Pass (unit) |
| Daily Sleep | `useTodayHealthHero` → `useDailySleepCard` | Yes | Yes | Missing message | Error | `/(app)/recovery/sleep` | Card a11y | Pass (unit) |
| Oura Readiness | `useDailyReadinessCard` → readiness view + Oura presence | Yes | Yes | Waiting / reconnect CTA | Error | readiness + Oura settings | “Oura Readiness card” | Pass (unit) |
| Daily Nutrition | `useDailyNutritionCard` | Yes | Yes | Empty macros | Error | `/(app)/nutrition` | “Daily nutrition card” | Pass (unit) |

Architecture: screens/hooks use typed API/data layer; dash and dash cards do not import Firebase or scan `rawEvents`.

---

## Verification

| Command | Workspace | Exit code | Result | Notes |
|---------|-----------|-----------|--------|-------|
| `npm run typecheck` | root | 0 | Pass | Before and after repair |
| `npm run lint` | root | 0 | Pass | `--max-warnings=0` |
| `git diff --check` | root | 0 | Pass | |
| `npm run check:client-trust-boundary` | root | 0 | Pass | |
| `npx jest --ci --watchman=false --testPathIgnorePatterns='phase1E2E\|firestore.rules.test'` | root | 0 | Pass | **4903** tests / **808** suites |
| Focused dash composition suite | root | 0 | Pass | composition + accessibility + recap + provenance |
| `npx expo export --platform ios` | root | 0 | Pass | Bundled 2285 modules → `dist/` (gitignored) |
| `npm test` (emulator wrapper) | root | — | **Not Verified** | Java Firestore emulator cannot bind sockets in this agent environment |
| `npm ci` | root | — | **Not Verified / skipped** | Existing `node_modules`; CI uses `npm ci` |
| `npx expo-doctor` | root | 1 | **Partial / Not Verified** | Network DNS failures to Expo APIs in sandbox; also pre-existing peer/`@types/react-native` advisories |
| `npx expo start --clear --dev-client` | root | — | **Not Verified** | Simulator/CoreSimulator unavailable here |
| Firebase UID isolation probe | — | — | **Not Verified** | Emulator bind failure; `scripts/probe-healthz.sh` is healthz-only, not UID Firestore probe |
| Maestro/Detox E2E | — | — | N/A | No Maestro/Detox suite configured in repo |

---

## Manual smoke test

| Step | Result |
|------|--------|
| Cold-launch / auth / scroll / card taps / background / multi-user | **Not Verified** — iOS Simulator services unavailable in agent environment (`CoreSimulatorService` connection invalid) |
| Static composition proof | **Pass** via `dash-composition.test.tsx` and related dash tests |
| iOS JS bundle | **Pass** via `expo export --platform ios` |

---

## Remaining risks

1. Full `npm test` with Firestore emulator not executed in this environment (Java bind blocked).
2. Device/simulator visual smoke (safe-area, tab overlap, VoiceOver, Dynamic Type) not executed here.
3. Cross-user cache/sign-out runtime not re-probed on device.
4. `useTodayHealthHero` still computes unused greeting `vm` (harmless; optional follow-up cleanup).
5. Pre-existing `expo-doctor` peer/`@types/react-native` findings unrelated to this repair.
6. `docs/90_audits/OLI_REPO_AUDIT_CURRENT_TRUTH.md` remains historically stale (Dash-as-menu era); not rewritten (immutable audits folder convention); `SYSTEM_STATE.md` updated instead.

---

## Clean baseline recommendation

- **Diff:** `23 files changed, 38 insertions(+), 1683 deletions(-)` plus new `dash-composition.test.tsx`
- Working tree contains only intended repair + audit doc
- **Suitable as new clean baseline** for Dash composition, pending local confirmation of emulator `npm test` and one simulator smoke pass
- **Proposed commit message:**

```
fix(command-center): remove today progress regression and restore dashboard cards
```
