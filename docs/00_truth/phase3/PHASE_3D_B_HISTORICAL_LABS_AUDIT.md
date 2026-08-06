# Phase 3D-B — Historical Multi-Report Import and Neutral Progress History Audit

**Binding date:** 2026-08-06  
**Worktree:** `/Users/danielhendel/oli-labs-phase3db-history`  
**Branch:** `feat/labs-phase3db-historical-history`  
**Primary checkout:** Untouched (`/Users/danielhendel/oli`)

## Verified base commit

| Item | Value |
|------|-------|
| Required Phase 3D-A merge (reported) | `db508935521c25954b92c17180266493f4b64d68` |
| `origin/main` at worktree creation | `db508935521c25954b92c17180266493f4b64d68` |
| Subject | Merge pull request #206 from danielhendel/feat/labs-phase3da-extraction-review |
| Tree | `fda8d1689f83f314acbb4d0eabeaef52f6d2c129` |
| Parents | `d0bb4cf…` (main) + `f2ed086…` (feature) |
| Ancestry check | Phase 3D-A merge **is** current `origin/main` (HEAD = origin/main, 0 ahead / 0 behind) |
| Conflicting branch / PR | None for `feat/labs-phase3db-historical-history` |
| PR #206 | Not modified |

Phase 3D-A completion doc (`PHASE_3D_A_LABS_EXTRACTION_REVIEW.md`) explicitly marks **historical multi-report import as next / not started**.

---

## Current collections and contracts

### User-scoped Firestore

| Collection | Role | Primary contract |
|------------|------|------------------|
| `documents` | Document OS source of truth (checksum, upload, lifecycle) | `lib/contracts/documents.ts` |
| `documentIngestionJobs` | Parse orchestration | Document OS |
| `documentExtractions` / extractions envelopes | Generic extraction envelope | Document OS |
| `labExtractionDrafts` | Quest draft candidates + report metadata | `labExtractionDraftSchema` in `lib/contracts/labsOs.ts` |
| `labReviews` | Review / import terminal status | `LabReviewRecord` |
| `labAcceptedResults` | Typed structured accepted history | `AcceptedLabResult` / `acceptedLabResultSchema` |
| `labResults` | v2 projections for category/summary cards | `LabMetricResultDto` (`schemaVersion: 2`) |
| `labUploads` | Legacy uploads mirror | `LabUploadDto` |

Registry / export: `lib/data/user-data/userDataRetentionRegistry.ts`, `lib/data/documents/documentAccountLifecycle.ts` (`DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS`).

### Schema versions (as shipped)

- `LABS_OS_SCHEMA_VERSION` = `1.0.0`
- Alias / unit registry versions present on Labs OS contracts
- Projection boundary: `docs/00_truth/phase3/PHASE_3D_A_PROJECTION_BOUNDARY.md`

### API front door (authenticated)

| Route | Store | File |
|-------|-------|------|
| `GET /users/me/labs/summary` | `labResults` v2 | `services/api/src/routes/labsMe.ts` |
| `GET /users/me/labs/metrics/:metricKey` | `labResults` v2 + consumer filter | same |
| `GET /users/me/labs/metrics/:metricKey/history` | `labAcceptedResults` | same |
| Labs reviews / accept | drafts / reviews / accepted / projections | `labsReviewsMe.ts` |
| Document upload / reprocess / delete | Document OS + Labs derived | `documentsMe.ts` |

Client history API: `lib/api/labsHistory.ts` → `getLabMetricHistory`.  
Client hook: `lib/data/labs/useLabMetricHistory.ts` (**implemented, unused by screens**).

---

## Existing history support (Phase 3D-A foundations)

### Helpers (`lib/labs/history/`)

| Function | File | Behavior |
|----------|------|----------|
| `evaluateLabTrendEligibility` | `evaluateLabTrendEligibility.ts` | Eligibility including `numeric_compatible`, `table_only`, `inequality_table_only`, `qualitative`, `pattern`, `missing_date`, unit/specimen/method mismatches |
| `buildLabHistoryCompatibilityGroup` | same | `metric\|unit\|specimen\|method` group key |
| `sortLabHistoryByCollectionDate` | same | Descending by `collectedAt` only |
| `selectRepresentativeLabResult` | `selectRepresentativeLabResult.ts` | Panel/role/equality/review/page ranking; never reference-like |
| `calculateLabMetricChange` / `formatLabMetricChangeCopy` | `calculateLabMetricChange.ts` | Neutral absolute/% change; `interpretation: null` |
| `deduplicateLabHistorySourceRepresentations` | `deduplicateLabHistorySourceRepresentations.ts` | Collapse same-draw representations |

