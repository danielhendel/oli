# System State — As Built

**Status:** Current architecture interpretation (must track code)
**Last updated:** 2026-08-12 (Stage 1B Today IA)
**Audit baseline SHA:** `d43ae878373534dbb4cef84c4958221ace826792`
**Stage 1A merge SHA:** `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
**Progress map:** [REPO_TRUTH_PROGRESS_MAP.md](../00_truth/REPO_TRUTH_PROGRESS_MAP.md)

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

---

## Boundaries (as built)

| Layer | Reality |
|-------|---------|
| Mobile screens | Do **not** use Firestore directly; talk to the API with Firebase ID tokens |
| Cloud Run API | Authenticated public API and ingest boundary |
| Functions | Normalization and derived-truth computation |
| Shared schema | `lib/contracts` TypeScript + Zod source; package exports resolve to generated `lib/contracts/dist` (gitignored) |

---

## Mobile app navigation (Stage 1B)

**Stack:** Expo, Expo Router, Firebase JS Auth (client)

### Auth entry

- Signed-out → `/(auth)/sign-in`
- Sign-in / sign-up success → **Today** (`CONSUMER_HOME_HREF` = `/(app)/(tabs)/dash`)
- RouteGuard restored session → **Today**
- Root authenticated redirect (`app/(app)/index`) → **Today**

### Canonical Today home

- Filesystem route: `app/(app)/(tabs)/dash.tsx` (preserved)
- User-facing name: **Today**
- Content: Daily Monitor host (real domain cards) under the Oli brand header
- **Not** implemented on Today: Current State summary, Today’s Plan placeholders

### Primary dock (Health v1 default ON)

| Control | Label | Destination |
|---------|-------|-------------|
| Pill | Today | tab `dash` |
| Pill | Strength | `/(app)/workouts` |
| Pill | Cardio | `/(app)/cardio` |
| Pill | Nutrition | `/(app)/nutrition` |
| Detached | Health | menu (not a fake route) |

`EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1=0` is a **development-only** rollback to Timeline/Program/Library dock + Manage menu. Production must keep the default (enabled).

### Health hub (honest directory)

Profile, Body Composition, Activity, Recovery, Sleep, Labs, Supplements (Nutrition-owned).

**Removed from launch navigation:** DNA, Medical History, Scans, Medication, Health-record Supplements placeholder.

Strength / Cardio / Nutrition remain discoverable via the primary dock.

### Program

- Weekly Progress (when relocation flag default ON)
- Honest empty state (no durable `currentPrograms`)
- Single real entry: Workout program builder
- Placeholder cardio / nutrition / recovery builders are **not** launch-facing; `/program/builder` redirects to workout builder
- **Not** renamed My Plan

### Secondary surfaces (Settings → Explore when Health v1 ON)

| Surface | Role |
|---------|------|
| Timeline | Day-by-day record of what happened |
| Program | Weekly Progress + workout program entry |
| Library | Provenance / lineage / replay |
| Profile | Via Health hub (identity, preferences, account entry points) |
| Failures | Settings → Data integrity |

### Compatibility redirects

| Path | Behavior |
|------|----------|
| `/command-center` | Redirect → Today |
| `/dash/daily-recap` | Redirect → Today |
| `/supplements` | Redirect → `/(app)/nutrition/supplements` |

Command Center is **not** an auth destination, primary tab, or competing home.

### Feature flags retained (Stage 1B)

| Flag | Stage 1B disposition |
|------|----------------------|
| `EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1` | Default ON; production path; `0` = dev rollback only |
| `EXPO_PUBLIC_DASH_DAILY_MONITOR_FOUNDATION` | Default ON; powers Today Daily Monitor content |
| `EXPO_PUBLIC_DASH_WEEKLY_PROGRESS_RELOCATION` | Default ON; Weekly Progress on Program |

No new Stage 1B flag was introduced.

---

## Mobile app product responsibilities

**Responsibilities:** Authenticate; hold session; call Cloud Run API; render domain modules and Today / Daily Monitor surfaces.

**Derived truth consumption:** Portions of the app already read DailyFacts / sleep-night / workout summaries / readiness DTOs via API. This is **partial wiring**, not a complete Health OS loop.

**Known duplicate-truth pressure (Stage 2):** Some client analytics still hydrate **RawEvents** for trends (e.g. body / workouts / nutrition paths). Launch-metric remediation is staged; do not pretend a single UI truth exists everywhere today.

---

## API service

**Location:** `services/api`
**Runtime:** Node.js, Express, Firebase Admin (ADC / Cloud Run SA)

**Behaviors:** Verify Firebase ID tokens; user-scoped access; canonical ingest with idempotency; domain routes (preferences, sleep, workouts, nutrition, labs, account export/delete, Oura, etc.).

---

## Functions pipeline

**Implemented and tested:** Raw event normalization, daily aggregation, intelligence computation, Phase 1/2 proof gates in CI.

**Not claimed:** Full consumer closed loop (My Plan, Review/Adaptation) or Campus/Operations OS.

---

## Integrations (honest status)

| Integration | Code status | Audit/runtime note |
|-------------|-------------|--------------------|
| Apple Health | Paths exist in app/lib | Runtime device smoke unverified by 2026-08-10 audit |
| Oura | OAuth + pull/scheduled paths exist | Runtime unverified by that audit |
| Withings live sync | Orphaned; helpers refuse “Connected” | Do not present as live |
| Garmin / WHOOP | Missing | Deferred |

---

## Consumer product loop (partial)

| Loop step | Status |
|-----------|--------|
| Capture / ingest | Strong substrate |
| Daily Monitor inside Today | Partial product (Stage 1B shell) |
| Assessment persistence | Missing (in-memory store) |
| Seven-domain Current State OS | Missing as unified product (Stage 4) |
| My Plan (one coordinated plan) | Missing (Stage 6) |
| Review / Adaptation | Missing |
| Ownership UI (export/delete CTAs, legal URLs) | Missing (backend exists; Stage 1C) |

---

## Campus / Operations

**Not implemented.** No Campus Firestore paths should be invented before an Operations OS ADR. Location/provider remain optional execution context; personal health data stays user-scoped.

---

## Professional platform

`apps/professional` is prototype/mock tooling — **not** a P0 consumer launch dependency.

---

## Environments

- Local mobile: Expo against staging Firebase + staging Cloud Run (see `docs/40_engineering/local-dev/LOCAL_DEV.md`)
- Cloud Run: GCP service account
- Production Firebase project config remains a release-hardening gap (Stage 10)

---

## Historical correction

Earlier revisions of this file stated the Functions pipeline was “not yet wired to UI.” That is **stale**: multiple app modules already consume derived DTOs. Remaining gaps are product-loop completeness and Stage 2 metric-truth remediation, not total disconnection.
