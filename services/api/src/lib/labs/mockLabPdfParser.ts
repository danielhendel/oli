// services/api/src/lib/labs/mockLabPdfParser.ts
// Fail-closed structured extraction stub (Phase 3B).
// Never invent biomarkers. Never mark status "parsed" without a real parser.
import type { LabMetricResultDto } from "@oli/contracts";

export const LAB_STRUCTURED_EXTRACTION_UNAVAILABLE_MESSAGE =
  "This report is stored, but structured extraction is not available yet.";

export type LabPdfParseOutcome = {
  results: LabMetricResultDto[];
  matchedCount: number;
  unmatchedCount: number;
  status: "unsupported";
  labDate?: undefined;
  userMessage: string;
};

/**
 * Structured lab PDF extraction is not implemented.
 * Arbitrary PDF bytes must never produce mock biomarkers or abnormal flags.
 * @deprecated Name retained for call-site clarity; do not restore mock biomarkers.
 */
export function mockParseLabPdf(_args: {
  uploadId: string;
  fileName: string;
  now: string;
  /** Ignored — PDF bytes are never parsed into fake results. */
  pdfBytes?: Buffer | Uint8Array | null;
}): LabPdfParseOutcome {
  void _args;
  return {
    results: [],
    matchedCount: 0,
    unmatchedCount: 0,
    status: "unsupported",
    userMessage: LAB_STRUCTURED_EXTRACTION_UNAVAILABLE_MESSAGE,
  };
}

/** Explicit fail-closed resolver used by the upload pipeline. */
export function resolveLabPdfStructuredExtraction(args: {
  uploadId: string;
  fileName: string;
  now: string;
  pdfBytes?: Buffer | Uint8Array | null;
}): LabPdfParseOutcome {
  return mockParseLabPdf(args);
}
