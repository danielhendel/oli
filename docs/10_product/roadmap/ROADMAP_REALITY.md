# Roadmap — Reality Based (Consumer Launch)

**Status:** Current execution roadmap
**Last updated:** 2026-08-10 (Stage 1A truth freeze)
**Audit baseline SHA:** `d43ae878373534dbb4cef84c4958221ace826792`
**Product decisions:** [CONSUMER_LAUNCH_PRODUCT_DECISIONS.md](../decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)
**Progress map:** [REPO_TRUTH_PROGRESS_MAP.md](../../00_truth/REPO_TRUTH_PROGRESS_MAP.md)
**Historical audit roadmap:** [2026-08-10-consumer-launch-roadmap.md](../../audits/2026-08-10-consumer-launch-roadmap.md)

This roadmap reflects **dependency-ordered completion gates** for the consumer Health OS loop, aligned to merged code and the 2026-08-10 audit. It is not a calendar estimate.

> **Supersedes** earlier versions of this file that claimed wearables were deferred, that the next step was merely read-only visualization, or that the compute pipeline was unwired to the app.

---

## What exists today (code truth)

- Firebase Auth (email/password) + API token verification
- Cloud Run API: authenticated ingest, preferences, domain read/write routes
- Idempotent raw event writes; normalization → DailyFacts → Insights → IntelligenceContext
- Portions of the mobile app already consume derived truth (Dash cards, sleep/readiness, weekly fitness, etc.)
- Apple Health and Oura integration paths exist (runtime device proof still required for launch)
- Labs document import / review OS merged
- Account export/delete **backend** exists; mobile ownership CTAs and legal URLs do not
- Withings live sync remains orphaned (honest refusal helpers)

## What does not exist yet (launch-critical)

- One Today home IA (Dash → Today; Command Center not competing home)
- Assessment persistence; unified Current State OS surface
- One coordinated My Plan; Weekly Review / adaptation
- Password reset; consent; Privacy/Terms hosted URL links in-app
- Crash reporting product; production Firebase project config

---

## Stages (dependency order)

| Stage | Name | Intent |
|------:|------|--------|
| **1A** | Launch truth freeze & deterministic build gate | Track audit; promote repo truth; local/CI contracts hygiene |
| **1B** | One Today home & launch-facing IA | Dash → Today; Current State / Plan / Monitor roles; hide fake completeness |
| **1C** | Consumer ownership & account recovery | Password reset; export/delete CTAs; legal URLs; consent shell |
| **2** | Single launch-metric truth | Launch displays cite facts/summaries; remediate client rawEvent analytics hydration |
| **3** | Assessment & Baseline persistence | Assessment survives relaunch |
| **4** | Seven-domain Current State | Honest readiness; no fabricated ratings |
| **5** | Standards, Targets, Gaps, Actions | P0 domain Current/Rating-or-missing/Target/Gap/Action |
| **6** | One coordinated My Plan | One plan object; versioned; not isolated module plans |
| **7** | Execution hardening | Plan action → log → facts/timeline golden path |
| **8** | Daily monitoring & longitudinal record | Monitor + Timeline/Library coherence |
| **9** | Weekly Review & plan adaptation | Evidence-linked review; explicit plan version bump |
| **10** | Reliability, privacy, release hardening | Crash reporting; prod Firebase; privacy/compliance |
| **11** | Beta validation | Persona scorecard |
| **12** | Consumer launch | Scope A acceptance + store approval |
| **13+** | Professional & Campus enablement | After consumer loop; Operations OS ADR before Campus paths |

**Current stage:** **1A** (this PR). **Next:** **1B**.

### Critical path

```text
1A Truth+build gate
 → 1B Today IA
 → 1C Ownership surfaces
 → 2 Metric truth (can overlap early after IA decision)
 → 3 Assessment persist
 → 4 Current State
 → 5 Targets/Gaps/Actions
 → 6 My Plan
 → 7 Execution harden
 → 8 Monitor/Record
 → 9 Review/Adapt
 → 10 Release harden
 → 11 Beta
 → 12 Launch
```

### Explicitly deferred from P0

- Campus operations, reservations, equipment, kitchen, membership
- Professional coaching marketplace / assignment as launch dependency
- Garmin / WHOOP / Withings live restore
- IAP (until entitlement decision)
- Generic AI chatbot / autonomous medical decisions
- Equal depth across all seven domains at once

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
# CI also: API build, assert routes, proof gates, expo config, guardrails
```

`npm run typecheck` and `npm test` build `@oli/contracts` dist first (`npm run build:contracts`).

---

## Historical note

Pre–2026-08-10 content in this path claimed “wearables deferred” and “next: read-only visualization.” That description is obsolete relative to Apple Health / Oura paths and Dash consumption of derived data. Prefer this document and the progress map over any archived copy.
