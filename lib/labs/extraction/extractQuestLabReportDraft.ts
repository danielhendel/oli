/**
 * Quest text lab report extraction orchestration (pure) — Phase 3D-A.
 */

import type { LabExtractionDraft } from "@oli/contracts";
import { LABS_OS_SCHEMA_VERSION } from "@oli/contracts";
import { detectQuestTextReport } from "./detectQuestTextReport";
import { extractQuestAnalyteRows } from "./extractQuestAnalyteRows";
import { extractQuestReportMetadata } from "./extractQuestReportMetadata";
import { segmentQuestReportText } from "./segmentQuestReport";

export const QUEST_TEXT_PDF_PARSER_ID = "quest_text_pdf_v1";
export const QUEST_TEXT_PDF_PARSER_VERSION = "1.1.0";
export const QUEST_TEXT_PDF_EXTRACTION_VERSION = "1.1.0";

export type QuestPageText = { pageNumber: number; text: string };

export function extractQuestLabReportDraft(args: {
  documentId: string;
  userId: string;
  draftId: string;
  checksumSha256: string;
  pages: readonly QuestPageText[];
  createdAt: string;
  jobId?: string;
}): LabExtractionDraft {
  const fullText = args.pages.map((p) => p.text).join("\n");
  const textCharCount = fullText.replace(/\s+/g, " ").trim().length;
  const detection = detectQuestTextReport({
    fullText,
    pageCount: args.pages.length,
    textCharCount,
  });

  if (!detection.supported) {
    const warningCode =
      detection.reasonCode === "scanned_pdf_no_text"
        ? "scanned_pdf_no_text"
        : detection.reasonCode === "encrypted_pdf"
          ? "encrypted_pdf"
          : detection.reasonCode === "low_confidence"
            ? "low_confidence"
            : "unsupported_layout";
    return {
      schemaVersion: LABS_OS_SCHEMA_VERSION,
      id: args.draftId,
      documentId: args.documentId,
      userId: args.userId,
      reportCandidate: {
        confidence: detection.confidence,
        pageCount: args.pages.length,
        reportFamily: null,
        formatFamilyVersion: null,
      },
      panels: [],
      results: [],
      unmatched: [],
      warnings: [
        {
          code: warningCode,
          message:
            detection.reasonCode === "scanned_pdf_no_text"
              ? "This PDF does not contain a readable text layer."
              : "This report format is not supported for structured extraction yet.",
        },
      ],
      parser: {
        id: QUEST_TEXT_PDF_PARSER_ID,
        version: QUEST_TEXT_PDF_PARSER_VERSION,
        extractionVersion: QUEST_TEXT_PDF_EXTRACTION_VERSION,
      },
      sourceChecksumSha256: args.checksumSha256,
      status: "unsupported",
      createdAt: args.createdAt,
      ...(args.jobId ? { jobId: args.jobId } : {}),
    };
  }

  const segmented = segmentQuestReportText(args.pages);
  const metadata = extractQuestReportMetadata({
    metadataLines: [
      ...segmented.metadataLines,
      ...args.pages.flatMap((p) => p.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 20)),
    ],
    panelNames: segmented.panels.map((p) => p.name),
    pageCount: args.pages.length,
    formatFamily: detection.formatFamily,
    formatFamilyVersion: detection.formatFamilyVersion,
    confidence: detection.confidence,
  });

  const rows = extractQuestAnalyteRows({
    report: segmented,
    documentId: args.documentId,
    checksumSha256: args.checksumSha256,
    parserId: QUEST_TEXT_PDF_PARSER_ID,
    parserVersion: QUEST_TEXT_PDF_PARSER_VERSION,
    extractionVersion: QUEST_TEXT_PDF_EXTRACTION_VERSION,
  });

  const status =
    rows.results.length === 0 && rows.unmatched.length === 0
      ? "partial"
      : rows.warnings.some((w) => w.code === "unsupported_layout")
        ? "partial"
        : "review_needed";

  return {
    schemaVersion: LABS_OS_SCHEMA_VERSION,
    id: args.draftId,
    documentId: args.documentId,
    userId: args.userId,
    reportCandidate: metadata,
    panels: rows.panels,
    results: rows.results,
    unmatched: rows.unmatched,
    warnings: rows.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      ...(w.candidateId ? { candidateId: w.candidateId } : {}),
      ...(w.pageNumber ? { pageNumber: w.pageNumber } : {}),
    })),
    parser: {
      id: QUEST_TEXT_PDF_PARSER_ID,
      version: QUEST_TEXT_PDF_PARSER_VERSION,
      extractionVersion: QUEST_TEXT_PDF_EXTRACTION_VERSION,
    },
    sourceChecksumSha256: args.checksumSha256,
    status,
    createdAt: args.createdAt,
    ...(args.jobId ? { jobId: args.jobId } : {}),
  };
}
