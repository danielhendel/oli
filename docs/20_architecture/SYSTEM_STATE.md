# System State — As Built

**Status:** Current architecture interpretation (must track code)
**Last updated:** 2026-09-18 (Stage 3A **MERGED** PR #219 at `b366744…`; Stage 3B Body Composition value-first shell **ACTIVE** on branch; Stage 3C **NOT BEGUN**; Stage 2 **MERGED** PR #217; **RG-SOURCE-PRIVACY-01 OPEN**; Stage 1C **MERGED** PR #215; build hygiene **MERGED** PR #216; **RG-LEGAL-01 OPEN**)
**Merged `main` SHA:** `b366744007bf771a0796f8499e9be224d226e6b6`
**Stage 2 merge commit:** `c92ca0518366f0ef7b5e3af08e127fb623506622`
**Stage 2 final implementation head:** `2e8cbb7b83b7c2b311e5dccc2bcfda23b5ce6ffc` (ancestor of `main`)
**Stage 2 physical runtime SHA:** `255f7101db7a111471ca38b92813cb426e762007` (**PASS**; ancestor of `main`)
**Stage 3A merge commit:** `b366744007bf771a0796f8499e9be224d226e6b6` (PR #219; RFC/ADR Accepted; classification runtime not implemented)
**Stage 3B branch:** `feat/body-composition-stage3b-value-first-shell` (value-first educational shell only; not complete)
**Staging (historical Stage 2):** Cloud Run `oli-api-00276-hjm`; Gateway `oli-api-config-20260830-082245`; Firebase `oli-staging-fdbba`
**Staging (historical Stage 1C):** Cloud Run `oli-api-00275-5sc`; deletion Function `onaccountdeleterequested-00067-puy`; ledger sweep ACTIVE; Firestore TTL `accountDeletions.expireAt` ACTIVE
**Staging export (historical E2E):** Function `onAccountExportRequested` 4 GiB / 540 s
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

## Merged state (`main` @ `c92ca05`)

### Navigation and homes

| Surface | Merged `main` reality |
|---------|----------------------|
| Primary dock | **Home · Today · Plan · Progress · You** — no FAB sixth destination |
| Auth / session landing | Authenticated routes resolve to Home (`CONSUMER_HOME_HREF`; filesystem `/(app)/(tabs)/dash`) |
| Command Center | Compatibility **Redirect to Home** (grid not rendered) |
| Daily Recap | Compatibility **Redirect to Home** |
| Domain routes | Strength/workouts, cardio, nutrition, activity, body, recovery/sleep, labs, etc. exist as modules; consumer label **Movement** for Activity |
| Program / Plan | Tab label **Plan**; honest empty state; placeholder builders not launch-facing |
| Daily Monitor | Owned by **Today** primary tab (Stage 2) |
| Progress | Dedicated Progress tab; Weekly Progress once when relocation ON; Timeline + domain histories |
| You | Hub: profile, devices, assessments, labs, privacy, Your Data, settings, Account, failures, Health & Performance Data |
| Timeline / Library / Failures | Timeline under Progress; Library (data lineage) and Failures under You |
| Flags | Health-v1 **deprecated no-op** for chrome; Daily Monitor + Weekly Progress flags still govern those real components |

**Stage 2 IA is merged.** Current State / What Oli Sees / overall score remain **not implemented**.

Home: compact **Oli** header + drawer; **My Health & Performance** seven full-width category cards; no Daily Monitor embedded; no fabricated Current State; no scores/ratings/recommendations/What Oli Sees. Today Movement omits stored zero so empty aggregates are not “0 Steps · Sedentary”. Unfinished-day sedentary classification is deferred to Stage 3 analytics contracts.

Plan: `currentPrograms = []`; no persistence; no Oli-authored plan language; not called My Plan.

Progress: no adherence/outcome/causal claims.

You: DNA / Medical History / Scans / Medication placeholders are hidden from launch navigation. Account screen title is **Account**; Firebase UID absent from consumer UI. You → Account routes to `/(app)/settings/account` (Stage 1A merged).

Auth: dark Sign In / Create account; light iOS status bar. Password-reset request flow merged (Stage 1A). Profile-only onboarding Opening → About You → Home merged (Stage 2).

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

| Capability | Merged `main` reality |
|------------|----------------------|
| Export/delete backend | Exists (API + Functions) |
| Export UI CTAs | Merged (Stage 1B / PR #214) |
| Delete UI CTAs | Merged (Stage 1C / PR #215) |
| Local-data purge | Merged (Stage 1C / PR #215) |
| Deletion coverage | Closed (0 gaps; export gaps remain open) |
| Password reset | Merged (Stage 1A) |
| You → Account routing | Fixed (Stage 1A) |
| Sign-in error mapping | Centralized safe mapping |
| Public-link contract / external open | Merged (Stage 1A) |
| Hosted Privacy / Terms / Support pages | Not published — **RG-LEGAL-01 OPEN** |
| Durable consent persistence | Missing — RFC/ADR approved for future implementation; **not implemented** |
| Minimal onboarding | **Merged** (Stage 2 / PR #217) — Opening → About You → Home (source connection contextual; not mandatory onboarding); physical PASS `255f710…` |
| Home category entry | **Merged** (Stage 2 / PR #217) — My Health & Performance full-width seven-card stack; drawer secondary nav |
| Today primary tab | **Merged** (Stage 2 / PR #217) — Daily Monitor owned by Today; not embedded on Home |
| Source-privacy E2E (two-account server matrix) | Deferred — leadership-accepted residual risk; **RG-SOURCE-PRIVACY-01 OPEN**; Issue [#218](https://github.com/danielhendel/oli/issues/218) OPEN |
| Export coverage closure | Gaps disclosed — **OPEN** |
| Export scalability (streaming/pagination) | Buffered ZIP worker — Gate **OPEN** — `docs/90_audits/export-scalability-gate.md` |
| Crash reporting product | Missing — Release hardening |
| Production Firebase project config | Release-hardening gap |
| Current State / What Oli Sees / Plan persistence / Progress analytics | **Not** implemented |
| Body salvage (PR #178) | CLOSED unmerged; disposition only in Stage 3A docs |
| Body Composition Category Intelligence | Stage 3A **MERGED** (PR #219 at `b366744…`; Accepted 2026-09-18 with guardrails; RFC/ADR Accepted, not implemented as classification). Stage 3B value-first educational shell **ACTIVE** on branch. Stage 3C **NOT BEGUN**. Official classification/trends **blocked** by repository gaps |
| Build checksum hygiene | Merged (PR #216) — ordinary API builds do not mutate tracked checksum truth |
| Production deploy | **none** |

---

## Closed unmerged state (PR #210 — not merged)

| Fact | Detail |
|------|--------|
| PR | [#210](https://github.com/danielhendel/oli/pull/210) **CLOSED**, unmerged |
| Head | `f64c69736c15b2877789ab2dee0a06c2e9edfaa7` |
| Five-item dock | Today · Strength · Cardio · Nutrition · Health — **not merged**; **not** product authority |
| Today naming | Draft-only; superseded by approved Home |
| Cleanup value | Honesty redirects, hub cleanup, Program empty state **reimplemented** on R1 (no cherry-pick) |
| R1 action | Disposition executed; PR #210 branch unmodified |

See [delta audit](../audits/2026-08-14-analytics-first-product-direction-delta.md).

---

## Closed unmerged state (PR #178 — not merged)

| Fact | Detail |
|------|--------|
| PR | [#178](https://github.com/danielhendel/oli/pull/178) **CLOSED**, unmerged |
| Branch | `feat/profile-floating-shortcut` (**preserved**) |
| Salvage | Body salvage **deferred** to later approved analytics stages |
| Stage 1A action | Do not reopen, merge, or reimplement Body work |

---

## Approved primary destinations (Stage 2 — MERGED on `main`)

```text
Home · Today · Plan · Progress · You
```

| Destination | Intent | Merged `main` reality |
|-------------|--------|----------------------|
| Home | Whole-person health & performance domain map | Compact Oli header + drawer; seven full-width category cards; no Daily Monitor |
| Today | Daily health & performance state | Owns existing Daily Monitor content |
| Plan | Human-created or externally sourced plan representation | Honest empty state; no persistence |
| Progress | Execution, adherence, outcomes, trends, analysis | History + Weekly Progress; no outcome analytics product |
| You | Account, sources, assessments, labs, history, privacy, export, deletion, settings | Hub present; export UI merged (Stage 1B); delete UI and local lifecycle merged (Stage 1C) |

**Next ownership/product work:** Stage **3B** Body Composition value-first educational shell (**ACTIVE** on `feat/body-composition-stage3b-value-first-shell`; not complete). Official Body classification and facts-first trends remain blocked. Stage 3C **not begun**. **RG-SOURCE-PRIVACY-01** remains OPEN and blocks external TestFlight / production / public release. Issue [#218](https://github.com/danielhendel/oli/issues/218) OPEN. **RG-LEGAL-01 OPEN**. Export coverage/scalability OPEN. No staging or production deployment from Stage 3B.

---

## Mobile app

**Stack:** Expo, Expo Router, Firebase JS Auth (client)

**Responsibilities:** Authenticate; hold session; call Cloud Run API; render domain modules and Home / Daily Monitor, Plan, Progress, and You shells.

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
- Public legal/support URLs (when configured): `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_OF_SERVICE_URL`, `EXPO_PUBLIC_SUPPORT_URL` — public configuration, not secrets

---

## Historical correction

Earlier revisions stated the Functions pipeline was “not yet wired to UI.” That is **stale**: multiple app modules already consume derived DTOs. Remaining gaps are analytics-first productization, metric-truth remediation, ownership UI, and release hardening — not total disconnection.

The 2026-08-10 “Today / My Plan / adaptation” product doctrine is **superseded** for current consumer authority; see Vision v2 and Consumer Product Decisions v2.
