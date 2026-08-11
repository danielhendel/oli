> **Historical audit artifact (non-authoritative).** Snapshot of merged `main` @ `d43ae878373534dbb4cef84c4958221ace826792` on **2026-08-10**.
> Promoted by branch `chore/consumer-launch-stage1a-truth-freeze` (Stage 1A). Do not treat as current execution truth.
> **Companions:** [repo audit](./2026-08-10-consumer-launch-repo-audit.md) · [capability matrix](./2026-08-10-consumer-launch-capability-matrix.md) · [removal register](./2026-08-10-removal-consolidation-register.md) · [roadmap (audit)](./2026-08-10-consumer-launch-roadmap.md) · [proposed progress map](./2026-08-10-proposed-repo-truth-progress-map.md)
> **Current truth:** [Repo-Truth Progress Map](../00_truth/REPO_TRUTH_PROGRESS_MAP.md) · [ROADMAP_REALITY](../10_product/roadmap/ROADMAP_REALITY.md) · [SYSTEM_STATE](../20_architecture/SYSTEM_STATE.md) · [product decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)

# Oli Consumer Launch Roadmap — Evidence-Based

**Audit date:** 2026-08-10
**From repo truth:** `origin/main` @ `d43ae878`
**Not a calendar estimate.** Stages are dependency-ordered completion gates.

Companion: master audit, capability matrix, removal register, proposed progress map.

---

## Launch scopes

### Scope A — Consumer Launch Core (P0)

**Promise:** Oli captures your health reality, shows an honest Current State, gives one coordinated plan you can execute anywhere, and proves whether you are improving — without silent failure.

**Included**
- Identity (email auth), password reset, session persistence
- Consent + privacy policy + terms URLs
- In-app export + account deletion CTAs (backend already exists)
- Assessment persistence → Baseline → Target/Gap (7-domain structure)
- Daily Monitor as Today home (clear vs Current State)
- One My Plan object: weekly actions from goals + domain prescriptions (v1 may be preference-driven)
- Execution verticals: Strength logging, Activity/steps, Sleep/Recovery (Oura/AH), Nutrition logging
- Monitoring: Daily Monitor + Timeline day record + Failures
- Weekly Review v1 (bounded, explainable) + explicit next-plan version bump
- AH + Oura + manual golden path
- Crash reporting + staging→prod env separation plan
- Apple purpose strings / account deletion compliance

**Excluded from P0**
- Campus, reservations, equipment, kitchen, clinical onsite
- Professional coaching marketplace
- Garmin/WHOOP/Withings live restore
- IAP (unless leadership overrides)
- AI chatbot / autonomous medical decisions
- Equal depth across all seven domains
- Continuous Timeline feed

**Required data flows**
- Ingest → normalize → DailyFacts → UI (no silent raw analytics divergence for launch metrics)
- Preferences/goals → Plan → Execution events → Review

**Quality bar**
- Code Check Gate green: typecheck, lint, invariants, trust boundary, tests, proof gates
- Honest `missing`/`partial`/`ready`/`error` readiness
- No production seed-as-truth without labeling
- Device golden-path proof on staging

**Acceptance**
1. New user can create account, consent, complete assessment (persisted), connect ≥1 source or manual log.
2. Sees Current State with honest gaps.
3. Sees today’s plan actions and can complete ≥1 strength + ≥1 nutrition + view sleep/activity.
4. Completions appear in monitoring within expected sync window.
5. Weekly review summarizes adherence with evidence links.
6. User can export and delete account in-app.
7. No fabricated ratings without standards evidence.

### Scope B — Consumer Expansion (P1)

- Deeper Cardio + Body composition targets
- Labs as first-class Health domain (post-import OS)
- Workout program builder persistence
- Passwordless / Apple Sign-In
- Push for plan actions
- Reduce client rawEvent reads
- Professional read-only share (governed)
- Education embedded at decisions
- Withings restore evaluation

