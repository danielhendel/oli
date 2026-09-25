/**
 * Live Lean Rx DXA document parser (server).
 *
 * Bridges the Document Ingestion OS parser registry to the pure DXA extractor: reads the
 * PDF text layer with the shared pdfjs adapter, then produces both the generic extraction
 * envelope and the Body Scan extraction draft.
 *
 * Text layer only — no OCR. Image-only reports are declined so they surface as manual
 * review instead of fabricated values. Never logs page text or metric values.
 */

import type {
  BodyScanExtractionDraft,
  DocumentExtractionResult,
  ExtractedDocumentField,
  ExtractionProvenance,
} from "@oli/contracts";
import { BODY_SCAN_SCHEMA_VERSION } from "@oli/contracts";
import {
  buildUnsupportedExtractionResult,
  type DocumentParser,
  type DocumentParserInput,
  type ParserEligibilityResult,
} from "../../../../../lib/data/documents/documentParser";
import {
  summarizeAdapterConfidence,
  type BodyScanAdapterInput,
} from "../../../../../lib/data/body-scans/bodyScanAdapter";
import {
  LIVE_LEAN_RX_DXA_ADAPTER_ID,
  LIVE_LEAN_RX_DXA_ADAPTER_VERSION,
  detectLiveLeanRxDxa,
  extractLiveLeanRxDxa,
} from "../../../../../lib/data/body-scans/extraction/liveLeanRxDxaExtractor";
import { extractPdfTextPages } from "../labs/pdfTextExtraction";
import { bodyScanDraftId, bodyScanIdForDocument } from "./persistBodyScan";

export const LIVE_LEAN_RX_DXA_PARSER_ID = LIVE_LEAN_RX_DXA_ADAPTER_ID;
const EXTRACTION_VERSION = "1.0.0";

async function toAdapterInput(input: DocumentParserInput): Promise<BodyScanAdapterInput> {
  const bytes = input.fileBytes ?? new Uint8Array();
  const text = await extractPdfTextPages(bytes);
  return {
    documentId: input.documentId,
    scanId: bodyScanIdForDocument(input.documentId),
    checksumSha256: input.checksumSha256,
    pages: text.pages,
    pageCount: text.pageCount,
    textCharCount: text.textCharCount,
    textWarningCodes: text.warningCodes,
  };
}

async function canParse(input: DocumentParserInput): Promise<ParserEligibilityResult> {
  if (input.mediaType !== "application/pdf") {
    return { eligible: false, reasonCode: "media_type_not_supported" };
  }
  if (input.documentType !== "dexa_report" && input.documentType !== "unknown") {
    return { eligible: false, reasonCode: "document_type_not_supported" };
  }
  if (!input.fileBytes) return { eligible: false, reasonCode: "file_bytes_unavailable" };

  const adapterInput = await toAdapterInput(input);
  const detection = detectLiveLeanRxDxa(adapterInput);
  return detection.eligible ? { eligible: true } : { eligible: false, reasonCode: detection.reasonCode };
}

/**
 * Produce the Document OS extraction envelope and the Body Scan draft in one pass so the
 * PDF text layer is only read once per job.
 */
