# Phase 1 Scope — Personal Health Library (Binding)

This document is a **binding contract** for Phase 1. CI must fail if Phase 1 invariants are violated.

## Phase 1 Primary Goal
Store all personal health data in one place and allow the user to see who they are over time.

## System Model (Binding)
Phase 1 is implemented as a user-centric pipeline with strict separation between canonical data and derived truth:

- **RawEvents**: untrusted, immutable ingestion inputs (validated at boundaries)
- **CanonicalEvents**: normalized, typed canonical representation
- **DailyFacts**: deterministic daily aggregates derived from canonical
- **Insights**: deterministic rules-driven derived conclusions
- **IntelligenceContext**: daily context summary derived from canonical + facts + insights

## Required Capabilities (Phase 1 Complete = all true)

### A) Unified Personal Health Library
- All health data types are stored under a single user-centric model: `/users/{uid}/...`
- There is a strict distinction between:
  - canonical data (RawEvents + CanonicalEvents)
  - derived truth (DailyFacts + Insights + IntelligenceContext)

### B) Health Timeline
- Data is time-indexed by day (YYYY-MM-DD) and supports longitudinal reads (“me over time”).
- Timeline reads must be safe under missing/partial data (no crashes, explicit empty states).

### C) Data Ingestion & Uploads
- All ingestion paths are fail-closed:
  - invalid data is rejected at the boundary OR recorded as an explicit failure
  - no silent drops
- All ingestion paths MUST land as RawEvents first (never write Canonical/Derived directly).

### D) Derived Truth Pipeline
- DailyFacts / Insights / IntelligenceContext are recomputable deterministically.
- Recompute is authoritative:
  - derived docs are overwritten from source-of-truth canonical data
  - no incremental drift, no silent divergence

### E) Client Consumption
- Client reads are validated.
- The client must never write to canonical/derived collections (no corruption paths).
- Readiness states are explicit: loading / ready / empty / invalid.

### F) System Integrity
- Invariants are enforced by CI and/or runtime rules.
- No silent drift paths are allowed.

## Non-Goals (Explicitly out of Phase 1)
- Automated multi-wearable integrations beyond a single additional source
- Coaching workflows or marketplace features
- AI recommendations beyond deterministic Insights/Context surfaces

