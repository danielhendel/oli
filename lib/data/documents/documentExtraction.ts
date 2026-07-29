/**
 * Extraction envelope validation (pure).
 * Validates envelope integrity — not medical correctness.
 */

import {
  documentExtractionResultSchema,
  type DocumentExtractionResult,
  type ExtractedDocumentField,
} from "@oli/contracts";

export type ExtractionEnvelopeValidationIssue = {
  code:
    | "SCHEMA_INVALID"
    | "DUPLICATE_FIELD_ID"
    | "MISSING_PROVENANCE"
    | "PROVENANCE_FIELD_MISMATCH"
    | "INVALID_CONFIDENCE"
    | "NAN_OR_INFINITY"
    | "MISSING_PAGE"
    | "PARSER_VERSION_MISSING";
  message: string;
};

export type ExtractionEnvelopeValidationResult =
  | { ok: true; value: DocumentExtractionResult }
  | { ok: false; issues: ExtractionEnvelopeValidationIssue[] };

function confidenceInvalid(value: number | null | undefined): boolean {
  if (value == null) return false;
  return !Number.isFinite(value) || value < 0 || value > 1;
}

function hasNaNOrInfinity(field: ExtractedDocumentField): boolean {
  const n = field.normalizedCandidateValue;
  return typeof n === "number" && !Number.isFinite(n);
}

/**
 * Validate a candidate extraction envelope.
 * Rejects duplicate field IDs, missing provenance, invalid confidence, NaN/Infinity.
 */
export function validateExtractionEnvelope(raw: unknown): ExtractionEnvelopeValidationResult {
  const parsed = documentExtractionResultSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: [{ code: "SCHEMA_INVALID", message: "Extraction envelope failed schema validation" }],
    };
  }

  const value = parsed.data;
  const issues: ExtractionEnvelopeValidationIssue[] = [];

  if (!value.parserId || !value.parserVersion || !value.extractionVersion) {
    issues.push({ code: "PARSER_VERSION_MISSING", message: "Parser/extraction version is required" });
  }

  const fieldIds = new Set<string>();
  for (const field of value.fields) {
    if (fieldIds.has(field.fieldId)) {
      issues.push({ code: "DUPLICATE_FIELD_ID", message: `Duplicate field ID: ${field.fieldId}` });
    }
    fieldIds.add(field.fieldId);

    if (!Number.isInteger(field.pageNumber) || field.pageNumber < 1) {
      issues.push({ code: "MISSING_PAGE", message: `Field ${field.fieldId} lacks a valid page number` });
    }
    if (confidenceInvalid(field.confidence)) {
      issues.push({ code: "INVALID_CONFIDENCE", message: `Field ${field.fieldId} has invalid confidence` });
    }
    if (hasNaNOrInfinity(field)) {
      issues.push({ code: "NAN_OR_INFINITY", message: `Field ${field.fieldId} has non-finite numeric value` });
    }
  }

  if (confidenceInvalid(value.confidenceSummary.overall)) {
    issues.push({ code: "INVALID_CONFIDENCE", message: "Overall confidence is invalid" });
  }

  if (value.fields.length > 0 && value.provenance.length === 0) {
    issues.push({ code: "MISSING_PROVENANCE", message: "Structured fields require provenance" });
  }

  const provenanceFieldIds = new Set(value.provenance.map((p) => p.fieldId));
  for (const field of value.fields) {
    if (!provenanceFieldIds.has(field.fieldId)) {
      issues.push({
        code: "PROVENANCE_FIELD_MISMATCH",
        message: `Missing provenance for field ${field.fieldId}`,
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value };
}

/** Staging review boundary — extracted fields are never canonical health facts. */
export function isExtractionAcceptedAsCanonical(_result: DocumentExtractionResult): false {
  void _result;
  return false;
}