export async function parseLiveLeanRxDxaBundle(input: DocumentParserInput): Promise<{
  envelope: DocumentExtractionResult;
  draft: BodyScanExtractionDraft;
}> {
  const now = new Date().toISOString();
  const adapterInput = await toAdapterInput(input);
  const result = extractLiveLeanRxDxa(adapterInput);
  const confidenceSummary = summarizeAdapterConfidence(result.fields);
  const scanId = bodyScanIdForDocument(input.documentId);

  const envelopeFields: ExtractedDocumentField[] = result.fields.map((field) => ({
    fieldId: field.fieldId,
    rawLabel: field.rawLabel,
    rawValue: field.rawValue,
    normalizedCandidateValue: field.normalizedValue,
    unitCandidate: field.unit,
    pageNumber: field.pageNumber ?? 1,
    sourceLocator: field.sourceLocator,
    confidence: field.confidence,
    warningCodes: field.warningCodes,
    parserFieldType: `body_scan.${field.metricId}`,
    requiresReview: field.requiresReview,
  }));

  const provenance: ExtractionProvenance[] = result.fields.map((field) => ({
    documentId: input.documentId,
    fieldId: field.fieldId,
    parserId: LIVE_LEAN_RX_DXA_ADAPTER_ID,
    parserVersion: LIVE_LEAN_RX_DXA_ADAPTER_VERSION,
    extractionVersion: EXTRACTION_VERSION,
    pageNumber: field.pageNumber ?? 1,
    sourceLocator: field.sourceLocator,
    confidence: field.confidence,
    warningCodes: field.warningCodes,
    computedAt: now,
  }));

  const envelope: DocumentExtractionResult = {
    schemaVersion: "1.0.0",
    documentId: input.documentId,
    parserId: LIVE_LEAN_RX_DXA_ADAPTER_ID,
    parserVersion: LIVE_LEAN_RX_DXA_ADAPTER_VERSION,
    extractionVersion: EXTRACTION_VERSION,
    status: result.status === "unsupported" ? "unsupported" : "partial",
    pagesProcessed: adapterInput.pages.length,
    ...(adapterInput.pageCount > 0 ? { pageCount: adapterInput.pageCount } : {}),
    fields: envelopeFields,
    warnings: result.warnings.map((w) => ({ code: w.code, message: w.message })),
    confidenceSummary,
    provenance,
    sourceDocumentChecksum: input.checksumSha256,
    // The envelope is a candidate set; confirmation happens in the Body Scans review flow.
    reviewStatus: "review_needed",
    createdAt: now,
  };

  const draft: BodyScanExtractionDraft = {
    schemaVersion: BODY_SCAN_SCHEMA_VERSION,
    id: bodyScanDraftId(scanId, LIVE_LEAN_RX_DXA_ADAPTER_ID),
    userId: "",
    scanId,
    documentId: input.documentId,
    jobId: null,
    adapter: { id: LIVE_LEAN_RX_DXA_ADAPTER_ID, version: LIVE_LEAN_RX_DXA_ADAPTER_VERSION },
    status: result.status,
    scanTypeCandidate: result.scanTypeCandidate,
    methodCandidate: result.methodCandidate,
    device: result.device,
    performedAtCandidate: result.performedAtCandidate,
    pagesProcessed: adapterInput.pages.length,
    pageCount: adapterInput.pageCount,
    fields: result.fields,
    warnings: result.warnings,
    confidenceSummary,
    sourceDocumentChecksum: input.checksumSha256,
    superseded: false,
    createdAt: now,
    updatedAt: now,
  };

  return { envelope, draft };
}

export const liveLeanRxDxaParser: DocumentParser = {
  id: LIVE_LEAN_RX_DXA_ADAPTER_ID,
  version: LIVE_LEAN_RX_DXA_ADAPTER_VERSION,
  supportedDocumentTypes: ["dexa_report"],
  canParse,
  async parse(input: DocumentParserInput): Promise<DocumentExtractionResult> {
    if (!input.fileBytes) {
      return buildUnsupportedExtractionResult({
        documentId: input.documentId,
        parserId: LIVE_LEAN_RX_DXA_ADAPTER_ID,
        parserVersion: LIVE_LEAN_RX_DXA_ADAPTER_VERSION,
        extractionVersion: EXTRACTION_VERSION,
        checksumSha256: input.checksumSha256,
        createdAt: new Date().toISOString(),
        warningCode: "DEXA_SOURCE_BYTES_UNAVAILABLE",
        warningMessage: "This scan report is stored, but its contents could not be read.",
      });
    }
    const bundle = await parseLiveLeanRxDxaBundle(input);
    return bundle.envelope;
  },
};
