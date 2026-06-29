# Professional Portal Readiness Audit v1

**Sprint:** Pro Portal Audit Sprint 0  
**Date:** 2026-06-24  
**Status:** Documentation only — no implementation  
**Authority:** Subordinate to `docs/00_truth/CONSTITUTION.md` and `docs/10_product/vision/VISION.md`

---

## Executive Summary

Oli is a **consumer-first Expo mobile app** with a mature **RawEvent → CanonicalEvent → DailyFacts → Insights** backend pipeline, but **no professional portal, role model, client assignment, or consent layer** exists today. The repo is a **partial npm monorepo**: workspaces cover `@oli/contracts`, `services/api`, and `services/functions`, while the mobile app lives at the repo root (`app/`, `components/`, `lib/`).

**Key findings:**

| Area | Readiness | Blocker |
|------|-----------|---------|
| Health Journey UI (Assessment → Baseline → Target State) | **Partial** | Assessment is session-only (no persistence); Baseline/Target State are client-computed |
| Module data (body, workouts, nutrition, sleep, labs, timeline) | **Strong server truth** | All APIs are `/users/me/*` — no cross-user access |
| Pure domain logic (`lib/classifications/`, builders, contracts) | **Highly reusable** | Needs web-safe adapters and auth context injection |
| RN UI (`lib/ui/*`) | **Mobile-only** | Not portable to Next.js without rewrite |
| Auth / permissions | **Not ready** | Binary `admin: true` claim only; no professional role |
| Firestore rules | **Owner-scoped only** | No delegated read paths for professionals |
| Monorepo / web | **Not scaffolded** | No `apps/` or `packages/`; no Next.js |

**Recommended first build:** Pro Sprint 1 — portal shell at `apps/professional` (Next.js/TypeScript), Firebase Auth login, protected layout, placeholder client list/detail. Do **not** wire real client data until Sprint 2 (auth roles + assignment + consent).

**Alignment with Oli architecture:**

```
Assessment → Baseline → Target State → Professional Review → Customized Systems/Products
RawEvent → CanonicalEvent → Facts → Analytics → Insights
```

The consumer app has built the first three stages (Assessment, Baseline, Target State) as **client-side read models**. Professional Review and Customized Systems/Products are **not implemented**. The derived-truth pipeline on the server is production-ready for read-only professional consumption once permission boundaries exist.

---

## 1. Current Architecture Summary

### 1.1 Expo Router Structure

Three-level navigator hierarchy:

```
app/
├── _layout.tsx              # Root Stack (auth guard, providers)
├── index.tsx                # → Redirect to /(app)
├── (auth)/                  # sign-in, sign-up
├── (app)/                   # Main product shell (Stack, ~140 screens)
│   ├── _layout.tsx          # Stack.Screen entries + OliFloatingNavigationHost
│   ├── index.tsx            # → /(app)/(tabs)/dash
│   ├── (tabs)/              # Bottom tabs (4 visible + hidden profile)
│   │   ├── dash.tsx
│   │   ├── timeline/        # Nested Stack
│   │   ├── program.tsx
│   │   ├── library/         # Nested Stack
│   │   └── profile.tsx      # Hidden — opened via Manage menu
│   ├── body/, workouts/, cardio/, nutrition/, recovery/, labs/
│   ├── profile/             # health-assessment, health-baseline, target-state
│   ├── settings/, program/, activity/, energy/, dna/, command-center/
│   └── event/[id].tsx
└── debug/                   # __DEV__ only
```

**Key layout files:**

| File | Role |
|------|------|
| `app/_layout.tsx` | Providers (Auth, Theme, ActivityRollup, Preferences, UserProfile); `RouteGuard` |
| `app/(app)/_layout.tsx` | Main Stack; ~100+ `Stack.Screen` entries; floating nav overlay |
| `app/(app)/(tabs)/_layout.tsx` | 4 tabs: Dash, Timeline, Program, Library |
| `app/(app)/(tabs)/timeline/_layout.tsx` | Timeline nested stack |
| `app/(app)/(tabs)/library/_layout.tsx` | Library nested stack |

**Route count:** ~171 route source files under `app/` (excluding `__tests__/`).

### 1.2 Bottom Tabs

Configured in `app/(app)/(tabs)/_layout.tsx`:

| Tab | Route | Icon | Notes |
|-----|-------|------|-------|
| Dash | `dash.tsx` | home | `initialRouteName="dash"` |
| Timeline | `timeline/` | time | Nested stack |
| Program | `program.tsx` | rocket | |
| Library | `library/` | book | Nested stack |

**Profile is NOT a bottom tab.** Reached via Manage FAB menu (`components/navigation/manageHubItems.ts` → `href: "/(app)/(tabs)/profile"`).

**Navigation chrome files:**

- `components/navigation/FloatingNavigationChrome.tsx`
- `components/navigation/OliBottomNav.tsx`
- `components/navigation/ManageFab.tsx` / `ManageMenu.tsx`
- `components/navigation/manageHubItems.ts`
- `components/navigation/OliFloatingNavigationHost.tsx`
- `components/navigation/stackFloatingNavVisibility.ts`

Stack floating nav allowlist (health module landing pages): `/body`, `/activity`, `/workouts`, `/cardio`, `/nutrition`, `/recovery`, `/labs`, `/dna`.

### 1.3 Shared Screen / Header / Navigation Patterns

| Pattern | Where | Components |
|---------|-------|------------|
| Tab root screens | Dash, Timeline, Program, Library | `TabRootScreenHeader`, `ScreenContainer`, `useFloatingTabBarScrollPadding` |
| Stack module hubs | body, workouts, nutrition, etc. | `ModuleScreenShell`, `workoutsStackNavigationOptions(role)` |
| Profile / health flows | health-assessment, health-baseline, target-state | Thin route files → screen components; `useLayoutEffect` + `HeaderBackButton` |
| Digital Twin detail | profile/system, profile/metric | Inline `<Stack.Screen options={...} />` |

**Header component inventory:**

- `lib/ui/TabRootScreenHeader.tsx`
- `lib/ui/ModuleScreenShell.tsx`
- `lib/ui/ScreenStates.tsx`
- `lib/ui/headers/workoutsStackHeader.ts`
- `lib/ui/HeaderBackButton.tsx`, `HeaderControls.tsx`, `HeaderIconButton.tsx`
- `lib/ui/health-assessment/HealthAssessmentProgressHeader.tsx`

### 1.4 Profile / Health & Fitness Data Routes

**Profile hub (Manage menu):**

