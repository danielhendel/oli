/**
 * CDC / WHO adult BMI screening categories for Weight card presentation.
 * Screening only — not Body Composition, not ideal weight, not performance.
 */

import type { BodyMetricStandardDefinition } from "@/lib/body/standards/bodyMetricStandardTypes";

export const CDC_WHO_ADULT_BMI_SCREENING_STANDARD_ID = "cdc-who-adult-bmi-screening" as const;
export const CDC_WHO_ADULT_BMI_SCREENING_VERSION = "2024.1" as const;

/** Official adult BMI cutoffs (kg/m²). Obesity subclasses for detail surfaces. */
export const CDC_WHO_ADULT_BMI_THRESHOLDS = {
  underweightUpperExclusive: 18.5,
  healthyWeightLowerInclusive: 18.5,
  healthyWeightUpperExclusive: 25,
  overweightLowerInclusive: 25,
  overweightUpperExclusive: 30,
  obesityLowerInclusive: 30,
  class1LowerInclusive: 30,
  class1UpperExclusive: 35,
  class2LowerInclusive: 35,
  class2UpperExclusive: 40,
  class3LowerInclusive: 40,
} as const;

/** Presentation axis for compact card (BMI units). */
export const CDC_WHO_ADULT_BMI_AXIS = {
  min: 15,
  max: 40,
} as const;

export const CDC_WHO_ADULT_BMI_SCREENING_STANDARD: BodyMetricStandardDefinition = {
  standardId: CDC_WHO_ADULT_BMI_SCREENING_STANDARD_ID,
  version: CDC_WHO_ADULT_BMI_SCREENING_VERSION,
  metric: "weight",
  classificationPurpose: "screening",
  sourceAuthority: "government",
  sourceTitle: "Adult BMI Categories",
  sourceOrganization: "CDC / WHO",
  publicationYear: 2024,
  citationId: "cdc-adult-bmi-categories",
  applicableAge: { minimumYears: 20, maximumYears: null },
  applicableSex: "all",
  applicablePopulation: "Adults age 20 and older (general screening)",
  compatibleMethods: ["calculated_bmi", "height_and_weight"],
  requiredInputs: ["weightKg", "heightCm", "ageYears"],
  classifications: [
    {
      id: "underweight",
      displayLabel: "Underweight",
      lowerInclusive: null,
      upperExclusive: 18.5,
      unit: "kg/m²",
    },
    {
      id: "healthy_weight",
      displayLabel: "Healthy Weight",
      lowerInclusive: 18.5,
      upperExclusive: 25,
      unit: "kg/m²",
    },
    {
      id: "overweight",
      displayLabel: "Overweight",
      lowerInclusive: 25,
      upperExclusive: 30,
      unit: "kg/m²",
    },
    {
      id: "obesity",
      displayLabel: "Obesity",
      lowerInclusive: 30,
      upperExclusive: null,
      unit: "kg/m²",
    },
  ],
  limitations: [
    "BMI is weight-for-height screening — not a direct Body Composition measurement.",
    "Does not distinguish fat mass from lean mass.",
    "Can misclassify muscular individuals.",
    "Not an ideal-weight target, performance classification, or personal prescription.",
    "Adult thresholds must not be applied under age 20.",
    "Do not classify pregnancy or unsupported clinical states with this consumer standard.",
  ],
  runtimeAuthorization: "approved_for_body_consumer_ui",
};

export const CDC_WHO_ADULT_BMI_OBESITY_SUBCLASSES: readonly {
  readonly id: string;
  readonly displayLabel: string;
  readonly lowerInclusive: number;
  readonly upperExclusive: number | null;
}[] = [
  { id: "obesity_class_1", displayLabel: "Class 1 Obesity", lowerInclusive: 30, upperExclusive: 35 },
  { id: "obesity_class_2", displayLabel: "Class 2 Obesity", lowerInclusive: 35, upperExclusive: 40 },
  { id: "obesity_class_3", displayLabel: "Class 3 Obesity", lowerInclusive: 40, upperExclusive: null },
] as const;

export type CdcWhoAdultBmiClassId =
  | "underweight"
  | "healthy_weight"
  | "overweight"
  | "obesity";

export function classifyCdcWhoAdultBmi(bmi: number): CdcWhoAdultBmiClassId | null {
  if (!Number.isFinite(bmi) || bmi <= 0) return null;
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy_weight";
  if (bmi < 30) return "overweight";
  return "obesity";
}

export function classifyCdcWhoAdultObesitySubclass(
  bmi: number,
): "obesity_class_1" | "obesity_class_2" | "obesity_class_3" | null {
  if (!Number.isFinite(bmi) || bmi < 30) return null;
  if (bmi < 35) return "obesity_class_1";
  if (bmi < 40) return "obesity_class_2";
  return "obesity_class_3";
}

/** Convert BMI boundary to weight (kg) at a given height. */
export function weightKgForBmiAtHeight(bmi: number, heightCm: number): number | null {
  if (!Number.isFinite(bmi) || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  const hM = heightCm / 100;
  return bmi * hM * hM;
}

export function bmiFromWeightAndHeight(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const hM = heightCm / 100;
  const bmi = weightKg / (hM * hM);
  return Number.isFinite(bmi) ? bmi : null;
}

export function formatBmiRangeLabel(
  lowerInclusive: number | null,
  upperExclusive: number | null,
): string {
  if (lowerInclusive == null && upperExclusive != null) {
    return `BMI < ${upperExclusive}`;
  }
  if (lowerInclusive != null && upperExclusive == null) {
    return `BMI ≥ ${lowerInclusive}`;
  }
  if (lowerInclusive != null && upperExclusive != null) {
    const upperDisplay = Number((upperExclusive - 0.1).toFixed(1));
    // Prefer familiar inclusive upper for Healthy Weight (18.5–24.9) style when exclusive is .0
    if (upperExclusive === 25) return `BMI ${lowerInclusive}–24.9`;
    if (upperExclusive === 30) return `BMI ${lowerInclusive}–29.9`;
    if (upperExclusive === 35) return `BMI ${lowerInclusive}–34.9`;
    if (upperExclusive === 40) return `BMI ${lowerInclusive}–39.9`;
    return `BMI ${lowerInclusive}–${upperDisplay}`;
  }
  return "BMI range unavailable";
}
