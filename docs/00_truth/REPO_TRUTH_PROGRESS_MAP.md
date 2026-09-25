# Repo-Truth Progress Map

**Status:** Current operational truth (subordinate to code + CI)
**Last verified:** 2026-09-25
**Merged `main` SHA:** `5835051715ceea5e1a1cece12f28a9af53e206e7`
**R0:** Merged (PR #211) at `55e2ad6762949bb09006f8beefd95bae60dbd9bb`
**R1:** Merged (PR #212) at `f502d8b83a3b2ad309c92ae8433ef14ea5c71c10`
**Prior Stage 1A truth freeze (historical):** Merged (PR #209) at `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
**Audit baseline SHA (historical):** `d43ae878373534dbb4cef84c4958221ace826792`
**Current execution-stage label:** `Stage 3E — Body Scans Foundation V1` (**ACTIVE**). Stage 3C **MERGED** (PR [#221](https://github.com/danielhendel/oli/pull/221) at `5835051715ceea5e1a1cece12f28a9af53e206e7`; physical `e4a23a552910f28241b10b25ae84b46529dab891` **PASS**; post-merge proof **PASS**). Stage 3B **MERGED** (PR #220). Stage 3A docs **MERGED** (PR #219). Stage 3D **NOT BEGUN / DEFERRED**. No deployment from Stage 3E implementation.
**Stage 1B:** **MERGED** (PR #214 at `3d4859e45d537813b6846ecaf4cb49222519ef80`)
**Stage 1C:** **MERGED** (PR #215 at `d7f4fd0548a6e1d34e3870310e0b0479cdd9a137`)
**Build hygiene:** **MERGED** (PR #216 at `8027c1c1d3b1a97a408c237d9a6655174a05aa0e`)
**Stage 2:** **MERGED** (PR #217 at `c92ca0518366f0ef7b5e3af08e127fb623506622`)
**Stage 2 final implementation head:** `2e8cbb7b83b7c2b311e5dccc2bcfda23b5ce6ffc` (ancestor of `main`)
**Stage 2 physical runtime SHA:** `255f7101db7a111471ca38b92813cb426e762007` (**PASS**; ancestor of `main`)
**Stage 3A:** **MERGED** (PR [#219](https://github.com/danielhendel/oli/pull/219) at `b366744007bf771a0796f8499e9be224d226e6b6`)
**Stage 3A branch (historical):** `docs/body-composition-definition-evidence-audit-v1`
**Stage 3B:** **MERGED** (PR [#220](https://github.com/danielhendel/oli/pull/220) at `0124c641f119150c7ed105cef8fd0b8f7d19cd8d`)
**Stage 3B branch (historical):** `feat/body-composition-stage3b-value-first-shell`
**Stage 3B physical runtime SHA:** `c962d36ef947e67e03092df9ed8207de17aef9de` (**PASS**; ancestor of `main`)
**Stage 3C:** **MERGED** (PR [#221](https://github.com/danielhendel/oli/pull/221) at `5835051715ceea5e1a1cece12f28a9af53e206e7`)
**Stage 3C branch (historical):** `feat/body-composition-stage3c-standards-graphs-v1`
**Stage 3C physical runtime SHA:** `e4a23a552910f28241b10b25ae84b46529dab891` (**PASS**; ancestor of `main`)
**Stage 3C post-merge proof:** **PASS** (suites/tests/skipped: 1106 / 6714 / 0)
**Stage 3D:** **NOT BEGUN / DEFERRED**
**Stage 3E Body Scans:** **ACTIVE** on `feat/body-composition-stage3e-body-scans-v1` — foundation V1 **implemented on branch, not merged** (product/data: `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`; implementation truth: `docs/00_truth/phase3/STAGE_3E_BODY_SCANS_IMPLEMENTATION_TRUTH.md`)

> **Rule:** If this map conflicts with merged code or CI, **code and CI win**. Update this map; do not invent product truth from docs alone.

> **R0 status:** Complete and merged (PR #211). Do **not** treat R0 as in-progress.

> **R1 status:** Complete and merged (PR #212). Historical four-destination dock superseded by Stage 2.

> **Stage 1A status:** **Merged** (PR [#213](https://github.com/danielhendel/oli/pull/213) at `10f85ee3d377d25075353c152b27611b6b572c84`). Password recovery verified on physical iPhone. Public-link infrastructure merged. Hosted legal/support pages **not published**. **RG-LEGAL-01 OPEN**. Durable legal assent remains **inactive**.
>
> **Stage 1B status:** **MERGED** (PR [#214](https://github.com/danielhendel/oli/pull/214) at `3d4859e45d537813b6846ecaf4cb49222519ef80`). Consumer Data Export physical E2E **PASS** on staging. Consent architecture approved for future implementation; durable consent persistence **not implemented**. Legal assent **inactive**. **RG-LEGAL-01 OPEN**.
>
> **Stage 1C status:** **MERGED** (PR [#215](https://github.com/danielhendel/oli/pull/215) at `d7f4fd0548a6e1d34e3870310e0b0479cdd9a137`). In-app account deletion implemented and physically verified. Server-side deletion lifecycle and local account-transition isolation implemented. Consent persistence **not implemented**. Legal assent **inactive**. **RG-LEGAL-01 OPEN**. Export coverage closure **OPEN**. Export scalability gate **OPEN**. Infrastructure CI validation truth gap **OPEN**. Production deploy **none**.
>
> **PR #216 status:** **MERGED** at `8027c1c1d3b1a97a408c237d9a6655174a05aa0e`. Ordinary API builds no longer mutate tracked checksum truth. Local `main` synchronized to `origin/main`.
>
> **Stage 2 status:** **MERGED** (PR [#217](https://github.com/danielhendel/oli/pull/217) at `c92ca0518366f0ef7b5e3af08e127fb623506622`). Profile-only onboarding **Opening → About You → Home**. Primary IA on `main`: **Home · Today · Plan · Progress · You**. Home is domain map (full-width category cards + drawer); Today is a separate destination owning Daily Monitor. Source connection contextual. Focused static/automated source-gate tests PASS; complete two-disposable-account server-side evidence **deferred by product leadership** — **LEADERSHIP-ACCEPTED RESIDUAL RISK**; **RG-SOURCE-PRIVACY-01 OPEN**. Consent persistence **not implemented**. Legal assent **inactive**. **RG-LEGAL-01 OPEN**. Export coverage closure **OPEN**. Export scalability gate **OPEN**. Infrastructure CI validation truth gap **OPEN**. Production deploy **none**.
>
> **Stage 3A status:** **MERGED** (PR [#219](https://github.com/danielhendel/oli/pull/219) at `b366744007bf771a0796f8499e9be224d226e6b6`). Human approval **2026-09-18 APPROVED WITH GUARDRAILS**. RFC/ADR **Accepted** (architecture/standards direction; classification runtime **not** implemented). Product/standards spec accepted with guardrails. Official Body Fat/Lean Mass classification / personal rail placement / facts-first trends **blocked**. **RG-LEGAL-01 OPEN**. **RG-SOURCE-PRIVACY-01 OPEN** (Issue [#218](https://github.com/danielhendel/oli/issues/218) OPEN). Export coverage/scalability **OPEN**. No staging or production deployment from Stage 3A/3B/3C.
>
> **Stage 3B status:** **MERGED** (PR [#220](https://github.com/danielhendel/oli/pull/220) at `0124c641f119150c7ed105cef8fd0b8f7d19cd8d`). Physical runtime SHA `c962d36ef947e67e03092df9ed8207de17aef9de` **PASS** (product leadership 2026-09-20; ancestor of `main`). Weight CDC/WHO adult BMI screening **IMPLEMENTED** — Weight remains the **only** classified Body metric. Body Fat / Lean Mass **unclassified** at Stage 3C start (presentation + compatible derivations only). Metric-specific Apple Health popups + local `appleHealth:metricSyncScopes:{uid}` preference **IMPLEMENTED**. Backend/Firestore schema **unchanged**. Release gates remain **OPEN**.
>
> **Stage 3C status:** **MERGED** (PR [#221](https://github.com/danielhendel/oli/pull/221) at `5835051715ceea5e1a1cece12f28a9af53e206e7`). Physical runtime SHA `e4a23a552910f28241b10b25ae84b46529dab891` (**PASS**, 2026-09-25; ancestor of `main`). Post-merge proof **PASS** (1106 / 6714 / 0). Landing IA **APPROVED**: Total Mass → Weight; Components → Body Fat + Lean Mass. Body Fat Gallagher educational ranges **APPROVED FOR STAGE 3C V1** (`gallagher-4c-bmi-equivalent-body-fat-reference` / `2000.1`); personal Body Fat classification **BLOCKED**. Lean Mass numerical reference **BLOCKED**; composition-share **APPROVED**. Detail trend pages + display modes **COMPLETE**. Complete Body Fat Apple Health history (**5Y** / **All**; checkpoint `appleHealth:bodyFatBackfillState:{uid}`). Weight remains the **only** approved personal Body classifier. ACE **REJECTED**. No Body score; no Muscle Mass. Stage 3D **NOT BEGUN / DEFERRED**. Stage 3E Body Scans **ACTIVE**. No staging/production deploy from Stage 3C. No new Firestore standards path. Completion audit: `docs/90_audits/2026-09-25-stage3c-body-composition-standards-graphs-completion.md`.
>
> **Stage 3E status:** **ACTIVE** on `feat/body-composition-stage3e-body-scans-v1` (base `5835051715ceea5e1a1cece12f28a9af53e206e7`). Body Scans foundation V1 — designed results + original PDF evidence; Document Ingestion OS reuse; DXA Live Lean / GE Lunar adapter; InBody/Evolt/Bod Pod/Other store + manual review; no scan/scale trend mixing; production `bodyScans` flag disabled; release gates remain **OPEN**. Product/data: `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`. No staging/production deploy from Stage 3E implementation agent.

---

## Authority

1. Merged code on `main`
2. `docs/INDEX.md` + `docs/00_truth/`
3. Automated checks / runtime evidence
4. Current product authority: [VISION](../10_product/vision/VISION.md) · [Consumer decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md) · [Roadmap](../10_product/roadmap/ROADMAP_REALITY.md)
5. [2026-08-14 product-direction delta](../audits/2026-08-14-analytics-first-product-direction-delta.md) (decision support)
6. [2026-08-10 consumer-launch audit set](../audits/2026-08-10-consumer-launch-repo-audit.md) (historical)
7. Legacy docs

Schema/code authority for shared contracts: **`lib/contracts` source** (emitted to gitignored `lib/contracts/dist` via `npm run build:contracts`).

---

## PR #212 (MERGED — R1)

| Field | Value |
|-------|-------|
| PR | [#212](https://github.com/danielhendel/oli/pull/212) |
| Branch | `feat/analytics-first-r1-four-destination-ia` |
| Merge commit | `f502d8b83a3b2ad309c92ae8433ef14ea5c71c10` |
| State | **MERGED** |
| Product result | Primary dock **Home · Plan · Progress · You** on `main` |

---

## PR #213 (MERGED — Stage 1A)

| Field | Value |
|-------|-------|
| PR | [#213](https://github.com/danielhendel/oli/pull/213) |
| Branch | `feat/consumer-stage1a-account-recovery-legal` |
| Merge commit | `10f85ee3d377d25075353c152b27611b6b572c84` |
| State | **MERGED** |
| Product result | Account routing, password recovery, public-link infrastructure, safe auth error mapping |

---

## PR #178 (CLOSED — unmerged)

| Field | Value |
|-------|-------|
| PR | [#178](https://github.com/danielhendel/oli/pull/178) |
| Branch | `feat/profile-floating-shortcut` (**preserved**; do not delete) |
| State | **CLOSED**, unmerged |
| Product basis | Floating Profile fifth-destination / Body salvage candidate |
| Salvage | **Body salvage deferred** to later approved analytics stages |
| Action | Do **not** reopen, merge, rebase, or cherry-pick into Stage 1A |

---

## PR #210 (CLOSED — superseded, unmerged)

| Field | Value |
|-------|-------|
| PR | [#210](https://github.com/danielhendel/oli/pull/210) |
| Branch | `feat/consumer-launch-stage1b-today-ia` (**preserved**; do not delete) |
| Head | `f64c69736c15b2877789ab2dee0a06c2e9edfaa7` |
| State | **CLOSED**, unmerged |
| Product basis | Superseded **Today / domain-tab** direction |
| Salvage | Reusable cleanup only; already reimplemented intentionally on R1 — **do not merge, reopen, rebase, or cherry-pick** |

Stage **1C** under the old Today/My Plan roadmap is **no longer** the immediate next step.

---

## Verified / strong foundations

Technical foundations from the August 10 audit remain valid unless merged code disproves them:

- Firebase email/password auth substrate (R1 physical-iPhone sign-in, sign-out, and session restore PASS; password reset **merged in Stage 1A**)
- Cloud Run API as authenticated ingest / public API boundary
- Client trust boundary (no Firestore in `app/` / `components/`)
- Constitutional invariant CI checks
- RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext pipeline (backend)
- Account export/delete **backend** routes + Functions
- Domain verticals: Apple Health workouts/steps/body paths, Oura sleep/readiness paths, nutrition logging, labs import OS

## Partial product capabilities (merged `main`)

- Primary dock: **Home · Today · Plan · Progress · You** (filesystem Home remains `/(app)/(tabs)/dash`)
- Home: compact **Oli** header + hamburger drawer + seven full-width **My Health & Performance** category cards (Stage 2 / PR #217)
- Today: separate primary destination owning Daily Monitor
- Plan: honest empty state; placeholder builders not launch-facing
- Progress: Weekly Progress once (when relocation flag ON) + history links
- You: profile, devices, assessments, labs, privacy, settings, Account, failures, domain discovery
- Assessment / Baseline / Target UI with **in-memory** assessment store
- Ownership backend complete; mobile export UI **merged** (Stage 1B); delete-account UI **merged** (Stage 1C / PR #215)
- Account route at `/(app)/settings/account`; You → Account routing **merged** (Stage 1A)
- Profile-only onboarding **Opening → About You → Home** **merged** (Stage 2 / PR #217)

## Stage 1A (MERGED — RG-LEGAL-01 OPEN)

- Merged via PR [#213](https://github.com/danielhendel/oli/pull/213) at `10f85ee3d377d25075353c152b27611b6b572c84`
- Scope delivered:
  - You → Account → `/(app)/settings/account` (Settings remains distinct) — **physical PASS**
  - Enumeration-safe password-reset request + completion + new-password sign-in — **physical PASS** (`oli-staging-fdbba`)
  - Centralized public-link contract + external open service; missing config **omits** document actions
  - Centralized sign-in/sign-up auth error mapping — raw `Firebase:` / `auth/…` strings eliminated from consumer UI
- **Public-link infrastructure:** Merged
- **Public legal documents:** **Not published**
- **Release gate:** **RG-LEGAL-01 OPEN** — Public Legal and Support Readiness
- **Physical-iPhone staging smoke (2026-08-22):** **PASS**

## Stage 1B (MERGED — RG-LEGAL-01 OPEN)

- Merged via PR [#214](https://github.com/danielhendel/oli/pull/214) at `3d4859e45d537813b6846ecaf4cb49222519ef80`
- Branch (historical): `feat/consumer-stage1b-consent-export`
- Baseline `main` (Stage 1A merge): `10f85ee3d377d25075353c152b27611b6b572c84`
- Staging (physical E2E): Firebase `oli-staging-fdbba`; Cloud Run **`oli-api-00273-rg2`**; Function `onAccountExportRequested` **4 GiB / 540 s**
- Canonical consent docs: `docs/80_rfc/RFC-consumer-consent-persistence-v1.md`, `docs/70_adrs/ADR-consumer-consent-architecture-v1.md`
- Scope delivered on branch:
  - Consent architecture RFC/ADR; typed readiness presentation; **durable persistence not implemented** (RG-LEGAL-01 + governance)
  - Consumer Data Export: request → pending → restore → ready → authorized download → iOS share
  - Export API: `GET /export/latest`, `GET /export/:requestId`, `GET /export/:requestId/download`, `POST /export`
  - Stale-pending recovery; signed-URL download IAM (`scripts/admin/apply-export-download-iam.sh`)
  - Operation-specific retry (status refresh vs download); offline/reconnect; sign-out restoration
  - Honest export coverage disclosure in Your Data
- **Stage 1A:** Merged (PR #213)
- **Consent architecture:** approved for **future** implementation
- **Consent persistence:** **not** implemented (no Firestore/API consent writes)
- **Legal assent:** **inactive** (no fake acceptedAt / legal version)
- **RG-LEGAL-01:** **OPEN** (informational only in UI)
- **Physical-iPhone staging smoke (2026-08-29):** **PASS**
  - Consent readiness PASS; stale-request recovery PASS
  - Export E2E: request → pending → force-quit restore → ready → download → share PASS
  - Offline Ready preservation + Retry status refresh PASS; reconnect PASS
  - Sign-out / sign-in restoration PASS; full explanation copy PASS
- **Export coverage closure:** **OPEN**
- **Export scalability gate:** **OPEN** — `docs/90_audits/export-scalability-gate.md` (buffered ZIP; ~161–169 MB archives; prior OOM at 256 MiB and 1 GiB; success at 4 GiB / ~78 s)
- **Production deploy:** **none**
- **Not begun:** Body salvage (PR #178 remains closed/unmerged)

## Stage 1C (MERGED — PR #215)

- Merged via PR [#215](https://github.com/danielhendel/oli/pull/215) at `d7f4fd0548a6e1d34e3870310e0b0479cdd9a137`
- Branch (historical): `feat/consumer-stage1c-account-deletion-lifecycle`
- Governance: `docs/80_rfc/RFC-account-deletion-lifecycle-v1.md`, `docs/70_adrs/ADR-account-deletion-lifecycle-v1.md` (**Accepted** 2026-08-30)
- Scope delivered:
  - Delete Account UI + password reauthentication + server 5-minute `auth_time` enforcement
  - Deletion-pending API gate; idempotent delete request/status
  - Durable minimized ledger at accept; Auth last; local cleanup + account-switch isolation
  - P0 deletion coverage closed (0 gaps; 0 BLOCKED; 0 UNKNOWN)
  - Enforceable 90-day ledger retention (`expireAt` + TTL + daily sweep); legacy `storageDelete` remediated
- **Physical-iPhone deletion E2E (2026-09-04):** **PASS**
- **Export coverage closure:** **OPEN** (15 classified P0 export gaps)
- **Export scalability gate:** **OPEN**
- **Infrastructure CI validation truth gap:** **OPEN**
- **RG-LEGAL-01:** **OPEN**
- **Consent persistence:** **not implemented**
- **Legal assent:** **inactive**
- **Production deploy:** **none**

## PR #216 (MERGED — build hygiene)

- Merged via PR [#216](https://github.com/danielhendel/oli/pull/216) at `8027c1c1d3b1a97a408c237d9a6655174a05aa0e`
- Ordinary API builds no longer mutate tracked workout-summary checksum truth
- Local `main` synchronized to `origin/main` at the SHA above

## Stage 2 (MERGED — PR #217)

- Merged via PR [#217](https://github.com/danielhendel/oli/pull/217) at `c92ca0518366f0ef7b5e3af08e127fb623506622`
- Branch (historical): `feat/consumer-stage2-minimal-onboarding-readiness`
- Final implementation head: `2e8cbb7b83b7c2b311e5dccc2bcfda23b5ce6ffc` (ancestor of `main`)
- Physical runtime SHA: `255f7101db7a111471ca38b92813cb426e762007` — **physical-iPhone functional PASS** (ancestor of `main`)
- Product direction now on `main`:
  - Opening → About You → Home
  - Primary dock **Home · Today · Plan · Progress · You**
  - Source connection not part of mandatory onboarding
  - Home: compact centered **Oli**, hamburger drawer, seven full-width category cards
  - Today: separate primary tab owning Daily Monitor (not embedded on Home)
  - Movement/Activity preserved outside the Home list
  - No scores / ratings / recommendations / What Oli Sees
  - Apple Health requires explicit current-account connection
- Source-privacy posture:
  - Focused static review + automated account-scoped source-gate tests: **PASS**
  - Complete two-disposable-account server-side evidence: **deferred** (leadership-accepted residual risk)
  - Do **not** claim full source-privacy verification PASS
  - Evidence: `docs/90_audits/2026-09-16-stage2-source-privacy-risk-acceptance.md`
- Staging (historical Stage 2): Cloud Run `oli-api-00276-hjm`; Gateway `oli-api-config-20260830-082245`; Firebase `oli-staging-fdbba`
- **Consent persistence:** **not implemented**
- **Legal assent:** **inactive**
- **RG-LEGAL-01:** **OPEN**
- **RG-SOURCE-PRIVACY-01:** **OPEN** — blocks external TestFlight, production deployment, and public release; does **not** block Stage 3B internal development
- **Export coverage closure:** **OPEN**
- **Export scalability gate:** **OPEN**
- **Infrastructure CI validation truth gap:** **OPEN**
- **Production deploy:** **none**

## Stage 3A (MERGED — docs; Accepted 2026-09-18 with guardrails)

- Merge commit: `b366744007bf771a0796f8499e9be224d226e6b6` (PR [#219](https://github.com/danielhendel/oli/pull/219))
- Branch (historical): `docs/body-composition-definition-evidence-audit-v1`
- Prior baseline `main`: `c92ca0518366f0ef7b5e3af08e127fb623506622`
- Delivered: repository-truth audit; evidence matrix; product/standards specification; RFC/ADR
- Human approval: **2026-09-18 APPROVED WITH GUARDRAILS**
- RFC: `docs/80_rfc/RFC-body-composition-category-intelligence-v1.md` — **Accepted** (not implemented as runtime classification)
- ADR: `docs/70_adrs/ADR-body-composition-category-intelligence-v1.md` — **Accepted** (not implemented as runtime classification)
- Spec: `docs/10_product/specs/BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md` — Accepted with guardrails
- Gate: `docs/90_audits/2026-09-18-body-composition-definition-gate.md`
- **Not authorized by Stage 3A alone:** personalized rails, Body score, aggregate health/performance classification, “Optimized”/“Excellence” personal placement, new schema/persistence/DailyFacts/Insights, DEXA parsing, RawEvent classification, AH→BIA inference
- **Repository blockers for classification/trends:** incomplete CanonicalEvent path; AH/manual DailyFacts dual truth; manual outside overview truth; hollow RMR; RawEvent-derived trends; standards-registry location unresolved
- Does **not** close RG-LEGAL-01, RG-SOURCE-PRIVACY-01, export coverage, export scalability, or infra validation truth gap
- Does **not** authorize external TestFlight, production deployment, public release, or App Store submission
- **Production deploy:** **none**

## Stage 3B (MERGED — PR #220)

- Merge commit: `0124c641f119150c7ed105cef8fd0b8f7d19cd8d` (PR [#220](https://github.com/danielhendel/oli/pull/220))
- Branch (historical): `feat/body-composition-stage3b-value-first-shell`
- Physical runtime SHA: `c962d36ef947e67e03092df9ed8207de17aef9de` (**PASS** 2026-09-20; ancestor of `main`)
- Landing: **Weight / Body Fat / Lean Mass** cards (redundant connection card removed)
- Weight: CDC/WHO adult BMI screening chart + `lb|BMI` / `kg|BMI` presentation — **only classified Body metric**
- Body Fat / Lean Mass: measured values + compatible presentation derivations; **neutral unclassified rail**; **no** classification / marker
- Apple Health: metric-specific popups; per-metric Oli sync scopes; global Settings management
- Local preference (accepted Stage 3B amendment): `appleHealth:metricSyncScopes:{uid}` — device-local, UID-keyed, not native permission truth
- **Must not include / not present:** Body score, aggregates, Optimized/Excellence placement, Body Fat/Lean runtime classification, ALMI/sarcopenia claims, AH→BIA inference, new Firestore schema
- Body Fat / Lean Mass standards at Stage 3B merge: **PROPOSED / NOT IMPLEMENTED** (Stage 3C owns educational reference graphs)
- Issue [#218](https://github.com/danielhendel/oli/issues/218) remains **OPEN**; **RG-SOURCE-PRIVACY-01 OPEN**; **RG-LEGAL-01 OPEN**
- Export coverage/scalability remain **OPEN**
- No staging or production deployment from Stage 3B

## Stage 3C (MERGED — PR #221)

- Merge commit: `5835051715ceea5e1a1cece12f28a9af53e206e7` (PR #221)
- Branch (historical): `feat/body-composition-stage3c-standards-graphs-v1`
- Baseline `main` at merge: prior Stage 3B `0124c641f119150c7ed105cef8fd0b8f7d19cd8d`
- Physical runtime SHA: `e4a23a552910f28241b10b25ae84b46529dab891` (**PASS**; ancestor of `main`)
- Post-merge proof: **PASS** (1106 / 6714 / 0)
- Prior physical candidate `050d338e62749d7920988900f25d61b847fdbad4`: **SUPERSEDED — DO NOT REUSE PHYSICAL EVIDENCE**
- Landing IA **APPROVED**: Total Mass → Weight; Components → Body Fat + Lean Mass; metric-specific calendar/list; education on detail
- Body Fat numerical educational card reference: **APPROVED FOR STAGE 3C V1** (`gallagher-4c-bmi-equivalent-body-fat-reference` / `2000.1`)
- Body Fat personal placement: **BLOCKED** (method + reference-population eligibility required later; Stage 3D provenance dependency)
- Body Fat limitations: general combined AA/White educational reference; separate Asian model in source; provisional BMI-equivalent screening; not universal; not method-independent
- Lean Mass numerical reference: **DEFERRED / BLOCKED** — no approved pooled non-inferred reference; Hologic/NHANES method-specific; Apple Health method unknown; no sensitive reference-population profile field
- Lean Mass Stage 3C fallback: **COMPOSITION-SHARE VISUALIZATION** **APPROVED**
- Weight: **APPROVED / IMPLEMENTED** personal BMI screening — only personally classified Body metric
- Weight detail: single hero longitudinal trend (no duplicate Latest/History cards); Weight card retains “Where am I?” classification; detail owns “How am I changing?”
- Body score / aggregate classification / Performance·Excellence: **NOT IMPLEMENTED**
- Stage 3D: **NOT BEGUN / DEFERRED** — must **not** auto-implement reference markers or numerical standards
- Stage 3E Body Scans: **ACTIVE** — `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`
- No staging or production deployment from Stage 3C; no backend / Firestore standards path

## Stage 3E (ACTIVE — Body Scans foundation)

- Branch: `feat/body-composition-stage3e-body-scans-v1`
- Base: `5835051715ceea5e1a1cece12f28a9af53e206e7`
- Product/data: `docs/10_product/specs/BODY_SCANS_PRODUCT_AND_DATA_V1.md`
- Scope: periodic Body Scans (DXA / InBody / Evolt / Bod Pod / Other); designed results + original PDF; Document Ingestion OS reuse; Live Lean DXA adapter; no scan/scale trend mixing
- Implementation truth: `docs/00_truth/phase3/STAGE_3E_BODY_SCANS_IMPLEMENTATION_TRUTH.md`
- Implemented on branch (not merged): upload → extract → review → confirm → detail → reprocess → delete; DXA text-layer adapter (`live_lean_rx_dxa`); short-lived signed View Original; scan stores covered by export and account deletion; trend isolation enforced by **CHECK 23** / **I-21**
- Known limits: 5 MiB shared Document OS upload limit; text-layer only (no OCR; image-only → manual review); DXA is the only structured adapter
- Feature flag `bodyScans`: development enabled; production **disabled**
- Physical real-PDF test **required** (personal PDF must not enter Git)
- Release gates remain **OPEN**; no staging/production deploy from Stage 3E implementation agent
- Do **not** claim Stage 3E merged or production-ready

### RG-LEGAL-01 — Public Legal and Support Readiness (OPEN)

Required before durable legal consent activation, external TestFlight, App Store submission, or public production release.

| Requirement | Status |
|-------------|--------|
| Approved Privacy Policy content | Not published |
| Approved Terms content | Not published |
| Approved Support page | Not published |
| Stable public HTTPS URLs | Not configured |
| EAS env values for the three public URLs | Not configured |
| Physical-iPhone verification of hosted pages | Not run |
| App Store Connect Privacy Policy URL | Not set |
| App Store Connect Support URL | Not set |
| Version / effective-date governance | Not established |

Environment variable names (public config, not secrets):

```text
EXPO_PUBLIC_PRIVACY_POLICY_URL
EXPO_PUBLIC_TERMS_OF_SERVICE_URL
EXPO_PUBLIC_SUPPORT_URL
```

RG-LEGAL-01 remaining OPEN does **not** block Stage 1A engineering merge. It **does** block durable legal consent, external TestFlight, App Store submission, and public release.

### RG-SOURCE-PRIVACY-01 — Unconnected Source Isolation (OPEN)

Required before external TestFlight, production deployment, or public release.

| Requirement | Status |
|-------------|--------|
| Automated or unambiguous E2E proof that an unconnected account cannot query/ingest/backfill/repair/inherit Apple Health or Oura source state | Not implemented |
| Test identities provisioned without repeated human disposable-email creation | Not implemented |
| Sanitized machine-readable evidence artifact | Not produced |

Leadership disposition (2026-09-16): complete two-disposable-account server-side evidence matrix is **deferred** for Stage 2 merge. Residual risk is accepted for continued staging development and Stage 3A definition. See `docs/90_audits/2026-09-16-stage2-source-privacy-risk-acceptance.md`.

RG-SOURCE-PRIVACY-01 remaining OPEN does **not** block Stage 2 engineering merge or Stage 3A internal development. It **does** block external TestFlight, production deployment, and public release.
## Missing under analytics-first launch direction

- Current State productization, What Oli Sees, confidence / analytical explanation contracts
- Human-created Plan representation with provenance (no Oli authorship)
- Progress analytics (execution, adherence, outcomes) as a first-class surface
- Durable consent persistence (RFC/ADR approved; not implemented)
- Crash reporting product; production Firebase project config
- Device-verified E2E golden paths for launch acceptance
- Defensible overall score (gated — not a P0 assumption)
- Body salvage (PR #178 deferred)
- Minimal onboarding / data readiness (Stage 2 **MERGED** via PR #217)
- Body Composition Category Intelligence (Stage 3A **merged** PR #219; Stage 3B shell **merged** PR #220 at `0124c641…`, physical `c962d36…`; Stage 3C **merged** PR #221 at `58350517…`, physical `e4a23a55…`; Stage 3D **NOT BEGUN / DEFERRED**; Stage 3E Body Scans **ACTIVE**)

**Explicitly not implemented:** Current State as Home hero, What Oli Sees, unified confidence contracts, human-authored Plan persistence, Progress outcome analytics, consent persistence; Body Composition Stage 3D+ facts/classification runtime; official Body Fat/Lean Mass personal markers; Lean Mass numerical LMI ranges (Kelly Table S5 pooled reference unavailable); Body Scans production rollout.

## In progress (not complete)

- **Stage 3E Body Scans Foundation V1** — **ACTIVE** on `feat/body-composition-stage3e-body-scans-v1`; not merged; production flag disabled; physical real-PDF test required; personal markers remain **BLOCKED**; Stage 3D **NOT BEGUN / DEFERRED**
- **RG-SOURCE-PRIVACY-01 OPEN** (complete two-account server evidence deferred; leadership-accepted residual risk; Issue [#218](https://github.com/danielhendel/oli/issues/218) OPEN)
- **RG-LEGAL-01 OPEN** (hosted legal/support pages not published)
- Export coverage / scalability **OPEN**
- PR #178 remains CLOSED unmerged; Body salvage disposition in Stage 3A docs only
- PR #210 remains CLOSED unmerged; preserved branch unmodified
- Other open PRs and local worktrees are **in-progress only** until merged to `main`

## Code Check Gate

Ordinary local commands (clean checkout):

```bash
npm ci
npm run typecheck          # builds @oli/contracts dist first
npm run lint
npm run check:invariants
npm run check:client-trust-boundary
npm test -- --ci           # pretest builds contracts
# aggregate:
npm run check
```

Generated `lib/contracts/dist` is **not** tracked. Recover from interrupted builds with `npm run build:contracts -- --force` (do not rely on undocumented `rm -rf`).

## Companion current docs

- [Analytics-first vision](../10_product/vision/VISION.md)
- [Consumer launch product decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)
- [Consumer launch roadmap](../10_product/roadmap/ROADMAP_REALITY.md)
- [System state](../20_architecture/SYSTEM_STATE.md)
- [2026-08-14 direction delta](../audits/2026-08-14-analytics-first-product-direction-delta.md)
- [Historical August 10 audit](../audits/2026-08-10-consumer-launch-repo-audit.md)