### Consumer integrity

- `selectLabConsumerHistoryRows`, `selectLabConsumerLatestResult`, `isEligibleLabConsumerHistoryRow` — `lib/labs/integrity/filterLabHistoryForConsumer.ts`
- One-active-generation cleanup — `cleanupStaleLabDerivedRows` in `runLabAutoPublishAfterDraft.ts`
- Signed-in reconciliation — `labsSignedInReconciliationMigration.ts`, CLI `scripts/labs/labs-integrity-audit.cli.ts`

### Date authority (partial)

- Extraction: `parseQuestDateTime` / `extractQuestReportMetadata` (`lib/labs/extraction/extractQuestReportMetadata.ts`)
- Contract comment on `AcceptedLabResult.uploadedAt`: operational; **never history axis**
- History route and consumer latest prefer `collectedAt`
- Date-only stored as `YYYY-MM-DDT00:00:00.000Z` with precision `date_only`
- Timezone name used for precision enum only — **not retained** as `timezoneOffset` / `timezoneName`

### Provenance (as shipped)

Accepted top-level: `sourceDocumentId`, `sourceExtractionId`, `sourceCandidateId`.  
Idempotent id: `acc_{documentId}_{candidateId}`.  
Nested provenance: page, locator, checksum, parser versions, panel/result roles.

### Duplicate documents

SHA-256 checksum collision on upload in `documentsMe.ts` returns `{ duplicate: true }` and does not keep a second active document.

### What already works for multiple successful imports (data layer)

Distinct `sourceDocumentId`s, `collectedAt` ordering on accepted history API, consumer dedup, stale cleanup on reprocess, delete-by-sourceDocumentId, integrity migration for orphans/thresholds.

---

## Known gaps (why Phase 3D-B exists)

### Product / UI

1. Docs mark historical multi-report import **not started**.
2. Metric detail / Labs home still read **v2 projections**, not `useLabMetricHistory`.
3. Metric detail falls back to `reportedAt` then `createdAt` for display date (`LabMetricDetailContent.tsx`) — violates collection-date-only history axis when `collectedAt` missing.
4. Category latest uses `collectedAt ?? reportedAt` (`labMetricCatalog.ts`).
5. No Labs home neutral progress summary across multi-report history.
6. No post-import summary emphasizing collection date vs upload date.
7. Document list may under-emphasize Collected vs Uploaded.

### Temporal contract

8. No `LabSourceTimestamp` type (`sourceRaw`, `sourceCalendarDate`, `instant`, offset/name).
9. Calendar date is compressed into ISO UTC wall-clock; TZ name discarded after precision classification.
10. Missing `collectedAt` does not always fail closed for history points in UI (falls back).

### Identity

11. No cryptographic / versioned history-point fingerprint of the target form  
    `hash(userId + canonicalMetricId + sourceDocumentId + sourceCandidateId + sourceCalendarDate + panelId + specimenType + methodId + measuredOrCalculated)`.
12. Dedup keys omit or inconsistently include document/candidate/method/measured fields.
13. History filter path hardcodes `measuredOrCalculated: "reported_unknown"` in places, weakening identity.

### Parsers / layouts

14. Strong support for Quest text + Cardio IQ (2024-style). No dedicated year/layout profiles or synthetic fixtures for:
    - Quest 2020 Basic Health Profile
    - Quest 2020 standard (non-fasting / N/A calculated)
    - Quest 2021 qualitative antibody
    - Quest 2022 standard (lipids/CBC/CMP/hormones/PSA/iron)
15. Older sparse layouts may land in `unsupported_layout` / review-needed.

### API / scale

16. History loads ≤200 accepted rows then sorts in memory; no Firestore `orderBy collectedAt` composite index.
17. Cursor is accepted-result id after in-memory sort (works for bounded pages; not ideal at scale).
18. Pairwise method compatibility not fully evaluated across draws at list time (`methodCompatibility` may default `"compatible"`).

### Dual-store drift

19. Category cards / metric detail projections can disagree with accepted typed history for inequalities, qualitative, patterns.
20. Change copy on metric detail uses projection history heuristics, not always `historyCompatibilityGroup`.

### Export registry drift

21. Retention registry may still mark `lab_results` as `not_covered` while Functions export includes Labs collections — align in this phase if touched.

