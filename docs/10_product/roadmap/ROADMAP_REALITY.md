# Roadmap — Reality Based (Consumer Launch)

**Status:** Current execution roadmap
**Version:** 2.0
**Effective date:** 2026-08-14
**Last operational refresh:** 2026-08-29
**Authority level:** T2 execution roadmap (subordinate to Constitution and code/CI)
**Supersedes:** 2026-08-10 Today / coordinated My Plan / adaptation roadmap
**Merged baseline:** `3d4859e45d537813b6846ecaf4cb49222519ef80` (Stage 1B / PR #214)
**R0 baseline:** `55e2ad6762949bb09006f8beefd95bae60dbd9bb` (PR #211)
**Prior Stage 1A truth freeze:** `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e` (PR #209)
**Product decisions:** [CONSUMER_LAUNCH_PRODUCT_DECISIONS.md](../decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)
**Vision:** [VISION.md](../vision/VISION.md)
**Progress map:** [REPO_TRUTH_PROGRESS_MAP.md](../../00_truth/REPO_TRUTH_PROGRESS_MAP.md)
**Direction delta:** [2026-08-14 delta audit](../../audits/2026-08-14-analytics-first-product-direction-delta.md)
**Historical audit roadmap:** [2026-08-10-consumer-launch-roadmap.md](../../audits/2026-08-10-consumer-launch-roadmap.md) (immutable evidence)

This roadmap reflects **dependency-ordered completion gates** for the analytics-first consumer product, aligned to merged code truth. It is not a calendar estimate.

> **Hard roadmap law:** No stage may introduce an Oli-authored professional prescription, an autonomous professional-plan modification, or an unsupported causal claim.

---

## What exists today (code truth)

- Firebase Auth (email/password) + API token verification
- Cloud Run API: authenticated ingest, preferences, domain read/write routes
- Idempotent raw event writes; normalization → DailyFacts → Insights → IntelligenceContext
- Portions of the mobile app already consume derived truth (Dash cards, sleep/readiness, weekly fitness, etc.)
- Apple Health and Oura integration paths exist (runtime device proof still required for launch)
- Labs document import / review OS merged
- Account export/delete **backend** exists; mobile export UI **merged** (Stage 1B); delete UI and local-data lifecycle (Stage 1C — **active**)
- Withings live sync remains orphaned (honest refusal helpers)
- Primary dock on `main`: **Home · Plan · Progress · You** (R1 / PR #212 merged)
- PR #210 (Today IA) is **CLOSED**, **unmerged**, and based on a superseded navigation doctrine
- PR #178 (Profile floating shortcut / Body salvage candidate) is **CLOSED**, **unmerged**; Body salvage deferred
- Password reset, public-link infrastructure, You → Account routing, and safe auth error mapping are **merged** (Stage 1A / PR #213)
- Hosted Privacy / Terms / Support pages are **not published** (**RG-LEGAL-01 OPEN**)

## What does not exist yet (launch-critical under analytics-first)

- Unified Current State / What Oli Sees / confidence contracts as one product system
- Human-authored Plan representation with provenance (no Oli authorship)
- Execution, adherence, and outcome Progress analytics as a first-class surface
- Durable consent architecture (RFC/ADR approved; persistence deferred); export UI **merged** (Stage 1B physical PASS); delete UI and local-data lifecycle (Stage 1C — **active**)
- Crash reporting product; production Firebase project config
- Defensible overall score methodology (gated; not a P0 assumption)
- Body salvage (deferred)

---

## Stages (dependency order)

| Stage | Name | Intent |
|------:|------|--------|
| **R0** | Analytics-First Product Direction Reset | Vision, decisions, roadmap, progress map, system state, index, delta audit, PR #210 disposition (**docs only**) — **merged** (PR #211) |
| **R1** | PR #210 disposition & four-destination IA | Home · Plan · Progress · You; retire Command Center as home; reuse honest cleanup; no false capabilities; no Oli-authored plan — **merged** (PR #212) |
| **1A** | Account recovery, Account routing, legal/support foundation | Password-reset request; You → Account; public-link contract; honest absent-config behavior (**RG-LEGAL-01** for hosted pages) |
| **1B** | Consent and consumer data export | Consent architecture + export UI; **durable legal assent inactive until RG-LEGAL-01** |
| **1C** | Account deletion and local data lifecycle | Delete UI; reauthentication; local purge; coverage closure |
| **2** | Minimal onboarding & data readiness | Opening → About You → Connect → Understand; honest partial data; no subjective goals questionnaire |
| **3** | Analytics truth contracts | Baseline, standards registry, trend, confidence, completeness, evidence, association/causation language, versioning — **RFC/ADR before schema**. Includes unfinished-day activity presentation (do not label an in-progress day **Sedentary** from a stored zero / empty HealthKit aggregate; R1 only omitted measured-zero on Home Movement). |
| **4** | Seven-domain Current State | Body, Recovery, Movement, Strength, Cardio, Nutrition, Health; honest missing; no fabricated overall score |
| **5** | Home & What Oli Sees | Current State, direction, meaningful analysis, progressive disclosure; no recommendations |
| **6** | Domain detail experiences | Answer → Context → Analysis → Deep Data |
| **7** | Human-created Plan representation | Source, author, duration, schedule, details, provenance; no autonomous authorship/modification |
| **8** | Execution & adherence analytics | Planned vs completed; volume; intensity; consistency; evidence; confidence |
| **9** | Progress & outcome analytics | State vs Progress; program-period outcomes; associations; no invented causation |
| **10** | Professional analytical review | Read-only summary; human interpretation; permissioned access; no autonomous plan changes |
| **11** | Reliability & release hardening | Crash reporting; production Firebase; EAS validation; privacy manifest; source maps; golden paths; TestFlight |
| **12** | Beta validation | New, manual-only, connected, partial-data, returning, degraded, ownership, professional-plan (where supported) personas |
| **13** | Consumer launch | All approved P0 acceptance gates |
| **14+** | Campus & platform expansion | Operations OS ADR; providers; locations; entitlements; reservations; equipment; kitchen; professional platform; multi-location continuity |

**Current stage:** **Stage 1C — Account Deletion and Local Data Lifecycle** (**active** on `feat/consumer-stage1c-account-deletion-lifecycle`).
**Stage 1B:** **MERGED** (PR #214) at `3d4859e45d537813b6846ecaf4cb49222519ef80`; physical-iPhone export E2E **PASS** (2026-08-29).
**Stage 1A:** Merged (PR #213) at `10f85ee3d377d25075353c152b27611b6b572c84`; physical-iPhone password-recovery smoke **PASS** (2026-08-22).
**R0:** Merged (PR #211) at `55e2ad6762949bb09006f8beefd95bae60dbd9bb`.
**R1:** Merged (PR #212) at `f502d8b83a3b2ad309c92ae8433ef14ea5c71c10`.
**Release gate:** **RG-LEGAL-01 OPEN** (hosted Privacy / Terms / Support not published).
**Staging export runtime (physical PASS 2026-08-29):** Cloud Run `oli-api-00273-rg2`; Function 4 GiB / 540 s; Firebase `oli-staging-fdbba`.
**Export:** Physical E2E **PASS** (request → pending → restore → ready → download → share; offline/reconnect; sign-out restoration). Coverage closure **OPEN**. Scalability gate **OPEN** (`docs/90_audits/export-scalability-gate.md`).
**Consent:** Architecture approved for future implementation (`docs/80_rfc/RFC-consumer-consent-persistence-v1.md`, `docs/70_adrs/ADR-consumer-consent-architecture-v1.md`); **persistence not implemented**; legal assent **inactive**.
**Planned next after Stage 1C merges:** **Stage 2 — Minimal Onboarding and Data Readiness** (**not begun**).

Durable Terms/Privacy assent remains **inactive** until RG-LEGAL-01 passes. Stage 1B must not record acceptance of unpublished documents.

### Stage 1A acceptance split

#### Engineering acceptance (Stage 1A / PR #213) — **PASS on branch**

* Account routing (You → Account distinct from Settings) — physical PASS
* Password-recovery request + enumeration-safe feedback — physical PASS
* Reset email delivery + password confirmation + new-password sign-in — physical PASS
* Raw Firebase auth errors eliminated from consumer Sign In — verified
* Error / offline / retry handling — physical PASS
* Typed public-link contract + external-link service
* Honest absent-config behavior (omit unavailable document actions; no fake URLs) — physical PASS
* Tests + physical-iPhone password-recovery smoke — PASS
* Home landing after reset sign-in — PASS; dock **Home · Plan · Progress · You**

#### RG-LEGAL-01 — Public Legal and Support Readiness (OPEN)

Required before:

* Durable legal consent activation
* External TestFlight
* App Store submission
* Public production release

Required variables:

```text
EXPO_PUBLIC_PRIVACY_POLICY_URL
EXPO_PUBLIC_TERMS_OF_SERVICE_URL
EXPO_PUBLIC_SUPPORT_URL
```

Required release evidence: approved content; stable public HTTPS pages; EAS environment configuration; physical-iPhone hosted-page verification; App Store metadata; version/effective dates.

Stage 1B may design consent storage and build Data Export, but must not claim acceptance of unpublished documents.
Stage **1C** under the old Today/My Plan roadmap is **not** the immediate next step.

### Critical path

```text
R0 Product authority reset (docs) — MERGED (PR #211)
 → R1 Four-destination IA + PR #210 disposition — MERGED (PR #212)
 → 1A Account recovery + legal/support foundation — **MERGED** (PR #213; RG-LEGAL-01 OPEN)
 → 1B Consent + data export — **MERGED** (PR #214)
 → 1C Account deletion + local data lifecycle — **ACTIVE**
 → 2 Minimal onboarding / data readiness — **NOT BEGUN**
 → 3 Analytics truth contracts (RFC/ADR)
 → 4 Seven-domain Current State
 → 5 Home + What Oli Sees
 → 6 Domain detail
 → 7 Human Plan representation
 → 8 Execution / adherence
 → 9 Progress / outcomes
 → 10 Professional analytical review
 → 11 Release harden
 → 12 Beta
 → 13 Launch
 → 14+ Campus / platform
```

### Explicitly deferred from P0

- Campus operations, reservations, equipment, kitchen, membership
- Professional coaching marketplace / assignment as launch dependency
- Garmin / WHOOP / Withings live restore
- IAP (until entitlement decision)
- Generic AI chatbot / autonomous medical or training prescription
- Oli-authored My Plan and autonomous plan adaptation
- Equal fabricated depth across all seven domains
- Overall score without defensible methodology
- Body salvage from PR #178

---

## Code Check Gate (every stage)

```bash
npm ci
npm run check
# or individually:
npm run typecheck
npm run lint
npm run check:invariants
npm run check:client-trust-boundary
npm test -- --ci
```

`npm run typecheck` and `npm test` build `@oli/contracts` dist first (`npm run build:contracts`).

---

## Historical note

The 2026-08-10 roadmap and closed PR #210 assumed Today as home and a coordinated My Plan / adaptation loop. That product doctrine is superseded for current consumer authority. Prefer this document, the progress map, and Vision v2 over any archived or Draft Stage 1B copy.

PR #209 (“Stage 1A truth freeze”) was a docs/CI freeze gate and is **not** the same as this ownership Stage 1A (account recovery + legal/support).
