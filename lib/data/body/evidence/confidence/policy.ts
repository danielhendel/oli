/**
 * Assessment Confidence label policy boundary.
 *
 * Qualitative labels (Limited / Moderate / Good / Strong) are permitted
 * terminology only. Assignment rules are NOT frozen in repository truth.
 *
 * This module is the sole place that may produce a non-null label.
 * Draft v1 produces no labels — fail closed with policy_not_frozen.
 *
 * Forbidden inventiveness:
 * - DXA ⇒ Strong
 * - BIA ⇒ Limited
 * - recent ⇒ Strong / old ⇒ Limited
 * - more sources ⇒ higher label
 * - lower BF%/Waist/VAT ⇒ higher confidence
 * - Q1–Q5 ordinal quality
 * - numeric points / weights / percentages
 */

import type {
  BodyCompositionConfidenceConstructStatus,
  BodyCompositionConfidenceLabel,
  BodyCompositionConfidenceRationaleCode,
  BodyCompositionResolverConstructStatus,
} from "@oli/contracts";
import {
  BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
  BODY_COMPOSITION_CONFIDENCE_FROZEN_LABEL_RULE_COUNT,
  BODY_COMPOSITION_CONFIDENCE_LABEL_POLICY_STATE,
} from "@oli/contracts";

export const CONFIDENCE_POLICY_VERSION = BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION;

export const LABEL_POLICY_STATE = BODY_COMPOSITION_CONFIDENCE_LABEL_POLICY_STATE;

export const FROZEN_LABEL_RULE_COUNT = BODY_COMPOSITION_CONFIDENCE_FROZEN_LABEL_RULE_COUNT;

/** Domain rollup (Health / Performance Assessment Confidence) is not frozen. */
export const DOMAIN_ROLLUP_POLICY_STATE = "domain_rollup_policy_not_frozen" as const;

/** Exact recency half-lives and confidence effects remain open. */
export const RECENCY_LABEL_POLICY_STATE = "recency_threshold_not_frozen" as const;

/** Method / device quality coefficients remain open. */
export const METHOD_QUALITY_POLICY_STATE = "method_quality_policy_not_frozen" as const;
export const DEVICE_QUALITY_POLICY_STATE = "device_quality_policy_not_frozen" as const;

/** Source-independence / corroboration policy remains open. */
export const INDEPENDENCE_POLICY_STATE = "independence_unknown" as const;

export type LabelAssignmentDecision = {
  /** Always null while FROZEN_LABEL_RULE_COUNT === 0. */
  label: BodyCompositionConfidenceLabel | null;
  status: BodyCompositionConfidenceConstructStatus;
  rationaleCodes: BodyCompositionConfidenceRationaleCode[];
  /** Frozen policy citation token — never invent a rule id. */
  frozenRuleRef: null;
};

/**
 * Map Resolver status → Confidence status when no label rule is frozen.
 * Does not assign Limited merely because policy is missing.
 */
export function confidenceStatusFromResolverStatus(
  resolverStatus: BodyCompositionResolverConstructStatus,
): BodyCompositionConfidenceConstructStatus {
  switch (resolverStatus) {
    case "insufficient":
      return "insufficient";
    case "unsupported":
      return "unsupported";
    case "conflict":
      return "conflict";
    case "undated_only":
      return "undated_only";
    case "policy_not_frozen":
    case "resolved":
    case "resolved_with_supporting":
    case "multiple_valid":
      // Evidence may exist, but public label assignment is not frozen.
      return "policy_not_frozen";
    default: {
      const _exhaustive: never = resolverStatus;
      return _exhaustive;
    }
  }
}

function resolverStatusRationale(
  resolverStatus: BodyCompositionResolverConstructStatus,
): BodyCompositionConfidenceRationaleCode {
  switch (resolverStatus) {
    case "resolved":
      return "resolver_status_resolved";
    case "resolved_with_supporting":
      return "resolver_status_resolved_with_supporting";
    case "multiple_valid":
      return "resolver_status_multiple_valid";
    case "policy_not_frozen":
      return "resolver_status_policy_not_frozen";
    case "conflict":
      return "resolver_status_conflict";
    case "insufficient":
      return "resolver_status_insufficient";
    case "undated_only":
      return "resolver_status_undated_only";
    case "unsupported":
      return "resolver_status_unsupported";
    default: {
      const _exhaustive: never = resolverStatus;
      return _exhaustive;
    }
  }
}

/**
 * Sole label-producing entry. Draft v1 has zero frozen rules → always null.
 */
export function assignConfidenceLabel(args: {
  resolverStatus: BodyCompositionResolverConstructStatus;
}): LabelAssignmentDecision {
  if (FROZEN_LABEL_RULE_COUNT !== 0) {
    // Future: evaluate frozen rule matrix here only.
    // Intentionally unreachable in draft_v1 — fail closed rather than invent.
  }

  const status = confidenceStatusFromResolverStatus(args.resolverStatus);
  const rationaleCodes: BodyCompositionConfidenceRationaleCode[] = [
    resolverStatusRationale(args.resolverStatus),
    "label_policy_not_frozen",
    "label_withheld_no_frozen_rule",
    "label_not_assigned_from_favorability",
    "value_independent_assessment",
    "parser_confidence_not_consumed",
  ];

  // Never force Limited as a generic fallback when policy is open.
  return {
    label: null,
    status,
    rationaleCodes,
    frozenRuleRef: null,
  };
}

export function isSupportedConfidenceVersion(version: string): boolean {
  return version === CONFIDENCE_POLICY_VERSION;
}
