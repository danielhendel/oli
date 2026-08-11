> **Historical audit artifact (non-authoritative).** Snapshot of merged `main` @ `d43ae878373534dbb4cef84c4958221ace826792` on **2026-08-10**.
> Promoted by branch `chore/consumer-launch-stage1a-truth-freeze` (Stage 1A). Do not treat as current execution truth.
> **Companions:** [repo audit](./2026-08-10-consumer-launch-repo-audit.md) · [capability matrix](./2026-08-10-consumer-launch-capability-matrix.md) · [removal register](./2026-08-10-removal-consolidation-register.md) · [roadmap (audit)](./2026-08-10-consumer-launch-roadmap.md) · [proposed progress map](./2026-08-10-proposed-repo-truth-progress-map.md)
> **Current truth:** [Repo-Truth Progress Map](../00_truth/REPO_TRUTH_PROGRESS_MAP.md) · [ROADMAP_REALITY](../10_product/roadmap/ROADMAP_REALITY.md) · [SYSTEM_STATE](../20_architecture/SYSTEM_STATE.md) · [product decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)

# Removal / Consolidation / Reposition / Refactor / Defer Register

**Audit date:** 2026-08-10
**Merged truth:** `d43ae878` on `origin/main`
**Constraint:** No deletions performed during this audit.

---

## How to use

Each entry includes: recommendation, evidence, replacement, migration impact, data impact, test impact, risk, stage, deprecation need.

---

## REMOVE (product surface or debt)

### R1 — Health record placeholder destinations as launch-facing “capabilities”

| Field | Detail |
|-------|--------|
| Files | `app/(app)/dna/index.tsx`, `medical-history/index.tsx`, `scans/index.tsx`, `medication/index.tsx`, `supplements/index.tsx`; `lib/ui/health/HealthRecordPlaceholderScreen.tsx`; hub wiring in `lib/navigation/healthHubItems.ts` |
| Usage | Health v1 menu entries → “Coming soon” |
| Why REMOVE from launch nav | Pretend health-record completeness; violate “silence is a lie” if users infer capability |
| Replacement | Hide until real; or single “Not available yet” under Settings → Roadmap |
| Migration | Nav config only |
| Data | None |
| Tests | Placeholder tests exist — retarget or keep as non-nav |
| Risk | Low |
| Stage | Stage 1 IA freeze |
| Deprecation | Yes — remove from hub before TestFlight |

### R2 — Program builder placeholders as if programs exist

| Field | Detail |
|-------|--------|
| Files | `app/(app)/program/cardio.tsx`, `nutrition.tsx`, `recovery.tsx`; `ProgramBuilderPlaceholderScreen` |
| Why | “Coming soon” builders adjacent to empty `currentPrograms` confuse My Plan |
| Replacement | Single Program empty state explaining weekly goals until builders ship |
| Risk | Low |
| Stage | Stage 1–2 |
| Deprecation | Soft-hide until P1 |

### R3 — `/dash/daily-recap` Coming soon

| Field | Detail |
|-------|--------|
| File | `app/(app)/dash/daily-recap.tsx` |
| Why | Dead-end from potential timeline links |
| Replacement | Omit links until weekly review exists |
| Stage | Stage 1 |
| Risk | Low |

### R4 — Auth landing to Command Center (behavioral remove)

| Field | Detail |
|-------|--------|
| Files | `app/(auth)/sign-in.tsx`, `sign-up.tsx` intent → `command-center`; overridden by RouteGuard → dash |
| Why | Conflicting home; CC is legacy module grid |
| Replacement | Auth → Daily Monitor/Dash only; CC behind Settings/debug or delete later |
| Stage | Stage 1 |
| Risk | Medium (power users) |
| Deprecation | Keep route temporarily; remove from auth intent immediately |

---

## MERGE / CONSOLIDATE

### M1 — Command Center + Dash/Daily Monitor

| Field | Detail |
|-------|--------|
| Evidence | `app/(app)/command-center/index.tsx` (~1436 LOC); `dash.tsx` + DailyMonitorHost; SYSTEM_STATE historically split |
| Why | Two homes |
| Merge into | Daily Monitor as Today; module grid becomes Manage/Health hub only |
| Impact | Navigation + auth redirects |
| Risk | Medium |
| Stage | Stage 1 |

### M2 — Weekly Fitness Card + Weekly Progress

