> **Historical audit artifact (non-authoritative).** Snapshot of merged `main` @ `d43ae878373534dbb4cef84c4958221ace826792` on **2026-08-10**.
> Promoted by branch `chore/consumer-launch-stage1a-truth-freeze` (Stage 1A). Do not treat as current execution truth.
> **Companions:** [repo audit](./2026-08-10-consumer-launch-repo-audit.md) · [capability matrix](./2026-08-10-consumer-launch-capability-matrix.md) · [removal register](./2026-08-10-removal-consolidation-register.md) · [roadmap (audit)](./2026-08-10-consumer-launch-roadmap.md) · [proposed progress map](./2026-08-10-proposed-repo-truth-progress-map.md)
> **Current truth:** [Repo-Truth Progress Map](../00_truth/REPO_TRUTH_PROGRESS_MAP.md) · [ROADMAP_REALITY](../10_product/roadmap/ROADMAP_REALITY.md) · [SYSTEM_STATE](../20_architecture/SYSTEM_STATE.md) · [product decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)

# Oli Consumer Product Launch — Repo-Truth Audit

**Audit date:** 2026-08-10 (America/New_York, EDT)
**Auditor role:** Combined principal product / Expo / Firebase / data / security / QA / Apple / UX / program lead
**Scope:** Read-only repository audit. No production writes, migrations, deploys, or product code changes.
**Merged truth:** `origin/main` @ `d43ae878373534dbb4cef84c4958221ace826792`
**Checked-out branch:** `main` (identical to `origin/main`, 0 ahead / 0 behind)

---

## 1. Executive Verdict

| Question | Verdict |
|----------|---------|
| Is the merged product launch-ready? | **NO** |
| Is there a complete consumer closed loop? | **PARTIAL** |
| Strongest working product capability | Authenticated personal health memory + domain capture/visualization (Apple Health workouts/steps/body, Oura sleep/readiness, nutrition logging, labs document import) on the RawEvent → derived-truth spine |
| Largest product gap | No durable one coordinated **My Plan** with assessment persistence, daily plan actions, review, and adaptation |
| Largest architectural risk | Client hydration of **rawEvents** for analytics/trends (body, workouts, nutrition) alongside DailyFacts — duplicate truth pressure |
| Largest UX risk | Health v1 nav hides Body/Activity/Sleep/Recovery from primary Health menu while Daily Monitor / Program / Timeline / Command Center compete as “home” |
| Largest privacy/security risk | Account **export/delete APIs exist without in-app CTAs**; no privacy policy / terms URLs; staging-only env; App Store account-deletion guideline unmet in UI |
| Largest release risk | No crash reporting product; no production Firebase project configured (`.firebaserc` prod = placeholder); runtime device/simulator smoke **UNVERIFIED** this audit |
| First recommended implementation stage | **Stage 1 — Repo & launch-truth freeze**: authoritative docs refresh + nav/home decision + close ownership UI + restore CI-local build hygiene |
| What must not be built yet | Campus operations, marketplace, coach marketplace, equipment reservations, ambient capture, kitchen ops, Garmin/WHOOP breadth, AI chatbot product |

---

## 2. What Is Verified Working

Evidence confidence noted. “Verified” here means **repository + automated check evidence**, not device runtime (device smoke was not executed).