| Route file | URL | Screen |
|------------|-----|--------|
| `app/(app)/(tabs)/profile.tsx` | `/(app)/(tabs)/profile` | `ProfileMainScreen` (Digital Twin home) |
| `app/(app)/profile/health-assessment.tsx` | `/profile/health-assessment` | `HealthAssessmentScreen` |
| `app/(app)/profile/health-baseline.tsx` | `/profile/health-baseline` | `HealthBaselineScreen` |
| `app/(app)/profile/target-state.tsx` | `/profile/target-state` | `TargetStateScreen` |
| `app/(app)/profile/edit/[field].tsx` | `/profile/edit/:field` | Field editors |
| `app/(app)/profile/system/[systemId].tsx` | `/profile/system/:systemId` | `DigitalTwinSystemScreen` |
| `app/(app)/profile/metric/[metricId].tsx` | `/profile/metric/:metricId` | `DigitalTwinMetricScreen` |

**Health module destinations** (from `components/navigation/manageHubItems.ts`):

| Module | Landing route |
|--------|---------------|
| Body Composition | `app/(app)/body/index.tsx` |
| Activity | `app/(app)/activity/index.tsx` |
| Strength | `app/(app)/workouts/index.tsx` |
| Cardio | `app/(app)/cardio/index.tsx` |
| Nutrition | `app/(app)/nutrition/index.tsx` |
| Sleep | `app/(app)/recovery/sleep.tsx` |
| Recovery | `app/(app)/recovery/index.tsx` |
| Labs | `app/(app)/labs/index.tsx` |
| DNA | `app/(app)/dna/index.tsx` |

### 1.5 Data Pipeline (Server Truth)

```
RawEvent (users/{uid}/rawEvents)
  → Normalization (services/functions/src/normalization/)
  → CanonicalEvent (users/{uid}/events)
  → Recompute pipeline (services/functions/src/pipeline/recomputeForDay.ts)
  → DailyFacts, Insights, IntelligenceContext, HealthScores, HealthSignals
  → Derived ledger snapshots (users/{uid}/derivedLedger/{day}/snapshots/*)
```

**Contracts:** `lib/contracts/` (`@oli/contracts` workspace package)

**Client consumption:** `lib/api/usersMe.ts` → `lib/data/use*` hooks → `lib/data/*/build*` view models → `lib/ui/*` screens

---

## 2. Module-by-Module Audit

### Summary Table

| Module | Routes | Data hooks | Builders | UI | API | Firestore | Persistence | Mobile-only? | Portal reuse | Gaps/blockers |
|--------|--------|------------|----------|-----|-----|-----------|-------------|--------------|--------------|---------------|
| **Profile / Health Data** | ✅ 13 routes | ✅ | ✅ | ✅ RN | `/profile/main`, `/preferences` | `users/{uid}/profile/main`, root `.preferences` | Server | Partial | Reusable with API wrapper | Digital Twin composes many endpoints; RN UI |
| **Health Assessment** | ✅ 1 route | ✅ | ✅ | ✅ RN | ❌ None | ❌ None | **Session in-memory only** | Yes | **Not ready** | No persistence — lost on restart |
| **Health Baseline** | ✅ 1 route | ✅ | ✅ | ✅ RN | Indirect (composed hooks) | Reads upstream collections | **Client-computed, not persisted** | Partial | Reusable with API wrapper | Depends on Assessment session state |
| **Target State** | ✅ 1 route | ✅ | ✅ | ✅ RN | ❌ None | ❌ None | **Client-computed, not persisted** | Partial | Reusable with API wrapper | Depends on Baseline + Assessment |
| **Evidence-Based Classifications** | ⚠️ Explainer routes only | ❌ | ✅ `lib/classifications/` | Partial | ❌ | ❌ | Code thresholds | No | **Ready to reuse** | No dedicated module screen |
| **Body Composition** | ✅ 10 routes | ✅ 12 hooks | ✅ | ✅ 35+ RN files | `/users/me/raw-events`, `/ingest` | `rawEvents`, `events`, `dailyFacts` | Server pipeline | Partial | Reusable with API wrapper | Apple Health sync mobile-only |
| **Workouts / Strength** | ✅ 28 routes | ✅ | ✅ 127 files | ✅ 88 RN files | `/users/me/events`, workout summaries | `rawEvents`, `events`, `workoutDaySummaries`, `workoutMonthSummaries` | Server + AsyncStorage journal | Partial | Reusable with API wrapper | Session logger, HealthKit mobile-only |
| **Cardio** | ✅ 13 routes | ✅ (shared w/ workouts) | ✅ | ✅ | Same as workouts | Same | Server | Partial | Reusable with API wrapper | Shares workout ingest stack |
| **Nutrition** | ✅ 22 routes | ✅ 16 hooks | ✅ | ✅ 37 RN files | `/users/me/nutrition/*`, `/ingest` | `rawEvents`, `dailyFacts`, `meals`, `pantry`, `nutritionMeta` | Server + AsyncStorage outbox | Partial | Reusable with API wrapper | Barcode scan, outbox sync mobile-only |
| **Sleep / Recovery** | ✅ 10 routes | ✅ 11 hooks | ✅ | ✅ | `/users/me/sleep-night`, Oura | `sleepNights`, `ouraVendorSleep`, `dailyFacts` | Server (Oura + Apple Health) | Partial | Reusable with API wrapper | Oura OAuth mobile-only; `sleepNights` API-only (rules deny client) |
| **Labs** | ✅ 10 routes | ✅ 7 hooks | ✅ | ✅ 8 RN files | `/users/me/labs/*` | `labUploads`, `labResults` | Server (v2 upload + legacy v0) | Partial | Reusable with API wrapper | PDF upload via `expo-document-picker` |
| **Timeline** | ✅ 4 routes | ✅ 2 hooks | ✅ | ✅ 5 RN files | `GET /users/me/timeline` | Aggregates events, dailyFacts, insights | Read-model (no own collection) | Partial | Reusable with API wrapper | Session cache only |
| **Daily Facts** | ❌ No dedicated screen | ✅ | ✅ | Embedded in cards | `GET /users/me/daily-facts` | `users/{uid}/dailyFacts/{day}` | **Server-computed only** | No | **Ready to reuse** | Central truth layer — no UI module |
| **Health Score / Insights** | ⚠️ Embedded (Dash, Profile, Command Center) | ✅ 5 hooks | ✅ | Partial | `/users/me/health-score`, `/insights`, etc. | `healthScores`, `healthSignals`, `insights`, `intelligenceContext` | **Server-computed only** | Partial | Reusable with API wrapper | No dedicated route |

---

### 2.1 Profile / Health & Fitness Data

**Route files:**
- `app/(app)/(tabs)/profile.tsx`
- `app/(app)/profile/edit/[field].tsx`, `metric/[metricId].tsx`, `system/[systemId].tsx`
- `app/(app)/settings/index.tsx`, `account.tsx`, `privacy.tsx`, `units.tsx`, `devices.tsx`, `devices/[deviceId].tsx`
- `app/(app)/settings/data-sources/index.tsx`, `source/[sourceId].tsx`, `metric/[metricId].tsx`
- `app/(app)/fitness-goals.tsx`, `oura-connected.tsx`

