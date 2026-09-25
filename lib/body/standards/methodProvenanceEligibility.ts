/**
 * Method / provenance eligibility for Body Composition standards.
 * Fail closed for personal classification; educational graphs may still render.
 */

export type BodyCompositionMeasurementMethodKind =
  | "dxa"
  | "validated_composition"
  | "height_and_weight"
  | "apple_health_transport_unknown_method"
  | "unlabeled_manual"
  | "unknown"
  | "absent";

export type BodyCompositionPersonalClassificationEligibility = {
  readonly eligible: boolean;
  readonly methodKind: BodyCompositionMeasurementMethodKind;
  readonly methodKnown: boolean;
  readonly reasons: readonly string[];
};

export type BodyCompositionEducationalEvidenceInput = {
  readonly hasMeasuredValue: boolean;
  readonly measurementMethod: string | null;
};

const KNOWN_COMPATIBLE = new Set([
  "dxa",
  "dexa",
  "dxa_scan",
  "method_labeled_validated_composition",
  "validated_composition",
  "validated_mf_bia",
  "4c",
  "four_compartment",
]);

const TRANSPORT_UNKNOWN = new Set([
  "apple_health",
  "applehealth",
  "healthkit",
  "apple_health_transport",
  "apple_health_transport_without_method",
]);

/**
 * Normalize a free-form method label into a coarse eligibility kind.
 * Does not invent BIA from Apple Health transport.
 */
export function classifyBodyCompositionMeasurementMethodKind(
  measurementMethod: string | null | undefined,
): BodyCompositionMeasurementMethodKind {
  if (measurementMethod == null) return "absent";
  const raw = measurementMethod.trim().toLowerCase();
  if (raw.length === 0) return "absent";
  if (raw === "height_and_weight" || raw === "calculated_bmi") return "height_and_weight";
  if (KNOWN_COMPATIBLE.has(raw) || raw.includes("dxa") || raw.includes("dexa")) return "dxa";
  if (raw.includes("validated") && raw.includes("composition")) return "validated_composition";
  if (raw.includes("validated") && raw.includes("bia")) return "validated_composition";
  if (TRANSPORT_UNKNOWN.has(raw) || raw.includes("apple") || raw.includes("healthkit")) {
    return "apple_health_transport_unknown_method";
  }
  if (raw.includes("manual") || raw === "unlabeled_manual") return "unlabeled_manual";
  return "unknown";
}

/**
 * Personal classification eligibility — Stage 3C BF/Lean always fail closed at the
 * standard-authorization layer; this helper records method/provenance reasons.
 */
export function evaluatePersonalClassificationEligibility(input: {
  readonly metric: "bodyFat" | "leanTissue" | "weight";
  readonly measurementMethod: string | null;
  readonly personalStandardApproved: boolean;
  readonly constructCompatible: boolean;
}): BodyCompositionPersonalClassificationEligibility {
  const methodKind = classifyBodyCompositionMeasurementMethodKind(input.measurementMethod);
  const methodKnown =
    methodKind === "dxa" ||
    methodKind === "validated_composition" ||
    methodKind === "height_and_weight";
  const reasons: string[] = [];

  if (!input.personalStandardApproved) {
    reasons.push("Personal classification standard is not approved for Body consumer UI.");
  }
  if (!input.constructCompatible) {
    reasons.push("Owned measurement construct is not compatible with the candidate standard.");
  }
  if (methodKind === "absent" || methodKind === "unknown") {
    reasons.push("Measurement method is missing or unknown.");
  }
  if (methodKind === "apple_health_transport_unknown_method") {
    reasons.push(
      "Apple Health is transport only; unknown underlying method cannot authorize personal classification.",
    );
  }
  if (methodKind === "unlabeled_manual") {
    reasons.push("Manual entry without a labeled method cannot authorize personal classification.");
  }
  if (input.metric === "leanTissue" && input.constructCompatible === false) {
    reasons.push("Total lean mass cannot be treated as a limb-specific lean index for clinical cutoffs.");
  }

  const eligible =
    input.personalStandardApproved && input.constructCompatible && methodKnown;

  return {
    eligible,
    methodKind,
    methodKnown,
    reasons: reasons.length > 0 ? reasons : ["Eligible under current gates."],
  };
}

export function buildEducationalEvidenceSnapshot(
  input: BodyCompositionEducationalEvidenceInput,
): {
  readonly hasMeasuredValue: boolean;
  readonly measurementMethodLabel: string | null;
  readonly methodKnown: boolean;
  readonly methodCompatibleWithEducationalReference: boolean;
  readonly evidenceSummary: string;
} {
  const methodKind = classifyBodyCompositionMeasurementMethodKind(input.measurementMethod);
  const methodKnown =
    methodKind === "dxa" ||
    methodKind === "validated_composition" ||
    methodKind === "height_and_weight";
  const methodCompatible =
    methodKind === "dxa" || methodKind === "validated_composition";
  const measurementMethodLabel =
    input.measurementMethod != null && input.measurementMethod.trim().length > 0
      ? input.measurementMethod.trim()
      : null;

  let evidenceSummary: string;
  if (!input.hasMeasuredValue) {
    evidenceSummary =
      "Oli does not currently have a measured value for this construct on Body overview.";
  } else if (methodCompatible) {
    evidenceSummary =
      "Oli has a measured value with a method label that may be compatible with future verified standards. Personal placement remains withheld until a standard is approved.";
  } else if (methodKind === "apple_health_transport_unknown_method") {
    evidenceSummary =
      "Oli has a measured value via Apple Health transport, but the underlying measurement method is not known. Personal classification stays withheld.";
  } else if (!methodKnown) {
    evidenceSummary =
      "Oli has a measured value, but method provenance is incomplete. Personal classification stays withheld.";
  } else {
    evidenceSummary =
      "Oli has a measured value. Personal classification stays withheld until a verified standard is approved for this construct.";
  }

  return {
    hasMeasuredValue: input.hasMeasuredValue,
    measurementMethodLabel,
    methodKnown,
    methodCompatibleWithEducationalReference: methodCompatible,
    evidenceSummary,
  };
}