| Field | Detail |
|-------|--------|
| Evidence | `WeeklyFitnessCardHost`; flags `dashWeeklyProgressRelocation` move title to Program |
| Why | Same component, two product names |
| Merge into | One “Weekly Progress” under My Plan / Program |
| Stage | Stage 2 Plan |

### M3 — Strength `/workouts` and `/workouts/overview`

| Field | Detail |
|-------|--------|
| Evidence | Index re-exports overview |
| Why | Duplicate landings |
| Merge | Keep one canonical landing href in nav config |
| Risk | Low |

### M4 — Timeline vs module calendars vs Library for “what happened”

| Field | Detail |
|-------|--------|
| Evidence | Timeline day; workouts/activity/body calendars; Library categories |
| Why | Competing longitudinal records |
| Merge strategy | Timeline = day truth log; modules = domain deep-dive; Library = provenance/replay power tool |
| Stage | Stage 3–4 IA |
| Risk | Medium |

### M5 — Dual type systems for storage shapes

| Field | Detail |
|-------|--------|
| Evidence | `services/functions/src/types/health.ts` vs `lib/contracts/*.ts` |
| Why | DUPLICATE TRUTH / drift |
| Merge | Contracts as single schema source; Functions import or generate |
| Stage | Architecture Stage 0–2 |
| Risk | High if rushed |
| ADR | Required |

### M6 — Supplements dual routes

| Field | Detail |
|-------|--------|
| Evidence | Health hub `/supplements` placeholder vs `/nutrition/supplements` |
| Merge | One nutrition-owned supplements surface |
| Stage | Stage 1 |

### M7 — Goals systems

| Field | Detail |
|-------|--------|
| Evidence | `weeklyFitnessGoals`, hardcoded `NUTRITION_KCAL_GOAL`, body composition goal, fitness-goals screen, assessment targets |
| Why | Fragmented targets ≠ one plan |
| Merge | Preferences-backed Goals object owned by My Plan |
| Stage | Stage 2 |

---

## REPOSITION

### P1 — Body / Activity / Sleep / Recovery entry under Health v1

| Field | Detail |
|-------|--------|
| Evidence | Health hub items omit Body/Activity/Sleep; legacy Manage had them (`manageHubItems.ts` vs `healthHubItems.ts`) |
| Why | Users cannot find core domains |
| Move | Health menu → include State domains OR State tab |
| Stage | Stage 1 |
| Risk | Medium UX churn |

### P2 — Timeline / Program / Library

| Field | Detail |
|-------|--------|
| Evidence | `href: null` when Health v1 ON; Explore in Settings |
| Why | Phase 1 trust surfaces buried |
| Move | Secondary tab or Profile → Record; do not delete |
| Stage | Stage 1 |

### P3 — Assessment / Baseline / Target

| Field | Detail |
|-------|--------|
| Evidence | Under Profile |
| Why | Correct for ownership of state, but must feed My Plan |
| Move | Keep under Profile/State; surface gaps on Daily Monitor |
| Stage | Stage 2 |

### P4 — Education explainers

| Field | Detail |
|-------|--------|
| Evidence | Many `*-explainer` routes |
| Why | Should appear at decision points |
| Move | Sheet/inline from domain cards; keep deep links |
| Stage | P1 |

---

## REFACTOR BEFORE LAUNCH

### F1 — Client rawEvent analytics hydration

| Field | Detail |
|-------|--------|
| Files | `lib/data/useWeightSeries.ts`, `lib/data/body/useBodyMetricTrends.ts`, `lib/data/workouts/useWorkoutsCalendar.ts`, nutrition overview raw rollups, timeline raw paging |
| Violation | UI analytics from RawEvents vs DailyFacts spine |
| Risk | Divergent numbers; trust failure |
| Fix | API series from facts/summaries; raw only for lineage/debug |
| Priority | P0 architecture |
| Systemic | Yes |

### F2 — Oversized workout UI

| Field | Detail |
|-------|--------|
| Files | `app/(app)/workouts/log.tsx` (~4137), `overview.tsx` (~2320), `exercise-picker.tsx` (~1622) |
| Risk | Unmaintainable; a11y/regression cost |
| Fix | Split container/presenters; extract hooks already partially present |
| Priority | P0–P1 |
| Systemic | Pattern also in command-center, debug |

### F3 — Assessment persistence