### Scope C — Campus / Platform (P2+)

- Operations OS ADR (facilities, reservations, equipment, menus)
- Entitlements / membership
- Provider network fulfillment
- Ambient capture / smart gym verification
- Multi-campus identity continuity
- External developer platform
- Advanced Twin simulation

---

## Stages (dependency order)

### Stage 0 — Audit complete (this document set)

- **Outcome:** Shared repo truth
- **DoD:** Five audit artifacts published under `docs/audits/`; no product code changed
- **Gate:** Leadership reads Executive Verdict + Decisions

### Stage 1 — Launch Truth Freeze & Ownership Surfaces *(FIRST IMPLEMENTATION STAGE)*

| Field | Content |
|-------|---------|
| User outcome | User knows where home is; can control data; legal links exist |
| Why now | Blocks App Store and trust; IA blocks all feature work |
| Reuse | Account API, Privacy/Your Data screens, Daily Monitor, Health hub config |
| Missing | Export/delete UI, password reset, TOS/Privacy URLs, consent gate |
| Refactors | Auth → dash only; hide placeholders from Health hub |
| Removals | Soft-remove placeholder hub items; stop CC auth landing |
| Backend | Confirm export/delete coverage gaps list for UI honesty |
| Mobile | Settings CTAs; onboarding shell; nav config |
| Schema | None (or consent record ADR if persisted) |
| UX | One Today home; Current State entry clear |
| Security/privacy | Strip prod debug logs; legal URLs |
| Tests | Account CTA tests; nav snapshot tests |
| Docs | Propose updates to ROADMAP_REALITY + SYSTEM_STATE (do not silently edit authoritative without approval) |
| Apple | Account deletion guideline; privacy policy |
| Campus | Preserve location-optional principle |
| Acceptance | In-app delete/export reachable; hub has no fake PHR; dual-home resolved |
| Code Check Gate | typecheck, lint, invariants, trust, unit tests |
| Deps | Leadership decisions 1 & 4 |
| Risks | Coverage gaps must be disclosed in UI |
| Untouched | Pipeline Functions, ingest, domain deep modules |

### Stage 2 — Architectural duplicate-truth reduction (launch metrics)

| Field | Content |
|-------|---------|
| User outcome | Same metric shows one number |
| Why now | Trust failure if Dash ≠ Body ≠ Timeline |
| Reuse | DailyFacts, workout summaries, sleep-night API |
| Work | Replace launch-path rawEvent trend reads with facts/summary APIs; label remaining raw as lineage |
| ADR | Optional: “UI may not compute trends from rawEvents” |
| Acceptance | Weight/steps/workout volume/sleep duration launch displays cite facts or summaries |
| Gate | Typecheck + targeted regression suites |
| Risks | Large calendar hooks — incremental migration |

### Stage 3 — Assessment & Baseline persistence

| Field | Content |
|-------|---------|
| User outcome | Assessment survives relaunch; Baseline/Target trustworthy |
| Reuse | health-assessment UI, baseline builders, classification framework |
| Missing | API persistence for assessment answers; versioning |
| Schema ADR | Assessment document under user profile (API-written) |
| Acceptance | Kill app → assessment/baseline remain |
| Untouched | Classification math unless bugs found |

### Stage 4 — Seven-domain Current State productization

| Field | Content |
|-------|---------|
| User outcome | “Where am I?” across 7 domains with honest readiness |
| Reuse | Profile Digital Twin, baseline, domain modules |
| Work | Single Current State screen composing domains; deep links to modules; Health menu includes State domains |
| Acceptance | Partial domains show missing—not fake Optimal |
| Campus note | State remains person-scoped |

### Stage 5 — Standards, targets, gaps, actions

| Field | Content |
|-------|---------|
| User outcome | Know excellence bar, personal target, gap, next action |
| Reuse | `lib/classifications/*`, target-state roadmap, weekly goals |
| Work | Unify goals; remove hardcoded nutrition targets; action chips → Plan |
| Acceptance | Each P0 domain has Current/Rating-or-missing/Target/Gap/Action |

