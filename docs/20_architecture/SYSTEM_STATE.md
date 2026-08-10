# System State — As Built

**Status:** Current architecture interpretation (must track code)
**Last updated:** 2026-08-10 (Stage 1A truth freeze)
**Audit baseline SHA:** `d43ae878373534dbb4cef84c4958221ace826792`
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

## Mobile app

**Stack:** Expo, Expo Router, Firebase JS Auth (client)

**Responsibilities:** Authenticate; hold session; call Cloud Run API; render domain modules and Dash / Daily Monitor surfaces.

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
| Daily Monitor / Dash cards | Partial product |
| Assessment persistence | Missing (in-memory store) |
| Seven-domain Current State OS | Missing as unified product |
| My Plan (one coordinated plan) | Missing |
| Review / Adaptation | Missing |
| Ownership UI (export/delete CTAs, legal URLs) | Missing (backend exists) |

Dash (as of recovery baseline) composes domain cards; Program tab lacks durable plan documents (`currentPrograms` empty). Health v1 nav and Command Center create competing “home” pressure — resolution is Stage 1B (decision recorded; not implemented in 1A).

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