| Capability | Status | Confidence | Evidence |
|------------|--------|------------|----------|
| Firebase email/password auth + RN persistence + RouteGuard | IMPLEMENTED BUT RUNTIME UNVERIFIED | HIGH | `lib/firebaseConfig.ts`, `lib/auth/*`, `app/_layout.tsx`, `app/(auth)/sign-in.tsx`, `sign-up.tsx` |
| Client trust boundary (no Firestore in screens) | VERIFIED WORKING (static) | HIGH | `npm run check:client-trust-boundary` exit 0; no `getFirestore`/`getDoc` in `app/`/`components/` |
| Constitutional invariant CI checks | VERIFIED WORKING (static) | HIGH | `npm run check:invariants` exit 0 (CHECKs 1–22) |
| Lint gate | VERIFIED WORKING | HIGH | `npm run lint` exit 0 (`--max-warnings=0`) |
| Typecheck (after clean project rebuild) | VERIFIED WORKING | HIGH | `rm -rf node_modules/.cache/tsbuildinfo` then `npm run typecheck` exit 0 |
| Unit/integration suite (majority) | PARTIAL (suite incomplete due to env) | HIGH | `npm test`: **979** suites passed, **6142** tests passed; **2** suites failed until contracts dist rebuild (missing `bodyCompositionGoal` emit) |
| Ingest → normalize → DailyFacts/Insights/IntelligenceContext pipeline | IMPLEMENTED BUT RUNTIME UNVERIFIED | HIGH | `services/api/src/routes/events.ts`, Functions `onRawEventCreated`, `recomputeForDay.ts`, Phase 1 proof gate in CI |
| Account export/delete **backend** | IMPLEMENTED BUT RUNTIME UNVERIFIED | HIGH | `services/api/src/routes/account.ts`; Functions `onAccountExportRequested` / `onAccountDeleteRequested` |
| Apple Health workouts / steps / body sync paths | IMPLEMENTED BUT RUNTIME UNVERIFIED | MEDIUM | `lib/integrations/appleHealth/*`, extensive `__tests__` |
| Oura OAuth + pull/scheduled sync + sleep views | IMPLEMENTED BUT RUNTIME UNVERIFIED | MEDIUM | `services/api` Oura routes; `onOuraPullScheduled` exported; device screens under settings |
| Strength/cardio/nutrition/activity/body/sleep module UIs reading API | IMPLEMENTED BUT RUNTIME UNVERIFIED | MEDIUM | Routes under `app/(app)/{workouts,cardio,nutrition,activity,body,recovery}` + `lib/data/*` |
| Labs historical PDF import / review OS (Phase 3D-B merged) | IMPLEMENTED BUT RUNTIME UNVERIFIED | MEDIUM | Merge PR #207 on `main`; labs routes + docs under `docs/00_truth/phase3/` |
| Firestore rules deny client writes to derived truth | VERIFIED WORKING (static) | HIGH | `services/functions/firestore.rules`; invariant CHECK 2 |
| Storage client deny-all | VERIFIED WORKING (static) | HIGH | `storage.rules` |

---

## 3. What Exists but Is Not Complete

### Runtime unverified
- All mobile golden paths (boot, auth, sync, logging) — no simulator/device session this audit.
- Deployed Cloud Run / Functions staging behavior — not probed.
- EAS production channel / TestFlight — not exercised.

### Partial
- **Assessment / Baseline / Target State:** real UI + classifiers; assessment store is **in-memory only** (`lib/data/health-assessment/healthAssessmentStore.ts`).
- **Program / My Plan:** weekly fitness goals persist; `currentPrograms = []` hardcoded (`app/(app)/(tabs)/program.tsx`); workout builder draft in-memory; cardio/nutrition/recovery builders are placeholders.
- **Daily Monitor vs Current State:** Daily Monitor foundation flags default ON; seven-domain Current State lives mainly under Profile Digital Twin / baseline — not a unified OS home.
- **Timeline / Library / Program:** Phase 1 routes required by CI; **hidden from primary dock** when Health v1 nav is ON (`EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1` default).
- **Withings:** historical honesty layer (`WITHINGS_LIVE_SYNC_SUPPORTED = false`); live sync **orphaned**; Withings Functions source folder effectively empty tests-only on `main`.
- **Nutrition targets:** hardcoded `NUTRITION_KCAL_GOAL = 2000` (`lib/data/nutrition/nutritionGoals.ts`).
- **Seed foods** in production food search path (`services/api` seed catalog).
- **Export/delete coverage gaps** explicitly inventoried (`userDataRetentionRegistry.ts`).

### Placeholder / mock
- Health hub: DNA, medical history, scans, medication, supplements → `HealthRecordPlaceholderScreen`.
- Program builders: cardio/nutrition/recovery → `ProgramBuilderPlaceholderScreen`.
- `/dash/daily-recap` → “Coming soon”.
- `apps/professional` mock clients — prototype only.
- Command Center remains a parallel module grid (`/command-center`), not dock-linked.

### Broken / blocked locally without rebuild hygiene
- Stale `tsbuildinfo` / incomplete `@oli/contracts` dist emit caused typecheck failures and 2 Jest suite load failures until clean rebuild. **CI builds contracts first** (`.github/workflows/ci.yml`) — likely green if dist emits fully after clean build. Local default `npm run typecheck` without clean can fail (observed 22 then 6 errors).

### Hidden behind flags
- Health v1 primary nav (default ON).
- Daily Monitor foundation + weekly progress relocation (default ON).
- Labs OS / Document Ingestion OS env flags.
- Timeline continuous feed explicitly not shipping.

### Unmerged / in progress (NOT launch truth)
Open PRs (via `gh pr list`, 2026-08-10):

