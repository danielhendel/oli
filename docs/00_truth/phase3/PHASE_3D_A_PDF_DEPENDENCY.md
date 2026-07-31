# Phase 3D-A — PDF text extraction dependency

| Field | Value |
|-------|-------|
| Package | `pdfjs-dist` |
| Version | `4.10.38` |
| License | Apache-2.0 |
| Scope | `services/api` only (server / Cloud Run) |
| Maintenance | Mozilla PDF.js distribution — actively maintained |
| Why | No existing PDF text dependency in the repo; digitally generated Quest PDFs require a text-layer extractor |
| Alternatives considered | `pdf-parse` (wraps older pdf.js; weaker maintenance), OCR providers (not approved for 3D-A) |
| Security | Runs server-side only; never shipped to mobile; raw text never logged; bounded pages/chars/timeout |
| OCR | Not included |
| Bundle impact | API container only — not in Expo client bundle |

Adapter: `services/api/src/lib/labs/pdfTextExtraction.ts`
