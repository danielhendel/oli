# System State — As Built

**Status:** Current architecture interpretation (must track code)
**Last updated:** 2026-08-19 (R1 four-destination IA **complete on branch**; **not merged**)
**Merged `main` SHA:** `55e2ad6762949bb09006f8beefd95bae60dbd9bb`
**R1 branch:** `feat/analytics-first-r1-four-destination-ia` @ `fee0f05f42f27e04b918a700270c111d47e12772` (visual/a11y; IA `88d67ab`)
**Authority level:** T2 architecture interpretation — **describes what exists**; subordinate to code/CI
**Progress map:** [REPO_TRUTH_PROGRESS_MAP.md](../00_truth/REPO_TRUTH_PROGRESS_MAP.md)
**Approved product direction (not implementation proof):** [VISION.md](../10_product/vision/VISION.md)

This document describes the **actual system architecture**, not the aspirational one. Planned systems must not be presented as implemented.

---

## High-level architecture

```text
[ Expo App ]
    |
    | Firebase ID Token (no Firestore SDK in screens)
    v
[ API Service — Cloud Run ]  ← authenticated public API / ingestion boundary
    |
    | Admin SDK writes (user-scoped)
    v
[ Firestore ]
    |
    | Triggers
    v
[ Functions Pipeline ]
    RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext
```

The analytics-first product direction **strengthens** this pipeline; it does not replace it.

---

## Boundaries (as built)

| Layer | Reality |
|-------|---------|
| Mobile screens | Do **not** use Firestore directly; talk to the API with Firebase ID tokens |
| Cloud Run API | Authenticated public API and ingest boundary |
| Functions | Normalization and derived-truth computation |
| Shared schema | `lib/contracts` TypeScript + Zod source; package exports resolve to generated `lib/contracts/dist` (gitignored) |

---

## Merged state (`main` @ `55e2ad6`)

### Navigation and homes

| Surface | Merged `main` reality | R1 branch (complete on branch, not merged) |
|---------|----------------------|------------------------|
| Primary dock | **Dash · Strength · Cardio · Nutrition · Health** (Health v1 flag default ON) | **Home · Plan · Progress · You** — no FAB fifth destination |
| Auth / session landing | Authenticated routes resolve to `/(app)/(tabs)/dash` | Same filesystem; user-facing name **Home** (`CONSUMER_HOME_HREF`) |
| Command Center | Parallel module grid at `/(app)/command-center` (competing-home pressure) | Compatibility **Redirect to Home** (grid not rendered) |
| Daily Recap | Placeholder surface | Compatibility **Redirect to Home** |
| Domain routes | Strength/workouts, cardio, nutrition, activity, body, recovery/sleep, labs, etc. exist as modules | Unchanged routes; consumer label **Movement** for Activity |
| Program / Plan | Program tab; durable coordinated plan documents absent | Tab label **Plan**; honest empty state; placeholder cardio/nutrition/recovery builders not launch-facing; workout builder route preserved, not advertised |
| Daily Monitor | Dash / Daily Monitor foundation — **not** the approved permanent Home identity | Retained as **Today** section under Home; header is Home |
| Progress | Weekly Progress was relocated toward Program/Dash flags | Dedicated Progress tab; Weekly Progress once when relocation ON; Timeline + domain histories |
| You | Profile via Health hub / hidden tabs | You hub: profile, devices, assessments, labs, privacy, Your Data, settings, failures, Health & Performance Data |
| Timeline / Library / Failures | Phase 1 routes exist | Timeline under Progress; Library (data lineage) and Failures under You |
| Flags | `EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1` historically switched docks | Health-v1 **deprecated no-op** for chrome; Daily Monitor + Weekly Progress flags still govern those real components |

**Approved IA is implemented on the R1 branch, not on merged `main`.** Physical-iPhone R1 smoke **PASS** (2026-08-19). Current State / What Oli Sees / overall score remain **not implemented**. PR #212 remains Draft.

Home (R1): no fabricated Current State; copy “Building your health picture” is not an analytical result. Today Movement shows positive finite steps when measured (device: 2,431 Steps; Apple Health `hkEmpty: false`) and omits stored zero so empty aggregates are not “0 Steps · Sedentary”. Unfinished-day sedentary classification is deferred to Stage 3.

Plan (R1): `currentPrograms = []`; no persistence; no Oli-authored plan language; not called My Plan.

Progress (R1): no adherence/outcome/causal claims. History rows scroll fully above the floating dock.

You (R1): DNA / Medical History / Scans / Medication placeholders are hidden from launch navigation; one Supplements destination (`/(app)/nutrition/supplements`). Hub rows scroll fully above the floating dock. Account uses consumer title **Account**, dark-theme readable status, no Firebase UID.

