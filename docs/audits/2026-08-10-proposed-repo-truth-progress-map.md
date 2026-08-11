> **Historical audit artifact (non-authoritative).** Snapshot of merged `main` @ `d43ae878373534dbb4cef84c4958221ace826792` on **2026-08-10**.
> Promoted by branch `chore/consumer-launch-stage1a-truth-freeze` (Stage 1A). Do not treat as current execution truth.
> **Companions:** [repo audit](./2026-08-10-consumer-launch-repo-audit.md) · [capability matrix](./2026-08-10-consumer-launch-capability-matrix.md) · [removal register](./2026-08-10-removal-consolidation-register.md) · [roadmap (audit)](./2026-08-10-consumer-launch-roadmap.md) · [proposed progress map](./2026-08-10-proposed-repo-truth-progress-map.md)
> **Current truth:** [Repo-Truth Progress Map](../00_truth/REPO_TRUTH_PROGRESS_MAP.md) · [ROADMAP_REALITY](../10_product/roadmap/ROADMAP_REALITY.md) · [SYSTEM_STATE](../20_architecture/SYSTEM_STATE.md) · [product decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)

# Proposed Repo-Truth Progress Map (Audit)

**Status:** PROPOSED AUDIT ARTIFACT — not authoritative until promoted
**Date:** 2026-08-10
**Path:** `docs/audits/2026-08-10-proposed-repo-truth-progress-map.md`
**Do not treat as** `docs/00_truth/` or `docs/authoritative/` governance.

Merged truth SHA: `d43ae878373534dbb4cef84c4958221ace826792` (`origin/main` = local `main`)

---

## 1. Merged truth (origin/main)

| Area | Repo-truth status | Evidence |
|------|-------------------|----------|
| Auth email/password | Complete (runtime unverified) | `lib/auth`, auth routes |
| API ingest + idempotency | Complete (static + tests) | `services/api` events route; invariants |
| Normalization + DailyFacts/Insights/Intelligence | Complete (backend) | Functions pipeline; CI proof gates |
| Client trust boundary | Complete (static) | assert script pass |
| Firestore rules deny derived client writes | Complete (static) | `firestore.rules` |
| Dash / Daily Monitor foundation | Partial product | Flags default ON; real cards |
| Domain modules (AH workouts/steps/body, Oura sleep, nutrition, labs) | Partial→strong verticals | Large `app/(app)/*` + `lib/data` |
| Program / My Plan persistence | Incomplete | `currentPrograms=[]` |
| Assessment persistence | Incomplete | In-memory store |
| Review / adaptation | Missing | No weekly plan review |
| Export/delete backend | Complete | account routes + Functions |
| Export/delete mobile UI | Missing | Privacy copy only |
| Privacy policy / terms | Missing | — |
| Crash reporting | Missing | — |
| IAP | Missing | — |
| Campus | Missing | — |
| Professional consumer link | Missing | Mock portal only |
| Withings live | Orphaned | Truth helpers refuse Connected |
| Garmin/WHOOP | Missing | — |

