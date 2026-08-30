# Repo-Truth Progress Map

**Status:** Current operational truth (subordinate to code + CI)
**Last verified:** 2026-08-29
**Merged `main` SHA:** `3d4859e45d537813b6846ecaf4cb49222519ef80`
**R0:** Merged (PR #211) at `55e2ad6762949bb09006f8beefd95bae60dbd9bb`
**R1:** Merged (PR #212) at the SHA above
**Prior Stage 1A truth freeze (historical):** Merged (PR #209) at `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
**Audit baseline SHA (historical):** `d43ae878373534dbb4cef84c4958221ace826792`
**Current execution-stage label:** `Stage 1C — Account Deletion and Local Data Lifecycle` (**active**)
**Stage 1B:** **MERGED** (PR #214 at `3d4859e45d537813b6846ecaf4cb49222519ef80`)
**Current next implementation stage after Stage 1C:** `Stage 2 — Minimal Onboarding and Data Readiness` (**not begun**)

> **Rule:** If this map conflicts with merged code or CI, **code and CI win**. Update this map; do not invent product truth from docs alone.

> **R0 status:** Complete and merged (PR #211). Do **not** treat R0 as in-progress.

> **R1 status:** Complete and merged (PR #212). Primary navigation on `main`: **Home · Plan · Progress · You**.

> **Stage 1A status:** **Merged** (PR [#213](https://github.com/danielhendel/oli/pull/213) at `10f85ee3d377d25075353c152b27611b6b572c84`). Password recovery verified on physical iPhone. Public-link infrastructure merged. Hosted legal/support pages **not published**. **RG-LEGAL-01 OPEN**. Durable legal assent remains **inactive**.
>
> **Stage 1B status:** **MERGED** (PR [#214](https://github.com/danielhendel/oli/pull/214) at `3d4859e45d537813b6846ecaf4cb49222519ef80`). Consumer Data Export physical E2E **PASS** on staging. Consent architecture approved for future implementation; durable consent persistence **not implemented**. Legal assent **inactive**. **RG-LEGAL-01 OPEN**.
>
> **Stage 1C status:** **Active** on `feat/consumer-stage1c-account-deletion-lifecycle`. Account deletion UI **not yet implemented**. Local-data lifecycle **not yet implemented**. Account-switch isolation **not yet verified**. Deletion coverage **not yet closed**. Infrastructure CI validation truth gap **remains open**.

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

- Primary dock: **Home · Plan · Progress · You** (filesystem Home remains `/(app)/(tabs)/dash`)
- Home transitional shell: “Where am I?” + “Building your health picture” + Today Daily Monitor (no overall score / no What Oli Sees)
- Plan: honest empty state; placeholder builders not launch-facing
- Progress: Weekly Progress once (when relocation flag ON) + history links
- You: profile, devices, assessments, labs, privacy, settings, Account, failures, domain discovery
- Assessment / Baseline / Target UI with **in-memory** assessment store
- Ownership backend complete; mobile export UI **merged** (Stage 1B); delete-account UI **not yet implemented** (Stage 1C active)
- Account route at `/(app)/settings/account`; You → Account routing **merged** (Stage 1A)

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

## Stage 1C (ACTIVE — not complete)

- Branch: `feat/consumer-stage1c-account-deletion-lifecycle`
- Baseline `main` (Stage 1B merge): `3d4859e45d537813b6846ecaf4cb49222519ef80`
- Scope in progress:
  - In-app account deletion with reauthentication
  - Idempotent deletion request/status recovery
  - Local user-data lifecycle and account-transition isolation
  - Export-archive cleanup; server-side deletion coverage closure
- **Account deletion UI:** not yet implemented
- **Local-data lifecycle:** not yet implemented
- **Account-switch isolation:** not yet verified
- **Deletion coverage closure:** not yet closed
- **Export coverage closure:** **OPEN**
- **Export scalability gate:** **OPEN**
- **Infrastructure CI validation truth gap:** **OPEN** (GitHub `tf-validate` false-green)
- **RG-LEGAL-01:** **OPEN**
- **Consent persistence:** **not implemented**
- **Legal assent:** **inactive**
- **Production deploy:** **none**

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

- **Stage 1C is active** on `feat/consumer-stage1c-account-deletion-lifecycle`
- **RG-LEGAL-01 OPEN** (hosted legal/support pages not published)
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
