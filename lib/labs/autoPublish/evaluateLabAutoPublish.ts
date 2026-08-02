/**
 * Central high-confidence lab auto-publish policy (Phase 3D-A).
 *
 * Pure + deterministic. Automatic publication means transcription confidence
 * only — never medical validation.
 */
import {
  LAB_AUTO_PUBLISH_POLICY_VERSION,
  type LabAutoPublishBlockReason,
  type LabAutoPublishDecision,
  type LabCandidateConfidence,
  type LabExtractionWarningCode,
  type LabReportMetadataCandidate,
  type LabResultCandidate,
} from "@oli/contracts";
import { getLabMetricImportProfile } from "./labMetricImportProfiles";

export const LAB_AUTO_PUBLISH_THRESHOLDS = {
  reportFamily: 0.98,
  rowSegmentation: 0.98,
  /** Exact/approved deterministic identity only. */
  analyteIdentity: 1.0,
  resultValue: 0.99,
  unit: 0.99,
  provenance: 1.0,
  date: 0.98,
  duplicateSafety: 1.0,
} as const;

export const LAB_AUTO_PUBLISH_BLOCKING_WARNINGS: ReadonlySet<LabExtractionWarningCode> = new Set([
  "ambiguous_analyte",
  "ambiguous_value",
  "ambiguous_unit",
  "unsupported_result_type",
  "duplicate_candidate",
  "conflicting_report_date",
  "page_count_mismatch",
  "low_confidence",
  "scanned_pdf_no_text",
  "encrypted_pdf",
  "unsupported_layout",
]);

const ALLOWED_MATCH_METHODS = new Set(["exact_canonical", "exact_alias", "normalized_exact", "deterministic_pattern"]);

export type EvaluateLabAutoPublishInput = {
  report: LabReportMetadataCandidate;
  candidate: LabResultCandidate;
  /** Report-family / parser eligibility already resolved by ingestion. */
  reportFamilyEligible: boolean;
  confidence: LabCandidateConfidence;
  /** Candidate-level warning codes (extraction). */
  warningCodes: readonly LabExtractionWarningCode[];
};

function buildEvidence(input: EvaluateLabAutoPublishInput) {
  const c = input.candidate;
  return {
    matchMethod: c.aliasMatch.matchMethod,
    resultKind: c.result?.kind ?? "null",
    comparator: c.result?.kind === "numeric" ? c.result.comparator : null,
    normalizedUnit: c.unit.normalizedUnit,
    confidence: input.confidence,
    warningCodes: [...input.warningCodes],
  };
}

function fail(reasons: LabAutoPublishBlockReason[], input: EvaluateLabAutoPublishInput): LabAutoPublishDecision {
  return {
    eligible: false,
    policyVersion: LAB_AUTO_PUBLISH_POLICY_VERSION,
    reasons,
    evidence: buildEvidence(input),
  };
}

/**
 * Evaluate one candidate for automatic structured publication.
 * Each required confidence dimension is independently gated — no weighted average.
 */
