# Phase 3D-A — Labs Extraction, Review, and Structured History

**Status:** In progress (implementation branch)  
**Base:** Phase 3C Document Ingestion OS (`d0bb4cf` / PR #205)

## Bound product rule

Stored document ≠ structured lab result. Extracted candidates require human review. No auto-accept. No DailyFacts / Insights / canonical Lab events in this phase.

## Supported formats (v1)

- Digitally generated Quest Diagnostics text-layer PDFs (`quest_text_pdf_v1`)
- DirectLabs / Quest layouts
- Cleveland HeartLab / Cardio IQ sections embedded in Quest reports

## Unsupported (honest terminal / review states)

- Image-only / scanned PDFs without text layer
- Encrypted PDFs
- Non-Quest providers
- DEXA / DNA
- LLM-primary parsing
- OCR (not approved)

## Pipeline

Original PDF → Document OS record → Quest eligibility → PDF text extract (pdfjs-dist server-only) → Labs extraction draft → alias/unit/range/flag candidates → user review → accepted structured results → Labs history UI

## Feature flag

`EXPO_PUBLIC_LABS_OS_V1` — default on; `"0"` rolls UI back to Phase 3C stored-document Labs experience.

## Explicit non-goals

Canonical BloodTest event activation, Oli clinical ranges, medical recommendations, unit value conversion beyond notation normalization.
