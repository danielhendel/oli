# Phase 3D-C — Lab Graphs and Trend Visualizations Audit

**Status:** Planning checkpoint (pre-implementation)  
**Worktree:** `/Users/danielhendel/oli-labs-phase3dc-graphs`  
**Branch:** `feat/labs-phase3dc-graphs`  
**Primary checkout:** Untouched (`/Users/danielhendel/oli`)

---

## Verified base

| Item | Value |
|------|-------|
| Reported Phase 3D-B merge (treated as report) | `d43ae878373534dbb4cef84c4958221ace826792` |
| `origin/main` at worktree creation | `d43ae878373534dbb4cef84c4958221ace826792` |
| Subject | Merge pull request #207 from danielhendel/feat/labs-phase3db-historical-history |
| Tree | `514d316379d3c2e649c4d2b108f769eff4a2792d` |
| Parents | `db508935…` (main / 3D-A) + `d74fba40…` (3D-B feature) |
| Ancestry | Reported SHA **is** current `origin/main` (HEAD = origin/main, 0 ahead / 0 behind) |
| Conflicting branch / PR | None for `feat/labs-phase3dc-graphs` |
| PR #206 / #207 | Not modified |

Phase 3D-B completion (`PHASE_3D_B_HISTORICAL_LABS_COMPLETION.md`) explicitly marks **lab graphs / trend visualizations as next / not started**.

---

## Existing history architecture (reuse — do not invent a second store)

### API

| Item | Repo truth |
|------|------------|
| Route | `GET /users/me/labs/metrics/{metricKey}/history` |
| Handler | `services/api/src/routes/labsMe.ts` |
| Client | `lib/api/labsHistory.ts` → `getLabMetricHistory` |
| Hook | `lib/data/labs/useLabMetricHistory.ts` (**wired** into metric detail) |
| Store | `labAcceptedResults` only |
| Page limit | `1–50` (default `20`) |
| Upstream fetch bound | `.limit(200)` then filter / dedupe / sort / page |

Pipeline (server): auth → catalog metric → fetch accepted rows → require `collectedAt` → `selectLabConsumerHistoryRows` → `sortLabHistoryByCollectionDate` (desc) → cursor page → `toHistoryPointDto`.

### Pure history helpers (`lib/labs/history/`)

| Function | Role |
|----------|------|
| `evaluateLabTrendEligibility` | Point eligibility: `numeric_compatible`, qualitative/pattern/inequality table-only, unit/specimen/method mismatches, missing collection date |
| `buildLabHistoryCompatibilityGroup` | `metric\|unit\|specimen\|method` group key |
| `sortLabHistoryByCollectionDate` | Descending by `collectedAt` only |
| `selectRepresentativeLabResult` | Collapse draw siblings; never reference-like |
| `calculateLabMetricChange` / `formatLabMetricChangeCopy` | Neutral absolute/% change; `interpretation: null` |
| `deduplicateLabHistorySourceRepresentations` | Same-source representation collapse |
| `labSourceTimestamp` / `historyTimestampFromAccepted` | Calendar-date authority; no device-TZ shift of displayed date |

### Temporal invariant (locked — do not change unless bug proven)

```
x-axis date = laboratory collectedAt / sourceCalendarDate
```

Never: `uploadedAt`, `createdAt`, `processedAt`, `reportedAt`, `receivedAt`, reprocess time, or document upload date.

Upload order must not affect graph order. Sorting for visualization is owned by the chart transformer (API returns descending).

### Metric detail today

Screen: `app/(app)/labs/metric/[metricKey].tsx`  
UI: `lib/ui/labs/LabMetricDetailContent.tsx`

Layout today:

1. Latest result (+ reference range text from source report)
2. Neutral change
3. “What this means”
4. History table (accepted preferred; projection fallback)
5. Source

Available to charts without new APIs: `LabHistoryPointDto[]` with `trendEligible`, `trendEligibility`, units, `collectedAt` / `sourceCalendarDate`, numeric/qualitative/pattern results, provenance (`sourceDocumentId`, `sourcePage`, `laboratoryName`, `normalizedFlag`).

`loadMore` exists on the hook but is **not** wired in the UI.

### Labs home

Category cards show value + neutral progress line. **No sparklines in 3D-C** (default). Full chart lives on metric detail only.

---

## Existing visualization primitives

| Question | Answer |
|----------|--------|
| Approved Labs line chart? | **No** |
| Victory / Skia installed? | **No** |
| Reanimated as direct dep? | **No** (optional peer only) |
| Chart package already installed? | **`react-native-svg@15.11.2`** |
| Charts used elsewhere? | **Yes** — Body weight / Weight trend / Exercise progress (SVG); workout bars (View/Animated) |
| Expo SDK | `~53.0.27` |
| Shared path helper | `lib/ui/body/monotoneLinePath.ts` → `monotonePathD` |
| Interaction reference | `lib/ui/WeightTrendChart.tsx` (responder scrub + nearest point) |
| Reduce Motion pattern | `lib/ui/activity/useActivityReduceMotion.ts` |

---

## Chosen chart implementation

**Minimal stack consistent with repo truth:**