| # | Title | Branch | Notes |
|---|-------|--------|-------|
| 208 | feat(labs): add lab trend visualizations | `feat/labs-phase3dc-graphs` | DRAFT |
| 178 | feat(nav): make floating action open profile | `feat/profile-floating-shortcut` | OPEN |
| 22 | Phase1/step1 timezone daykey | `phase1/step1-timezone-daykey` | stale OPEN |
| 15 | Sprint0 phase1 guardrails | `sprint0-phase1-guardrails` | stale OPEN |
| 7 | Infra CI scope | `chore/infra-ci-scope` | stale OPEN |

**20 local worktrees** exist (timeline, sleep, weekly-fitness, privacy repairs, labs graphs, etc.). Counted as **IN PROGRESS**, not merged product.

---

## 4. What Should Be Removed, Merged, Repositioned, or Refactored

See companion: `docs/audits/2026-08-10-removal-consolidation-register.md`.

Highest-signal recommendations:

| Decision | Item | Why |
|----------|------|-----|
| MERGE | Command Center ↔ Dash/Daily Monitor | Dual homes; auth intent → CC but RouteGuard → dash |
| MERGE | Weekly Fitness vs Weekly Progress | Same host, flag-relocated labels |
| REPOSITION | Body/Activity/Sleep under Health v1 | Critical domains weakly linked in Health menu |
| REFACTOR | Client rawEvent trend hydration | Architecture violation vs DailyFacts authority |
| REFACTOR | Oversized workout screens | `workouts/log.tsx` ~4137 LOC; `overview.tsx` ~2320 LOC |
| REMOVE (product surface) | Health placeholders claiming “health record” without capability | DNA/scans/etc. until real |
| DEFER | Campus / pro assignment / IAP | No consumer closed loop yet |
| KEEP | Phase 1 Library/Timeline/Failures | Trust substrate; may be secondary nav |

---

## 5. Consumer Closed-Loop Assessment

| Stage | Status | Evidence summary |
|-------|--------|------------------|
| Assessment | PARTIAL | Routes + in-memory store; no API persistence |
| Baseline / Current State | PARTIAL | `useHealthBaseline` composes live domains; not a persisted OS document; Daily Monitor is day view not lifelong state |
| Target | PARTIAL | `useTargetState` roadmap derived; sparse metrics (null strength/VO₂/etc.) |
| Plan | PARTIAL / MISSING coordinated plan | Weekly goals + empty programs + placeholders |
| Execution | PARTIAL → strong in verticals | Workout logger, nutrition log/search/scan, manual weight, cardio flows exist |
| Monitoring | PARTIAL | Dash/Daily Monitor, Timeline day log, module calendars |
| Review | MISSING | No weekly/monthly plan review product |
| Adaptation | MISSING | No plan versioning / adjustment engine |

**Closed-loop scorecard (evidence-based):**

1. Identity — **YES** (email auth) / password reset **NO** / Apple Sign-In **NO**
2. Capture reality — **YES** for AH/Oura/manual/labs (runtime unverified)
3. Current State — **PARTIAL**
4. Explain how good — **PARTIAL** (classification framework + Health Score 4-domain)
5. Target & Gap — **PARTIAL**
6. One useful Plan — **NO**
7. Execute anywhere — **PARTIAL** (location-independent records; gym registry optional)
8. Verify what happened — **PARTIAL** (ingest + summaries; provenance uneven)
9. Improving? — **PARTIAL** (client trends; server insights exist)
10. Adapt next plan — **NO**
11. Understand/control data — **PARTIAL** (inventory UI; export/delete CTA missing)
12. Recover from failure — **PARTIAL** (failures screen + FailClosed patterns; no crash product)

---

## 6. First Consumer Launch Definition

**One-sentence promise:**
Oli is the trustworthy Health Operating System that captures your health reality, shows an honest Current State, gives you one coordinated plan you can execute anywhere, and proves whether you are improving — without silent failure.

**P0 (Consumer Launch Core)** — see roadmap doc for full scope. Minimum verticals recommended:
1. Identity + consent + ownership (export/delete UI)
2. Capture: Apple Health + Oura + manual golden path
3. Current State across 7 domains with honest missing data (depth may be uneven)
4. One coordinated My Plan (even if initially preference-driven weekly actions)
5. Execution for Strength + Activity + Sleep/Recovery + Nutrition (logging)
6. Daily Monitor + Timeline record
7. Weekly review v1 (bounded) + next-plan bump
8. Apple release compliance bar

Tradeoff: prefer **4 deep verticals that close the loop** over seven shallow dashboards. Keep seven-domain **structure** even when some domains are `missing`/`partial`.

---

## 7. Remaining Development Roadmap

