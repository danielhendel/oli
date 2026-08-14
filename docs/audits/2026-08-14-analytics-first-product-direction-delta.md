# Oli Analytics-First Consumer Product Direction — Delta Audit

Audit date: 2026-08-14
Technical baseline audit: 2026-08-10
Current merged baseline: `6c8797bea5135124adb3c3f47b0bee85bc5b2c8e`
Draft implementation reviewed: PR #210

**Status:** Decision-support audit
**Scope:** Product-direction delta only
**Not a replacement for:** the 2026-08-10 technical repo audit
**Authority:** Decision support for R0 documentation reset; subordinate to code + CI and to the Constitution

> Historical August 10 audit artifacts remain immutable evidence. This document does not rewrite them.

---

## 1. Executive verdict

| Finding | Verdict |
|---------|---------|
| New full technical audit required? | **No.** Technical findings from 2026-08-10 remain valid unless merged code disproves them. |
| First-release product direction changed? | **Yes — materially.** Analytics-first replaces Today / coordinated My Plan / autonomous adaptation assumptions. |
| Prior Oli-authored My Plan + adaptation as P0? | **Superseded** for current consumer product authority. |
| PR #210 merge unchanged? | **Must not.** Draft implements superseded `Today · Strength · Cardio · Nutrition · Health` IA. |
| Active documentation before more implementation? | **Must reset** (this R0 stage). |
| Stage 1A? | **Merged** as PR #209 at `6c8797b`. |
| PR #210? | **OPEN Draft**, head `f64c69736c15b2877789ab2dee0a06c2e9edfaa7`, CI check SUCCESS, unmodified by this stage. |

**Governing product doctrine (approved input for R0):**

> Professionals plan. People execute. Oli analyzes.
> Oli measures. Oli analyzes. Oli explains. You decide.

---

## 2. Previous versus current product doctrine

| Topic | Previous (2026-08-10 launch decisions) | Current (analytics-first) | Classification |
|-------|----------------------------------------|---------------------------|----------------|
| Product identity | Health Operating System closed loop | Personal health & performance analytics team; pursuit of excellence | **Amend** |
| Oli’s authority | Drive Assessment → Gap → My Plan → Adaptation | Collect, organize, measure, compare, analyze, explain | **Supersede** |
| User authority | Execute Oli-coordinated plan; goals partly system-shaped | Owns personal goals and decisions | **Amend** |
| Professional authority | Deferred P1+; not primary planner in P0 loop | Professionals plan; Oli does not replace professional judgment | **Amend** |
| Goals | Assessment / fitness goals feed plan | Humans set goals; Oli does not choose them | **Supersede** |
| Targets | Standard → Target → Gap → Action | Standards for comparison; not automatic “actions from gaps” | **Amend** |
| Actions | Oli-generated plan actions from gaps | Human/professional plan execution; Oli measures adherence | **Supersede** |
| Recommendations | Implied in Gap → Action and Review | Prohibited as prescription (“you should”, “your priority is”) | **Remove from active authority** |
| Plan authorship | One coordinated **My Plan** (Oli-shaped) | Human-created or externally sourced plans only | **Supersede** |
| Plan modification | Weekly review → next-plan bump / adaptation | Oli must not autonomously modify professional/human plans | **Supersede** |
| Review | Weekly Review product stage | Analytical Progress / What Oli Sees (no auto plan change) | **Amend** |
| Adaptation | Explicit Stage 9 plan adaptation | Out of consumer P0 authority | **Remove from active authority** |
| Home | **Today** with Current State + Today’s Plan + Daily Monitor | **Home** = Where am I? (Current State, standards, direction, What Oli Sees) | **Supersede** |
| Daily Monitor | Core third slot of Today | Placement open (Home history vs You); not the permanent central product | **Requires leadership decision** |
| Current State | Part of closed loop / Today summary | First-class “Where am I?” — separate from Progress | **Retain** (strengthen) |
| Progress | Implied in Review / Weekly Progress | First-class “How am I changing?” destination | **Amend** |
| AI role | Insights consumer; future optimization guest | Analysis/explanation only; never prescribe or write truth | **Amend** (align tighter with I-04) |
| Professional role | P1+ support/assignment | Plan authors; receive intelligence later; decide | **Amend** |
| Primary navigation | Today · Strength · Cardio · Nutrition · Health (1B) | **Home · Plan · Progress · You** | **Supersede** |
| Activity vs Movement | Consumer domain **Activity** | Consumer label **Movement**; technical **Activity** until compatibility RFC | **Amend** |
| Causal language | Not tightly locked in launch decisions | Association ≠ causation; conservative wording required | **Amend** |
| Confidence | Readiness/honesty themes present | Explicit confidence / data sufficiency required on analytical outputs | **Amend** |
| Overall score | Not locked; health score surfaces exist | **Not approved for P0** until methodology defensible | **Requires leadership decision** (default: gate) |