Auth (R1): dark Sign In / Create account; light iOS status bar; sign-out → Sign In → Home; force-quit restore on Home. Command Center is a Home redirect, not a rendered home.

### Integrations and pipeline

| Integration | Code status | Note |
|-------------|-------------|------|
| Apple Health | Paths exist in app/lib | Runtime device smoke still a launch gap |
| Oura | OAuth + pull/scheduled paths exist | Runtime unverified for launch acceptance |
| Withings live sync | Orphaned; helpers refuse “Connected” | Do not present as live |
| Garmin / WHOOP | Missing | Deferred |

Pipeline and derived consumption: portions of the app read DailyFacts / sleep-night / workout summaries / readiness DTOs via API. This is **partial wiring**, not a complete analytics-first Home/Plan/Progress product.

**Known duplicate-truth pressure:** Some client analytics still hydrate **RawEvents** for trends. Remediation remains staged; do not pretend a single UI truth exists everywhere.

### Ownership and gaps

| Capability | Merged reality |
|------------|----------------|
| Export/delete backend | Exists (API + Functions) |
| Export/delete UI CTAs | Missing |
| Password reset | Missing |
| Consent / hosted Privacy & Terms URLs in-app | Missing |
| Crash reporting product | Missing |
| Production Firebase project config | Release-hardening gap |
| Unified standards / baselines / confidence / analytical explanation / association language / Progress contracts | **Not** implemented as one product system |
| Current State / What Oli Sees as Home product | **Not** implemented |
| Human-authored Plan representation with provenance | **Not** implemented |
| Progress analytics surface | **Not** implemented |

---

## Closed unmerged state (PR #210 — not merged)

| Fact | Detail |
|------|--------|
| PR | [#210](https://github.com/danielhendel/oli/pull/210) **CLOSED**, unmerged |
| Head | `f64c69736c15b2877789ab2dee0a06c2e9edfaa7` |
| Five-item dock | Today · Strength · Cardio · Nutrition · Health — **not merged**; **not** product authority |
| Today naming | Draft-only; superseded by approved Home |
| Cleanup value | Honesty redirects, hub cleanup, Program empty state **reimplemented** on R1 (no cherry-pick) |
| R1 action | Disposition executed; PR #210 branch unmodified |

See [delta audit](../audits/2026-08-14-analytics-first-product-direction-delta.md).

---

## Approved but not implemented direction

```text
Home · Plan · Progress · You
```

| Destination | Intent |
|-------------|--------|
| Home | Analytics-first Current State, standards, direction, What Oli Sees |
| Plan | Human-created or externally sourced plan representation |
| Progress | Execution, adherence, outcomes, trends, analysis |
| You | Account, sources, assessments, labs, history, privacy, export, deletion, settings |

Do **not** state that this navigation is already merged to `main`. On the R1 branch the four destinations exist as shells with physical-iPhone PASS; Current State, What Oli Sees, Plan persistence, and Progress analytics remain unimplemented. Next after merge: Consumer Ownership and Account Recovery.

---

## Mobile app

**Stack:** Expo, Expo Router, Firebase JS Auth (client)

**Responsibilities:** Authenticate; hold session; call Cloud Run API; render domain modules and Home / Daily Monitor, Plan, Progress, and You shells (R1 branch).

---

## API service

**Location:** `services/api`
**Runtime:** Node.js, Express, Firebase Admin (ADC / Cloud Run SA)

**Behaviors:** Verify Firebase ID tokens; user-scoped access; canonical ingest with idempotency; domain routes (preferences, sleep, workouts, nutrition, labs, account export/delete, Oura, etc.).

---

## Functions pipeline

**Implemented and tested:** Raw event normalization, daily aggregation, intelligence computation, Phase 1/2 proof gates in CI.

**Not claimed:** Analytics-first Home/Plan/Progress product completion, overall score methodology, or Campus/Operations OS.

---

## Campus / Operations

**Not implemented.** No Campus Firestore paths should be invented before an Operations OS ADR. Location/provider remain optional execution context; personal health data stays user-scoped.

---

## Professional platform

`apps/professional` is prototype/mock tooling — **not** a P0 consumer launch dependency. Longer-term professional analytics must remain intelligence for humans, not autonomous prescription.

---

## Environments

- Local mobile: Expo against staging Firebase + staging Cloud Run (see `docs/40_engineering/local-dev/LOCAL_DEV.md`)
- Cloud Run: GCP service account
- Production Firebase project config remains a release-hardening gap

---

## Historical correction

Earlier revisions stated the Functions pipeline was “not yet wired to UI.” That is **stale**: multiple app modules already consume derived DTOs. Remaining gaps are analytics-first productization, metric-truth remediation, ownership UI, and release hardening — not total disconnection.

The 2026-08-10 “Today / My Plan / adaptation” product doctrine is **superseded** for current consumer authority; see Vision v2 and Consumer Product Decisions v2.