**Data hooks:** `lib/data/profile/useUserProfileMain.tsx`, `lib/features/profile/useProfileHealthSummary.ts`, `lib/features/profile/digitalTwin/useDigitalTwinHome.ts`, `lib/preferences/PreferencesProvider.tsx`

**Builders:** `lib/data/profile/profileTabViewModel.ts`, `lib/features/profile/digitalTwin/buildDigitalTwinHomeVm.ts`, `buildDigitalTwinOverviewVm.ts`, `buildDigitalTwinSystemVm.ts`, `buildDigitalTwinCompletenessVm.ts`

**UI:** `lib/ui/profile/ProfileMainScreen.tsx`, `ProfileHealthDataSection.tsx`, `lib/ui/profile/digitalTwin/*`

**API:** `lib/api/profileMain.ts` (`GET/PUT /profile/main`), `lib/api/preferences.ts`, `lib/api/usersMe.ts` (health score, signals, insights, daily facts, labs for Digital Twin)

**Firestore:** `users/{uid}/profile/main`, `users/{uid}` (`.preferences`), `users/{uid}/integrations/oura`, `users/{uid}/healthScores/{day}`, `healthSignals/{day}`, `insights/{insightId}`, `intelligenceContext/{day}`, `dailyFacts/{day}`, `labResults/{id}`

**Portal reuse:** **Reusable with API wrapper** — contracts and VM builders are platform-agnostic; UI is RN-only.

**Gaps:** No `clientId` param on any endpoint. Digital Twin requires 6+ parallel API calls.

---

### 2.2 Health Assessment

**Route:** `app/(app)/profile/health-assessment.tsx` → `lib/ui/health-assessment/HealthAssessmentScreen.tsx`

**Data:** `lib/data/health-assessment/useHealthAssessmentFlow.ts`, `healthAssessmentStore.ts` (`useHealthAssessmentState`, `useCurrentStateProfile`)

**Builders:** `lib/data/health-assessment/buildCurrentStateProfile.ts`, `categories.ts`, `questionRegistry.ts`, `types.ts`

**API / Firestore:** **None.** Store comment in `healthAssessmentStore.ts`: *"no Firebase/API writes in Sprint A"*

**Persistence:** In-memory only — **lost on app restart**

**Portal reuse:** **Not ready** — must persist `CurrentStateProfile` server-side before professionals can review it.

**Gaps:** Critical blocker for professional portal v1 Health Journey view.

---

### 2.3 Health Baseline

**Route:** `app/(app)/profile/health-baseline.tsx` → `lib/ui/health-baseline/HealthBaselineScreen.tsx`

**Data:** `lib/data/health-baseline/useHealthBaseline.ts` — composes 10+ existing hooks (body, strength, nutrition, sleep, labs, activity, assessment)

**Builders:** `lib/data/health-baseline/buildHealthBaseline.ts`, `buildHealthBaselineSummary.ts`, `scoring.ts`, `healthBaselineInput.ts`

**API:** Indirect — pulls from all module hooks above

**Persistence:** **Client-computed, not persisted**

**Portal reuse:** **Reusable with API wrapper** — pure builders are platform-agnostic; server could expose pre-computed baseline or portal recomputes from client data APIs.

**Gaps:** Depends on in-memory Assessment state. Recomputation on web requires all upstream data APIs with `clientId` support.

---

### 2.4 Target State

**Route:** `app/(app)/profile/target-state.tsx` → `lib/ui/target-state/TargetStateScreen.tsx`

**Data:** `lib/data/target-state/useTargetState.ts`

**Builders:** `lib/data/target-state/buildTargetStateRoadmap.ts`, `buildTargetStateSummary.ts`, `classifyBaseline.ts`, `deriveMilestonesForMetric.ts`, `deriveNextLevel.ts`, `deriveTargetPriority.ts`

**API / Firestore:** None directly — depends on Health Baseline + Assessment + profile sex

**Persistence:** **Client-computed, not persisted**

**Portal reuse:** **Reusable with API wrapper** — pure builders portable.

**Gaps:** Same as Baseline — depends on unpersisted Assessment.

---

### 2.5 Evidence-Based Classifications

**Status:** Cross-cutting framework — no dedicated module route.

**Closest UI:** `app/(app)/body/body-metric-ranges-explainer.tsx`, `workouts/strength-range-explainer.tsx`, `cardio/cardio-range-explainer.tsx`, `activity/activity-range-explainer.tsx`

**Core library:** `lib/classifications/registry.ts`, `classifyMetric.ts`, `classifyDomains.ts`, `bodyComposition.ts`, `activity.ts`, `strength.ts`, `cardio.ts`, `recovery.ts`, `nutrition.ts`, `labs.ts`, `types.ts`

**Authority doc:** `docs/authoritative/Oli Evidence-Based Classification Framework v1.md`

**Portal reuse:** **Ready to reuse** — platform-agnostic pure functions.

---

### 2.6 Body Composition

**Routes:** `app/(app)/body/index.tsx` + 9 sub-routes (overview, weight, dexa, calendar, day, list, metric, settings, explainer)

**Hooks:** `lib/data/body/useBodyCompositionData.ts`, `useBodyOverviewData.ts`, `useBodyMetricTrends.ts`, `useAppleHealthBodySync.ts`, etc.

**Builders:** `lib/data/body/bodyTodayCardModel.ts`, `weightBaselineCardModel.ts`, `bodySnapshot.ts`, `lib/body/bodyCompositionInterpretation.ts`

**API:** `lib/api/usersMe.ts` — `getRawEvents`, `getDailyFacts`, `logWeight`; `services/api/src/routes/events.ts`

**Firestore:** `users/{uid}/rawEvents`, `events`, `dailyFacts`, `rawEventIngestSuppressions`

**Portal reuse:** **Reusable with API wrapper** — summary cards can be rebuilt from dailyFacts + rawEvents APIs.

**Gaps:** Apple Health sync is mobile-only. Weight logging is write — portal v1 is read-only.

---

### 2.7 Workouts / Strength

**Routes:** 28 files under `app/(app)/workouts/` + `app/(app)/training/strength/log.tsx` + 18 program builder routes

**Hooks:** `lib/data/workouts/useWorkoutsCalendar.ts`, `lib/hooks/useStrengthBaseline.ts`, `useStrengthAnalyticsDetailScreenData.ts`, etc.

**Builders:** 127 files under `lib/data/workouts/` including `strengthBaselineCardModel.ts`, `strengthTodayCardModel.ts`, `workoutsCalendarModel.ts`, `parseWorkoutFromRawEvent.ts`

**API:** `/users/me/events`, `/raw-events`, `/workout-day-summaries`, `/workout-month-summaries`, rebuild POSTs; `/exercise-definitions`

**Firestore:** `rawEvents`, `events`, `workoutDaySummaries`, `workoutMonthSummaries`, `exerciseDefinitions`, `dailyFacts`

**Portal reuse:** **Reusable with API wrapper** — calendar models and summary cards are pure; session logger is mobile-only.

