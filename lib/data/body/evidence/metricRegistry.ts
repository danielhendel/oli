/**
 * Body Composition evidence metric metadata.
 * Shared labels/semantics with Body Scan registry where keys overlap.
 */

import type {
  BodyCompositionComparabilityGroup,
  BodyCompositionConstructId,
  BodyCompositionEvidenceMetricKey,
  BodyCompositionEvidenceUnit,
  BodyCompositionRecencyClass,
  BodyCompositionRedundancyGroup,
} from "@oli/contracts";

import { BODY_SCAN_METRIC_REGISTRY } from "@/lib/data/body-scans/bodyScanMetricRegistry";

export type BodyCompositionEvidenceMetricDefinition = {
  key: BodyCompositionEvidenceMetricKey;
  label: string;
  canonicalUnit: BodyCompositionEvidenceUnit;
  recencyClass: BodyCompositionRecencyClass;
  defaultComparabilityGroup: BodyCompositionComparabilityGroup;
  redundancyGroup: BodyCompositionRedundancyGroup;
  constructEligibility: readonly BodyCompositionConstructId[];
  /** Never map DXA lean / FFM to this key. */
  skeletalMuscleOnly: boolean;
  continuousTrendEligibleDefault: boolean;
};

function fromScan(
  key: keyof typeof BODY_SCAN_METRIC_REGISTRY,
  extras: Partial<BodyCompositionEvidenceMetricDefinition> &
    Pick<
      BodyCompositionEvidenceMetricDefinition,
      "recencyClass" | "defaultComparabilityGroup" | "redundancyGroup"
    >,
): BodyCompositionEvidenceMetricDefinition {
  const d = BODY_SCAN_METRIC_REGISTRY[key];
  return {
    key: key as BodyCompositionEvidenceMetricKey,
    label: d.label,
    canonicalUnit: d.canonicalUnit,
    constructEligibility: d.scoringConstructEligibility as readonly BodyCompositionConstructId[],
    skeletalMuscleOnly: key === "skeletal_muscle_mass",
    continuousTrendEligibleDefault: false,
    ...extras,
  };
}

export const BODY_COMPOSITION_EVIDENCE_METRIC_REGISTRY: Record<
  BodyCompositionEvidenceMetricKey,
  BodyCompositionEvidenceMetricDefinition
