# Oli — Unleash Your Greatness!

## Pursuit of Excellence Through Personal Health & Performance Analytics

**Status:** Current Foundational Product Direction
**Version:** 2.0
**Effective date:** 2026-08-14
**Authority level:** T2 product intent (subordinate to the Constitution and to code/CI)
**Supersedes:** Oli Product Definition & Vision v1 for current consumer product direction
**Describes:** Approved product direction and first-release boundaries — **not** implemented application state
**Related:** [Consumer Product Decisions](../decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md) · [Roadmap](../roadmap/ROADMAP_REALITY.md) · [System State](../../20_architecture/SYSTEM_STATE.md) · [Delta audit](../../audits/2026-08-14-analytics-first-product-direction-delta.md)

---

## 1. Executive Summary

Oli helps people pursue excellence in their health and performance.

Oli is your **personal health and performance analytics team**.

Oli shows you where you are, how you are changing, and how you compare to excellence.

**Foundational product principle:**

> **Oli measures. Oli analyzes. Oli explains. You decide.**

**Fundamental responsibility division:**

> **Professionals plan. People execute. Oli analyzes.**

Oli does not autonomously prescribe goals, priorities, workouts, nutrition plans, medical actions, or modifications to professional-created programs.

---

## 2. The Soul of Oli

Oli is built for people who pursue excellence.

The philosophical question is:

> **How good can I become?**

The user may already be healthy, active, fit, strong, or disciplined.

Oli helps the user understand:

- Where am I?
- What is good?
- What is great?
- What is excellent?
- How have I changed?
- Am I actually improving?
- Is my work producing results?

Oli must preserve the distinction between good and excellent without shaming the user.

**Truth is the objective.**

---

## 3. Core Product Definition

| Question | Answer |
|----------|--------|
| Why Oli exists | Help people pursue excellence in their health and performance |
| What Oli is | Your personal health and performance analytics team |
| What Oli does | Shows where you are, how you are changing, and how you compare to excellence |

Product transformation:

```text
Data → Information → Analysis → Understanding
```

---

## 4. Analytics, Not Prescription

Oli is not:

- An AI doctor
- An autonomous trainer
- An autonomous dietitian
- An autonomous coach
- A system that chooses the user’s goals
- A system that decides what category the user must prioritize
- A system that automatically creates professional prescriptions
- A system that automatically changes professional-created plans
- A generic AI chatbot
- A dashboard that dumps fragmented numbers on the user

Oli may measure adherence and outcomes against human- or professionally authored plans. Oli may not pretend it authored those plans or quietly rewrite them.

---

## 5. Core Analytical Responsibilities

Oli must become exceptional at:

1. **Collect** — Bring fragmented information together.
2. **Organize** — Normalize information into Oli’s whole-person model.
3. **Measure** — Establish current value, status, score where defensible, trend, applicable standard, and confidence.
4. **Compare** — Against defensible standards, historical baseline, prior periods, and professional-defined targets.
5. **Analyze** — Improvement, decline, plateau, deviation, consistency, adherence, relationships, and missing information.
6. **Explain** — Turn data into understandable evidence.

---

## 6. Seven-Domain Model

Consumer-facing domains:

1. Body
2. Recovery
3. Movement
4. Strength
5. Cardio
6. Nutrition
7. Health

These domains describe the individual’s state. They are not seven goals the user must optimize simultaneously.

**Terminology:**

| Consumer label | Current internal technical label (where implemented) |
|----------------|------------------------------------------------------|
| Movement | Activity |

Do not introduce a parallel technical domain in documentation alone. Canonical contract renames require separate compatibility review and RFC/ADR.

---

## 7. Standards of Excellence

Where scientifically and practically defensible, Oli may use:

```text
Needs Attention · Fair · Good · Great · Excellent
```

These labels are conceptual defaults, not universal thresholds.

Every implemented standard must eventually define: metric, evidence basis, applicable population, age/sex rules where relevant, unit, thresholds, standard type, version, effective date, data requirements, and confidence limitations.

- Never lower a standard merely to create positive emotional feedback.
- Never shame a person for being below Excellent.
- No rating may be shown without a defensible standard and sufficient data.

---

## 8. Current State and Progress

| Concept | Question |
|---------|----------|
| Current State | Where am I? |
| Progress | How am I changing? |

They must remain separate.

Examples that must remain representable independently:

- Excellent but declining
- Good but improving rapidly

---

## 9. Confidence and Data Sufficiency

Oli must never manufacture certainty.

Analytical outputs must support honest states such as:

- `88 · Great` with `↑ Improving`
- `Building baseline`
- `Insufficient data`

Where helpful, explain what is missing (for example: additional qualifying cardio sessions to establish a baseline).

No false precision.

---

## 10. Association and Causation

Distinguish:

- Measurement
- Association
- Causation

Prefer conservative language: coincided with, occurred alongside, was associated with, may be related to, available data does not establish causation.

Do not state causation without sufficient evidence and an approved analytical method.

---

## 11. Onboarding Experience

No feature tour. No long subjective questionnaire. No vague prompts such as “How do you want to feel?” or “What does wellness mean to you?”

### Opening

```text
Pursue Excellence.

Understand where you are.
See how you’re progressing.
Discover how good you can become.

Get Started
```

### About You

Collect only the minimum information necessary for interpretation: name, date of birth, sex, height, weight.

### Connect

```text
Bring your health together.
Connect what you already use.
```

Possible initial sources (vision only — **repo truth governs** what may be shown as supported): Apple Health, Oura, MyFitnessPal, Withings.