---

### 2.8 Cardio

**Routes:** 13 files under `app/(app)/cardio/`

**Hooks/builders:** Shared with workouts domain — `lib/data/workouts/cardioBaselineCardModel.ts`, `cardioTodayCardModel.ts`, `cardioYearlyCardModel.ts`, `lib/classifications/cardio.ts`

**API/Firestore:** Same workout ingest stack; filtered by `lib/data/workouts/workoutDomain.ts`

**Portal reuse:** **Reusable with API wrapper**

---

### 2.9 Nutrition

**Routes:** 22 files under `app/(app)/nutrition/`

**Hooks:** 16 files under `lib/hooks/useNutrition*.ts`, `lib/data/nutrition/useNutritionDailyFactsRollup.ts`

**Builders:** `lib/data/nutrition/nutritionTodayCardModel.ts`, `nutritionBaselineModel.ts`, `nutritionFactsAggregate.ts`

**API:** `/users/me/nutrition-meta`, `/nutrition/pantry`, `/nutrition/meals`, `/nutrition/food-search`, `/ingest`

**Firestore:** `rawEvents`, `dailyFacts`, `meals`, `pantry`, `nutritionMeta/state`

**Portal reuse:** **Reusable with API wrapper** — macro summaries from dailyFacts; barcode scan mobile-only.

---

### 2.10 Sleep / Recovery

**Routes:** 10 files under `app/(app)/recovery/`

**Hooks:** `lib/hooks/useSleepNight.ts`, `lib/data/sleep/useSleepNightRollupMap.ts`, `useSleepOverviewScreenData.ts`

**Builders:** `lib/data/sleep/buildSleepTodayVm.ts`, `buildSleepBaselineVm.ts`, `buildWeeklySleepVm.ts`

**API:** `/users/me/sleep-night`, `/oura-sleep-view`, `/oura-readiness-view`, Oura integration routes

**Firestore:** `sleepNights/{anchorDay}` (**API-only — Firestore rules deny client read**), `ouraVendorSleep`, `rawEvents`, `dailyFacts`

**Portal reuse:** **Reusable with API wrapper** — must use API routes, not direct Firestore.

**Gaps:** Oura OAuth is mobile-only consumer flow.

---

### 2.11 Labs

**Routes:** 10 files under `app/(app)/labs/`

**Hooks:** `lib/data/labs/useLabsSummary.ts`, `useLabUploads.ts`, `useLabMetricDetail.ts`

**Builders:** `lib/labs/labMetricCatalog.ts`, `lib/classifications/labs.ts`

**API:** `lib/api/labs.ts` — `/users/me/labs/summary`, uploads CRUD, metric detail; legacy `/users/me/labResults`

**Firestore:** `labUploads/{uploadId}`, `labResults/{id}` (no Firestore rules — API/Admin SDK only)

**Portal reuse:** **Reusable with API wrapper**

**Gaps:** PDF upload via `expo-document-picker` — read-only portal won't need upload in v1.

---

### 2.12 Timeline

**Routes:** `app/(app)/(tabs)/timeline/index.tsx`, `[day].tsx`, `app/(app)/event/[id].tsx`

**Hooks:** `lib/data/useTimeline.ts`, `lib/features/timeline/useTimelineDay.ts`

**Builders:** `lib/features/timeline/buildTimelineDayVm.ts`, `resolveTimelineItemHref.ts`

**API:** `GET /users/me/timeline?start=&end=` (`services/api/src/routes/usersMe.ts`)

**Firestore:** Aggregates `events`, `rawEvents`, `dailyFacts`, `insights`, `intelligenceContext`, `derivedLedger` per day

**Portal reuse:** **Reusable with API wrapper** — timeline API is already a read-model aggregation endpoint.

---

### 2.13 Daily Facts

**Status:** No dedicated consumer screen — central derived-truth layer consumed everywhere.

**Hooks:** `lib/data/useDailyFacts.ts`, `dailyFactsSessionCache.ts`

**Contract:** `lib/contracts/dailyFacts.ts`

**Server compute:** `services/functions/src/dailyFacts/aggregateDailyFacts.ts`, `services/functions/src/pipeline/recomputeForDay.ts`

**API:** `GET /users/me/daily-facts?day=`

**Firestore:** `users/{uid}/dailyFacts/{yyyy-MM-dd}`, `derivedLedger/{day}/snapshots/dailyFacts`

**Portal reuse:** **Ready to reuse** — contract + API are platform-agnostic.

---

### 2.14 Health Score / Insights

**Status:** Embedded — no dedicated route. Surfaces in Profile Digital Twin, Dash hero, Command Center, Library replay.

**Hooks:** `lib/data/useHealthScore.ts`, `useHealthSignals.ts`, `useInsights.ts`, `useIntelligenceContext.ts`, `lib/hooks/useTodayHealthHero.ts`

**Server compute:** `services/functions/src/healthScore/computeHealthScoreV1.ts`, `healthSignals/computeHealthSignalsV1.ts`, `insights/rules.ts`

**API:** `/users/me/health-score`, `/health-signals`, `/insights`, `/intelligence-context`, `/derived-ledger/snapshot`

**Firestore:** `healthScores/{day}`, `healthSignals/{day}`, `insights/{insightId}`, `intelligenceContext/{day}`, `derivedLedger/{day}/snapshots/*`

**Portal reuse:** **Reusable with API wrapper**

---

## 3. Backend / API Readiness

### 3.1 API Route Inventory

Mount point: `services/api/src/index.ts`. Auth: Firebase ID token → `req.uid` via `services/api/src/middleware/auth.ts`.

| Route file | Mount | Scope | Key endpoints |
|------------|-------|-------|---------------|
| `routes/profileMain.ts` | `/profile` | User | `GET/PUT /profile/main` |
| `routes/preferences.ts` | `/preferences` | User | `GET/PUT /preferences` |
| `routes/events.ts` | `/ingest` | User | `POST /ingest`, `DELETE /ingest/:rawEventId` |
| `routes/uploads.ts` | `/uploads` | User | `POST /uploads` |
| `routes/usersMe.ts` | `/users/me` | User | Large read surface (see below) |
| `routes/labsMe.ts` | `/users/me/labs` | User | Labs v2 |
| `routes/nutritionUserMeta.ts` | `/users/me` | User | Nutrition meta |
| `routes/nutritionPantry.ts` | `/users/me` | User | Pantry CRUD |
| `routes/nutritionMeals.ts` | `/users/me` | User | Meals CRUD |
| `routes/nutritionStores.ts` | `/users/me` | User | Stores catalog |
| `routes/exerciseDefinitions.ts` | `/exercise-definitions` | User | Exercise defs |
| `routes/integrations.ts` | `/integrations` | User | Oura connect/revoke |
| `routes/account.ts` | `/` | User | Export, delete |
| `routes/ouraPull.ts` | `/integrations/oura/pull` | **Cross-user (invoker-only)** | Batch pull all connected users |