Dependency-ordered stages are in `docs/audits/2026-08-10-consumer-launch-roadmap.md`.

**First implementation stage after this audit (do not implement in this pass):**
**Stage 1 — Launch Truth Freeze & Ownership Surfaces**
(Decide home nav; wire export/delete UI; privacy/terms; docs authoritative refresh proposal; eliminate dual-home confusion; ensure contracts build emits in CI/local).

---

## 8. Campus and Future Expansion Readiness

| Area | Classification |
|------|----------------|
| Location-optional execution records | **EXTENDABLE** — workouts/nutrition not Campus-bound; `selectedGymId` is equipment preference only (`lib/workouts/gymRegistry.ts`) |
| Provider model | **NOT YET APPLICABLE** — needs ADR before schemas |
| Entitlements / membership | **NOT YET APPLICABLE** — no IAP/entitlement layer |
| Health vs Operations boundary | **AT RISK** if Campus objects are stuffed into personal health paths without ADR |
| Execution provenance (planned/completed/inferred/verified) | **EXTENDABLE** — RawEvent provenance exists; plan-vs-actual incomplete |
| Identity continuity | **READY** — single Firebase uid personal record model |
| Offline/edge | **EXTENDABLE** — idempotent ingest + AsyncStorage queues; no edge OS |
| Campus product UI | **DEFER / NOT YET APPLICABLE** |

**Campus Expansion Contract (preserve now):**
1. User-scoped `users/{uid}/…` personal health memory remains the consumer record of truth.
2. Ingest stays append-only RawEvent with idempotency; no UI writes to derived collections.
3. Location/provider must remain **optional** metadata on execution events — never required for plan validity.
4. Do not invent Campus Firestore roots in the consumer app before an Operations OS ADR.
5. Professional assignment must go through API contracts — not direct client Firestore — as stated in `apps/professional/README.md`.

---

## 9. Code Check Gate Results

| Command | Exit | Notes |
|---------|------|-------|
| `npm run typecheck` (initial dirty incremental) | **2** | 22 errors: missing contracts emit + stale `lib/dist-types` + stress typings |
| `npm run -w @oli/contracts build` + clean `tsbuildinfo` + `npm run typecheck` | **0** | Pass after CI-equivalent hygiene |
| `npm run lint` | **0** | Pass |
| `npm run check:invariants` | **0** | Pass |
| `npm run check:client-trust-boundary` | **0** | Pass |
| `npm test` (full, all perms) | **1** | 979 pass / 2 fail load: `Cannot find module './bodyCompositionGoal'` from stale contracts dist; **6142** tests passed |
| Device/simulator smoke | **UNVERIFIED** | Not run |
| `gh pr status` GraphQL | **Forbidden** | REST `gh pr list` worked |
| `npx expo-doctor` | **UNVERIFIED** | Not run this pass |

**Node:** v20.19.5 · **npm:** 11.8.0 · **Expo:** 53.0.27 · **RN:** 0.79.6 · **firebase:** 12.9.0 · **firebase-functions:** 6.6.0

---

## 10. Decisions Required From Product Leadership

1. **Primary home surface**
   - Context: Dash/Daily Monitor, Command Center, Program, and Profile Digital Twin compete.
   - Options: (A) Daily Monitor as Today home; (B) Current State as home; (C) keep dual.
   - Default: **(A)** Daily Monitor = Today; Current State nested under Profile/State; retire CC from auth landing.
   - Delay cost: continued IA confusion and duplicate engineering.

2. **P0 domain depth**
   - Context: Seven domains exist structurally; plan/review missing.
   - Options: equal shallow depth vs 3–4 deep verticals.
   - Default: **deep Strength + Activity + Recovery/Sleep + Nutrition**, honest partial for Labs/Body/Cardio.
   - Delay cost: seven dashboards without a loop.

3. **Consumer vs Professional launch coupling**
   - Context: `apps/professional` is mock-only.
   - Options: self-serve only vs require coach.
   - Default: **self-serve P0**; professional P1+.
   - Delay cost: blocks launch on unfinished portal.

4. **Privacy policy / terms hosting**
   - Context: no URLs in app.
   - Options: external hosted legal pages vs in-app WebView.
   - Default: **hosted URLs** linked from Settings before TestFlight.
   - Delay cost: App Store rejection risk.

5. **Whether subscriptions are required for P0**
   - Context: no IAP code.
   - Options: free beta → paid later vs paywall at launch.
   - Default: **no IAP in P0**; entitlement ADR before monetization.
   - Delay cost: low if beta; high if Store listing implies paid features without restore.