> = {
  height: {
    key: "height",
    label: "Height",
    canonicalUnit: "cm",
    recencyClass: "very_slow",
    defaultComparabilityGroup: "profile_anthropometry",
    redundancyGroup: "none",
    constructEligibility: [],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: false,
  },
  body_mass: {
    key: "body_mass",
    label: "Body Mass",
    canonicalUnit: "kg",
    recencyClass: "fast",
    defaultComparabilityGroup: "continuous_scale_weight",
    redundancyGroup: "weight_body_mass",
    constructEligibility: [],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: true,
  },
  waist_circumference: {
    key: "waist_circumference",
    label: "Waist Circumference",
    canonicalUnit: "cm",
    recencyClass: "moderate",
    defaultComparabilityGroup: "manual_anthropometry",
    redundancyGroup: "waist_whtr",
    constructEligibility: ["H1"],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: false,
  },
  total_mass: fromScan("total_mass", {
    recencyClass: "slow",
    defaultComparabilityGroup: "dxa_total_composition",
    redundancyGroup: "weight_body_mass",
  }),
  fat_percent: fromScan("fat_percent", {
    recencyClass: "moderate",
    defaultComparabilityGroup: "consumer_bia_composition",
    redundancyGroup: "bf_fat_mass_fmi",
  }),
  fat_mass: fromScan("fat_mass", {
    recencyClass: "moderate",
    defaultComparabilityGroup: "consumer_bia_composition",
    redundancyGroup: "bf_fat_mass_fmi",
  }),
  lean_mass: fromScan("lean_mass", {
    recencyClass: "moderate",
    defaultComparabilityGroup: "consumer_bia_composition",
    redundancyGroup: "lean_ffm_ffmi",
  }),
  fat_free_mass: fromScan("fat_free_mass", {
    recencyClass: "moderate",
    defaultComparabilityGroup: "dxa_total_composition",
    redundancyGroup: "lean_ffm_ffmi",
  }),
  bone_mineral_content: fromScan("bone_mineral_content", {
    recencyClass: "slow",
    defaultComparabilityGroup: "dxa_bone",
    redundancyGroup: "bone",
  }),
  visceral_fat_mass: fromScan("visceral_fat_mass", {
    recencyClass: "slow",
    defaultComparabilityGroup: "dxa_vat",
    redundancyGroup: "central_adiposity_vat",
  }),
  visceral_fat_volume: fromScan("visceral_fat_volume", {
    recencyClass: "slow",
    defaultComparabilityGroup: "dxa_vat",
    redundancyGroup: "central_adiposity_vat",
  }),
  android_gynoid_ratio: fromScan("android_gynoid_ratio", {
    recencyClass: "slow",
    defaultComparabilityGroup: "dxa_total_composition",
    redundancyGroup: "none",
  }),
  bone_mineral_density: fromScan("bone_mineral_density", {
    label: "Total Body BMD",
    recencyClass: "slow",
    defaultComparabilityGroup: "dxa_bone",
    redundancyGroup: "bone",
  }),
  skeletal_muscle_mass: fromScan("skeletal_muscle_mass", {
    recencyClass: "moderate",
    defaultComparabilityGroup: "unknown",
    redundancyGroup: "none",
  }),
  bmi: {
    key: "bmi",
    label: "BMI",
    canonicalUnit: "kg_per_m2",
    recencyClass: "fast",
    defaultComparabilityGroup: "unknown",
    redundancyGroup: "none",
    constructEligibility: [],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: false,
  },
  whtr: {
    key: "whtr",
    label: "Waist-to-Height Ratio",
    canonicalUnit: "ratio",
    recencyClass: "moderate",
    defaultComparabilityGroup: "manual_anthropometry",
    redundancyGroup: "waist_whtr",
    constructEligibility: ["H1"],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: false,
  },
  fmi: {
    key: "fmi",
    label: "Fat Mass Index",
    canonicalUnit: "kg_per_m2",
    recencyClass: "moderate",
    defaultComparabilityGroup: "unknown",
    redundancyGroup: "bf_fat_mass_fmi",
    constructEligibility: ["H2"],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: false,
  },
  ffmi: {
    key: "ffmi",
    label: "Fat-Free Mass Index",
    canonicalUnit: "kg_per_m2",
    recencyClass: "moderate",
    defaultComparabilityGroup: "unknown",
    redundancyGroup: "lean_ffm_ffmi",
    constructEligibility: ["H3", "P1"],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: false,
  },
  almi: {
    key: "almi",
    label: "Appendicular Lean Mass Index",
    canonicalUnit: "kg_per_m2",
    recencyClass: "slow",
    defaultComparabilityGroup: "dxa_regional",
    redundancyGroup: "appendicular_lean_almi",
    constructEligibility: ["P2"],
    skeletalMuscleOnly: false,
    continuousTrendEligibleDefault: false,
  },
};

export function bodyCompositionEvidenceMetricDefinition(
  key: BodyCompositionEvidenceMetricKey,
): BodyCompositionEvidenceMetricDefinition {
  return BODY_COMPOSITION_EVIDENCE_METRIC_REGISTRY[key];
}

/** Body Scan metric ids that map 1:1 into evidence metric keys. */
export function mapBodyScanMetricToEvidenceKey(
  metricId: string,
): BodyCompositionEvidenceMetricKey | null {
  if (metricId in BODY_COMPOSITION_EVIDENCE_METRIC_REGISTRY) {
    return metricId as BodyCompositionEvidenceMetricKey;
  }
  return null;
}