### 3.2 `/users/me` Read Surface (Professional-Relevant)

| Endpoint | Firestore paths read | Professional need |
|----------|---------------------|-------------------|
| `GET /users/me/daily-facts?day=` | `dailyFacts/{day}` | Module summaries |
| `GET /users/me/events` | `events` | Workouts, nutrition events |
| `GET /users/me/raw-events` | `rawEvents` | Provenance |
| `GET /users/me/timeline?start=&end=` | Multiple collections | Timeline highlights |
| `GET /users/me/health-score?day=` | `healthScores/{day}` | Overview |
| `GET /users/me/health-signals?day=` | `healthSignals/{day}` | Attention signals |
| `GET /users/me/insights?day=` | `insights` | Insights |
| `GET /users/me/intelligence-context?day=` | `intelligenceContext/{day}` | Context |
| `GET /users/me/sleep-night` | `sleepNights` | Sleep summary |
| `GET /users/me/labs/summary` | `labUploads`, `labResults` | Labs |
| `GET /users/me/workout-day-summaries` | `workoutDaySummaries` | Strength/cardio |
| `GET /profile/main` | `profile/main` | Current State Profile inputs |

### 3.3 Backend/API Readiness Table

| Capability | Exists? | User-scoped only? | Needs `clientId`? | Unsafe for pro access today? |
|------------|---------|-------------------|-------------------|------------------------------|
| Profile read | ✅ | ✅ `/users/me` or `/profile/main` | ✅ Yes | ⚠️ No consent check |
| Daily facts read | ✅ | ✅ | ✅ Yes | ⚠️ No consent check |
| Events / timeline | ✅ | ✅ | ✅ Yes | ⚠️ No consent check |
| Labs read | ✅ | ✅ | ✅ Yes | ⚠️ No consent check; PHI sensitivity |
| Workout summaries | ✅ | ✅ | ✅ Yes | ⚠️ No consent check |
| Sleep night read | ✅ | ✅ (API-only) | ✅ Yes | ⚠️ No consent check |
| Health score / insights | ✅ | ✅ | ✅ Yes | ⚠️ No consent check |
| Assessment persist | ❌ | — | — | N/A |
| Baseline persist | ❌ | — | — | N/A |
| Target state persist | ❌ | — | — | N/A |
| Professional client list | ❌ | — | — | N/A |
| Consent verification | ❌ | — | — | N/A |
| Cross-user read (delegated) | ❌ | — | — | **All `/users/me` only** |
| Admin recompute (any userId) | ✅ | ❌ Cross-user | N/A | ✅ Gated by `admin: true` claim only |
| Oura batch pull (all users) | ✅ | ❌ Cross-user | N/A | ✅ Invoker IAM only |

### 3.4 Cloud Functions

Entry: `services/functions/src/index.ts`

| Function | Type | Cross-user? |
|----------|------|-------------|
| `onAuthCreate` | Auth trigger | Seeds `users/{uid}/profile/general` |
| `onRawEventCreated` | Firestore trigger | User-scoped |
| `onCanonicalEventCreated` | Firestore trigger | User-scoped |
| `onDailyFactsRecomputeScheduled` | Scheduled | All users (batch) |
| `onInsightsRecomputeScheduled` | Scheduled | All users (batch) |
| `recomputeDailyFactsAdminHttp` | Admin HTTP | **Yes** — `{ userId, date }` body |
| `recomputeInsightsAdminHttp` | Admin HTTP | **Yes** |
| `recomputeDailyIntelligenceContextAdminHttp` | Admin HTTP | **Yes** |
| `onAccountDeleteRequested` | Pub/Sub | User-scoped delete |

### 3.5 Firestore Rules Summary

File: `services/functions/firestore.rules`

- **Default deny** on `{document=**}`
- **Owner-scoped read** for: `users/{userId}`, `rawEvents`, `events`, `dailyFacts`, `insights`, `intelligenceContext`, `healthScores`, `healthSignals`, `failures`, `exerciseDefinitions`, `profile/{docId}`, `nutritionMeta`, `pantry`, `meals`, `sources`
- **Explicit deny:** `sleepNights` (API/Admin SDK only)
- **Not in rules (default deny for clients):** `labUploads`, `labResults`, `workoutDaySummaries`, `workoutMonthSummaries`, `derivedLedger`, `integrations`, `ouraVendorSleep`
- **No professional/delegated read paths**

### 3.6 APIs Needing `clientId` / Cross-User Support

Every `/users/me/*` endpoint needs a professional variant, e.g.:

```
GET /professionals/me/clients                    # list assigned clients
GET /professionals/me/clients/:clientId/profile  # with consent + scope check
GET /professionals/me/clients/:clientId/daily-facts?day=
GET /professionals/me/clients/:clientId/timeline?start=&end=
GET /professionals/me/clients/:clientId/labs/summary
GET /professionals/me/clients/:clientId/health-score?day=
GET /professionals/me/clients/:clientId/assessment  # NEW — once persisted
GET /professionals/me/clients/:clientId/baseline    # NEW — server-computed or derived
```

**Unsafe today (must NOT expose without permission layer):**
- All existing `/users/me/*` routes — professional could impersonate by swapping tokens (no cross-user path exists, but no guard prevents future mistakes)
- Admin recompute endpoints — arbitrary `userId` with only `admin: true` claim
- Direct Firestore client reads — owner-scoped only (good), but professional portal should never use client Firestore SDK for client data

### 3.7 New Permission Layer Needed

1. **Professional role** — Firebase custom claim or Firestore `professionals/{uid}` doc
2. **Client assignment** — `professionalClientAssignments/{assignmentId}`
3. **Consent + access scopes** — `userProfessionalConsents/{consentId}` with revocable scopes
4. **API middleware** — verify professional role + assignment + consent scope before any cross-user read
5. **Audit log** — append-only log of professional access events (not present today)

---

## 4. Auth and Permissions Audit

### 4.1 Current State

| Capability | Present? | Evidence |
|------------|----------|----------|
| User role (consumer) | ✅ Implicit | Firebase Auth uid; all `/users/me/*` |
| Professional role | ❌ | No matches in codebase |
| Admin role | ✅ Partial | `admin: true` custom claim — Functions admin HTTP only (`services/functions/src/http/adminAuth.ts`, `scripts/setAdminClaim.ts`) |
| Client assignment | ❌ | No data model |
| Professional-client relationship | ❌ | No data model |
| Data sharing consent | ❌ | No data model |
| Revocable permissions | ❌ | No data model |
| Audit logs | ❌ | No access audit trail |
| RBAC in user API | ❌ | `authMiddleware` checks token only — no claims |

**Firebase Auth usage:**
- Client: `lib/auth/AuthProvider.tsx`, `lib/auth/getIdToken.ts`
- API: `services/api/src/middleware/auth.ts` — `verifyIdToken` → `req.uid`
- Gateway: `infra/gateway/openapi.yaml` — Firebase JWT validation