---

## 3. Technical findings that remain valid

Evidence from the 2026-08-10 audit @ `d43ae878` (and Stage 1A merge `6c8797b`). These are **not** re-proven as device runtime truth by this delta audit.

| Area | Status as of audit / main | Notes |
|------|---------------------------|-------|
| Auth foundation | Firebase email/password substrate | Device smoke still a launch gap |
| API trust boundary | Cloud Run + no Firestore in screens | CI `check:client-trust-boundary` |
| Canonical pipeline | RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext | Preserve; vision strengthens, does not replace |
| Apple Health / Oura paths | Implemented in code | Runtime device proof still required |
| Domain verticals | Strength, cardio, nutrition, activity, body, recovery, labs | Partial productization |
| Export/delete backend | API + Functions exist | UI CTAs still missing on main |
| Password reset | Missing | Ownership stage |
| Consent / legal URLs | Missing | Ownership stage |
| Export/delete UI | Missing | Ownership stage |
| Crash reporting | Missing | Release hardening |
| Production Firebase | Placeholder gap | Release hardening |
| RawEvent trend duplication | Client analytics hydrate rawEvents | Metric-truth remediation still needed |
| Nutrition hardcoding | e.g. kcal goal hardcodes | Honesty / truth remediation |
| Seed-food truth risk | Seed catalog in search path | Honesty / truth remediation |
| Runtime-verification gaps | Golden paths unverified at audit | Still apply |

---

## 4. Findings superseded by the new direction

These were active or implied P0 product assumptions under the 2026-08-10 launch doctrine and/or PR #210. They are **not** current consumer product authority:

- Oli-authored coordinated **My Plan** as a P0 product
- Oli-generated **actions from gaps**
- Automatic **weekly plan adaptation** / next-plan version authored by Oli
- **Daily Monitor as the permanent central product home**
- Five-domain primary navigation: **Today · Strength · Cardio · Nutrition · Health**
- **“Today’s Plan”** as an Oli-generated action surface
- Professional platform coupling to **autonomous AI recommendations** for consumer P0
- Closed-loop stage sequence centered on Target → Gap → Action → Adaptation as the first-release spine

Technical substrate for logging, plans-as-data, and review analytics may still be reused under the new Plan / Progress model — authorship and autonomy rules changed.

---

## 5. Draft PR #210 salvage matrix

