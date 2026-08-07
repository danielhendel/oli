# Phase 3D-B — Historical Multi-Report Import and Neutral Progress History

**Status:** Complete (PR #207)  
**Base:** Phase 3D-A Labs Extraction & Review (`db508935` / PR #206)  
**Feature head:** `77fa42bf7b1f6d653ea42812f2fe76a94f66132f`  
**Signed-in device gate:** Passed on exact feature head (defects: none)

## Phase position

- **Phase 3D-A** — previously merged (PR #206). Owns single-report Quest extraction, auto trusted import, accepted results, and metric history API foundations.
- **Phase 3D-B** — this phase. Extends Document OS + 3D-A accepted-result ownership for **historical multi-report import**, **collection-date timeline authority**, and **neutral latest/prior change**.
- **Next safe Labs step:** Lab graphs / trend visualizations (not started here). Classifications remain out of scope until after graphs.

## Bound product rules (as shipped)

- History timeline date = laboratory **`collectedAt` / source calendar date** only.
- **`uploadedAt` / `createdAt` / `processedAt` never replace `collectedAt`** for history identity or ordering.
- One genuine source result → one active history point (checksum/source identity; not filename).
- Duplicate report/result suppression remains checksum-based.
- Latest / prior selection uses `collectedAt` order.
- Neutral absolute and percentage change only — no better/worse language.
- Qualitative / pattern / inequality results are **table-only** history (no numeric coercion, no chart points).
- Lab reports list is an **imported-report archive**, not a required-review queue.
- Consumer-safe document display names hide opaque picker/cache identifiers at presentation time.
- Reuse Phase 3D-A accepted-result store and history helpers — **no third history store**.

## Historical Quest coverage (v1)

| Collection | Layout / notes |
|------------|----------------|
| June 5, 2020 | Basic Health Profile — stacked Desired Range grammar; DOB+Collected Date pipe-line fix |
| Sep 24, 2020 | Standard historical Quest text |
| Apr 13, 2021 | Qualitative SARS-CoV-2 IgG + IgM (Positive); interpretation-guide exclusion |
| Jul 7, 2022 | Standard historical Quest text |
| Oct 15, 2024 | Regression coverage on newer Quest layouts |

## Capabilities completed

- Historical multi-report import via authenticated Document OS front door
- Collection-date authority end-to-end (source → DTO → accepted → history → UI)
- Bounded metric history API through staging gateway (`GET /users/me/labs/metrics/{metricKey}/history`)
- One history point per genuine source result + duplicate suppression
- Neutral absolute / percentage latest–prior change
- Qualitative / pattern / inequality table-only timelines
- Consumer-safe report names (`Lab report` fallback for opaque tokens)
- Export / delete / reprocess coverage retained from 3D-A path
- Signed-in iPhone device gate passed on `77fa42bf7b1f6d653ea42812f2fe76a94f66132f`

## Explicit non-goals (do not overclaim)

- Generic non-Quest providers
- OCR / scanned image-only PDFs
- Graphs / range bands / classification categories
- Category scores
- DailyFacts / Insights / IntelligenceContext
- Production deployment in this phase
- VoiceOver / Dynamic Type / Reduce Motion formal a11y certification (accepted NOT TESTED on device gate)

## Staging last verified (pre-merge)

| Item | Value |
|------|-------|
| Project | `oli-staging-fdbba` |
| Revision | `oli-api-00267-jjg` @ 100% |
| Image digest | `sha256:a230579340ef0717f14e28bda50d6736f298aad02ddb8bb95782fd01a759f5c3` |
| Source marker | `oli-api:77fa42b` |
| Gateway | `oli-api-config-20260807-134514` ACTIVE |
| Health | Cloud Run + gateway 200 |

## Feature flag

`EXPO_PUBLIC_LABS_OS_V1` — unchanged; Labs OS remains the consumer surface for historical reports and history.

## Audit trail

Pre-implementation audit: `docs/00_truth/phase3/PHASE_3D_B_HISTORICAL_LABS_AUDIT.md`