export function evaluateLabAutoPublish(input: EvaluateLabAutoPublishInput): LabAutoPublishDecision {
  const reasons: LabAutoPublishBlockReason[] = [];
  const { candidate, report, confidence } = input;

  if (!input.reportFamilyEligible) {
    reasons.push("unsupported_report_family");
  }
  if (confidence.reportFamily < LAB_AUTO_PUBLISH_THRESHOLDS.reportFamily) {
    reasons.push("low_report_family_confidence");
  }
  if (input.warningCodes.includes("scanned_pdf_no_text") || input.warningCodes.includes("encrypted_pdf")) {
    reasons.push("image_only_or_encrypted");
  }

  const match = candidate.aliasMatch;
  if (!match.canonicalMetricId || match.matchMethod === "unmatched") {
    reasons.push("analyte_unmatched");
  } else if (match.requiresReview || match.confidence < 0.95) {
    reasons.push("analyte_ambiguous");
  } else if (!ALLOWED_MATCH_METHODS.has(match.matchMethod)) {
    reasons.push("analyte_fuzzy_or_non_deterministic");
  } else if (confidence.analyteIdentity < LAB_AUTO_PUBLISH_THRESHOLDS.analyteIdentity) {
    reasons.push("low_dimension_confidence");
  }

  const result = candidate.result;
  if (!result || result.kind !== "numeric") {
    reasons.push("result_type_not_auto_publishable");
  } else if (result.comparator !== "eq") {
    reasons.push("result_comparator_not_eq");
  } else if (confidence.resultValue < LAB_AUTO_PUBLISH_THRESHOLDS.resultValue) {
    reasons.push("result_value_low_confidence");
  }

  if (!candidate.unit.known || !candidate.unit.normalizedUnit) {
    reasons.push("unit_unknown");
  } else if (confidence.unit < LAB_AUTO_PUBLISH_THRESHOLDS.unit) {
    reasons.push("unit_low_confidence");
  }

  const profile = match.canonicalMetricId ? getLabMetricImportProfile(match.canonicalMetricId) : undefined;
  if (!profile || !profile.autoPublishV1) {
    reasons.push("metric_not_auto_publish_v1");
  } else if (candidate.unit.normalizedUnit && !profile.allowedUnits.includes(candidate.unit.normalizedUnit)) {
    reasons.push("unit_incompatible");
  } else if (result && !profile.expectedKinds.includes(result.kind)) {
    reasons.push("cross_field_inconsistent");
  }

  const prov = candidate.provenance;
  if (
    !prov.sourceDocumentId ||
    !prov.sourceLocator ||
    !prov.sourceChecksumSha256 ||
    !prov.parserId ||
    !Number.isFinite(prov.sourcePage) ||
    prov.sourcePage < 1
  ) {
    reasons.push("missing_provenance");
  } else if (confidence.provenance < LAB_AUTO_PUBLISH_THRESHOLDS.provenance) {
    reasons.push("low_dimension_confidence");
  }

  if (!report.collectedAt) {
    reasons.push("missing_collection_date");
  } else if (confidence.date < LAB_AUTO_PUBLISH_THRESHOLDS.date) {
    reasons.push("conflicting_or_low_date_confidence");
  }

  if (prov.resultRole === "historical_column") {
    reasons.push("historical_column");
  }
  if (confidence.duplicateSafety < LAB_AUTO_PUBLISH_THRESHOLDS.duplicateSafety) {
    reasons.push("duplicate_candidate");
  }
  if (confidence.rowSegmentation < LAB_AUTO_PUBLISH_THRESHOLDS.rowSegmentation) {
    reasons.push("low_dimension_confidence");
  }

  for (const code of input.warningCodes) {
    if (LAB_AUTO_PUBLISH_BLOCKING_WARNINGS.has(code)) {
      reasons.push("blocking_warning");
      break;
    }
  }

  if (profile?.methodSensitive && candidate.method?.noteRef && !candidate.method.assayMethod) {
    // Unresolved method note on method-sensitive metric → block
    if (input.warningCodes.includes("method_note_unresolved")) {
      reasons.push("method_unresolved");
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  if (uniqueReasons.length > 0) {
    return fail(uniqueReasons, input);
  }

  return {
    eligible: true,
    policyVersion: LAB_AUTO_PUBLISH_POLICY_VERSION,
    evidence: buildEvidence(input),
  };
}

/**
 * Derive per-dimension confidence from draft candidate + report signals.
 * Conservative: weak nested signals clamp the dimension.
 */
export function deriveLabCandidateConfidence(args: {
  report: LabReportMetadataCandidate;
  candidate: LabResultCandidate;
  duplicateInReport: boolean;
}): LabCandidateConfidence {
  const c = args.candidate;
  const reportFamily = Math.min(1, args.report.confidence);
  const analyteIdentity =
    c.aliasMatch.matchMethod === "exact_canonical" && c.aliasMatch.confidence >= 0.99
      ? 1
      : c.aliasMatch.matchMethod === "exact_alias" && c.aliasMatch.confidence >= 0.95 && !c.aliasMatch.requiresReview
        ? 1
        : c.aliasMatch.matchMethod === "normalized_exact" && c.aliasMatch.confidence >= 0.95 && !c.aliasMatch.requiresReview
          ? 1
          : Math.min(c.aliasMatch.confidence, 0.99);

  const resultValue =
    c.result?.kind === "numeric" && c.result.comparator === "eq" && Number.isFinite(c.result.value)
      ? Math.max(c.confidence, 0.99)
      : Math.min(c.confidence, 0.5);

  const unit = c.unit.known && c.unit.normalizedUnit ? Math.max(c.unit.confidence, 0.99) : Math.min(c.unit.confidence, 0.4);

  const provenance =
    c.provenance.sourceDocumentId &&
    c.provenance.sourceChecksumSha256 &&
    c.provenance.sourceLocator &&
    c.provenance.sourcePage >= 1
      ? 1
      : 0;

  const date = args.report.collectedAt ? Math.min(1, args.report.confidence) : 0;
  const duplicateSafety = args.duplicateInReport || c.provenance.resultRole === "historical_column" ? 0 : 1;
  const rowSegmentation = c.warnings.includes("ambiguous_value") || c.warnings.includes("duplicate_candidate") ? 0.5 : 0.99;

  return {
    reportFamily,
    rowSegmentation,
    analyteIdentity,
    resultValue,
    unit,
    provenance,
    date,
    duplicateSafety,
  };
}
