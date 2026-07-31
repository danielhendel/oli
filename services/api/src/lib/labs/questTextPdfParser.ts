/**
 * Quest text PDF document parser (Phase 3D-A).
 * Deterministic text-layer extraction → Labs draft + Document OS envelope.
 */

import type { DocumentExtractionResult, LabExtractionDraft } from "@oli/contracts";
import {
  buildUnsupportedExtractionResult,
  type DocumentParser,
  type DocumentParserInput,
  type ParserEligibilityResult,
} from "../../../../../lib/data/documents/documentParser";
import {
  extractQuestLabReportDraft,
  QUEST_TEXT_PDF_EXTRACTION_VERSION,
  QUEST_TEXT_PDF_PARSER_ID,
  QUEST_TEXT_PDF_PARSER_VERSION,
} from "../../../../../lib/labs/extraction/extractQuestLabReportDraft";
import { detectQuestTextReport } from "../../../../../lib/labs/extraction/detectQuestTextReport";
import { extractPdfTextPages } from "./pdfTextExtraction";

export type QuestParseBundle = {
  envelope: DocumentExtractionResult;
  draft: LabExtractionDraft;
};

function draftIdFor(documentId: string): string {
  return `draft_${documentId}_${QUEST_TEXT_PDF_PARSER_ID}_${QUEST_TEXT_PDF_PARSER_VERSION}`;
}

function envelopeFromDraft(draft: LabExtractionDraft): DocumentExtractionResult {
  const status =
    draft.status === "unsupported"
      ? "unsupported"
      : draft.status === "failed"
        ? "failed"
        : draft.results.length === 0
          ? "partial"
          : "complete";

  const fields = draft.results.map((r) => ({
    fieldId: r.id,
    rawLabel: r.rawAnalyteLabel,
    rawValue: r.rawResult,
    normalizedCandidateValue: r.result?.kind === "numeric" ? r.result.value : null,
    unitCandidate: r.unit.normalizedUnit,
    pageNumber: r.provenance.sourcePage,
    sourceLocator: r.provenance.sourceLocator,
    confidence: r.confidence,
    warningCodes: r.warnings,
    parserFieldType: "lab_result",
    requiresReview: true,
  }));

  const provenance = draft.results.map((r) => ({
    documentId: draft.documentId,
    fieldId: r.id,
    parserId: draft.parser.id,
    parserVersion: draft.parser.version,
    extractionVersion: draft.parser.extractionVersion,
    pageNumber: r.provenance.sourcePage,
    sourceLocator: r.provenance.sourceLocator,
    confidence: r.confidence,
    warningCodes: r.warnings,
    computedAt: draft.createdAt,
  }));

  return {
    schemaVersion: "1.0.0",
    documentId: draft.documentId,
    parserId: draft.parser.id,
    parserVersion: draft.parser.version,
    extractionVersion: draft.parser.extractionVersion,
    status,
    pagesProcessed: draft.reportCandidate.pageCount ?? 0,
    ...(draft.reportCandidate.pageCount && draft.reportCandidate.pageCount > 0
      ? { pageCount: draft.reportCandidate.pageCount }
      : {}),
    fields,
    warnings: draft.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      ...(w.candidateId ? { fieldId: w.candidateId } : {}),
    })),
    confidenceSummary: {
      overall: draft.reportCandidate.confidence,
      lowConfidenceFieldCount: draft.results.filter((r) => r.confidence < 0.85).length,
    },
    provenance,
    sourceDocumentChecksum: draft.sourceChecksumSha256,
    reviewStatus: status === "unsupported" || status === "failed" ? "extracted" : "review_needed",
    createdAt: draft.createdAt,
  };
}

export async function parseQuestLabPdfBundle(input: DocumentParserInput): Promise<QuestParseBundle> {
  const now = new Date().toISOString();
  const draftBase = {
    documentId: input.documentId,
    userId: "server", // overwritten by orchestration with real uid
    draftId: draftIdFor(input.documentId),
    checksumSha256: input.checksumSha256,
    createdAt: now,
  };

  if (!input.fileBytes || input.fileBytes.byteLength === 0) {
    const draft = extractQuestLabReportDraft({
      ...draftBase,
      pages: [],
    });
    return { envelope: envelopeFromDraft(draft), draft };
  }

  const extracted = await extractPdfTextPages(input.fileBytes);
  const detection = detectQuestTextReport({
    fullText: extracted.pages.map((p) => p.text).join("\n"),
    pageCount: extracted.pageCount,
    textCharCount: extracted.textCharCount,
  });

  if (!detection.supported) {
    const draft = extractQuestLabReportDraft({
      ...draftBase,
      pages: extracted.pages,
    });
    // Prefer extractor warning codes when present
    if (extracted.warningCodes.includes("scanned_pdf_no_text") && draft.warnings.length === 0) {
      draft.warnings.push({
        code: "scanned_pdf_no_text",
        message: "This PDF does not contain a readable text layer.",
      });
      draft.status = "unsupported";
    }
    return { envelope: envelopeFromDraft(draft), draft };
  }

  const draft = extractQuestLabReportDraft({
    ...draftBase,
    pages: extracted.pages,
  });
  return { envelope: envelopeFromDraft(draft), draft };
}

export const questTextPdfParser: DocumentParser = {
  id: QUEST_TEXT_PDF_PARSER_ID,
  version: QUEST_TEXT_PDF_PARSER_VERSION,
  supportedDocumentTypes: ["lab_report", "unknown"],
  async canParse(input: DocumentParserInput): Promise<ParserEligibilityResult> {
    if (input.mediaType !== "application/pdf") {
      return { eligible: false, reasonCode: "media_type_not_supported" };
    }
    if (input.documentType !== "lab_report" && input.documentType !== "unknown") {
      return { eligible: false, reasonCode: "document_type_not_supported" };
    }
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
      // Soft-eligible — orchestration should supply bytes; without bytes we still run and return unsupported.
      return { eligible: true };
    }
    try {
      const extracted = await extractPdfTextPages(input.fileBytes);
      const detection = detectQuestTextReport({
        fullText: extracted.pages.map((p) => p.text).join("\n"),
        pageCount: extracted.pageCount,
        textCharCount: extracted.textCharCount,
      });
      if (!detection.supported) {
        return { eligible: false, reasonCode: detection.reasonCode };
      }
      return { eligible: true };
    } catch {
      return { eligible: false, reasonCode: "pdf_text_extraction_failed" };
    }
  },
  async parse(input: DocumentParserInput): Promise<DocumentExtractionResult> {
    const { envelope } = await parseQuestLabPdfBundle(input);
    if (envelope.status === "unsupported" && envelope.fields.length === 0) {
      return buildUnsupportedExtractionResult({
        documentId: input.documentId,
        parserId: QUEST_TEXT_PDF_PARSER_ID,
        parserVersion: QUEST_TEXT_PDF_PARSER_VERSION,
        extractionVersion: QUEST_TEXT_PDF_EXTRACTION_VERSION,
        checksumSha256: input.checksumSha256,
        createdAt: envelope.createdAt,
        warningCode: envelope.warnings[0]?.code ?? "LAB_STRUCTURED_EXTRACTION_UNAVAILABLE",
        warningMessage:
          envelope.warnings[0]?.message ??
          "This report is stored, but structured extraction is not available for this format.",
      });
    }
    return envelope;
  },
};

/** Expose last draft via parse bundle helper for orchestration persistence. */
export { draftIdFor };
