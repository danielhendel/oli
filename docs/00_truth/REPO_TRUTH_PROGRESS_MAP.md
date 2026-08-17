# Repo-Truth Progress Map

**Status:** Current operational truth (subordinate to code + CI)
**Last verified:** 2026-08-17
**Merged `main` SHA:** `55e2ad6762949bb09006f8beefd95bae60dbd9bb`
**R0:** Merged (PR #211) at the SHA above
**Stage 1A:** Merged (PR #209) at `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
**Audit baseline SHA (historical):** `d43ae878373534dbb4cef84c4958221ace826792`
**Current execution-stage label:** `R1 — PR #210 Disposition and Four-Destination Information Architecture`
**Current next implementation stage after R1 merges:** `Stage 1 — Consumer Ownership and Account Recovery`

> **Rule:** If this map conflicts with merged code or CI, **code and CI win**. Update this map; do not invent product truth from docs alone.

> **R0 status:** Complete and merged (PR #211). Do **not** treat R0 as in-progress.

> **R1 status:** Application implemented on `feat/analytics-first-r1-four-destination-ia` (`88d67ab` navigation/tests; this map commit records verification). **Not merged.** Static gates passed. iOS four-tab dock visual smoke is **not** complete — see Runtime below. Do **not** treat R1 as merged.

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

## PR #210 (CLOSED — superseded, unmerged)

| Field | Value |
|-------|-------|
| PR | [#210](https://github.com/danielhendel/oli/pull/210) |
| Branch | `feat/consumer-launch-stage1b-today-ia` (**preserved**; do not delete) |
| Head | `f64c69736c15b2877789ab2dee0a06c2e9edfaa7` |
| State | **CLOSED**, unmerged |
| Product basis | Superseded **Today / domain-tab** direction |
| Salvage | Reusable cleanup only; must be reimplemented intentionally on R1 — **do not merge, reopen, rebase, or cherry-pick** |
| R1 action | Approved salvage **reimplemented** on this branch (no cherry-pick, no merge of PR #210) |

Stage **1C** under the old Today/My Plan roadmap is **no longer** the immediate next step after R1.

---

## Verified / strong foundations

Technical foundations from the August 10 audit remain valid unless merged code disproves them:

- Firebase email/password auth substrate (device smoke may still be unverified)
- Cloud Run API as authenticated ingest / public API boundary
- Client trust boundary (no Firestore in `app/` / `components/`)
- Constitutional invariant CI checks
- RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext pipeline (backend)
- Account export/delete **backend** routes + Functions
- Domain verticals: Apple Health workouts/steps/body paths, Oura sleep/readiness paths, nutrition logging, labs import OS

## Partial product capabilities (merged `main`)

- Dash / Daily Monitor as monitor foundation (user-facing Home exists only on the R1 branch)
- Assessment / Baseline / Target UI with **in-memory** assessment store
- Program tab without durable human-authored Plan representation
- Seven domains exist as modules/structure; not one Current State OS surface
- Ownership backend complete; mobile export/delete CTAs and legal URLs missing
- Primary dock on **merged `main`** remains Dash · Strength · Cardio · Nutrition · Health

## R1 branch (not merged)

- Branch: `feat/analytics-first-r1-four-destination-ia`
- Implementation commit: `88d67ab4ab3f53a36f86440d86a574eafddbee0a` (`feat(consumer): establish analytics-first primary navigation`)
- Primary dock: **Home · Plan · Progress · You** (filesystem Home remains `/(app)/(tabs)/dash`)
- Auth / RouteGuard / sign-in / sign-up land on Home (`CONSUMER_HOME_HREF`)
- Command Center and Daily Recap are compatibility redirects to Home; Health supplements → Nutrition supplements; Program builder hub → Plan
- Home transitional shell: Your Health & Performance honest baseline copy + Today Daily Monitor (no overall score / no What Oli Sees)
- Plan: honest empty state (`currentPrograms = []`); placeholder builders not launch-facing
- Progress: Weekly Progress once (when relocation flag ON) + history links
- You: profile, devices, assessments, labs, privacy, settings, failures, domain discovery; Movement presentation label for Activity
- **Static verification (2026-08-17):** `npm ci`, typecheck, lint, invariants, client trust boundary, `npm test -- --ci` (985 suites / 6151 tests / 0 skipped), `npm run check`, `git diff --check` all exit 0
- **Expo Doctor:** same 5 pre-existing findings; no new R1 finding
- **Runtime:** iPhone 16 Simulator (iOS 18.3), staging `.env.local`, Expo dev client + Metro. Restored Firebase session hydrated DailyFacts (`userAvailable: true`) and presented the Health Access sheet (authenticated product, not Command Center / Sign In). Four-tab dock labels, Plan/Progress/You, signed-out, and compatibility routes were **not** visually confirmed because Simulator UI automation is unauthorized (TCC -1743) and the Health sheet blocked the dock.
- **PR #178:** OPEN / CONFLICTING; R1 supersedes a floating Profile fifth destination. Close only after R1 merges, via a separate gate.

## Missing under analytics-first launch direction

- Four-destination IA **on merged `main`** (implemented on R1 branch; pending merge + complete iOS smoke)
- Current State productization, What Oli Sees, confidence / analytical explanation contracts
- Human-created Plan representation with provenance (no Oli authorship)
- Progress analytics (execution, adherence, outcomes) as a first-class surface
- Password reset, consent gate, Privacy/Terms hosted URLs in-app
- Crash reporting product; production Firebase project config
- Device-verified E2E golden paths for launch acceptance
- Defensible overall score (gated — not a P0 assumption)

**Explicitly not implemented:** Current State as Home hero, What Oli Sees, unified confidence contracts, human-created Plan persistence, Progress outcome analytics, ownership UI, onboarding.

## In progress (not complete)

- **R1** Draft PR pending complete iOS signed-out / signed-in / restored-session dock verification
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
