/**
 * Per-construct Assessment Confidence.
 * Confidence never mutates Resolver selections or reinterprets method.
 */

import type {
  BodyCompositionConstructConfidenceAssessment,
  BodyCompositionEvidenceBundle,
  BodyCompositionResolverConstructResult,
} from "@oli/contracts";

import { extractConfidenceBasis } from "./extractConfidenceBasis";
import { deriveLimitingFactors, deriveSupportingFactors } from "./factors";
import { assignConfidenceLabel } from "./policy";

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function dedupeRefs(refs: readonly string[]): string[] {
  return uniqueSorted(refs.filter((r) => r.length > 0));
}

export function assessConstructConfidence(args: {
  construct: BodyCompositionResolverConstructResult;
  bundle: BodyCompositionEvidenceBundle;
}): BodyCompositionConstructConfidenceAssessment {
  const { construct, bundle } = args;

  // Preserve Resolver classifications exactly (dedupe for determinism only).
  const primaryEvidenceRefs = dedupeRefs(construct.primaryEvidenceRefs);
  const supportingEvidenceRefs = dedupeRefs(construct.supportingEvidenceRefs);
  const alternateEvidenceRefs = dedupeRefs(construct.alternateEvidenceRefs);

  const confidenceBasis = extractConfidenceBasis({ construct, bundle });
  const labelDecision = assignConfidenceLabel({ resolverStatus: construct.status });
  const supportingFactors = deriveSupportingFactors({
    resolverStatus: construct.status,
    basis: confidenceBasis,
  });
  const limitingFactors = deriveLimitingFactors({
    resolverStatus: construct.status,
    basis: confidenceBasis,
  });

  const rationaleCodes = uniqueSorted([
    "factual_basis_extracted",
    "completeness_caller_supplied_partial",
    "recency_factual_only_threshold_not_frozen",
    "method_quality_policy_not_frozen",
    "device_quality_policy_not_frozen",
    "source_independence_unknown",
    ...labelDecision.rationaleCodes,
  ]);

  return {
    constructId: construct.constructId,
    status: labelDecision.status,
    label: labelDecision.label,
    resolverStatus: construct.status,
    confidenceBasis,
    supportingFactors,
    limitingFactors,
    rationaleCodes,
    primaryEvidenceRefs,
    supportingEvidenceRefs,
    alternateEvidenceRefs,
  };
}
