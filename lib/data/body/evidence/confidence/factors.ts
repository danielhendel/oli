/**
 * Structured supporting / limiting factors for Assessment Confidence.
 * Factor payloads never include physiological values.
 */

import type {
  BodyCompositionConfidenceBasis,
  BodyCompositionConfidenceLimitingFactor,
  BodyCompositionConfidenceSupportingFactor,
  BodyCompositionResolverConstructStatus,
} from "@oli/contracts";

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function deriveSupportingFactors(args: {
  resolverStatus: BodyCompositionResolverConstructStatus;
  basis: BodyCompositionConfidenceBasis;
}): BodyCompositionConfidenceSupportingFactor[] {
  const d = args.basis.factualDimensions;
  const out: BodyCompositionConfidenceSupportingFactor[] = [];

  if (
    args.resolverStatus === "resolved" ||
    args.resolverStatus === "resolved_with_supporting"
  ) {
    out.push("resolver_primary_resolved");
  }
  if (d.supportingRefCount > 0 || args.resolverStatus === "resolved_with_supporting") {
    out.push("resolver_supporting_present");
  }
  if (d.verifiedSourcePresent) out.push("verified_source_present");
  if (d.measuredEvidencePresent) out.push("measured_evidence_present");
  if (d.protocolState === "known_governed") out.push("governed_protocol_present");
  if (d.calculatedProvenanceState === "complete") out.push("calculated_provenance_complete");
  if (d.datedEvidencePresent) out.push("dated_evidence_present");
  if (d.complementaryChannelCount > 1) out.push("complementary_channel_present");
  if (d.knownMethodPresent) out.push("known_method_present");

  return uniqueSorted(out);
}

export function deriveLimitingFactors(args: {
  resolverStatus: BodyCompositionResolverConstructStatus;
  basis: BodyCompositionConfidenceBasis;
}): BodyCompositionConfidenceLimitingFactor[] {
  const d = args.basis.factualDimensions;
  const out: BodyCompositionConfidenceLimitingFactor[] = [
    // Completeness is always caller-supplied partial in V1.
    "caller_supplied_partial",
    // Qualitative label matrix is not frozen in draft_v1.
    "label_assignment_policy_not_frozen",
    "recency_threshold_not_frozen",
    "device_quality_policy_not_frozen",
    "method_quality_policy_not_frozen",
  ];

  if (
    args.resolverStatus === "policy_not_frozen" ||
    d.policyNotFrozenState ||
    args.resolverStatus === "resolved" ||
    args.resolverStatus === "resolved_with_supporting" ||
    args.resolverStatus === "multiple_valid"
  ) {
    // Resolved evidence still cannot receive a public label without a frozen matrix.
    out.push("policy_not_frozen");
  }

  if (d.unknownMethodPresent) out.push("method_unknown");
  if (d.protocolState === "unknown") out.push("protocol_unknown");
  if (d.protocolState === "missing") out.push("protocol_missing");
  if (args.resolverStatus === "undated_only" || d.undatedEvidencePresent) {
    out.push("undated_only");
  }
  if (args.resolverStatus === "conflict" || d.conflictState) out.push("conflict_present");
  if (args.resolverStatus === "multiple_valid") out.push("multiple_valid_unranked");
  if (d.calculatedProvenanceState === "unavailable") {
    out.push("calculated_provenance_unavailable");
  }
  if (d.independenceState === "independence_unknown") out.push("independence_unknown");
  if (d.estimatedEvidencePresent) out.push("estimated_evidence_present");
  if (args.resolverStatus === "insufficient") out.push("insufficient_required_inputs");
  if (args.resolverStatus === "unsupported") out.push("unsupported_evidence");

  return uniqueSorted(out);
}