---

## Proposed architecture (extend, do not duplicate)

### Authoritative history store

Keep **`labAcceptedResults`** as the multi-report longitudinal store.  
Keep **v2 `labResults`** as the category/summary projection boundary (Phase 3D-A rule).  
Do **not** invent a third history collection or activate BloodTestEvent unless repo truth later requires it.

### Temporal contract (additive)

Introduce `LabSourceTimestamp` (or equivalent fields on report metadata + accepted results) additively:

- Preserve `sourceRaw`, `sourceCalendarDate`, precision, optional instant/offset/name
- History ordering and change math use **`collectedAt.sourceCalendarDate`** (or equivalent calendar field)
- Never substitute `uploadedAt` / `createdAt` / `processedAt` / `reportedAt` / `receivedAt`
- Missing/ambiguous collection date → no history point; result remains in report detail; eligibility `missing_collection_date` / `missing_date`; fail closed

### History-point identity

Add deterministic `historyPointId` / fingerprint version for one genuine source result → one active point.  
Reuse `acceptedLabResultId(documentId, candidateId)` for storage; fingerprint for cross-generation dedup and invariant tests.

### Generation ownership

Reuse Phase 3D-A invariants:

- One active document per checksum (unless explicit version retention)
- One active parser-derived extraction generation per document/parser family
- One active accepted result per genuine source candidate
- One active history projection per accepted-result identity
- User overrides preserved across reprocess
- Delete removes only that source’s derived rows; recompute latest/prior

### Import orchestration

Upload order must not affect history order. History always sorts by collection date.  
Extend auto-publish path: extract → require deterministic collection date for history eligibility → accept → history points → invalidate summaries.

### Historical Quest profiles

Versioned layout profiles + synthetic de-identified fixtures (no private PHI):

- `quest_2020_basic_health_profile_v1`
- `quest_2020_standard_v1`
- `quest_2021_qualitative_antibody_v1`
- `quest_2022_standard_v1`
- Preserve `quest_cardio_iq` / 2024 advanced behavior (no regression)

### Client

Wire `useLabMetricHistory` into metric detail; bounded pagination; stale guards; invalidate on upload/delete/reprocess.  
Labs home: optional neutral progress line only when compatible prior exists.  
Import summary + document list: Collected primary, Uploaded secondary.

### Neutral change

Reuse `calculateLabMetricChange` / `formatLabMetricChangeCopy`. Extend with `elapsedDays` if needed.  
Forbidden language: improved/worsened/better/worse/healthy/optimal/risk.

### Qualitative / pattern / inequality

Timeline/table only; no numeric conversion; no percent change for inequalities unless a future censored-value policy is approved.

---

## Strict non-goals

- Colored trend graphs / range bands
- Deficient / Healthy / Strong / Optimal / Elite classifications
- “Better” / “worse” interpretations
- Medical diagnosis or recommendations
- Category scores / ratings
- DailyFacts / Insights / IntelligenceContext
- Canonical BloodTestEvent activation (unless code truth later requires)
- OCR
- Generic non-Quest providers
- Production deployment
- Committing private reports or pasting private values / PHI into fixtures, logs, or PR comments
- Automatic merge of this PR
- Recreating or modifying PR #206
- Reusing the deleted Phase 3D-A worktree path

---

## Implementation order (locked)

1. Temporal contract + failing date/identity tests  
2. History-point identity + generation ownership invariants  
3. Historical Quest layout profiles + synthetic fixtures  
4. Multi-report import orchestration (collection-date history)  
5. Compatibility / latest / prior / neutral change extensions  
6. Bounded history API hardening  
7. Client hook wiring + metric detail + Labs home + import/document UX  
8. Qualitative / inequality timelines  
9. Export / delete / reprocess coverage  
10. Synthetic multi-report lifecycle + private structural validation (PASS/FAIL only)  
11. Full Code Check Gate → staging (`oli-staging-fdbba`) → signed-in device review  
12. Keep PR **draft** until explicit approval

---

## Audit verdict

Phase 3D-A merged at `db508935` provides a **solid single-report → accepted-result → history API foundation**. Multi-report longitudinal product behavior is incomplete: UI still projection-led, temporal fields are flat ISO without retained calendar/TZ provenance, history identity is incomplete, and older Quest layouts lack dedicated profiles.

**Phase 3D-B should extend existing helpers, accepted store, Document OS lifecycle, and history route — not rebuild them.**
