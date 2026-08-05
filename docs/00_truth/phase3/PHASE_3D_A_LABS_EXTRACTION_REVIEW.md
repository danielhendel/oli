# Phase 3D-A — Labs Extraction, Review, and Structured History

**Status:** Complete (PR #206)  
**Base:** Phase 3C Document Ingestion OS (`d0bb4cf` / PR #205)  
**Feature head:** `c8235e021c54784631a025a914c4b8bdf84c0d37`  
**Signed-in device gate:** Passed (imported terminal state; integrityViolations = 0)

## Phase position

- **Phase 3C Document Ingestion OS** — previously merged (PR #205). Owns secure upload → store → classify → extract staging → document lifecycle.
- **Phase 3D-A** — this phase. Builds Labs extraction, automatic trusted import, structured history, integrity reconciliation, and imported-report terminal UX on top of Document OS.
- **Next safe Labs step:** historical multi-report import (not started here).

## Bound product rule (as shipped)

- Stored document ≠ structured lab result.
- Quest/DirectLabs digitally generated text-layer PDFs are extracted server-side (pdfjs; no OCR).
- High-confidence candidates may be **automatically published** into accepted Labs results (`imported` terminal report state when pending review count is 0).
- Zero-required-user-review is the happy path for supported reports; genuine unresolved exceptions still surface review when needed.
- Source-to-display reconciliation and one-active-generation / history ownership are enforced for consumer latest + history reads.
- Legacy derived-data migration / integrity audit tooling exists for signed-in cleanup (`labs_signed_in_reconciliation_v1`).
- Export/delete/reprocessing coverage includes Labs drafts, reviews, accepted results, and projections.
- Graphs, classifications, diagnosis, DailyFacts, Insights, IntelligenceContext, and full canonical BloodTestEvent activation are **out of scope** for Phase 3D-A.

## Supported formats (v1)

- Digitally generated Quest Diagnostics text-layer PDFs (`quest_text_pdf_v1`)
- DirectLabs / Quest layouts
- Cleveland HeartLab / Cardio IQ sections embedded in Quest reports

## Unsupported (honest terminal / review states)

- Image-only / scanned PDFs without text layer
- Encrypted PDFs
- Generic / non-Quest providers
- DEXA / DNA
- LLM-primary parsing
- OCR (not approved)
- Classification / diagnosis / clinical ranges invented by Oli

## Pipeline (as shipped)

Original PDF → Document OS record → Quest eligibility → PDF text extract (pdfjs-dist server-only) → Labs extraction draft → alias/unit/range/flag candidates → automatic trusted import when eligible → accepted structured results → Labs history UI; imported document status when no pending review remains.

## Feature flag

`EXPO_PUBLIC_LABS_OS_V1` — default on; `"0"` rolls UI back to Phase 3C stored-document Labs experience.

## Explicit non-goals (do not overclaim)

- Generic provider support beyond Quest/DirectLabs text PDFs
- OCR
- Graphs / trend visualizations beyond basic structured history points
- Classifications or diagnosis
- DailyFacts / Insights / IntelligenceContext
- Full canonical BloodTestEvent activation
- Medical recommendations or Oli clinical ranges beyond preserving source reference text

## Completion evidence (repo truth)

- Secure PDF ingestion via Phase 3C Document OS
- Quest/DirectLabs text extraction + auto trusted import
- Zero-required-user-review workflow for fully trusted imports
- Source-to-display reconciliation + history deduplication / latest selection
- Legacy derived-data integrity migration tooling
- One-active-generation / history ownership for consumer reads
- Imported terminal report state (list + document detail)
- Export/delete/reprocessing coverage
- Signed-in device gate passed on exact reviewed head
- Staging last verified at `oli-api-00260-bv8` @ 100% on image tag `c8235e0` (digest `sha256:03d66adc4669a0cbe50b325131faa5ff945bb32dc397ed0a515009c4fc4ea07e`) before merge
