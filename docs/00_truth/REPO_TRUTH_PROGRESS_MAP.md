# Repo-Truth Progress Map

**Status:** Current operational truth (subordinate to code + CI)
**Last verified:** 2026-08-21
**Merged `main` SHA:** `f502d8b83a3b2ad309c92ae8433ef14ea5c71c10`
**R0:** Merged (PR #211) at `55e2ad6762949bb09006f8beefd95bae60dbd9bb`
**R1:** Merged (PR #212) at the SHA above
**Prior Stage 1A truth freeze (historical):** Merged (PR #209) at `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
**Audit baseline SHA (historical):** `d43ae878373534dbb4cef84c4958221ace826792`
**Current execution-stage label:** `Stage 1A — Account Recovery, Account Routing, and Legal/Support Foundation`
**Current next implementation stages after Stage 1A merges:** `Stage 1B — Consent and Data Export` → `Stage 1C — Account Deletion and Local Data Lifecycle`

> **Rule:** If this map conflicts with merged code or CI, **code and CI win**. Update this map; do not invent product truth from docs alone.

> **R0 status:** Complete and merged (PR #211). Do **not** treat R0 as in-progress.

> **R1 status:** Complete and merged (PR #212). Primary navigation on `main`: **Home · Plan · Progress · You**.

> **Stage 1A status:** **Implementation present on branch; acceptance BLOCKED** pending approved hosted legal/support URLs and physical-iPhone staging smoke. Do **not** merge from this record. Do **not** begin Stage 1B.

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

- Firebase email/password auth substrate (R1 physical-iPhone sign-in, sign-out, and session restore PASS; password reset **in progress on Stage 1A branch**)
- Cloud Run API as authenticated ingest / public API boundary
- Client trust boundary (no Firestore in `app/` / `components/`)
- Constitutional invariant CI checks
- RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext pipeline (backend)
- Account export/delete **backend** routes + Functions
- Domain verticals: Apple Health workouts/steps/body paths, Oura sleep/readiness paths, nutrition logging, labs import OS

## Partial product capabilities (merged `main`)

- Primary dock: **Home · Plan · Progress · You** (filesystem Home remains `/(app)/(tabs)/dash`)
- Home transitional shell: “Where am I?” + “Building your health picture” + Today Daily Monitor (no overall score / no What Oli Sees)
- Plan: honest empty state; placeholder builders not launch-facing
- Progress: Weekly Progress once (when relocation flag ON) + history links
- You: profile, devices, assessments, labs, privacy, settings, Account, failures, domain discovery
- Assessment / Baseline / Target UI with **in-memory** assessment store
- Ownership backend complete; mobile export/delete CTAs still missing on `main`
- Account route exists at `/(app)/settings/account`; You → Account routing defect is corrected on the Stage 1A branch (not yet merged)

## Stage 1A branch (implementation present — acceptance blocked)

- Branch: `feat/consumer-stage1a-account-recovery-legal`
- Baseline `main`: `f502d8b83a3b2ad309c92ae8433ef14ea5c71c10`
- Scope delivered on branch:
  - You → Account routes to `/(app)/settings/account` (Settings remains distinct)
  - Enumeration-safe password-reset request (`requestPasswordReset` + `/(auth)/forgot-password`)
  - Centralized public-link contract + external open service
  - Sign Up Privacy Policy / Terms access; signed-in Privacy Policy / Terms / Support access
- **Static verification (2026-08-21):** `npm ci`, typecheck, lint, invariants, client trust boundary, `npm test -- --ci` (**995 suites / 6190 tests / 0 skipped**), `npm run check`, `git diff --check` all exit 0
- **Expo Doctor:** same 5 pre-existing findings; no new Stage 1A finding
- **Legal-link runtime acceptance:** **BLOCKED** — approved hosted values for `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_OF_SERVICE_URL`, and `EXPO_PUBLIC_SUPPORT_URL` were not present in repository configuration
- **Physical-iPhone staging smoke:** **NOT RUN** (blocked behind approved URLs + operator device session)
- **PR:** Draft required; must not merge while legal-link acceptance is blocked
- **Not implemented yet (Stage 1B / 1C):** durable consent; export UI; delete-account UI; local-data purge; retention/export/delete coverage closure
- **Not begun:** Body salvage (PR #178 remains closed/unmerged)

## Missing under analytics-first launch direction

- Current State productization, What Oli Sees, confidence / analytical explanation contracts
- Human-created Plan representation with provenance (no Oli authorship)
- Progress analytics (execution, adherence, outcomes) as a first-class surface
- Durable consent; export/delete UI; local-data lifecycle (Stage 1B / 1C)
- Crash reporting product; production Firebase project config
- Device-verified E2E golden paths for launch acceptance
- Defensible overall score (gated — not a P0 assumption)
- Body salvage (PR #178 deferred)

**Explicitly not implemented:** Current State as Home hero, What Oli Sees, unified confidence contracts, human-authored Plan persistence, Progress outcome analytics, consent persistence, export/delete UI, onboarding.

## In progress (not complete)

- **Stage 1A is active on branch** and not yet complete
- Stage 1B and Stage 1C are planned and **not started**
- PR #178 remains CLOSED unmerged; Body salvage deferred
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