```
Expo ~53
react-native-svg 15.11.2   (already installed — no new dependency)
monotonePathD              (reuse shared helper)
NEW Labs-only chart component + pure series transforms
```

- Do **not** add Victory Native, Skia, Gifted Charts, or Reanimated for this phase.
- Do **not** reuse Body/Weight chart components directly (different domain, eligibility, no clinical/weight floors).
- Share geometry helpers only (`monotonePathD`, calendar→UTC day index pattern from history libs).
- Dependency decision detail: `PHASE_3D_C_LAB_GRAPHS_DEPENDENCY.md`.

### Server vs client transforms

| Concern | Owner |
|---------|-------|
| Dedupe, representative collapse, reference/threshold exclusion, deleted/superseded filtering | **Server** (existing) |
| `trendEligible` / eligibility labels on DTO | **Server** (existing) |
| Page bound ≤50; fetch ≤200 | **Server** (existing) |
| Chart ascending sort by `collectedAt` | **Client pure transform** |
| Graph eligibility aggregation (`numeric_graph` / single-point / timeline modes) | **Client pure transform** (maps existing point eligibility) |
| Y domain padding, nearest-point selection, path geometry | **Client** |
| Neutral change math | **Existing pure lib** (unchanged by graph) |
| Classification / healthy bands / Oli zones | **Out of scope** |

---

## Performance boundaries

| Bound | Value |
|-------|-------|
| History API page | max **50** (default 20) |
| Upstream accepted fetch | **200** |
| Chart visible points (3D-C) | **≤50** (API page bound; no need for LTTB at Labs density) |
| Typical Cholesterol series | **4** points |

No unbounded arrays in the client. Pure transforms stay off the hot render path via memoization at the content boundary. Do not recompute heavy math inside paint.

Range controls: **All** for first release. Pure `filterLabTrendRange` may support 1Y/3Y/5Y for tests, but UI chips are omitted unless density justifies (sparse multi-year Labs histories usually need All).

---

## Accessibility strategy

Charts must not be visual-only.

| Requirement | Approach |
|-------------|----------|
| Accessible summary | `accessibilityLabel` on chart: metric name, point count, date span, latest value |
| Accessible point list | History table remains the detailed representation |
| Selected point | Visible date + exact value + unit; label includes source flag when shown |
| Touch targets | ≥44pt for scrub area / controls |
| Reduce Motion | Respect via existing reduce-motion helper; no decorative motion required |
| Color | Structural accent only — **no** good/bad coloring of the trend line |
| Screen reader | Do not auto-read every coordinate; summary + table |

Formal VoiceOver certification remains incomplete from 3D-B device gate — 3D-C still ships labels + table equivalence.

---

## Graph eligibility (series-level presentation)

Reuse `evaluateLabTrendEligibility` per point. Series builder maps to presentation modes:

| Mode | Meaning |
|------|---------|
| `numeric_graph` | ≥2 compatible equality-numeric points, same unit/specimen/method group |
| `single_numeric_point` | Exactly one graphable numeric point |
| `qualitative_timeline` | Qualitative / text history — table only |
| `pattern_timeline` | Pattern history — table only |
| `inequality_timeline` | Comparator ≠ `eq` — table only; never coerce `<4` → `4` |
| `incompatible_history` | Unit/specimen/method conflict prevents a combined numeric graph |
| `missing_collection_date` | No valid collection date for graphing |
| `not_graphable` | Catch-all empty / no numeric series |

Do not coerce incompatible results just to draw a line.

---

## Metric detail hierarchy (target)

1. **Latest result**
2. **Neutral change**
3. **Trend** (graph / single-point / timeline note)
4. **History** (existing table — not replaced)
5. **Source**

“What this means” may remain below the hero; Trend inserts before History.

---

## Strict non-goals

- Deficient / Healthy / Strong / Optimal / Elite
- Red/yellow/green Oli zones or clinical risk bands
- Laboratory reference-range shading as Oli interpretation
- Category scores / ratings
- Medical advice / recommendations / diagnosis / predictions
- DailyFacts / Insights / IntelligenceContext / graph-derived AI
- OCR / generic non-Quest providers
- Sparklines on Labs home
- Production deploy
- Automatic merge
- New chart dependency unless audit is overturned by Expo breakage
- Second Labs history store
- Firebase / business logic in screens
- PHI or health values in logs

---

## Implementation plan (commits)

1. `docs(labs): audit lab trend visualization architecture` ← this document + dependency decision
2. `test(labs): lock graph eligibility and temporal behavior`
3. `feat(labs): add deterministic lab trend series`
4. `feat(labs): add accessible lab trend chart`
5. `feat(labs): integrate trend graphs into metric detail`
6. Regression coverage for delete/reprocess via existing history lifecycle tests + chart series purity

---

## Open questions resolved by audit

| Question | Resolution |
|----------|------------|
| Need new dependency? | **No** |
| Minimal stack? | `react-native-svg` + `monotonePathD` |
| Max points today? | **50**/page; fetch **200** |
| Metric detail data? | Accepted history DTO already sufficient |
| Range chips? | Pure filter yes; UI **All** only for v1 |
| Extend eligibility API? | Prefer series-level mapping; extend point evaluator only if a bug is proven |
