# Repo-Truth Progress Map

**Status:** Current operational truth (subordinate to code + CI)
**Last verified:** 2026-08-10
**Audit baseline SHA:** `d43ae878373534dbb4cef84c4958221ace826792`
**Implementation baseline SHA:** same as audit baseline until Stage 1A merges (branch `chore/consumer-launch-stage1a-truth-freeze`)
**Current execution-stage label:** Consumer verticals ahead of the coordinated Health OS loop
**Current next stage:** Stage 1B — One Today Home & Launch Information Architecture

> **Rule:** If this map conflicts with merged code or CI, **code and CI win**. Update this map; do not invent product truth from docs alone.

---

## Authority

1. Merged code on `main`
2. `docs/INDEX.md` + `docs/00_truth/`
3. Automated checks / runtime evidence
4. [2026-08-10 consumer-launch audit set](../audits/2026-08-10-consumer-launch-repo-audit.md) (historical)
5. Current product / architecture docs
6. Legacy docs

Schema/code authority for shared contracts: **`lib/contracts` source** (emitted to gitignored `lib/contracts/dist` via `npm run build:contracts`).

---

## Verified / strong foundations

- Firebase email/password auth substrate (device smoke may still be unverified)
- Cloud Run API as authenticated ingest / public API boundary
- Client trust boundary (no Firestore in `app/` / `components/`)
- Constitutional invariant CI checks
- RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext pipeline (backend)
- Account export/delete **backend** routes + Functions
- Domain verticals: Apple Health workouts/steps/body paths, Oura sleep/readiness paths, nutrition logging, labs import OS

## Partial product capabilities

- Dash / Daily Monitor as monitor foundation (not yet the single Today home)
- Assessment / Baseline / Target UI with **in-memory** assessment store
- Program tab without durable coordinated My Plan
- Seven domains exist as modules/structure; not one Current State OS surface
- Ownership backend complete; mobile export/delete CTAs and legal URLs missing

## Missing launch-critical capabilities

- One Today home (Dash → Today) and IA freeze
- Password reset, consent gate, Privacy/Terms hosted URLs in-app
- Assessment persistence; seven-domain Current State productization
- Standards → Target → Gap → Action coherence for P0 domains
- One coordinated My Plan + Weekly Review / adaptation
- Crash reporting product; production Firebase project config
- Device-verified E2E golden paths for launch acceptance

## In progress (not complete)

Open PRs and local worktrees are **in-progress only** until merged to `main`. See the [audit progress snapshot](../audits/2026-08-10-proposed-repo-truth-progress-map.md) for the 2026-08-10 inventory; re-check `gh pr list` and `git worktree list` when planning merges.

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

- [Consumer launch roadmap](../10_product/roadmap/ROADMAP_REALITY.md)
- [System state](../20_architecture/SYSTEM_STATE.md)
- [Consumer launch product decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)
- [Historical audit](../audits/2026-08-10-consumer-launch-repo-audit.md)
