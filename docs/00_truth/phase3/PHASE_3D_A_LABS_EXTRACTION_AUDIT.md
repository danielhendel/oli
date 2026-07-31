# Phase 3D-A — Labs Extraction Audit (pre-edit)

**Binding date:** 2026-07-31  
**Worktree:** `/Users/danielhendel/oli-labs-phase3da-extraction`  
**Base:** `origin/main` @ `d0bb4cf571f1b000bafb9324e36107f49a207eaa` (PR #205 merged)

## Verified identity

| Item | Value |
|------|-------|
| origin/main | `d0bb4cf571f1b000bafb9324e36107f49a207eaa` |
| PR #205 | MERGED — Document Ingestion OS |
| Branch | `feat/labs-phase3da-extraction-review` |
| Primary checkout | Untouched (`/Users/danielhendel/oli`) |

## Existing architecture (code truth)

1. **Document OS (Phase 3C)** owns upload → store → classify → extract staging → review boundary.
2. **Lab parsers are fail-closed stubs** (`unsupported_lab`, legacy `mockLabPdfParser`) — no biomarkers, no PDF bytes.
3. **Orchestration does not fetch Storage bytes** into parsers today.
4. **No review/accept API** — `review_needed → accepted → structured` is unreachable.
5. **v2 `LabMetricResultDto`** exists in `labResults` but has **no production writer**; value is `number|null` (insufficient for inequalities/qualitative).
6. **Catalog** (`labMetricCatalog.ts`) has metric keys + aliases; no versioned alias registry / match method.
7. **No BloodTest/Lab canonical event** — do not invent one in 3D-A.
8. **No PDF text dependency** installed — server adapter required.
9. **Classification (`lib/classifications/labs.ts`)** must not wire to real user Labs data.

## Decisions (no conflict blocking 3D-A)

| Decision | Choice |
|----------|--------|
| Accepted structured store | New `labAcceptedResults` (typed `LabResultValue`) + optional numeric projection to v2 `labResults` only when `kind=numeric` and `comparator=eq` for existing summary UI |
| Extraction draft | New Labs-specific draft documents under `labExtractionDrafts`, plus Document OS envelope fields for staging status |
| Parser | `quest_text_pdf_v1` (deterministic text-layer Quest/DirectLabs family) |
| PDF dependency | Add server-only `pdfjs-dist` (Apache-2.0) — document in phase notes |
| Canonical events | Deferred to 3D-B / later — document adapter boundary only |
| Feature flag | `EXPO_PUBLIC_LABS_OS_V1` (default on; `"0"` rolls back to Phase 3C stored-document UX) |
| Auto-accept | Never in 3D-A |

## Material gaps to close

- Fetch bytes + checksum verify in ingestion job
- Real Quest parser + fixtures
- Labs draft / review / accept APIs
- History from accepted results with unit/method compatibility
- Delete/export coverage for drafts + accepted results
- Labs review UI + home/history updates
- Flag + docs

## Explicit non-goals (unchanged)

DEXA, DNA, DailyFacts, Insights, Oli clinical ranges, LLM primary parser, OCR, auto-canonicalize.
