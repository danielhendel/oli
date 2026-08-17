# System State — As Built

**Status:** Current architecture interpretation (must track code)
**Last updated:** 2026-08-14 (R0 analytics-first documentation reset)
**Merged `main` SHA:** `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
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

## Merged state (`main` @ `6c8797b`)

### Navigation and homes

| Surface | Merged reality |
|---------|----------------|
| Primary dock | **Dash · Strength · Cardio · Nutrition · Health** (Health v1 flag default ON) |
| Auth / session landing | Authenticated routes resolve to `/(app)/(tabs)/dash` (**Dash**, not “Home”) |
| Command Center | Still present as a parallel module grid at `/(app)/command-center` (competing-home pressure) |
| Domain routes | Strength/workouts, cardio, nutrition, activity, body, recovery/sleep, labs, etc. exist as modules |
| Program | Program tab exists; durable coordinated plan documents absent (`currentPrograms`-style emptiness remains a product gap) |
| Daily Monitor | Dash / Daily Monitor foundation exists as partial monitor product — **not** the approved permanent Home |
| Timeline / Library / Profile | Phase 1 routes exist; Timeline/Library/Program often hidden from primary dock when Health v1 is ON; Profile via Health hub / tabs |
| Failures | Trust substrate routes exist |

**Approved but not implemented on `main`:** `Home · Plan · Progress · You`.

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

## Draft state (PR #210 — not merged)

| Fact | Detail |
|------|--------|
| PR | [#210](https://github.com/danielhendel/oli/pull/210) Draft |
| Head (as of R0) | `f64c69736c15b2877789ab2dee0a06c2e9edfaa7` |
| Five-item dock | Today · Strength · Cardio · Nutrition · Health — **not merged**; **not** product authority |
| Today naming | Draft-only; superseded by approved Home |
| Cleanup value | Honesty redirects, hub cleanup, Program empty state may be reused after disposition |
| R0 action | Disposition documented; PR unmodified |

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

Do **not** state that this navigation or these experiences are already implemented.

---

## Mobile app

**Stack:** Expo, Expo Router, Firebase JS Auth (client)

**Responsibilities:** Authenticate; hold session; call Cloud Run API; render domain modules and Dash / Daily Monitor surfaces.

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