| Field | Detail |
|-------|--------|
| File | `lib/data/health-assessment/healthAssessmentStore.ts` |
| Gap | In-memory; baseline/target die on reload |
| Fix | API-backed assessment document (ADR for schema) |
| Priority | P0 |

### F4 — Program persistence

| Field | Detail |
|-------|--------|
| Files | `program.tsx` empty list; `lib/data/program/types.ts` documents NONE persistence |
| Fix | `users/{uid}/programs/{id}` via API — **do not** client-write Firestore |
| Priority | P0 |

### F5 — Nutrition goals hardcoding

| Field | Detail |
|-------|--------|
| File | `lib/data/nutrition/nutritionGoals.ts` `NUTRITION_KCAL_GOAL=2000` |
| Fix | Preferences-backed targets |
| Priority | P0 |

### F6 — Seed foods in production search

| Field | Detail |
|-------|--------|
| Evidence | API nutrition read merges seed catalog |
| Risk | Fake foods appear as real database |
| Fix | Label seeds or gate to empty graph only; prefer real graph |
| Priority | P0 trust |

### F7 — Debug logging in production paths

| Field | Detail |
|-------|--------|
| Files | devices oura logs, sleep debug, workouts calendar logs, energy baseline logs |
| Fix | Gate `__DEV__` / strip; no tokens/PII |
| Priority | P0 privacy |

### F8 — Normalization version stamps unused

| Field | Detail |
|-------|--------|
| Evidence | `normalizationVersions.ts` vs hardcoded `schemaVersion: 1` in mapper |
| Fix | Stamp canonicalVersion/logicVersion for reprocessing |
| Priority | P1 platform |

### F9 — Local contracts build hygiene

| Field | Detail |
|-------|--------|
| Evidence | Stale tsbuildinfo omitted `bodyCompositionGoal.js`; typecheck/tests failed until clean rebuild |
| Fix | CI already builds contracts; document clean build; consider `tsc -b --force` on contracts change |
| Priority | P0 engineering reliability |

### F10 — eslint-disable concentration

| Field | Detail |
|-------|--------|
| Evidence | ~188 eslint-disable hits / 84 files; hotspots workouts calendar/overview |
| Fix | Reduce as files split |
| Priority | P1 Great Code |

---

## DEFER

| ID | Item | Why defer | Revisit when |
|----|------|-----------|--------------|
| D1 | Campus UI / reservations / equipment OS | No consumer loop | After P0 loop + Operations ADR |
| D2 | Professional assignment / messaging | Mock portal only | After consumer plan versions |
| D3 | Garmin / WHOOP | Absent | After AH+Oura reliability |
| D4 | Withings live restore | Explicitly orphaned | Dedicated Phase restore |
| D5 | IAP / subscriptions | No code; not required for beta | Monetization decision |
| D6 | Push notifications | No stack | After daily actions exist |
| D7 | AI chatbot / autonomous clinical advice | Vision non-goal; trust risk | Never as P0 product |
| D8 | Timeline continuous feed | Explicitly not shipping | After day log stable |
| D9 | DNA / scans / meds full PHR | Placeholders | Domain strategy |
| D10 | Advanced Digital Twin simulation | Partial Twin UI only | After plan adaptation |

---

## KEEP (strategic — do not remove)

| Item | Why |
|------|-----|
| RawEvent → canonical → DailyFacts → Insights → IntelligenceContext | Constitutional spine |
| Failures + derived ledger + lineage/replay | Trust / Phase 1 |
| Client → API only (no screen Firestore) | Trust boundary (verified static) |
| Oura + Apple Health integrations | Capture reality |
| Domain modules (workouts, nutrition, activity, body, recovery, labs) | Execution + monitoring verticals |
| Classification framework (7 domains) | Standards language |
| Export/delete backend | Ownership foundation (needs UI) |
| Jest + proof gates + invariants | Quality substrate |

---

## Launch-dangerous placeholders inventory

| Item | Path | Action |
|------|------|--------|
| Hardcoded nutrition kcal/protein | `nutritionGoals.ts` | Replace with prefs |
| Empty currentPrograms | `program.tsx` | Persist or honest empty without “programs” chrome |
| Seed food catalog | API seed catalog | Gate/label |
| Health placeholders in launch nav | healthHubItems | Hide |
| Daniel/path in scripts | admin scripts paths | Dev-only OK; not product |
| Fake readiness | Not found as randomized production scores | Keep vendor-labeled Oura scores |

No durable hardcoded real user UIDs found in production app code (tests use fixtures).