### Stage 6 — One coordinated My Plan

| Field | Content |
|-------|---------|
| User outcome | One plan, not conflicting module plans |
| Reuse | Program tab, weekly fitness goals, workout design store |
| Work | Persist plan document via API; daily action list; empty-state honesty |
| Remove/merge | Placeholder builders hidden; goals systems merged |
| Acceptance | Plan actions drive Daily Monitor; modifications versioned |
| ADR | Plan schema + versioning before write path |

### Stage 7 — Execution vertical hardening

| Field | Content |
|-------|---------|
| User outcome | Complete plan actions anywhere |
| Reuse | workouts/log, nutrition log/search, AH sync, Oura |
| Work | Split oversized logger; offline queues; error recovery; a11y pass |
| Acceptance | Golden path: plan action → log → appears in facts/timeline |
| Untouched | Pro media OS beyond consumer needs |

### Stage 8 — Daily monitoring & longitudinal record

| Field | Content |
|-------|---------|
| User outcome | See today + history without contradiction |
| Reuse | Daily Monitor, Timeline, Failures, Library lineage |
| Work | IA roles locked; feed deferred; calendar overlap reduced |
| Acceptance | Persona 3–5 journeys pass on staging |

### Stage 9 — Review & adaptation v1

| Field | Content |
|-------|---------|
| User outcome | Weekly: did the plan work; what changes next |
| Reuse | Insights rules, weekly fitness rollup, adherence signals |
| Work | Weekly Review screen; explicit plan version bump; no ungrounded AI |
| Acceptance | Review cites evidence docs; user confirms adaptation |
| Exclude | Autonomous clinical decisions |

### Stage 10 — Reliability, privacy, release hardening

| Field | Content |
|-------|---------|
| Work | Sentry/Crashlytics; prod Firebase project; EAS prod profile validation; privacy manifest review; source maps; kill-switch flags if needed |
| Apple | TestFlight; account deletion demo; purpose string consistency |
| Acceptance | Staging soak + crash-free smoke checklist |

### Stage 11 — Beta validation

| Field | Content |
|-------|---------|
| Personas | New, manual-only, connected, partial, returning, degraded, ownership |
| DoD | Closed-loop scorecard all YES or explicitly waived with leadership sign-off |

### Stage 12 — Consumer launch

| Field | Content |
|-------|---------|
| DoD | Scope A acceptance + App Store approval |

### Stage 13+ — Professional & Campus enablement

| Field | Content |
|-------|---------|
| Work | Pro assignment API; Operations OS ADR; entitlements; location-optional execution verification |
| Do not | Rebuild consumer loop |

---

## Critical path

```text
Stage1 Ownership+IA
  → Stage2 Metric truth (parallelizable early with Stage1 after IA decision)
  → Stage3 Assessment persist
  → Stage4 Current State
  → Stage5 Targets/Gaps/Actions
  → Stage6 My Plan
  → Stage7 Execution harden
  → Stage8 Monitor/Record
  → Stage9 Review/Adapt
  → Stage10 Release harden
  → Stage11 Beta
  → Stage12 Launch
```

**Parallel after Stage 1:** Labs polish (PR #208), sleep-night range worktrees, privacy log repairs — only if they do not fork home IA or plan schema.

---

## Code Check Gate (every stage)

```bash
npm ci
npm run -w @oli/contracts build
npm run typecheck
npm run lint
npm run check:invariants
npm run check:client-trust-boundary
npm test -- --ci
# CI also: api build, assert routes, proof gates, expo config, guardrails
```

---

## First recommended implementation stage

**Stage 1 — Launch Truth Freeze & Ownership Surfaces**
Do not start Campus, IAP, or seven equal dashboards before Stage 1–6 complete.