**PR:** [#210](https://github.com/danielhendel/oli/pull/210)
**Branch:** `feat/consumer-launch-stage1b-today-ia`
**Head:** `f64c69736c15b2877789ab2dee0a06c2e9edfaa7`
**State at audit:** OPEN Draft · MERGEABLE · CI `check` SUCCESS
**This stage:** Did not modify, close, or merge PR #210.

| File | What it changes | Current PR intent | Analytics-first alignment | Classification | New destination | Test impact | Runtime re-verify | Risk | Recommended handling |
|------|-----------------|-------------------|---------------------------|----------------|-----------------|-------------|-------------------|------|----------------------|
| `lib/navigation/consumerHome.ts` | Canonical home href/label “Today” | Single authenticated home | Pattern good; label/IA wrong | **Keep with adaptation** | Home | Rewrite Stage 1B tests | Yes | Medium | Rename labels to Home; keep single-home helper |
| `app/(auth)/sign-in.tsx` | Post-auth → home | Align auth landing | Aligned if home = Home | **Keep with adaptation** | Home | Update expectations | Yes | Low | Point to Home href |
| `app/(auth)/sign-up.tsx` | Same | Same | Same | **Keep with adaptation** | Home | Same | Yes | Low | Same |
| `app/_layout.tsx` | Session restore → home | Same | Same | **Keep with adaptation** | Home | Same | Yes | Low | Same |
| `app/(app)/index.tsx` | Authenticated root → dash/Today | Same | Same | **Keep with adaptation** | Home | Same | Yes | Low | Same |
| `app/(app)/command-center/index.tsx` | CC → redirect to Today | Retire competing home | Aligned intent | **Keep with adaptation** | Home (compat redirect) | Routing tests | Yes | Low | Redirect to Home |
| `app/(app)/dash/daily-recap.tsx` | Dead-end → Today | Remove fake surface | Aligned honesty | **Keep with adaptation** | Home or You/history | Routing tests | Yes | Low | Redirect; placement TBD |
| `lib/navigation/primaryNavigationConfig.ts` | Today + Strength/Cardio/Nutrition/Health dock | Five-item launch dock | **Conflicts** with Home/Plan/Progress/You | **Rebuild** | Home/Plan/Progress/You | High | Yes | High | Do not merge as-is |
| `app/(app)/(tabs)/_layout.tsx` | Today tab title; hide secondary tabs | Support five-item IA | Conflicts | **Rebuild** | Four destinations | High | Yes | High | Rebuild dock |
| `lib/navigation/resolvePrimaryNavActiveDestination.ts` | Active destination for new dock | Support Stage 1B IA | Conflicts | **Rebuild** | Four destinations | Medium | Yes | Medium | Rebuild with new ids |
| `lib/navigation/healthHubItems.ts` | Honest Health hub items | Expose real capabilities only | Honesty reusable | **Keep with adaptation** | You / domain deep links | Hub tests | Yes | Medium | Rehome under You / domains |
| `lib/ui/navigation/healthHubIcons.ts` | Icon map for hub | Support hub cleanup | Neutral | **Keep with adaptation** | You | Low | No | Low | Keep with hub |
| `components/navigation/manageHubItems.ts` | Manage hub adjustments | Align secondary nav | Partial | **Investigate** | You / Plan | Low | Yes | Low | Confirm against four-dest IA |
| `lib/navigation/secondaryExploreDestinations.ts` | Explore destinations | Secondary discoverability | Partial | **Keep with adaptation** | You / Plan / Progress | Low | Yes | Low | Remap destinations |
| `app/(app)/(tabs)/program.tsx` | Honest empty Program | No fake plan | Aligned honesty | **Keep with adaptation** | Plan | Program tests | Yes | Medium | Become Plan shell, not My Plan engine |
| `lib/ui/program/ProgramCurrentScreen.tsx` | Program empty/current UI | Honesty | Aligned | **Keep with adaptation** | Plan | Related | Yes | Low | Attribute source; no Oli authorship |
| `app/(app)/program/builder.tsx` | Hide placeholder builders | Honesty | Aligned | **Keep unchanged** (intent) | Plan / later | Builder tests | Yes | Low | Keep honest empty |
| `app/(app)/supplements/index.tsx` | Redirect to nutrition supplements | Deduplicate | Aligned | **Keep unchanged** | Compatibility-only | Routing | Yes | Low | Keep redirect |
| `app/(app)/training/strength/log.tsx` | Minor nav/cleanup | Consistency | Neutral | **Investigate** | Plan / Strength deep | Low | Optional | Low | Diff review in R1 |
| `components/dashboard/DailyMonitorHost.tsx` | Copy/hierarchy for Today | Monitor under Today | Placement open | **Keep with adaptation** | Home or You | Hierarchy tests | Yes | Medium | Leadership: Home vs You |
| `lib/data/dash/dashDailyMonitorFoundation.ts` | Foundation labels/flags | Today naming | Partial | **Keep with adaptation** | Home/You | Unit | Optional | Low | Dec-label from Today doctrine |
| `lib/features/timeline/resolveTimelineItemHref.ts` | Timeline hrefs to home | Deep-link coherence | Partial | **Keep with adaptation** | Home / Progress | Unit | Optional | Low | Remap |
| `.env.example` | Flag/docs comments | Stage 1B flags | Partial | **Investigate** | Compatibility-only | N/A | No | Low | Strip Today doctrine comments |
| Stage 1B docs in PR (`REPO_TRUTH_*`, decisions, roadmap, SYSTEM_STATE) | Promote Today/My Plan stage | Document Stage 1B | **Conflicts** with R0 | **Drop** from merge / **supersede via R0** | N/A | N/A | No | High | Do not merge; R0 replaces on main |
| `lib/navigation/__tests__/consumerHome.stage1b.test.ts` | Lock Today home | Prove Stage 1B | Conflicts | **Rebuild** | Home tests | High | Yes | Medium | Rewrite for Home |
| `lib/navigation/__tests__/stage1bLaunchIa.routing.test.ts` | Lock five-item IA | Prove dock | Conflicts | **Rebuild** | Four-dest tests | High | Yes | High | Rewrite |
| Other Stage 1B-touched tests (tabs, program, health hub, oliNavigation, DailyMonitor, dash foundation, primaryNavHealthV1, timeline) | Align to Today IA | Support PR | Mixed | **Keep with adaptation** / **Rebuild** | Per surface | High | Yes | Medium | Update after IA rebuild |

### Theme rollup (requested evaluation points)

| Theme | Classification | Notes |
|-------|----------------|-------|
| Canonical consumer-home helper | Keep with adaptation | Reuse; Home not Today |
| Auth redirects | Keep with adaptation | Single home preserved |
| Command Center redirect | Keep with adaptation | Redirect to Home |
| Today naming | Rebuild / Drop | Superseded label |
| Five-item dock | Rebuild | Wrong destination set |
| Health hub cleanup | Keep with adaptation | Honesty; rehome under You |
| Health domain discoverability | Keep with adaptation | Domains remain; not primary dock |
| Program empty state | Keep with adaptation | Plan representation later |
| Program builder cleanup | Keep unchanged | Honesty |
| Daily Recap redirect | Keep with adaptation | Compat |
| Supplements consolidation | Keep unchanged | Compat |
| Timeline placement | Move to later / You or Progress | Not primary dock |
| Library placement | Move to later / You | Not primary dock |
| Profile placement | You | |
| Failures placement | You / trust substrate | |
| Feature flags | Investigate | May remain for transitional nav |
| Stage 1B tests | Rebuild | Lock wrong IA today |
| Stage 1B documentation | Drop / superseded by R0 | |

---

## 6. PR #210 disposition recommendation

### Recommendation

**Close PR #210 as superseded and implement a replacement branch from current `main` (R1), intentionally re-applying only salvage-classified cleanup.**

Do **not** execute close/merge in R0.

### Why

1. The user-facing destination set is wrong for the approved IA (`Home · Plan · Progress · You`).
2. Docs and tests in the PR encode the superseded Today / five-domain doctrine.
3. Reusable honesty work (single home helper, CC/Daily Recap redirects, Health hub honesty, Program empty state, supplements redirect) is separable and should be re-applied deliberately on a clean `main` baseline.
4. Amending #210 in place would mix superseded product authority with new authority and raise review risk.
5. A blind “split” without closing still leaves an open Draft encoding wrong product law.

### Reusable work

- Single authenticated home constant/helper pattern
- Auth / session / root redirects to that home
- Command Center and Daily Recap compatibility redirects
- Health hub placeholder suppression and real-capability listing
- Program honesty empty state and builder placeholder hiding
- Supplements canonical redirect
- Routing/unit test patterns (rewritten for new labels)

### Must not merge

- Today as product home name
- Primary dock: Today / Strength / Cardio / Nutrition / Health
- Documentation asserting Stage 1B Today doctrine as current authority
- Tests that freeze the five-item IA as launch truth
- Any implication that Today’s Plan is Oli-authored actions

### Migration cost

Medium: re-apply ~15–20 productive files; rewrite nav config + tests; discard Today-doctrine docs from the PR (already replaced by R0 on main after merge).

### Review risk

Lower with a clean R1 PR than amending a Draft that CI already labels as “Today home.”

### Preferred next branch

`feat/consumer-launch-r1-home-plan-progress-you` (name illustrative) from post-R0 `main`.

### Required runtime test plan (for R1, not R0)

- Signed-out boot → Sign in (no Command Center flash)
- Signed-in → **Home**
- Dock: Home / Plan / Progress / You only
- Compatibility: `/command-center`, daily-recap, legacy supplements
- Health hub / domain deep links still reachable
- Program/Plan empty honesty; no fabricated plan
- No false Current State / What Oli Sees / overall score claims

---

## 7. Updated first-release capability map

Organize P0 around:

```text
Collect → Organize → Measure → Compare → Analyze → Explain
```

| Capability | P0? | Notes |
|------------|-----|-------|
| Identity and ownership | Yes | Auth, recovery, consent, legal URLs |
| Minimal onboarding | Yes | Opening / About You / Connect / Understand — no feature tour |
| Source connection | Yes | Only integrations that exist in repo truth |
| Data readiness | Yes | Honest missing/partial/building baseline |
| Seven-domain Current State | Yes | Body, Recovery, Movement, Strength, Cardio, Nutrition, Health |
| Standards where defensible | Yes | No rating without standard + data |
| State versus Progress | Yes | Separate concepts and contracts |
| Confidence | Yes | Never manufacture certainty |
| What Oli Sees | Yes | Analysis only; evidence-linked |
| Human-authored Plan representation | Yes | Source attribution; no Oli authorship |
| Execution analytics | Yes | Planned vs completed |
| Adherence | Yes | With confidence |
| Outcome analysis | Yes | Conservative association language |
| Privacy / export / deletion | Yes | UI + backend |
| Reliability | Yes | Crash reporting, prod config, golden paths |

### Explicitly exclude from P0

- Oli-authored professional plans
- Autonomous plan modification
- Generic AI chatbot
- Unsupported causal claims
- Campus operations
- Marketplace
- Broad professional platform
- Overall score without defensible methodology
- Seven fabricated complete scores

---

## 8. Analytics output contract — proposed, not implemented

**Status:** Product and architecture **proposal** only.
**Not** a new canonical schema.
**Requires** RFC/ADR before implementation.
**Do not invent Firestore paths.**

Proposed analytical output fields:

| Field | Intent |
|-------|--------|
| Domain | One of the seven consumer domains |
| Metric | Named measurable |
| Current value | Observed or derived value |
| Unit | Explicit unit |
| Applicable period | Day / week / program period / etc. |
| Current-state status | Where am I (separate from trend) |
| Standard reference | Which standard applied |
| Rating where defensible | Needs Attention … Excellent — or omitted |
| Historical baseline | Established baseline if any |
| Comparison period | Against what window |
| Trend | Direction of travel |
| Magnitude of change | Sized change when defensible |
| Data completeness | Completeness statement |
| Confidence | Epistemic confidence |
| Evidence / source facts | Links to facts used |
| Explanation | Human-readable analysis |
| Association wording | Conservative association language |
| Causation limitation | Explicit non-causation where needed |
| Last computed time | Freshness |
| Logic version | Analytical logic version |
| Standard version | Standard registry version |

Preserve pipeline:

```text
RawEvent → CanonicalEvent → DailyFacts → Insights → IntelligenceContext → UI
```

---

## 9. Information architecture mapping

Approved direction (not implemented):

```text
Home · Plan · Progress · You
```

| Current / PR #210 surface | Proposed placement | Implemented as such? |
|---------------------------|--------------------|----------------------|
| Dash | Home (route may remain `dash` temporarily) | No — still Dash on main; Today only on Draft #210 |
| Daily Monitor | Open: Home history vs You | No |
| Command Center | Compatibility redirect → Home | Redirect only on #210 |
| Strength / Cardio / Nutrition | Domain detail under Home/Plan deep links — not primary dock | Dock items on main and #210 |
| Body / Activity(Movement) / Recovery / Sleep / Labs | Domain / Health deep data → Home detail or You | Partial modules |
| Program | Plan | Empty/honesty on #210 |
| Weekly Progress | Progress | Partial |
| Timeline | You or Progress secondary | Hidden from Health v1 dock on main |
| Library | You | Hidden from Health v1 dock on main |
| Profile / Settings | You | Exists |
| Failures | You (trust) | Exists |
| Connected devices | You | Partial |
| Assessments | You / onboarding inputs | In-memory assessment gap |
| Privacy / Export / Delete | You | Backend yes; UI missing |

Do not treat proposed placement as implemented state.

---

## 10. Open decisions

| # | Decision | Recommended default (not approval) | Status |
|---|----------|--------------------------------------|--------|
| 1 | Overall score in P0 | Gate until weighting, missing-domain, confidence aggregation, versioning, explanation exist | Open |
| 2 | Plan-entry source at launch | Human/external import + honest empty; no Oli-authored plan | Open |
| 3 | Standards governance | Versioned registry with evidence basis before user-facing ratings | Open |
| 4 | Confidence methodology | Align with readiness semantics; user-visible incomplete states | Open |
| 5 | Movement vs Activity compatibility | Consumer “Movement”; keep technical `Activity` until RFC | Open |
| 6 | What Oli Sees generation rules | Deterministic, evidence-linked, no prescription lexicon | Open |
| 7 | Minimum evidence for trends | Require explicit baseline + period completeness | Open |
| 8 | Minimum evidence for association statements | Multi-point coincidence rules; always show causation limitation | Open |
| 9 | Daily Monitor on Home vs You/history | Prefer Home secondary / history; not central CTA | Open |
| 10 | Missing fifth feature-acceptance question | Source said “five questions” but supplied four — **do not invent a fifth**; leadership may add later | Open — inconsistency flagged |

### Feature-acceptance inconsistency (flag)

Upstream direction text said “five questions” but listed four:

1. Does this help Oli understand the individual better?
2. Does this help Oli measure progress toward excellence?
3. Does this help Oli explain something meaningful?
4. Does this reduce the analytical burden on the user or professional?

Active Vision treats these as **four questions**. A fifth remains a product-leadership decision.

---

## 11. Constitutional conflict result

Inspected:

- `docs/00_truth/CONSTITUTION.md`
- `docs/00_truth/SOURCE_OF_TRUTH.md`
- `docs/00_truth/GOVERNANCE_CHARTER.md`

**Result: No constitutional amendment required.**

- I-04 already forbids intelligence from writing truth and constrains AI to consumer status.
- “Intelligence may suggest” is permissive, not a mandate to prescribe plans or modify professional programs.
- Analytics-first product law is **stricter product (T2) constraint** within constitutional bounds.
- No draft RFC created.

---

## 12. External / missing reference documents

Not found as repository copies (do not fabricate):

- Long-term business plan (external)
- Health OS white papers (referenced historically; not present as current authority files)
- Flagship-product document beyond repo vision
- `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, root `README.md`

**Repo authority controls Cursor execution.** External materials do not authorize prescription or autonomous plan modification for the current consumer product.

---

## 13. Long-term / reference docs in repo (classification)

| Document | Classification | R0 action |
|----------|----------------|-----------|
| `docs/audits/2026-08-10-*` | Historical audit evidence | Unchanged |
| `docs/90_audits/**` | Historical | Unchanged |
| `docs/professional-platform/*` | Long-term strategic / professional reference | Status banner where prescription/optimization language conflicts |
| `docs/authoritative/Oli Evidence-Based Classification Framework v1.md` | Long-term / standards reference | Status banner (Plan Engine / consumer authority) |
| `docs/README.md` | Legacy overview | Already stale banner |
| `docs/authoritative/README.md` | Legacy redirect | Already legacy banner |
| Active vision / decisions / roadmap / progress / system state | Current — must update | Updated in R0 |

---

## Companion current authority (after R0 merge)

- [VISION.md](../10_product/vision/VISION.md)
- [CONSUMER_LAUNCH_PRODUCT_DECISIONS.md](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)
- [ROADMAP_REALITY.md](../10_product/roadmap/ROADMAP_REALITY.md)
- [REPO_TRUTH_PROGRESS_MAP.md](../00_truth/REPO_TRUTH_PROGRESS_MAP.md)
- [SYSTEM_STATE.md](../20_architecture/SYSTEM_STATE.md)
- [docs/INDEX.md](../INDEX.md)
