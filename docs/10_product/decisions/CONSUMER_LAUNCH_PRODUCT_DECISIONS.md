# Consumer Launch Product Decisions

**Status:** Approved product decisions for consumer-launch direction
**Date:** 2026-08-10
**Implementation stage:** Stage 1B — One Today Home & Launch Information Architecture (behavior implemented on `feat/consumer-launch-stage1b-today-ia`)
**Related audit:** [2026-08-10 consumer-launch repo audit](../../audits/2026-08-10-consumer-launch-repo-audit.md)

---

## Context

The repository has strong personal-health-memory and domain verticals, but lacks a coordinated Health OS closed loop (Assessment → Current State → Plan → Execution → Monitor → Review → Adaptation). Multiple homes, Campus-first pressure, and professional-platform coupling risk diluting the first consumer launch.

## Decision

### 1. Core product

Oli is a **Health Operating System**, not a collection of trackers.

The first consumer product must complete:

Assessment → Current State → Standard → Target → Gap → My Plan → Execution → Monitoring → Review → Adaptation

The product must work **without** an Oli-owned physical location.

**Principle:** OLI WORKS ANYWHERE AND WORKS BEST AT OLI CAMPUS.

### 2. Seven-domain Current State structure

Visible domains:

1. Body Composition
2. Recovery
3. Activity
4. Strength
5. Cardio
6. Nutrition
7. Health

P0 execution depth initially prioritizes: **Strength, Activity, Recovery/Sleep, Nutrition**.

Body Composition, Cardio, and Health remain honest when partial or missing. **No fabricated ratings or fake completeness.**

### 3. One consumer home

The existing Dash route becomes the one consumer home called **Today**.

Future Today hierarchy:

1. Current State summary — “Where am I overall?”
2. Today’s Plan — “What should I do?”
3. Daily Monitor — “What has been measured, calculated, or logged today?”

**Command Center will not remain a competing authenticated home.**

Stage 1B implements this decision: auth and root redirects target Today; `/command-center` redirects to Today.

### 4. Current State placement

Current State is not merely profile information. It will have a dedicated State experience and a summary on Today. Profile remains identity, preferences, permissions, ownership, and account.

### 5. My Plan

Program evolves into **one coordinated My Plan**. Users must not receive isolated workout, cardio, nutrition, recovery, wearable, or professional plans as competing “the plan.”

Plan schema design/implementation is deferred past Stage 1A.

### 6. Consumer launch mode

P0 is a **self-service consumer** product. Professional support, assignment, secure messaging, and the professional portal are **P1+**.

### 7. Legal delivery

Privacy Policy, Terms of Service, and Support use **maintainable hosted URLs** linked from the app. Final legal copy is not invented in engineering PRs.

### 8. Monetization

No IAP required for internal/controlled beta. A separate entitlement/monetization decision is required before a paid public digital consumer launch. Do not implement IAP in early launch stages by default.

### 9. Campus boundary

Campus, facilities, reservations, equipment, kitchen, membership, and operational data remain deferred. Location and provider stay optional execution context. Personal health data remains user-scoped. **No Campus Firestore paths** before an Operations OS ADR.

## Consequences

- Future sessions must not reintroduce dual homes, seven shallow equal dashboards, Campus-first development, professional-launch coupling, a generic AI chatbot as the product, or a fragmented plan model.
- Stage sequencing follows [ROADMAP_REALITY](../roadmap/ROADMAP_REALITY.md).
- Implementation PRs change behavior only in their named stage; this document alone does not ship UI.

## Deferred alternatives

| Alternative | Why deferred |
|-------------|--------------|
| Campus-first launch | Violates “works anywhere”; needs Operations OS ADR |
| Professional-coupled P0 | Blocks self-service launch; P1+ |
| Equal depth across all seven domains at P0 | Honesty over fake completeness |
| Competing Command Center home | Dilutes Today IA |
| Isolated per-domain “plans” | Breaks coordinated My Plan |
| Generic AI chatbot product | Not the closed-loop OS |
| IAP before entitlement decision | Premature for controlled beta |

## Relationship to the 2026-08-10 audit

These decisions lock the audit’s recommended consumer direction without implementing Stage 1B+ product work. Audit artifacts under `docs/audits/2026-08-10-*` remain the historical evidence snapshot of `d43ae878`.