Secondary action: `I’ll do this later`.

### Understand

```text
Building your health picture…
```

Possible states: connecting data, establishing baselines, measuring current state, comparing against standards, analyzing progress — then `This is you. See My Health →`.

**Not implemented in the R0 documentation stage.**

---

## 12. Home Experience

Home answers: **Where am I?**

Initial hierarchy:

1. Current State
2. Domain ratings or honest data-readiness states
3. Direction of travel
4. What Oli Sees

Home must not initially overwhelm with dozens of cards, tasks, prescriptions, raw charts, notifications, recommendations, or deep event dumps.

An overall score such as `82 · Great` is **not automatically approved**. Default when an overall score is not defensible: `Building your complete baseline`.

---

## 13. What Oli Sees

Analysis, not recommendation.

Acceptable examples: strength reached a new high; cardio continues to improve; recovery below baseline; movement remains Excellent; cardio baseline incomplete.

Prohibited: “Your priority is…”, “You should…”, “Oli recommends…”, “You need to fix…”, “Change your program to…”.

Always explain evidence and limitations.

---

## 14. Domain Detail Experience

Progressive disclosure:

```text
Answer → Context → Analysis → Deep Data
```

A domain page may include: domain name; current score or readiness; rating where defensible; direction; standard context; explaining metrics; progress over time; What Oli Sees; full analysis; deep data and provenance.

Do not lead with raw data.

---

## 15. Professional Plans

Professional-created plans remain structurally separate from Oli analytics.

A plan must preserve: author/source, professional identity where applicable, program name, duration, current phase or week, planned sessions/actions, plan details, version and provenance when available.

Oli may: store/represent the plan; connect execution; measure adherence; analyze outcomes; explain what changed during the plan.

Oli may not: pretend Oli authored a professional plan; automatically modify the plan; present analytics as a professional prescription.

---

## 16. Execution Analytics

Answer: **Did I actually do what was planned?**

Potential analytics: planned vs completed sessions, adherence, training volume, intensity, nutrition/cardio completion, recovery consistency, confidence and evidence.

---

## 17. Progress Experience

Progress answers: **Is what I am doing actually working?** / **How am I changing?**

Potential sections: current plan/program, execution, adherence, outcomes, supporting changes, What Oli Sees, evidence, confidence.

Oli stops at analysis. Oli must not automatically modify the plan.

---

## 18. Professional Analytics

Longer-term professional analytics may summarize Current State, program period, adherence, outcomes, meaningful changes, associations, confidence, and evidence sufficiency.

Professionals receive intelligence. Professionals make professional decisions.

**Future stage — not first implementation work.**

---

## 19. Primary Navigation

Approved first-release information architecture:

| Destination | Question | Contains |
|-------------|----------|----------|
| **Home** | Where am I? | Current State, standards, direction, What Oli Sees |
| **Plan** | What am I doing? | Human-created or externally sourced plans, scheduled execution, program details |
| **Progress** | How am I changing? | Execution, adherence, outcomes, trends, Oli analysis |
| **You** | What does Oli know about me? | Profile, devices, assessments, labs, health info, professionals, history, privacy, export, deletion, settings |

**Not implemented** by this vision document alone. Merged code may still show Dash / domain dock / Command Center pressure — see [SYSTEM_STATE](../../20_architecture/SYSTEM_STATE.md).

---

## 20. Invisible Intelligence Engine

Analytical flow:

```text
COLLECT → ORGANIZE → NORMALIZE → ESTABLISH BASELINES → COMPARE AGAINST STANDARDS
→ MEASURE CHANGE → DETECT SIGNALS → ANALYZE RELATIONSHIPS → ASSESS CONFIDENCE
→ EXPLAIN → UNDERSTANDING
```

Preserve the code-truth pipeline:

```text
RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext → UI
```

The analytics-first vision strengthens this pipeline; it does not replace it.

---

## 21. Product Development Laws

1. Pursue Excellence
2. Truth Before Motivation
3. Good and Excellent Are Different
4. Progress Matters
5. Never Manufacture Certainty
6. Show Confidence
7. Correlation Is Not Causation
8. Oli Does Not Prescribe
9. Humans Remain in Control
10. Analyze Instead of Dumping Data
11. Progressive Disclosure
12. Complexity Belongs to Oli

---

## 22. Feature Acceptance Test

Evaluate proposed features with these **four** questions (source material said “five” but supplied four — a fifth remains a leadership decision; do not invent one):

1. Does this help Oli understand the individual better?
2. Does this help Oli measure progress toward excellence?
3. Does this help Oli explain something meaningful?
4. Does this reduce the analytical burden on the user or professional?

---

## 23. First-Release Boundaries

In scope for the analytics-first consumer launch direction: ownership, minimal onboarding, honest data readiness, seven-domain Current State, defensible standards, confidence, What Oli Sees, human-authored Plan representation, execution/adherence/outcome analytics, privacy/export/deletion, reliability.

Out of P0: Oli-authored professional plans; autonomous plan modification; generic chatbot; unsupported causation; Campus operations; marketplace; broad professional platform; overall score without methodology; fabricated complete domain scores.

---

## 24. Long-Term Campus and Professional Compatibility

Campus and professional platform expansion remain compatible **after** the consumer analytics core, without changing the authority boundary:

> Professionals plan. People execute. Oli analyzes.

The consumer record and analytics model remain location-independent. Campus is deferred pending an Operations OS ADR. Professional analytics are intelligence for humans — not autonomous prescription engines.
