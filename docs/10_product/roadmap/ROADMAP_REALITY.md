# Roadmap — Reality Based (Consumer Launch)

**Status:** Current execution roadmap
**Version:** 2.0
**Effective date:** 2026-08-14
**Last operational refresh:** 2026-09-25
**Authority level:** T2 execution roadmap (subordinate to Constitution and code/CI)
**Supersedes:** 2026-08-10 Today / coordinated My Plan / adaptation roadmap
**Merged baseline:** `5835051715ceea5e1a1cece12f28a9af53e206e7` (PR #221 Stage 3C; includes Stage 3B PR #220, Stage 3A PR #219, Stage 2 PR #217)
**Stage 2 merge commit:** `c92ca0518366f0ef7b5e3af08e127fb623506622`
**Stage 2 final implementation head:** `2e8cbb7b83b7c2b311e5dccc2bcfda23b5ce6ffc`
**Stage 2 physical runtime SHA:** `255f7101db7a111471ca38b92813cb426e762007` (physical-iPhone **PASS**; ancestor of `main`)
**Stage 3A merge commit:** `b366744007bf771a0796f8499e9be224d226e6b6` (PR #219)
**Stage 3A branch (historical):** `docs/body-composition-definition-evidence-audit-v1` (documentation only)
**Stage 3B merge commit:** `0124c641f119150c7ed105cef8fd0b8f7d19cd8d` (PR #220)
**Stage 3B branch (historical):** `feat/body-composition-stage3b-value-first-shell`
**Stage 3B physical runtime SHA:** `c962d36ef947e67e03092df9ed8207de17aef9de` (physical-iPhone **PASS**; ancestor of `main`)
**Stage 3C merge commit:** `5835051715ceea5e1a1cece12f28a9af53e206e7` (PR #221)
**Stage 3C branch (historical):** `feat/body-composition-stage3c-standards-graphs-v1`
**Stage 3C physical runtime SHA:** `e4a23a552910f28241b10b25ae84b46529dab891` (physical-iPhone **PASS**; ancestor of `main`)
**Stage 3C post-merge proof:** **PASS** (1106 / 6714 / 0)
**Stage 3D:** **NOT BEGUN / DEFERRED**
**Stage 3E Body Scans:** **ACTIVE** on `feat/body-composition-stage3e-body-scans-v1` (spec: `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`)
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
- Account export/delete **backend** exists; mobile export UI **merged** (Stage 1B); delete UI and local-data lifecycle **merged** (Stage 1C / PR #215)
- Withings live sync remains orphaned (honest refusal helpers)
- Primary dock on `main`: **Home · Today · Plan · Progress · You** (Stage 2 / PR #217 merged)
- Home category navigation and profile-only onboarding **merged** (Stage 2 / PR #217)
- PR #210 (Today IA) is **CLOSED**, **unmerged**, and based on a superseded navigation doctrine
- PR #178 (Profile floating shortcut / Body salvage candidate) is **CLOSED**, **unmerged**; Body salvage disposition in Stage 3A docs only
- Password reset, public-link infrastructure, You → Account routing, and safe auth error mapping are **merged** (Stage 1A / PR #213)
- Hosted Privacy / Terms / Support pages are **not published** (**RG-LEGAL-01 OPEN**)
- Ordinary API builds no longer mutate tracked checksum truth (**PR #216 merged**)
- Stage 3A Body Composition definition audit **merged** (PR #219 at `b366744…`); RFC/ADR **Accepted** 2026-09-18 with guardrails (not implemented as classification runtime)
- Stage 3B Body Composition value-first shell **MERGED** (PR #220 at `0124c641f119150c7ed105cef8fd0b8f7d19cd8d`; physical PASS `c962d36ef947e67e03092df9ed8207de17aef9de`)
- Weight remains the **only** classified Body metric; Body Fat / Lean Mass numerical personal placement **BLOCKED** pending leadership decision
- Stage 3C asymmetric Body Fat Gallagher ranges + Lean Mass composition-share **leadership-approved**; prior physical `050d338…` **SUPERSEDED**
- Personal Body Fat / Lean Mass markers **BLOCKED**
- Stage 3C Body Composition standards/graphs **MERGED** (PR #221 at `5835051715ceea5e1a1cece12f28a9af53e206e7`; physical `e4a23a55…`; post-merge proof **PASS**)
- Stage 3D Body Facts and Measurement Provenance **NOT BEGUN / DEFERRED**
- Stage 3E Body Scans Foundation **ACTIVE** (not merged; production flag disabled)

## What does not exist yet (launch-critical under analytics-first)

- Unified Current State / What Oli Sees / confidence contracts as one product system
- Human-authored Plan representation with provenance (no Oli authorship)
- Execution, adherence, and outcome Progress analytics as a first-class surface
- Durable consent architecture (RFC/ADR approved; persistence deferred); export UI **merged** (Stage 1B); delete UI **merged** (Stage 1C); minimal onboarding **merged** (Stage 2 / PR #217)
- Crash reporting product; production Firebase project config
- Defensible overall score methodology (gated; not a P0 assumption)
- Body Composition Stage 3C exact numerical Body Fat / Lean Mass standards (**DEFERRED** — not required to close Stage 3C v1)
- Body Composition Stage 3D facts/provenance and official Body Fat/Lean Mass classification / facts-first trends (blocked; Stage 3D **not begun**)
- Body salvage from PR #178 (deferred; do not cherry-pick)

---

## Stages (dependency order)

| Stage | Name | Intent |
|------:|------|--------|
| **R0** | Analytics-First Product Direction Reset | Vision, decisions, roadmap, progress map, system state, index, delta audit, PR #210 disposition (**docs only**) — **merged** (PR #211) |
| **R1** | PR #210 disposition & four-destination IA | Home · Plan · Progress · You; retire Command Center as home; reuse honest cleanup; no false capabilities; no Oli-authored plan — **merged** (PR #212) |
| **1A** | Account recovery, Account routing, legal/support foundation | Password-reset request; You → Account; public-link contract; honest absent-config behavior (**RG-LEGAL-01** for hosted pages) |
| **1B** | Consent and consumer data export | Consent architecture + export UI; **durable legal assent inactive until RG-LEGAL-01** |
| **1C** | Account deletion and local data lifecycle | Delete UI; reauthentication; local purge; coverage closure |
| **2** | Profile-only onboarding & Home category entry | Opening → About You → Home; source connection contextual in categories / Connected Devices; Home presents seven health & performance category cards; no subjective goals questionnaire |
| **3A** | Body Composition definition & evidence audit | Repository-truth audit; evidence matrix; product/standards specification; RFC/ADR — **MERGED** (PR #219 at `b366744…`); **Accepted** 2026-09-18 with guardrails |
| **3B** | Body Composition value-first shell | Weight / Body Fat / Lean Mass cards; approved Weight BMI screening; safe BF/Lean display derivations; metric-specific Apple Health; local metric sync scopes — **MERGED** (PR #220 at `0124c641…`; physical `c962d36…`). Weight is the only classified Body metric. Body Fat/Lean unclassified. No Body score, aggregates, schema, Insights. |
| **3C** | Standards, trend details, display modes | Total Mass → Weight; Components → Body Fat + Lean Mass; Gallagher BF educational ranges; Lean composition-share; shared detail trends + display modes; complete BF AH history — **MERGED** (PR #221 at `58350517…`; physical `e4a23a55…`; post-merge proof **PASS**). |
| **3D** | Body Facts and Measurement Provenance | Facts-first Body authority; measurement method; device/app provenance; uncertainty; like-with-like identity; truth consolidation; recomputability; versioning; bounded DTOs — **NOT BEGUN / DEFERRED**. Must not auto-implement personal markers or numerical standards. |
| **3E** | Body Scans foundation | Periodic DXA/InBody/Evolt/Bod Pod/Other PDF assessments; designed results + original evidence; Document OS reuse; Live Lean DXA adapter; no scan/scale mixing — **ACTIVE** (not merged; prod flag off). |
| **3B+** | Later Body Category Intelligence | Baseline inputs → facts-first markers → optional health classification → method-specific trends → reusable Category Intelligence — only after repository blockers and separate authorization (Stage 3D+) |
| **3** | Analytics truth contracts | Baseline, standards registry, trend, confidence, completeness, evidence, association/causation language, versioning — **RFC/ADR before schema**. Includes unfinished-day activity presentation (do not label an in-progress day **Sedentary** from a stored zero / empty HealthKit aggregate; R1 only omitted measured-zero on Home Movement). Body Composition standards feed this stage; durable standards-registry location still UNRESOLVED before Body classification persistence. |
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

**Current stage:** **Stage 3E Body Scans Foundation ACTIVE** (`feat/body-composition-stage3e-body-scans-v1`; base `5835051715ceea5e1a1cece12f28a9af53e206e7`). Stage 3C **MERGED** (PR #221 at `58350517…`; physical `e4a23a55…` **PASS**; post-merge proof **PASS**). Stage 3B **MERGED** (PR #220 at `0124c641…`; physical `c962d36…`). Stage 3A **MERGED** (PR #219 at `b366744…`). Stage 3D **NOT BEGUN / DEFERRED**. Weight remains the only personally classified Body metric; Body Fat shows Gallagher educational numerical ranges; Lean Mass keeps composition-share; detail pages share one trend + display-mode system. Body Scans must not mix into continuous scale trends.

**Stage 3A (MERGED — docs):**
- Repository-truth audit; evidence matrix; product/standards specification; RFC/ADR
- Human approval **2026-09-18 APPROVED WITH GUARDRAILS**
- RFC/ADR **Accepted** (architecture/standards; classification runtime not implemented)
- Merge commit `b366744007bf771a0796f8499e9be224d226e6b6`
- Repository blockers recorded for later facts/classification stages

**Stage 3B (MERGED — PR #220):**

- Merge commit: `0124c641f119150c7ed105cef8fd0b8f7d19cd8d`
- Physical runtime SHA: `c962d36ef947e67e03092df9ed8207de17aef9de` (**PASS**; ancestor of `main`)
- Weight / Body Fat / Lean Mass landing; Weight BMI screening implemented — **only classified Body metric**
- Body Fat / Lean Mass unclassified (compatible presentation derivations only)
- Metric-specific Apple Health popups + Settings; local metric sync scopes accepted
- No Body score / aggregates / Optimized/Excellence / AH→BIA / ALMI claims
- **RG-LEGAL-01 OPEN**; **RG-SOURCE-PRIVACY-01 OPEN** (Issue [#218](https://github.com/danielhendel/oli/issues/218) OPEN); export coverage/scalability **OPEN**
- No staging/production deploy from Stage 3B

**Stage 3C (MERGED — PR #221):**

- Merge commit: `5835051715ceea5e1a1cece12f28a9af53e206e7`
- Physical runtime SHA: `e4a23a552910f28241b10b25ae84b46529dab891` (**PASS**, 2026-09-25; ancestor of `main`)
- Post-merge proof: **PASS** (1106 suites / 6714 tests / 0 skipped)
- Landing hierarchy; Gallagher BF educational ranges; Lean composition-share; shared detail trends; display modes; complete BF AH history (**5Y** / **All** policy; `appleHealth:bodyFatBackfillState:{uid}`)
- Weight only personal classifier; ACE **REJECTED**; no Body score; no Muscle Mass
- Stage 3D **NOT BEGUN / DEFERRED**; Stage 3E Body Scans **ACTIVE**
- **RG-LEGAL-01 OPEN**; **RG-SOURCE-PRIVACY-01 OPEN**; export coverage/scalability **OPEN**
- No staging/production deploy from Stage 3C; no backend / Firestore standards path
- Completion audit: `docs/90_audits/2026-09-25-stage3c-body-composition-standards-graphs-completion.md`

**Stage 3E (ACTIVE — Body Scans foundation):**

- Branch: `feat/body-composition-stage3e-body-scans-v1`
- Base: `5835051715ceea5e1a1cece12f28a9af53e206e7`
- Product/data: `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`
- Designed results + original PDF; Document Ingestion OS reuse; Live Lean DXA adapter; no scan/scale trend mixing
- Feature flag `bodyScans`: development enabled; production **disabled**
- Physical real-PDF test **required** (do not commit personal PDF)
- **RG-LEGAL-01 OPEN**; **RG-SOURCE-PRIVACY-01 OPEN**; export coverage/scalability **OPEN**
- No staging/production deploy from Stage 3E implementation agent

**Stage 2:** **MERGED** (PR #217) at `c92ca0518366f0ef7b5e3af08e127fb623506622`.
**Stage 1C:** **MERGED** (PR #215) at `d7f4fd0548a6e1d34e3870310e0b0479cdd9a137`; physical-iPhone deletion E2E **PASS** (2026-09-04).
**Stage 1B:** **MERGED** (PR #214) at `3d4859e45d537813b6846ecaf4cb49222519ef80`; physical-iPhone export E2E **PASS** (2026-08-29).
**Stage 1A:** Merged (PR #213) at `10f85ee3d377d25075353c152b27611b6b572c84`; physical-iPhone password-recovery smoke **PASS** (2026-08-22).
**R0:** Merged (PR #211) at `55e2ad6762949bb09006f8beefd95bae60dbd9bb`.
**R1:** Merged (PR #212) at `f502d8b83a3b2ad309c92ae8433ef14ea5c71c10`.
**Build hygiene:** **MERGED** (PR #216) at `8027c1c1d3b1a97a408c237d9a6655174a05aa0e`.
**Release gate:** **RG-LEGAL-01 OPEN** (hosted Privacy / Terms / Support not published).
**Release gate:** **RG-SOURCE-PRIVACY-01 OPEN** (unconnected source-isolation E2E deferred; leadership-accepted residual risk — see `docs/90_audits/2026-09-16-stage2-source-privacy-risk-acceptance.md`; Issue [#218](https://github.com/danielhendel/oli/issues/218) OPEN).
**Staging runtime (historical Stage 2):** Cloud Run `oli-api-00276-hjm`; Gateway `oli-api-config-20260830-082245`; Firebase `oli-staging-fdbba`.
**Export:** Physical E2E **PASS**. Coverage closure **OPEN**. Scalability gate **OPEN**.
**Consent:** Architecture approved for future implementation; **persistence not implemented**; legal assent **inactive**.
**Production deploy:** **none**.

Durable Terms/Privacy assent remains **inactive** until RG-LEGAL-01 passes. Stage 3C must not weaken release gates.

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
 → 1C Account deletion + local data lifecycle — **MERGED** (PR #215)
 → 2 Profile-only onboarding + Home category entry — **MERGED** (PR #217; physical PASS `255f710…`; RG-SOURCE-PRIVACY-01 OPEN)
 → 3A Body Composition definition & evidence audit — **MERGED** (PR #219 at `b366744…`; Accepted 2026-09-18 with guardrails)
 → 3B Body Composition value-first shell — **MERGED** (PR #220 at `0124c641…`; physical `c962d36…`)
 → 3C Standards, trend details, display modes — **MERGED** (PR #221 at `58350517…`; physical `e4a23a55…` **PASS**; post-merge proof **PASS**)
 → 3E Body Scans foundation — **ACTIVE** (not merged; prod flag off; physical real-PDF test required)
 → 3D Body Facts and Measurement Provenance — **NOT BEGUN / DEFERRED** (must not auto-implement personal reference markers or numerical standards)
 → 3 Analytics truth contracts (RFC/ADR) — **NOT BEGUN** (Body standards feed this; registry location UNRESOLVED)
 → 3D+ Body Category Intelligence (facts/classification/trends) — **NOT BEGUN** (blocked until repository gaps + separate auth)
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