### 4.2 Proposed Minimal v1 Model (Document Only — Do Not Implement)

```
users/{uid}
  - role: "consumer" (default)
  - displayName, email (from Auth)

professionals/{professionalUid}
  - verified: boolean
  - displayName, credentials (optional v1)
  - createdAt

professionalClientAssignments/{assignmentId}
  - professionalUid
  - clientUid
  - status: "pending" | "active" | "revoked"
  - assignedAt
  - assignedBy: "client" | "professional" | "admin"

userProfessionalConsents/{consentId}
  - clientUid
  - professionalUid
  - assignmentId (FK)
  - scopes: string[]  // see accessScopes below
  - grantedAt
  - revokedAt: timestamp | null
  - expiresAt: timestamp | null (optional v1)

professionalAccessAudit/{auditId}  // append-only
  - professionalUid
  - clientUid
  - action: "read" | "list"
  - resource: string  // e.g. "labs.summary"
  - timestamp
  - ipHash (optional)
```

**accessScopes (v1):**

| Scope | Grants read access to |
|-------|----------------------|
| `profile` | `/profile/main`, preferences |
| `assessment` | Current State Profile (once persisted) |
| `baseline` | Health Baseline summary |
| `targetState` | Target State roadmap |
| `bodyComposition` | Body metrics, dailyFacts body block |
| `workouts` | Workout summaries, events |
| `cardio` | Cardio summaries |
| `nutrition` | Nutrition dailyFacts, meals (read) |
| `sleep` | Sleep nights, recovery |
| `labs` | Lab uploads, results |
| `timeline` | Timeline aggregation |
| `fullHealthProfile` | All scopes above |

**Consent flow (v1):**
1. Professional creates assignment (or client initiates invite)
2. Client grants consent with selected scopes in mobile app
3. Professional portal reads only consented scopes
4. Client can revoke at any time → immediate API denial

---

## 5. Monorepo / Web App Readiness

### 5.1 Current Package Structure

**Root `package.json` workspaces:**
```json
["lib/contracts", "services/api", "services/functions"]
```

| Surface | Location | Notes |
|---------|----------|-------|
| Mobile app (Expo Router) | `app/`, `components/`, `lib/` (except contracts) | Root-level — not in workspace |
| Shared contracts | `lib/contracts/` → `@oli/contracts` | Built to `dist/` |
| API | `services/api/` | Express → Cloud Run |
| Functions | `services/functions/` | Firebase Functions v2 |
| Native shells | `ios/`, `android/` | |
| **`apps/`** | **Does not exist** | |
| **`packages/`** | **Does not exist** | |
| **Next.js** | **Not installed** | |

**TypeScript:** Root solution in `tsconfig.json` with project references to `lib/tsconfig.build.json`, `app/tsconfig.json`, `services/functions/tsconfig.json`, `services/api/tsconfig.json`.

**Path aliases (`tsconfig.base.json`):**
- `@oli/contracts` → `lib/contracts/`
- `@/lib/*` → `lib/*`
- `@/*` → repo root

**Metro/Expo:** `metro.config.js`, `app.json`, `eas.json`, `babel.config.js` at root. `"web": "expo start --web"` exists but app is native-first (HealthKit, camera, etc.).

### 5.2 Shared Lib Coupling Issues

1. **Functions/API import `lib/ui/calendar`** — UI date utils bundled into backend (`DayKey`, `dateUtils`). Must extract to domain package before monorepo split.
2. **CanonicalEvent full schema** in `services/functions/src/types/health.ts` — not in `@oli/contracts`.
3. **esbuild bundling** in functions assumes repo-root `lib/` paths.
4. **`lib/ui/*`** is React Native — not reusable on web.

### 5.3 Can Next.js Be Added Under `apps/professional`?

**Yes, but greenfield.** Requirements:

1. Add `apps/professional` to npm workspaces
2. New `tsconfig` with paths to `@oli/contracts` and (later) extracted domain packages
3. Firebase Auth web SDK for login
4. API client pointing to same Cloud Run gateway with professional token
5. Do **not** import `lib/ui/*` — build web UI from scratch using headless view models

**Do not use Expo web** for professional portal — native integrations and RN component library make it unsuitable.

### 5.4 Recommended Structure

**Short-term (Pro Sprints 1–2):**

```
oli/                          # unchanged mobile root
apps/
  professional/               # NEW — Next.js 14+ App Router
    package.json
    tsconfig.json
    app/                      # Next.js routes
    lib/                      # portal-only API client, auth
services/                     # unchanged
lib/
  contracts/                  # unchanged workspace
```

Add `"apps/professional"` to root workspaces. Mobile stays at root to avoid disruptive move.

**Long-term monorepo:**

```
apps/
  mobile/                     # move app/, components/, ios/, android/, metro, expo config
  professional/               # Next.js
  api/                        # optional rename from services/api
  functions/                  # optional rename from services/functions
packages/
  contracts/                  # lib/contracts
  domain/                     # pure builders, classifications, format, date utils
  client-api/                 # lib/api + auth (shared fetch layer)
  pipeline-types/             # CanonicalEvent full types
  ui-native/                  # lib/ui (RN)
  ui-web/                     # professional portal components
```

**What NOT to move yet:**
- Mobile app shell (`app/`, `components/`, `ios/`, `android/`) — high disruption, no immediate portal benefit
- `lib/ui/*` — RN-only; portal builds its own UI
- `lib/integrations/appleHealth/` — mobile-only, stays with mobile app
- Functions pipeline internals — stable, works via API

**Move first (when portal needs shared logic):**
- `lib/classifications/` → `packages/domain`
- Pure `lib/data/*/build*` and `*Model.ts` files → `packages/domain`
- `lib/contracts/` → `packages/contracts` (already isolated)
- `lib/ui/calendar/dateUtils.ts` → `packages/domain` (unblocks backend decoupling)

---

## 6. Professional Portal Product Audit — MVP v1

### 6.1 Minimum v1 Use Case

```
Professional logs in
  → sees assigned clients (name, last activity, consent status)
  → opens one client
  → reviews read-only Health Journey evidence
```

### 6.2 Client Review Screen Sections