**Latest merged product commit theme:** Labs Phase 3D-B historical import (PR #207).

---

## 2. Current branch truth

| Field | Value |
|-------|-------|
| Branch | `main` |
| vs origin/main | Identical (0/0) |
| Working tree at audit | **Clean** |
| Note | Conversation snapshot earlier listed many dirty files; filesystem at audit start had none |

All conclusions for launch product = **merged main**.

---

## 3. Open PR / in-progress inventory (NOT complete)

### Open PRs (`gh pr list` 2026-08-10)

| PR | State | Branch | Relation to launch |
|----|-------|--------|--------------------|
| #208 labs trend visualizations | DRAFT | `feat/labs-phase3dc-graphs` | P1 labs polish |
| #178 floating action → profile | OPEN | `feat/profile-floating-shortcut` | Nav; may conflict Health v1 |
| #22 timezone daykey | OPEN (stale) | `phase1/step1-timezone-daykey` | Possibly superseded — verify before merge |
| #15 sprint0 guardrails | OPEN (stale) | `sprint0-phase1-guardrails` | Likely obsolete |
| #7 infra CI scope | OPEN (stale) | `chore/infra-ci-scope` | Infra only |

GraphQL `gh pr status` returned Forbidden; list via REST-style CLI succeeded.

### Local worktrees (20) — sample themes

Timeline v1 / daily completeness / viewport repairs; sleep-night range API; weekly-fitness-v2; Oura/API privacy repairs; labs graphs; release oura sleep score; detached timeline smoke.

**Rule:** Do not count as launch-complete until merged to `main`.

---

## 4. Verified completed capabilities (static / automated)

- Constitutional invariant checks (CHECK 1–22)
- Client trust boundary guards
- Lint max-warnings=0
- Typecheck after clean contracts + tsbuildinfo rebuild
- 6142 Jest tests passed in full suite run (2 suites failed only while contracts dist incomplete)
- Phase 1 required API/UI route assertions exist in CI
- No Firestore SDK usage in `app/` or `components/`

---

## 5. Partial capabilities

| Capability | What’s real | What’s missing |
|------------|-------------|----------------|
| Current State | Classification + baseline UI | Persisted assessment; unified State home |
| Daily Monitor | Presence cards | Plan actions / what-now completeness |
| Program | Weekly goals card | Program documents; builders |
| Nutrition | Logging/search | Prefs targets; seed labeling |
| Labs | Import/review/history | Trends PR draft; overview shells |
| Timeline/Library | Day log + lineage | Buried under Health v1; feed deferred |
| Ownership | Backend export/delete | Mobile CTAs; legal URLs |
| Withings | Honest orphan messaging | Live sync |

---

## 6. Missing capabilities (launch-critical)

- Coordinated My Plan with versions
- Weekly/monthly review & adaptation
- Password reset
- In-app account deletion & export triggers
- Privacy policy & terms
- Onboarding/consent sequence
- Production Firebase project config (placeholder in `.firebaserc`)
- Crash/error reporting product
- Device-verified E2E golden paths (this audit)

---

## 7. Documentation drift

| Document | Drift |
|----------|-------|
| `docs/10_product/roadmap/ROADMAP_REALITY.md` | Still says wearables deferred; code has Oura+AH; “next” is visualize steps/weight — long superseded |
| `docs/20_architecture/SYSTEM_STATE.md` | Says pipeline “not yet wired to UI”; Dash/modules consume DailyFacts |
| `docs/authoritative/*` | Mostly exercise media standards; README admits legacy |
| `docs/90_audits/REPO_REALITY_MAPPING.md` | 2025-12-30 file inventory; claims missing firestore.rules (now present under `services/functions/`) |
| `docs/90_audits/OLI_REPO_AUDIT_CURRENT_TRUTH.md` | 2025-03-11 nav (Manage/Stats tabs) obsolete vs Health v1 dock |
| Named “Unified Master Roadmap vNext” / “Repo-Truth Progress Map vCurrent” / “Canonical Schema v1.1” / “Architecture v2.1” / “Great Code Standard” / “ChatGPT Alignment Spec” | **Not found** as titled files |

**Recommended authoritative updates (after approval — not done in this audit):**
1. Replace ROADMAP_REALITY with code-aligned sprint map from consumer-launch-roadmap.md Stage 1+.
2. Refresh SYSTEM_STATE Dash/Daily Monitor + Health v1 nav section; remove “not wired to UI”.
3. Promote a real Repo-Truth Progress Map into an approved location (not silent overwrite).
4. Publish Canonical Schema index pointing at `lib/contracts` as code-aligned source.
5. Clarify `docs/authoritative/` is media-production standards, not Health OS constitution.

---

## 8. Actual execution stage (from code, not docs)

**Observed stage:** Post–Phase 1/2 trust substrate + Phase 3 integrations/labs, with a **fitness-module OS** (Dash/Daily Monitor + Strength/Cardio/Nutrition dock) and **incomplete plan/review loop**.

Not accurately described by ROADMAP_REALITY “Next: read-only visualization.”

Closest truthful label: **Consumer verticals ahead of coordinated Health OS loop**.

---

## 9. Recommended promotion path

1. Leadership accepts audit verdict + Stage 1.
2. Open RFC to update ROADMAP_REALITY / SYSTEM_STATE.
3. Copy approved progress map into agreed authoritative path.
4. Close or archive stale PRs #7/#15/#22 after explicit review.

---

## 10. Code Check Gate snapshot (2026-08-10)

| Check | Result |
|-------|--------|
| typecheck (clean rebuild) | PASS |
| lint | PASS |
| invariants | PASS |
| trust boundary | PASS |
| test suite | 979 pass / 2 fail under stale contracts dist; contracts rebuild required locally |
| device smoke | UNVERIFIED |
