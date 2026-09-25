/**
 * Body Scan extraction adapter interface (pure).
 *
 * Adapters read an already-extracted PDF *text layer*. Stage 3E does not add OCR: an
 * image-only report has no text to read, so adapters must decline and the scan lands in
 * manual review rather than guessing.
 *
 * Adapters produce candidates only. Nothing here is confirmed truth.
 */

import type {
  BodyScanDevice,
  BodyScanDraftStatus,
  BodyScanExtractedField,
  BodyScanExtractionWarning,
  BodyScanMethod,
  BodyScanType,
} from "@oli/contracts";

/** Minimum characters of text layer before a PDF is worth handing to an adapter. */
export const BODY_SCAN_MIN_TEXT_CHARS = 40;

export type BodyScanAdapterPage = { pageNumber: number; text: string };

export type BodyScanAdapterInput = {
  documentId: string;
  scanId: string;
  checksumSha256: string;
  pages: readonly BodyScanAdapterPage[];
  pageCount: number;
  textCharCount: number;
  /** Warning codes surfaced by PDF text extraction (e.g. `scanned_pdf_no_text`). */
  textWarningCodes: readonly string[];
};

export type BodyScanAdapterEligibility =
  | { eligible: true }
  | { eligible: false; reasonCode: string };

export type BodyScanAdapterResult = {
  status: BodyScanDraftStatus;
  scanTypeCandidate: BodyScanType;
  methodCandidate: BodyScanMethod;
  device: BodyScanDevice;
  performedAtCandidate: string | null;
  fields: BodyScanExtractedField[];
  warnings: BodyScanExtractionWarning[];
};

export type BodyScanAdapter = {
  id: string;
  version: string;
  detect(input: BodyScanAdapterInput): BodyScanAdapterEligibility;
  extract(input: BodyScanAdapterInput): BodyScanAdapterResult;
};

/** True when the PDF carries no usable text layer (image-only / scanned). */
export function hasUsableTextLayer(input: {
  textCharCount: number;
  textWarningCodes: readonly string[];
}): boolean {
  if (input.textWarningCodes.includes("scanned_pdf_no_text")) return false;
  if (input.textWarningCodes.includes("encrypted_pdf")) return false;
  return input.textCharCount >= BODY_SCAN_MIN_TEXT_CHARS;
}

/** Confidence at or below this threshold always requires explicit human review. */
export const BODY_SCAN_LOW_CONFIDENCE_THRESHOLD = 0.8;

export function fieldRequiresReview(args: {
  normalizedValue: number | null;
  confidence: number | null;
}): boolean {
  if (args.normalizedValue == null) return true;
  if (args.confidence == null) return true;
  return args.confidence <= BODY_SCAN_LOW_CONFIDENCE_THRESHOLD;
}

export function summarizeAdapterConfidence(fields: readonly BodyScanExtractedField[]): {
  overall: number | null;
  lowConfidenceFieldCount: number;
} {
  const scored = fields
    .map((f) => f.confidence)
    .filter((c): c is number => typeof c === "number");
  const lowConfidenceFieldCount = fields.filter((f) => f.requiresReview).length;
  if (scored.length === 0) return { overall: null, lowConfidenceFieldCount };
  const overall = scored.reduce((sum, c) => sum + c, 0) / scored.length;
  return { overall: Number(overall.toFixed(4)), lowConfidenceFieldCount };
}