| Section | Consumer source | Data dependency | v1 readiness |
|---------|----------------|-----------------|--------------|
| **Current State Profile** | `lib/data/health-assessment/buildCurrentStateProfile.ts` | Assessment answers | ❌ Not persisted — must add in Sprint 2/3 |
| **Health Baseline** | `lib/data/health-baseline/buildHealthBaselineSummary.ts` | Composed module data | ⚠️ Recomputable if APIs support clientId |
| **Classification Levels** | `lib/classifications/classifyDomains.ts` | Baseline + classifications | ✅ Pure functions ready |
| **Target State Roadmap** | `lib/data/target-state/buildTargetStateSummary.ts` | Baseline + assessment | ⚠️ Depends on assessment persist |
| **Missing Data** | `lib/features/profile/digitalTwin/buildDigitalTwinCompletenessVm.ts` | Profile + module presence | ⚠️ Partial — Digital Twin logic reusable |
| **Body Composition summary** | `lib/data/body/bodyTodayCardModel.ts`, dailyFacts | `/daily-facts`, `/raw-events` | ✅ API exists |
| **Workouts / Strength summary** | `lib/data/workouts/strengthBaselineCardModel.ts` | `/workout-day-summaries` | ✅ API exists |
| **Cardio summary** | `lib/data/workouts/cardioBaselineCardModel.ts` | Same | ✅ API exists |
| **Nutrition summary** | `lib/data/nutrition/nutritionBaselineModel.ts` | `/daily-facts` | ✅ API exists |
| **Sleep / Recovery summary** | `lib/data/sleep/buildSleepBaselineVm.ts` | `/sleep-night`, `/daily-facts` | ✅ API exists |
| **Labs summary** | `lib/data/labs/useLabsSummary.ts` | `/labs/summary` | ✅ API exists |
| **Timeline highlights** | `lib/features/timeline/buildTimelineDayVm.ts` | `/timeline` | ✅ API exists |

### 6.3 Explicitly Out of Scope for v1

- Messaging
- Professional notes (Sprint 5)
- Product sales / marketplace
- Plan builder
- Billing
- Automated recommendations
- Write access to client data

### 6.4 v1 Portal Pages

| Page | Purpose |
|------|---------|
| `/login` | Firebase Auth (email/password or Google) |
| `/clients` | Assigned client list with consent badges |
| `/clients/[clientId]` | Health Journey review (sections above) |
| `/clients/[clientId]/timeline` | Optional drill-down |
| `/clients/[clientId]/labs` | Optional drill-down (scope-gated) |
| `/unauthorized` | Wrong role / no assignment |
| `/settings` | Professional profile (minimal) |

---

## 7. Reuse Strategy

### 7.1 Classification by Module

| Module | Classification | Notes |
|--------|---------------|-------|
| Evidence-Based Classifications | **Ready to reuse** | `lib/classifications/*` — import directly in portal |
| Daily Facts contract + API | **Ready to reuse** | `@oli/contracts/dailyFacts`, existing API shape |
| Health Score / Insights compute | **Ready to reuse** | Server-side; portal reads via API |
| Profile contracts + VM builders | **Reusable with API wrapper** | Need `clientId` API + web hooks |
| Health Baseline builders | **Reusable with API wrapper** | Pure functions; recompute on portal or server |
| Target State builders | **Reusable with API wrapper** | Pure functions |
| Timeline VM builders | **Reusable with API wrapper** | `buildTimelineDayVm.ts` portable |
| Body / Workouts / Cardio / Nutrition / Sleep models | **Reusable with API wrapper** | Card models are pure TS |
| Labs contracts + catalog | **Reusable with API wrapper** | `lib/contracts/labsModule.ts`, `lib/labs/labMetricCatalog.ts` |
| Health Assessment | **Not ready** | No persistence |
| Profile / module RN UI | **Mobile-only** | `lib/ui/*` — rewrite for web |
| Apple Health / Oura integrations | **Mobile-only** | `lib/integrations/*` |
| Nutrition outbox / barcode scan | **Mobile-only** | Native APIs |
| Workout session logger | **Mobile-only** | `lib/workouts/journal/` |
| Digital Twin RN screens | **Needs web-safe adapter** | Logic reusable; UI rewrite |
| Auth provider | **Needs web-safe adapter** | `lib/auth/AuthProvider.tsx` is RN; use Firebase web SDK |

### 7.2 Reusable Code Inventory (Headless)

**Import directly in `apps/professional` (with tsconfig paths):**

```
lib/contracts/                          # @oli/contracts workspace
lib/classifications/                    # All classification logic
lib/data/health-baseline/build*.ts      # Pure builders
lib/data/health-baseline/scoring.ts
lib/data/target-state/build*.ts         # Pure builders
lib/data/target-state/classifyBaseline.ts
lib/data/health-assessment/buildCurrentStateProfile.ts  # Once inputs available
lib/data/body/bodyTodayCardModel.ts
lib/data/body/weightBaselineCardModel.ts
lib/data/workouts/strengthBaselineCardModel.ts
lib/data/workouts/cardioBaselineCardModel.ts
lib/data/nutrition/nutritionBaselineModel.ts
lib/data/sleep/buildSleepBaselineVm.ts
lib/features/timeline/buildTimelineDayVm.ts
lib/features/profile/digitalTwin/buildDigitalTwinCompletenessVm.ts
lib/labs/labMetricCatalog.ts
lib/format/healthScore.ts
lib/format/baselines.ts
```

**Do NOT import in portal:**

```
lib/ui/*                                # React Native
lib/integrations/appleHealth/*          # Native
lib/integrations/oura/* (mobile OAuth)  # Use API reads instead
components/*                            # React Native
app/*                                   # Expo Router
```

---

## 8. Risk Register

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R-01 | **No consent layer** — professional could access client PHI without authorization | **Critical** | Implement consent + scope checks before any cross-user API (Sprint 2) |
| R-02 | **Assessment not persisted** — Health Journey incomplete for professionals | **High** | Persist assessment server-side before Sprint 3 |
| R-03 | **HIPAA / medical claims** — classifications framed as coaching context, not diagnosis | **High** | Portal must display disclaimers; reference `docs/authoritative/Oli Evidence-Based Classification Framework v1.md` language |
| R-04 | **Apple / consumer app boundary** — App Store health data rules vs professional B2B | **Medium** | Professional portal is separate web app; consumer app remains self-directed PHR |
| R-05 | **Firestore rule gaps** — `labUploads`, `workoutDaySummaries`, etc. untested in rules tests | **Medium** | Portal uses API only (Admin SDK); never expose direct Firestore to professional client |
| R-06 | **Professional over-access** — admin recompute accepts arbitrary `userId` | **Medium** | Separate professional role from admin; audit logs |
| R-07 | **Duplicate source of truth** — Baseline computed client-side vs server dailyFacts | **Medium** | Portal should prefer server-computed dailyFacts/healthScores; document Baseline as derived view |
| R-08 | **Data freshness** — client-computed Baseline may differ from server state | **Medium** | Show `computedAt` timestamp; prefer server snapshots where available |
| R-09 | **Labs PHI sensitivity** — lab results are clinical data | **High** | Scope-gate `labs` separately; audit all lab reads |
| R-10 | **No audit trail** — cannot prove who accessed what | **High** | Append-only `professionalAccessAudit` from Sprint 2 |
| R-11 | **Token impersonation** — professional uses own token for `/users/me` | **Low** (today) | `/users/me` is self-only today; ensure new routes never alias uid from token to clientId without checks |
| R-12 | **Legal disclaimer** — portal shows health classifications that could be construed as medical advice | **Medium** | Required footer: informational only; consult qualified clinicians |
| R-13 | **Account deletion cascade** — newer collections may not be in delete list | **Medium** | Verify `onAccountDeleteRequested` covers all client data before professional access goes live |
| R-14 | **Dual profile docs** — `profile/general` (auth trigger) vs `profile/main` (API) | **Low** | Portal reads `profile/main` only |