---

## Repository Identity

| Field | Value |
|-------|-------|
| Date / TZ | Mon Aug 10 2026, EDT |
| pwd / root | `/Users/danielhendel/oli` |
| Remote | `git@github.com:danielhendel/oli.git` |
| Branch | `main` |
| HEAD / origin/main | `d43ae878373534dbb4cef84c4958221ace826792` |
| Commit date | Fri Aug 7 15:50:24 2026 -0400 — Merge PR #207 labs historical history |
| Working tree at audit start | **Clean** (nothing to commit) |
| Ahead/behind | 0 / 0 |
| Worktrees | 20 |
| Package manager | npm workspaces + `package-lock.json` |
| Monorepo | root Expo app + `lib/contracts`, `services/api`, `services/functions`, `apps/professional` |
| EAS | `eas.json` present |
| Cloud Run | `services/api`, `infra/`, `cloudbuild/` |
| CI | `.github/workflows/ci.yml` |
| Tests | Jest + Firestore emulator wrapper |
| Authoritative docs | `docs/00_truth/` (constitutional); `docs/authoritative/` is **legacy redirect** mostly exercise-media standards |
| Firebase projects | staging `oli-staging-fdbba`; prod placeholder |

---

## Source-of-Truth Document Findings

### Requested documents — location report

| Requested doc | Status | Path / note |
|---------------|--------|-------------|
| Oli Health OS — Authoritative Index | **PRESENT (different name)** | `docs/INDEX.md` — authority hierarchy T0–T3 |
| Unified Master Development Roadmap (vNext) | **MISSING** as named | Closest: `docs/10_product/roadmap/ROADMAP_REALITY.md` — **stale** (claims wearables deferred; code has Oura/AH) |
| Repo-Truth Progress Map (vCurrent) | **MISSING** as named | Closest stale: `docs/90_audits/REPO_REALITY_MAPPING.md` (2025-12-30); proposed map created this audit |
| Oli Canonical Schema v1.1 Code-Aligned | **MISSING** as named | Schemas live in `lib/contracts/*.ts` + Functions `types/health.ts` (DUPLICATE TRUTH risk) |
| Master System Architecture v2.1 | **MISSING** as named | Closest: `docs/20_architecture/SYSTEM_STATE.md` — partially stale (“pipeline not wired to UI”) |
| HealthOS Great Code Standard | **MISSING** as standalone named doc | Enforced partially via invariants + eslint; no single named standard file found |
| ChatGPT Alignment Specification v1.1 | **MISSING** | Not found |
| Product Definition & Vision | **PRESENT** | `docs/10_product/vision/VISION.md` (v1) |
| Life System / Flagship Architecture | **MISSING** | Not found under that title |
| Professional Platform Vision | **PARTIAL** | `docs/professional-platform/*` |
| White papers / Campus business plan | **MISSING** | Not found |
| Constitution | **PRESENT** | `docs/00_truth/CONSTITUTION.md` |

**Conflict rule applied:** code > docs. Example: `ROADMAP_REALITY.md` defers wearables; code has Oura + Apple Health. `SYSTEM_STATE.md` says pipeline “not yet wired to UI”; Dash/modules read DailyFacts via API.

`docs/authoritative/` **cannot govern** consumer launch — README states legacy path; contents are exercise media QA standards.

---

## Architecture Diagram (as built)

```text
[Expo Router app/ + lib/ + components/]
        | Firebase Auth ID token
        v
[Cloud Run API services/api] --authMiddleware--> Firestore Admin writes (rawEvents, prefs, labs…)
        |
        | Firestore triggers
        v
[Functions services/functions]
  onRawEventCreated → map → events (canonical)
  recomputeDerivedTruthForDay → dailyFacts / insights / intelligenceContext / healthScores
        |
        v
[GET /users/me/*] → lib/api → lib/data hooks → UI
```

**Active integrations:** Apple Health (client → ingest), Oura (OAuth + pull), manual ingest, document/labs upload.
**Orphaned:** Withings live sync.
**Absent:** Garmin, WHOOP, IAP, push, Sentry/Crashlytics.

---

## Related audit artifacts

1. `docs/audits/2026-08-10-consumer-launch-capability-matrix.md`
2. `docs/audits/2026-08-10-removal-consolidation-register.md`
3. `docs/audits/2026-08-10-consumer-launch-roadmap.md`
4. `docs/audits/2026-08-10-proposed-repo-truth-progress-map.md`

**Open decisions / non-claims:** Production deploy health, App Store review outcome, and end-to-end device sync are **UNVERIFIED**.
