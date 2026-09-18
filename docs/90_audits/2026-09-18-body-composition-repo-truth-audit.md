# Body Composition — Repository-Truth Audit

**Status:** Immutable audit snapshot (Stage 3A)
**Date:** 2026-09-18
**Merged `main` baseline:** `c92ca0518366f0ef7b5e3af08e127fb623506622` (PR #217)
**Stage 3A branch:** `docs/body-composition-definition-evidence-audit-v1`
**Authority:** Code and CI override this document on conflict
**Scope:** Documentation audit only — no runtime Body redesign

---

## 1. Purpose

Establish repository truth for Body Composition before any Category Intelligence runtime implementation. This audit maps routes, UI, data sources, pipeline coverage, provenance gaps, RawEvent exceptions, PR #178 disposition, tests, privacy, and scientific risk.

---

## 2. Executive findings

| Finding | Classification |
|---------|----------------|
| Body page leads with Apple Health permission gate before educational value | UNSAFE AS-IS for Stage 3B value-first shell |
| Overview trends and snapshot peeks read **RawEvents** on-device | ARCHITECTURAL VIOLATION of facts-first consumer truth |
| `weight` / `body_composition` are **fact-only** RawEvent kinds — **no CanonicalEvent** | ARCHITECTURAL VIOLATION vs aspirational Raw→Canonical→Facts story |
| `selectBodyFactsForDay` admits **Apple Health / healthkit only** — manual weight excluded from DailyFacts | DUPLICATE TRUTH; log shows manual, overview/facts do not |
| Weight is the hero metric; BMI / body fat / lean / RMR are secondary rows | Weight treated as near-complete composition UX |
| RMR route / DailyFacts field exist; HK BasalEnergyBurned is **intentionally not mapped** to RMR | PLACEHOLDER / HOLLOW — hide from launch until a real RMR source exists |
| Client interpretation bars use ACE-style / BMI healthy-weight heuristics | REQUIRES EVIDENCE / UNSAFE AS-IS for classification |
| `lib/classifications/bodyComposition.ts` registers BF%, BMI, WHtR bands | FORMULA ONLY; not wired as official Body UI truth; BMI mislabeled as composition domain |
| DEXA route is empty placeholder; DEXA document type exists without structured extraction | PLACEHOLDER / PARTIAL |
| Manual waist exists on profile contract; not on Body measurement surface | PARTIAL |
| Apple Health is transport (`apple_health` / `healthkit`), not a measurement method | Current ingest preserves sourceId only — method = unknown when not supplied |
| PR #178 physique estimate + AH→BIA inference + 4/10/18/20% margins | REJECT for scientific methodology; presentation salvage only after facts authority |
| No Body score / two-rail rails / Health Protection / Excellence on `main` | KEEP absence — do not invent |
| RG-SOURCE-PRIVACY-01 OPEN; account-scoped AH connection gates exist in Body access hooks | Privacy posture partial; gate remains OPEN |

---

## 3. Current route inventory

| Route | File | Runtime status | Disposition |
|-------|------|----------------|-------------|
| `/(app)/body` | `app/(app)/body/index.tsx` | Live Body Composition overview | REFACTOR (Stage 3B+) |
| `/(app)/body/weight` | `app/(app)/body/weight.tsx` | Alias re-export of index | KEEP |
| `/(app)/body/overview` | `app/(app)/body/overview.tsx` | Empty placeholder shell | HIDE / REMOVE FROM LAUNCH SURFACE |
| `/(app)/body/dexa` | `app/(app)/body/dexa.tsx` | Empty placeholder shell | HIDE / PLACEHOLDER |
| `/(app)/body/calendar` | `app/(app)/body/calendar.tsx` | Live calendar | REUSE / REFACTOR |
| `/(app)/body/list` | `app/(app)/body/list.tsx` | Composition log | REUSE / REFACTOR |
| `/(app)/body/day/[day]` | `app/(app)/body/day/[day].tsx` | Day detail | REUSE / REFACTOR |
| `/(app)/body/metric/[metric]` | `app/(app)/body/metric/[metric].tsx` | Metric detail | REUSE / REFACTOR |
| `/(app)/body/settings` | `app/(app)/body/settings.tsx` | Settings | REUSE |
| `/(app)/body/body-metric-ranges-explainer` | `app/(app)/body/body-metric-ranges-explainer.tsx` | Range explainer | REQUIRES EVIDENCE / REFACTOR |

Home category card navigates to Body Composition (`/(app)/body`).

---

## 4. Current page hierarchy (exact UX outline)

```text
Body Composition (header)
├── [Permission gate — if AH not determined / denied / unavailable]
│   └── BodyAppleHealthPermissionCard (connect / denied / unavailable)
│       └── secondary link: Apple Health in Settings (iOS)
│
└── [Else — data surface]
    ├── Syncing Apple Health… banner (when syncing)
    ├── Today card (BodyTodayCard)
    │   ├── Weight (dominant)
    │   ├── BMI row
    │   ├── Body Fat row
    │   └── Lean Mass row
    ├── This Week weight card (BodyWeeklyWeightCard)
    ├── Baseline delta card (BodyWeightBaselineDeltaCard)
    └── Yearly weight card (BodyYearlyWeightCard) — when visible

Header controls: calendar → body/calendar; log → body/list
Weekly calendar strip: flag BODY_SHOW_WEEKLY_CALENDAR_STRIP = false
```

### Page evaluation checklist

| Question | Finding |
|----------|---------|
| What user sees first | Apple Health permission card when not connected/authorized — **before** educational value |
| Explains Body Composition? | No purpose statement on overview |
| Metrics defined? | Labels only; deeper copy on explainer / metric detail |
| Source and method shown? | Source filtering to AH; method not shown as method |
| Measurement date shown? | “As of” day label on Today card when ready |
| Current state vs progress mixed? | Today + week + baseline + yearly on one scroll — partially mixed |
| Weight as complete composition? | Weight is hero; composition implied by BF/lean rows |
| BMI as composition? | BMI shown as Body Composition row; classifications also place BMI in `body-composition` domain |
| DEXA vs estimates distinguished? | No |
| Trends from RawEvents? | **Yes** — `useWeightSeries`, peeks, metric trends via `getRawEvents` |
| Client duplicates server truth? | Overview prefers DailyFacts for BF/BMI/lean/RMR when present, else peek RawEvent payloads |
| Missing → zero? | Empty states used; interpret progress clamps avoid NaN→0.5 in bars — not a score of zero |
| Stale appears current? | “Today” card can show latest snapshot day that is not today (“as of”) — better than silent today, but not a formal stale state |
| Conflicts reconciled honestly? | Source filter to AH only; no multi-method conflict UI |
| Source connection contextual? | Gate is contextual to Body, but leads with permission |
| Tracking vs influence conflated? | Overview is tracking-heavy; influence categories not shown |
| Loading / missing / partial / stale / conflict / error | Loading + error + empty exist; formal stale/conflict readiness states absent |

---

## 5. Component / hook inventory (selected)

### UI (`lib/ui/body/`)

| File | Responsibility | Disposition | Earliest stage |
|------|----------------|-------------|----------------|
| `BodyAppleHealthPermissionCard.tsx` | Permission CTA | REFACTOR (after value) | 3B/3C |
| `BodyTodayCard.tsx` | Snapshot summary | REFACTOR | 3B/3D |
| `BodyWeeklyWeightCard.tsx` | Weekly weight | REUSE after facts | 3G |
| `BodyWeightBaselineDeltaCard.tsx` | Baseline delta | REUSE after facts | 3G |
| `BodyYearlyWeightCard.tsx` | Yearly weight | REUSE after facts | 3G |
| `BodyWeightLineChart.tsx` | Chart plumbing | REUSE presentation | 3G |
| `InterpretationQualityBar.tsx` | Quality bar chrome | REQUIRES EVIDENCE | 3E+ |
| `WeightBaselineCard.tsx` | Baseline card | REFACTOR | 3G |
| `BodyLogActionSheet.tsx` | Manual log sheet | REUSE | 3C |

### Data hooks (`lib/data/body/`)

| File | Responsibility | Pipeline | Disposition |
|------|----------------|----------|-------------|
| `useBodyOverviewData.ts` | Overview orchestrator | RawEvent series + peek + DailyFacts | REFACTOR / REQUIRES ADR |
| `useBodyOverviewPeek.ts` | Bounded RawEvent peek | RawEvent | UNSAFE AS-IS for official truth |
| `useBodyOverviewSnapshotDayPeek.ts` | Day RawEvent peek | RawEvent | UNSAFE AS-IS for official truth |
| `useBodyMetricTrends.ts` | Metric trends | RawEvent pagination | UNSAFE AS-IS for official trends |
| `useWeightSeries` (lib/data) | Weight series | RawEvent pagination | DUPLICATE TRUTH pressure |
| `useAppleHealthBodyAccessState.ts` | Account-scoped AH gate | Connection + HK auth | KEEP / REUSE |
| `useAppleHealthBodySync.ts` | Sync trigger | Ingest RawEvents | KEEP plumbing |
| `useAppleHealthBodyBackfill.ts` | Backfill | Ingest RawEvents | KEEP plumbing |
| `bodySnapshot.ts` | Snapshot day helpers | Client derived | REFACTOR |
| `sourceFiltering.ts` | AH source allowlist | Client | KEEP until multi-source |

### Interpretation (`lib/body/`)

| File | Risk | Disposition |
|------|------|-------------|
| `bodyCompositionInterpretation.ts` | Client WHO BMI bands + ACE-style BF fitness copy | UNSAFE AS-IS for official classification |
| `bodyCompositionShared.ts` | BMI 18.5–24.9 healthy weight band; BF thresholds | REQUIRES EVIDENCE |
| `bodyOverviewInterpretationBar.ts` | Bar models | REFACTOR |
| `buildBodyMetricRangesExplainerModel.ts` | Explainer content | REQUIRES EVIDENCE |

### Classifications (`lib/classifications/`)

| File | Status | Disposition |
|------|--------|-------------|
| `bodyComposition.ts` | BF% male/female, BMI, WHtR bands; ACSM/NSCA/WHO citations lightly attributed | REQUIRES RFC + EVIDENCE; BMI must leave composition-as-composition framing |
| `classifyDomains.ts` → `classifyBodyComposition` | Domain classifier | DEFER from consumer Body UI until standards approved |

---

## 6. Source inventory

| Capability | Classification | Notes |
|------------|----------------|-------|
| Profile height | IMPLEMENTED | About You / profile |
| Profile sex for interpretation | IMPLEMENTED | Profile; used by interpretation helpers |
| Profile DOB / age | IMPLEMENTED | Profile; age helper exists |
| Manual weight | IMPLEMENTED ingest; PARTIAL / ARCHITECTURAL VIOLATION on read | Log + mutations exist; overview series/trends AH-filter out `manual`; `selectBodyFactsForDay` returns undefined for manual-only days |
| Manual body-fat % | PARTIAL | Optional on manual weight payload; no dedicated BF log UX on overview |
| Manual waist | PARTIAL | `userProfileMain.waistCircumferenceCm`; not Body measurement UX |
| Apple Health weight | IMPLEMENTED | HealthKit → ingest `kind: weight` |
| Apple Health body-fat % | IMPLEMENTED | Via weight payload or `body_composition` |
| Apple Health lean body mass | IMPLEMENTED | `leanBodyMassKg` |
| Apple Health BMI | IMPLEMENTED | Vendor BMI field ingested |
| Apple Health provenance / source app / device / method | MISSING / PARTIAL | HK sample source coalesced then stored as transport `apple_health`; method not preserved |
| Smart-scale via Apple Health | UNVERIFIED | May arrive as AH samples; method unknown |
| Direct connected scale (Withings live) | UNSUPPORTED / orphaned | Withings live sync orphaned per SYSTEM_STATE |
| DEXA document upload type | PARTIAL | `dexa_report` document type |
| DEXA structured parsing | MISSING | Parser warns `DEXA_STRUCTURED_EXTRACTION_UNAVAILABLE` |
| Fat mass (absolute) | MISSING as first-class fact | Derivable only if BF% + weight |
| Lean mass | PARTIAL | DailyFacts `leanBodyMassKg` |
| Appendicular lean mass | MISSING | |
| Regional lean / android-gynoid | MISSING | |
| Visceral adipose tissue | MISSING | |
| RMR | PLACEHOLDER / MISSING at ingest | Contract + metric route exist; HK `BasalEnergyBurned` queried but **intentionally ignored** at canonical boundary (`healthKit.ts`); client Mifflin estimate is separate interpretation — not ingested RMR |
| Measurement conditions | MISSING | |
| Device / source application | MISSING (beyond sourceId) | |
| Observed date | IMPLEMENTED | `observedAt` / dayKey |
| Units | IMPLEMENTED | Preferences mass unit |
| Uncertainty / quality / confidence | MISSING (official) | Client interpretation “quality” bars exist — not official confidence |
| Stale / conflict states | MISSING | |
| Method-specific trend | MISSING | Mixed AH series treated as one |

---

## 7. Apple Health is not a measurement method

Current ingest labels:

- `provider: "apple_health"`
- `sourceId: "apple_health"` (or `healthkit` on some paths)

No logic on `main` was found that maps `source includes "health"` → `method = BIA` in active Body overview code.

**PR #178 (unmerged) did implement** `inferPhysiqueMeasurementSource`: Apple Health / healthkit / `includes("health")` → `bia_smart_scale`. **Disposition: REJECT.**

Future rule (PROPOSAL):

```text
transport = apple_health | healthkit | …
method = dexa | mf_bia | sf_bia | consumer_scale | circumference | manual | unknown | …
When method unavailable → method = unknown. Do not guess.
```

---

## 8. Pipeline map

```text
HealthKit (iOS, account-gated) / manual ingest / (future DEXA)
  → API ingest RawEvent (kind: weight | body_composition)
  → FACT-ONLY path: NO CanonicalEvent
       (FACT_ONLY_RAW_EVENT_KINDS in mapRawEventToCanonical.ts)
  → recomputeForDay ← loadBodyFactsFromRawForDay
  → selectBodyFactsForDay (eligible sources = apple_health ∪ healthkit ONLY)
  → DailyFacts.body { weightKg, bodyFatPercent, bmi, leanBodyMassKg, restingMetabolicRateKcal }
  → IntelligenceContext / Energy / HealthScore (partial consumers)
  → UI (optional DailyFacts overlay on overview snapshot)

PARALLEL consumer path (current Body overview / trends / log):
  UI ← getRawEvents (useWeightSeries, peeks, useBodyMetricTrends, composition log)
  UI ← client interpretation (lib/body/*)
  UI ← classifications registry (present; not primary Body page truth)
```

**Code-truth correction:** Do not describe Body as RawEvent → CanonicalEvent → DailyFacts today. Weight and body_composition skip Canonical by design (`FACT_ONLY_RAW_EVENT_KINDS`). Future Category Intelligence must either (a) keep an explicit approved fact-only summary path with versioned selection rules, or (b) introduce Canonical body events via RFC — **UNRESOLVED** (REQUIRES ADR).

### DailyFacts / Insight coverage

| Field | DailyFacts | Selection rule | Official Body UI classification |
|-------|------------|----------------|----------------------------------|
| weightKg | Yes (AH only) | Manual/withings excluded | Snapshot/trends often RawEvent-derived (AH-filtered) |
| bodyFatPercent | Yes (AH only) | Same | Mixed facts/peek |
| bmi | Yes (AH only) | Same | Mixed |
| leanBodyMassKg | Yes (AH only) | Same | Mixed |
| restingMetabolicRateKcal | Field exists | Rarely populated from ingest | Hollow metric route; Mifflin is client estimate only |
| waist / WHtR / VAT / ALM | No | — | — |
| Health Protection band | No | — | — |
| Performance Support band | No | — | — |
| Confidence / readiness | No | — | — |

Insights: no dedicated Body insight generators found; IntelligenceContext exposes weight/BF accessors.

### RawEvent user-facing reads (Body)

1. `lib/data/useWeightSeries.ts`
2. `lib/data/body/useBodyOverviewPeek.ts`
3. `lib/data/body/useBodyOverviewSnapshotDayPeek.ts`
4. `lib/data/body/useBodyMetricTrends.ts`
5. Composition log via Raw weight list (`list.tsx` / `useBodyCompositionLog`) — may include manual rows the overview filter hides

**Disposition:** REQUIRES ADR — migrate official Current State and trends to facts/summary APIs; keep RawEvents for lineage/replay/debug only; resolve manual inclusion vs AH-only facts; resolve fact-only vs Canonical policy.

---

## 9. Manual entry / DEXA / trend behavior

| Area | Behavior |
|------|----------|
| Manual weight | Ingest + Body log **IMPLEMENTED**; overview/trends/DailyFacts **exclude** manual → DUPLICATE TRUTH |
| Manual BF% | Partial via body composition payloads / preferences goal editors |
| Manual waist | Profile field only |
| DEXA UI | Empty `dexa.tsx` |
| DEXA docs | Type exists; structured extraction unavailable |
| RMR | Metric detail route exists; no real ingested RMR from HK basal |
| Trends | Client weekly/yearly weight from AH-filtered RawEvent series; incremental sync ~45d; 5Y backfill is Devices-initiated |
| Like-with-like | Not enforced |

---

## 10. Privacy / security review (Body paths)

| Expectation | Body finding |
|-------------|--------------|
| Explicit current-account source connection | `useAppleHealthBodyAccessState` checks `getAppleHealthConnected()` before HK query — KEEP |
| No HealthKit read from OS permission alone | Enforced in access hook — KEEP |
| No screen Firestore | Body screens use API hooks — KEEP |
| Client–API boundary | Observed — KEEP |
| RG-SOURCE-PRIVACY-01 | Remains OPEN (Issue #218); leadership residual risk accepted for internal Stage 3A |
| PII in logs | Not exhaustively re-audited here; follow existing privacy runbooks |
| Historical data ownership / disconnect | Existing account deletion / source connection patterns; export coverage OPEN |

No Body-specific privacy “fix” authorized in Stage 3A.

---

## 11. PR #178 disposition matrix

Commit: `4f2e679246c17a074eba12d47114d9d01ab2d32a` on preserved branch `feat/profile-floating-shortcut`. **Do not cherry-pick.**

| Idea | Classification | Rationale |
|------|----------------|-----------|
| `physiqueEstimate.ts` | REJECT | Invents composition segments + unvalidated margins |
| SOURCE_MARGIN 4%/10%/18%/20% | REJECT / REQUIRES EVIDENCE | Not independently validated |
| Apple Health → BIA inference | REJECT | Transport ≠ method |
| BMI healthy-weight overlay on weight chart | REJECT as composition target; SUPPORTING CONTEXT only as BMI screening if labeled | BMI ≠ composition excellence |
| `weightTrendViewModel.ts` range selector UX | SALVAGE PRESENTATION ONLY | After facts-first series |
| `BodyWeightHeroChart` / `WeightHeroGraphCard` | SALVAGE PRESENTATION ONLY | No RawEvent official truth |
| `PhysiqueEstimateGraphCard` | REJECT | False precision physique |
| `bodyOverviewSnapshot.ts` shared snapshot helpers | POTENTIALLY SALVAGEABLE / SALVAGE AFTER FACTS AUTHORITY | Structure useful; truth source must change |
| Apple Health body sync coordinator | POTENTIALLY SALVAGEABLE | Plumbing |
| `useBodyOverviewData` rewrite | SUPERSEDED / REQUIRES ARCHITECTURE | Must not deepen RawEvent authority |
| Passing unit tests in #178 | PLUMBING / FORMULA ONLY | Not scientific approval |

---

## 12. Test inventory (quality assessment)

| Area | Suites (representative) | Classification |
|------|-------------------------|----------------|
| Body overview / resilience | `useBodyOverviewData.*.test.*` | PLUMBING / RUNTIME |
| Peek limit / parallel | `useBodyOverviewPeek.*.test.*` | ARCHITECTURE (bounds) |
| Metric trends bounded query | `useBodyMetricTrends.bounded-query.test.tsx` | ARCHITECTURE |
| AH sync / backfill / account gate | `useAppleHealthBody*.test.*`, `runAppleHealthBody*.test.ts` | PRIVACY / PLUMBING |
| Interpretation / bars | `bodyCompositionInterpretation.test.ts`, UI bar tests | FORMULA ONLY |
| Classifications registry | `lib/classifications/__tests__/*` | FORMULA ONLY — not scientific methodology approval |
| Weight series / cards | weekly/yearly/baseline model tests | PLUMBING / RUNTIME |
| DEXA structured extraction | Missing for Body truth | MISSING |
| Official readiness / conflict / confidence | Missing | MISSING |
| Accessibility of spectrum / rails | Missing (no rails yet) | MISSING |
| Scientific methodology gates | Missing | MISSING |

**Do not claim formula tests validate scientific methodology.**

---

## 13. Feature flags

| Flag | Value | Note |
|------|-------|------|
| `BODY_SHOW_WEEKLY_CALENDAR_STRIP` | `false` | Hides weekly strip on overview |

No Stage 3A Category Intelligence flag exists (correct — runtime not started).

---

## 14. Implementation blockers (for later stages)

1. Human approval of Stage 3A RFC/ADR/spec.
2. Facts-first summary APIs for Body Current State and method-specific series.
3. Explicit policy for **fact-only** weight/body_composition vs introducing Canonical body events.
4. Resolve **manual vs AH-only** DailyFacts selection and overview filtering (duplicate truth).
5. Provenance model distinguishing transport vs method.
6. Versioned standards registry (extend or replace `lib/classifications` pattern via RFC).
7. Waist capture UX if WHtR approved for v1.
8. Hide or replace hollow RMR surface until a real RMR source exists.
9. DEXA structured extraction if advanced tier authorized.
10. Release gates remain OPEN (legal, source privacy, export).

---

## 15. Reuse / reject summary

| KEEP | REUSE | REFACTOR | REJECT / UNSAFE |
|------|-------|----------|-----------------|
| Account-scoped AH gates | Weight chart presentation | Overview IA | AH→BIA inference |
| Manual weight ingest plumbing | Calendar/log routes | Interpretation bars | Physique estimate |
| RawEvent lineage backend | Bounded query patterns | Facts/peek fallback | BMI as composition excellence |
| Empty DEXA honesty | Metric detail navigation | Classifications domain labeling | Mixed-method silent trends |
| No fabricated Body score today | Sync/backfill plumbing | Permission-first gate | Universal BF excellence |
| | | AH-only facts + Raw UI dual path | Hollow RMR as composition truth |

---

## 16. Release gates (unchanged)

- RG-LEGAL-01: OPEN
- RG-SOURCE-PRIVACY-01: OPEN (Issue #218 OPEN)
- Export coverage: OPEN
- Export scalability: OPEN
- Infra CI validation truth gap: OPEN
- Consent persistence: NOT IMPLEMENTED
- Legal assent: INACTIVE
- Production deployment: NONE

---

## Companion Stage 3A documents

- Evidence matrix: `docs/90_audits/2026-09-18-body-composition-evidence-matrix.md`
- Product/standards spec: `docs/10_product/specs/BODY_COMPOSITION_PRODUCT_AND_STANDARDS_V1.md`
- RFC: `docs/80_rfc/RFC-body-composition-category-intelligence-v1.md`
- ADR: `docs/70_adrs/ADR-body-composition-category-intelligence-v1.md`