---

## 9. Phased Implementation Roadmap

### Pro Sprint 1: Portal Shell
- Create `apps/professional/` — Next.js 14+ App Router, TypeScript
- Add to npm workspaces; tsconfig paths to `@oli/contracts`
- Firebase Auth web SDK — login page
- Protected layout (middleware checks auth)
- Placeholder `/clients` list (mock data)
- Placeholder `/clients/[clientId]` detail page
- **No real client data yet**
- **No backend changes**

### Pro Sprint 2: Auth Roles + Assignment Model
- Firestore collections: `professionals/`, `professionalClientAssignments/`, `userProfessionalConsents/`
- Firebase custom claim or Firestore role lookup for `professional`
- Consumer mobile UI: grant/revoke consent (minimal)
- API middleware: verify professional + assignment + scope
- New routes: `GET /professionals/me/clients`, consent management
- Audit log writes on every cross-user read
- Firestore rules: deny all client-side cross-user reads (API only)

### Pro Sprint 3: Read-only Client Health Journey
- Persist Health Assessment (`users/{uid}/assessment/current` or similar — design in sprint)
- API: `GET /professionals/me/clients/:clientId/assessment`
- Portal: Current State Profile section
- Portal: Health Baseline section (server-computed or portal-side from APIs)
- Portal: Classification Levels (import `lib/classifications/`)
- Portal: Target State Roadmap
- Portal: Missing Data panel
- Scope checks: `assessment`, `baseline`, `targetState`

### Pro Sprint 4: Module Summary Views
- Cross-user API wrappers for existing `/users/me/*` endpoints
- Portal sections: Body, Workouts, Cardio, Nutrition, Sleep, Labs, Timeline highlights
- Reuse headless card models from `lib/data/*/`
- Scope-gate each module independently
- Read-only — no write endpoints

### Pro Sprint 5: Professional Review Notes
- `professionals/{uid}/clients/{clientId}/notes/{noteId}` collection
- Portal UI: findings, priorities, missing data callouts
- Professional interpretation (free text, not automated recommendations)
- Notes visible only to professional (not client in v1)

### Pro Sprint 6: Products / Services Selection
- Attach systems/products/services to client review
- Reference Oli product catalog (TBD)
- No automated plan generation
- Manual selection only

---

## 10. Open Questions

| # | Question | Impact | Recommendation |
|---|----------|--------|----------------|
| Q-1 | Should Health Assessment persist as Firestore doc or API-only blob? | Sprint 3 | Firestore doc under `users/{uid}/assessment/` — aligns with profile pattern |
| Q-2 | Should Health Baseline be server-computed and cached, or client-recomputed in portal? | Sprint 3 | Server-computed snapshot preferred for consistency; fallback to portal recompute |
| Q-3 | Professional auth: separate Firebase project or same project with custom claims? | Sprint 2 | Same project + `professional: true` claim — simpler v1 |
| Q-4 | How does client grant consent — mobile app flow or email invite link? | Sprint 2 | Mobile app flow first (consumer app already exists) |
| Q-5 | Is `apps/professional` at repo root or nested monorepo restructure first? | Sprint 1 | Add at root workspaces — no mobile move yet |
| Q-6 | Portal hosting — Vercel, Firebase Hosting, or Cloud Run? | Sprint 1 | **Uncertain** — Cloud Run aligns with existing infra; Vercel simpler for Next.js |
| Q-7 | Should professionals see raw events or only derived truth? | Sprint 4 | Derived truth default; raw events opt-in scope for v2 |
| Q-8 | Labs PDF access for professionals — metadata only or PDF download? | Sprint 4 | Metadata + parsed results only in v1; PDF download requires separate consent |
| Q-9 | HIPAA BAA required before launch? | Legal | **Uncertain** — legal review needed before production professional access |
| Q-10 | Extract `packages/domain` before or after Sprint 4? | Monorepo | After Sprint 3 — use tsconfig paths until duplication pain is felt |

---

## 11. Recommended Next Cursor Prompt

After this audit, use the following prompt to begin Pro Sprint 1:

```
Pro Sprint 1: Professional Portal Shell

Context: Read docs/professional-platform/Professional Portal Readiness Audit v1.md

Goal: Scaffold apps/professional as a Next.js 14+ App Router TypeScript app within the existing npm workspaces. No backend changes. No real client data.

Tasks:
1. Add apps/professional to root package.json workspaces
2. Initialize Next.js with TypeScript, ESLint, App Router
3. Configure tsconfig paths to @oli/contracts
4. Firebase Auth web SDK — email/password login page at /login
5. Auth middleware protecting /clients routes
6. Protected layout with minimal nav (logo, logout)
7. Placeholder /clients page — mock client list (2–3 hardcoded entries)
8. Placeholder /clients/[clientId] page — "Health Journey review coming soon" with section stubs matching audit MVP
9. /unauthorized page for wrong role
10. Root README in apps/professional explaining local dev

Do NOT:
- Add Firestore collections or API routes
- Import lib/ui/* (React Native)
- Move mobile app files
- Wire real client data

Run: npm run typecheck, npm run lint, npm run test -- --ci --runInBand
Report: files created, how to run locally, any workspace config changes
```

---

## Appendix A: Check Results (Sprint 0)

| Check | Result |
|-------|--------|
| `git status` | Clean working tree on `main`, up to date with `origin/main` |
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm run test -- --ci --runInBand` | ✅ Pass — 690 suites, 4129 tests (requires Firestore emulator; failed in sandbox, passed with full permissions) |

---

## Appendix B: Skipped / Uncertain Areas

| Area | Reason |
|------|--------|
| HIPAA BAA requirements | Legal review not in repo scope |
| Portal hosting target | No infra decision documented |
| Product catalog for Sprint 6 | Not implemented in consumer app |
| DNA module professional relevance | Placeholder route only (`app/(app)/dna/index.tsx`) — scope unclear |
| Activity module | Related to fitness data but not in MVP section list — include in Sprint 4 if time |
| Program builder | Local store only (`workoutProgramDesignStore.ts`) — out of v1 scope |
| Command Center | Debug/replay tool — not for professional portal |
| Withings integration | Phase 3A docs exist — integration status not fully audited |
| Account deletion completeness for newer collections | Flagged in backend audit — needs verification sprint |

---

**Document path:** `docs/professional-platform/Professional Portal Readiness Audit v1.md`  
**Version:** v1  
**Next sprint:** Pro Sprint 1 — Portal Shell
