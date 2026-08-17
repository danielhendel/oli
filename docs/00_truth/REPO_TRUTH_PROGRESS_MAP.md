# Repo-Truth Progress Map

**Status:** Current operational truth (subordinate to code + CI)
**Last verified:** 2026-08-14
**Merged `main` SHA:** `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
**Stage 1A:** Merged (PR #209) at the SHA above
**Audit baseline SHA (historical):** `d43ae878373534dbb4cef84c4958221ace826792`
**Current execution-stage label:** `R0 — Analytics-First Product Direction Reset`
**Current next implementation stage after R0 merges:** `R1 — PR #210 Disposition and Four-Destination Information Architecture`

> **Rule:** If this map conflicts with merged code or CI, **code and CI win**. Update this map; do not invent product truth from docs alone.

> **R0 status:** Documentation implementation branch in progress (`docs/analytics-first-product-direction-reset`). Do **not** mark R0 complete before its PR merges.

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

## PR #210 (Draft — unmodified by R0)

| Field | Value |
|-------|-------|
| PR | [#210](https://github.com/danielhendel/oli/pull/210) |
| Branch | `feat/consumer-launch-stage1b-today-ia` |
| Head (as of R0) | `f64c69736c15b2877789ab2dee0a06c2e9edfaa7` |
| State | **OPEN Draft**, unmerged |
| Product basis | Partly superseded **Today / domain-tab** direction |
| Salvage | Potentially reusable cleanup; requires disposition (see delta audit) |
| R0 action | Document disposition only — **do not merge, close, or edit** in R0 |

Stage **1C** under the old Today/My Plan roadmap is **no longer** the immediate next step after R0.

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

- Dash / Daily Monitor as monitor foundation (label still **Dash**, not Home)
- Assessment / Baseline / Target UI with **in-memory** assessment store
- Program tab without durable human-authored Plan representation
- Seven domains exist as modules/structure; not one Current State OS surface
- Ownership backend complete; mobile export/delete CTAs and legal URLs missing
- Primary dock remains Dash · Strength · Cardio · Nutrition · Health

## Missing under analytics-first launch direction

- Four-destination IA: **Home · Plan · Progress · You** (approved, not implemented)
- Current State productization, What Oli Sees, confidence / analytical explanation contracts
- Human-created Plan representation with provenance (no Oli authorship)
- Progress analytics (execution, adherence, outcomes) as a first-class surface
- Password reset, consent gate, Privacy/Terms hosted URLs in-app
- Crash reporting product; production Firebase project config
- Device-verified E2E golden paths for launch acceptance
- Defensible overall score (gated — not a P0 assumption)

**Explicitly not implemented:** Current State as Home hero, What Oli Sees, unified confidence contracts, human-created Plan analytics surface, Progress analytics — unless/until merged code proves otherwise.

## In progress (not complete)

- **R0** documentation branch (this map’s stage) — incomplete until PR merges
- Draft PR #210 — Draft, superseded direction, salvage pending R1
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
