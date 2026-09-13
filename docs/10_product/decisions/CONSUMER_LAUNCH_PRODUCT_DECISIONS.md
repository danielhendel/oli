# Consumer Launch Product Decisions

**Status:** Current approved consumer-launch product decisions
**Version:** 2.0
**Effective date:** 2026-08-14
**Authority level:** T2 product decisions (subordinate to Constitution and code/CI)
**Supersedes:** 2026-08-10 Today / coordinated My Plan launch decisions
**Describes:** Approved consumer product decisions — **not** runtime implementation proof
**Related:** [VISION.md](../vision/VISION.md) · [ROADMAP_REALITY.md](../roadmap/ROADMAP_REALITY.md) · [SYSTEM_STATE.md](../../20_architecture/SYSTEM_STATE.md) · [Delta audit](../../audits/2026-08-14-analytics-first-product-direction-delta.md)

> There is one active consumer product-decision document. Git history preserves v1 (2026-08-10).

---

## Product authority

```text
Professionals plan.
People execute.
Oli analyzes.
```

```text
Oli measures. Oli analyzes. Oli explains. You decide.
```

---

## Oli’s role

Oli’s analytical responsibilities for the consumer product:

1. Collect
2. Organize
3. Measure
4. Compare
5. Analyze
6. Explain

Oli does not autonomously prescribe goals, priorities, workouts, nutrition plans, medical actions, or modifications to professional-created programs.

---

## Human control

- The user owns personal goals and decisions.
- Appropriate professionals own professional judgment.
- Oli does not autonomously prescribe or modify professional plans.

---

## Home (Stage 2 consumer presentation)

Bottom-tab label remains **Home**.

Visible Home screen title:

```text
Oli
```

First substantive Home section:

```text
My Health & Performance
```

Approved consumer-facing category cards (exact order):

1. Body Composition
2. Strength
3. Cardio Fitness
4. Nutrition
5. Sleep
6. Recovery
7. Health

Today / Daily Monitor remains **beneath** the category grid.

Movement / Activity remains a preserved technical and history surface; it is **not** a top-level Home category card in Stage 2.

Do not show overall scores, domain ratings, standards thresholds, What Oli Sees, or recommendations on these cards in Stage 2.

## Onboarding (Stage 2)

Mandatory first-use flow:

```text
Opening → About You → Home
```

Source / device connection is **not** part of mandatory onboarding.

Apple Health, Oura, and other supported tracking methods are introduced from category context or You → Connected Devices.

Apple Health query / ingest / backfill requires an explicit connection for the **current** Oli account. Device HealthKit permission alone does not authorize sync.

---

## Primary navigation

Approved first-release information architecture:

```text
Home · Plan · Progress · You
```

| Destination | Question |
|-------------|----------|
| Home | What does Oli help me understand? (category entry) + today’s available data |
| Plan | What am I doing? |
| Progress | How am I changing? |
| You | What does Oli know about me? |

This IA is **approved direction**. Draft PR #210’s Today / five-domain dock is **superseded** and must not be treated as current product law.

---

## Seven domains

Analytical domains remain:

1. Body
2. Recovery
3. Movement
4. Strength
5. Cardio
6. Nutrition
7. Health

Stage 2 Home **consumer labels** for category entry are listed under Home above and are not a rename of contracts.

---

## Terminology

```text
Movement is the consumer term.
Activity remains the existing technical term until compatibility work is approved.
```

Do not invent a parallel technical domain or rename contracts in documentation-only work.

---

## Home

Home contains:

- Current State
- Standards (where defensible)
- Direction of travel
- What Oli Sees

**No prescription feed.** No “Today’s Plan” as an Oli-authored action surface.

---

## Plan

- Plans are human-created or externally sourced.
- Source attribution is required.
- Oli may represent and analyze plans.
- Oli does not autonomously author or modify plans.

---

## Progress

- Execution
- Adherence
- Outcomes
- Trends
- Analysis
- Confidence

**No autonomous program change.**

Current State and Progress remain separate product concepts and (eventually) separate data contracts.

---

## You

- Identity
- Connected sources
- Assessments
- Labs
- History
- Professionals
- Privacy
- Export
- Delete account
- Settings

---

## Overall score

**Not approved for P0** until:

- Weighting is defensible
- Missing-domain behavior is defined
- Confidence aggregation is defined
- Versioning is defined
- Explanation is available

Default when not defensible: honest incomplete language such as `Building your complete baseline`.

---

## What Oli Sees

- Analysis only
- Evidence-linked
- Conservative
- No “you should”
- No “your priority is”
- No unsupported causation

---

## Current State versus Progress

Must remain separate:

| Concept | Question |
|---------|----------|
| Current State | Where am I? |
| Progress | How am I changing? |

---

## P0 product mode

Self-service analytics first.

Professional analytics and professional plan workflows may follow **without** changing the core authority boundary.

---

## Campus

Deferred.

The consumer record and analytics model must remain location-independent. No Campus Firestore paths before an Operations OS ADR.

---

## Legal and ownership (retained)

- Privacy Policy, Terms, and Support use maintainable hosted URLs linked from the app.
- Final legal copy is not invented in engineering PRs.
- Export/delete UI remains launch-critical alongside existing backend routes.

---

## Monetization (retained)

No IAP required for internal/controlled beta. Separate entitlement decision before paid public digital launch.

---

## Consequences

Future sessions must not reintroduce:

- Today / five-domain dock as product law
- Oli-authored coordinated My Plan as P0
- Autonomous adaptation / next-plan authorship by Oli
- Dual authenticated homes (e.g. Command Center competing with Home)
- Campus-first development
- Generic AI chatbot as the product
- Fabricated complete scores or overall score without methodology

Stage sequencing follows [ROADMAP_REALITY](../roadmap/ROADMAP_REALITY.md).

---

## Relationship to audits

- Historical evidence: `docs/audits/2026-08-10-*` (immutable).
- Direction delta: [2026-08-14 analytics-first delta](../../audits/2026-08-14-analytics-first-product-direction-delta.md).
- PR #210 remains Draft; disposition is documented in the delta audit and is not executed by this decisions file.
