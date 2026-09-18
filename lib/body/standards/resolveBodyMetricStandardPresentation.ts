/**
 * Resolves Body metric standard presentation models.
 * Fail closed when applicability or authorization fails.
 * Graph components must only consume the returned presentation model.
 */

import { formatMassRangeForCopy, type MassDisplayUnit } from "@/lib/body/bodyCompositionShared";
import type {
  BodyMetricResolvedClassificationSegment,
  BodyMetricStandardPresentationModel,
} from "@/lib/body/standards/bodyMetricStandardTypes";
import {
  BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB,
} from "@/lib/body/standards/bodyFatStandardProposal";
import {
  LEAN_TISSUE_PROPOSED_STANDARD_STUB,
} from "@/lib/body/standards/leanTissueStandardProposal";
import {
  CDC_WHO_ADULT_BMI_AXIS,
  CDC_WHO_ADULT_BMI_SCREENING_STANDARD,
  bmiFromWeightAndHeight,
  classifyCdcWhoAdultBmi,
  formatBmiRangeLabel,
  weightKgForBmiAtHeight,
} from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";

export type BodyMetricStandardResolveInput = {
  readonly metric: "weight" | "bodyFat" | "leanTissue";
  readonly weightKg: number | null;
  readonly bodyFatPercent: number | null;
  readonly leanBodyMassKg: number | null;
  /** Prefer authoritative overview BMI when present; else computed from height+weight. */
  readonly bmi: number | null;
  readonly heightCm: number | null;
  readonly ageYears: number | null;
  readonly sex: "female" | "male" | "unspecified" | null;
  readonly measurementMethod: string | null;
  readonly massDisplayUnit: MassDisplayUnit;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function bmiAxisPosition(bmi: number): number {
  const { min, max } = CDC_WHO_ADULT_BMI_AXIS;
  return clamp01((bmi - min) / (max - min));
}

function buildWeightSegments(): readonly BodyMetricResolvedClassificationSegment[] {
  const { min, max } = CDC_WHO_ADULT_BMI_AXIS;
  const span = max - min;
  const cuts = [
    { id: "underweight", label: "Underweight", lo: min, hi: 18.5, tone: "caution" as const },
    { id: "healthy_weight", label: "Healthy Weight", lo: 18.5, hi: 25, tone: "reference" as const },
    { id: "overweight", label: "Overweight", lo: 25, hi: 30, tone: "caution" as const },
    { id: "obesity", label: "Obesity", lo: 30, hi: max, tone: "elevated" as const },
  ];
  return cuts.map((c) => {
    const cls = CDC_WHO_ADULT_BMI_SCREENING_STANDARD.classifications.find((x) => x.id === c.id)!;
    return {
      id: c.id,
      displayLabel: c.label,
      numericRangeLabel: formatBmiRangeLabel(cls.lowerInclusive, cls.upperExclusive),
      unit: "kg/m²",
      start: (c.lo - min) / span,
      end: (c.hi - min) / span,
      tone: c.tone,
    };
  });
}

function heightWeightRangeForClass(
  classId: string,
  heightCm: number,
  unit: MassDisplayUnit,
): string | null {
  const cls = CDC_WHO_ADULT_BMI_SCREENING_STANDARD.classifications.find((c) => c.id === classId);
  if (!cls) return null;
  const loBmi = cls.lowerInclusive ?? CDC_WHO_ADULT_BMI_AXIS.min;
  const hiBmi =
    cls.upperExclusive != null ? cls.upperExclusive - 0.0001 : CDC_WHO_ADULT_BMI_AXIS.max;
  const loKg = weightKgForBmiAtHeight(loBmi, heightCm);
  const hiKg = weightKgForBmiAtHeight(hiBmi, heightCm);
  if (loKg == null || hiKg == null) return null;
  return formatMassRangeForCopy(loKg, hiKg, unit);
}

/**
 * Resolve Weight BMI screening presentation.
 * Returns null when standard graph must not be shown (malformed), or a model with
 * markerPosition null when personal classification is not applicable.
 */
export function resolveWeightBmiScreeningPresentation(
  input: BodyMetricStandardResolveInput,
): BodyMetricStandardPresentationModel | null {
  const standard = CDC_WHO_ADULT_BMI_SCREENING_STANDARD;
  if (standard.runtimeAuthorization !== "approved_for_body_consumer_ui") return null;
  if (standard.classifications.length < 2) return null;

  const segments = buildWeightSegments();
  const educationalSummary =
    "Weight-for-height BMI screening using CDC and WHO adult categories: Underweight, Healthy Weight, Overweight, and Obesity. This is screening, not Body Composition.";

  const ageOk =
    input.ageYears != null &&
    Number.isFinite(input.ageYears) &&
    input.ageYears >= (standard.applicableAge.minimumYears ?? 20);

  const heightOk = input.heightCm != null && Number.isFinite(input.heightCm) && input.heightCm > 0;
  const weightOk = input.weightKg != null && Number.isFinite(input.weightKg) && input.weightKg > 0;

  let bmi = input.bmi != null && Number.isFinite(input.bmi) && input.bmi > 0 ? input.bmi : null;
  if (bmi == null && weightOk && heightOk) {
    bmi = bmiFromWeightAndHeight(input.weightKg as number, input.heightCm as number);
  }

  // Adult categories require known age ≥ 20. Unknown or under-20: fail closed (no adult graph).
  if (!ageOk) {
    return null;
  }

  // Educational standard graph may remain visible without a personal marker when height/BMI incomplete.
  if (!heightOk || !weightOk || bmi == null) {
    return {
      standardId: standard.standardId,
      standardVersion: standard.version,
      classificationPurpose: standard.classificationPurpose,
      sourceTitle: standard.sourceTitle,
      contextLabel: "BMI screening (CDC / WHO)",
      segments,
      markerPosition: null,
      markerLabel: null,
      classifiedId: null,
      accessibleSummary: `${educationalSummary} No personal comparison is available yet.`,
      heightSpecificWeightRangeLabel: null,
    };
  }

  const classId = classifyCdcWhoAdultBmi(bmi);
  if (classId == null) {
    return {
      standardId: standard.standardId,
      standardVersion: standard.version,
      classificationPurpose: standard.classificationPurpose,
      sourceTitle: standard.sourceTitle,
      contextLabel: "BMI screening (CDC / WHO)",
      segments,
      markerPosition: null,
      markerLabel: null,
      classifiedId: null,
      accessibleSummary: `${educationalSummary} Classification could not be resolved.`,
      heightSpecificWeightRangeLabel: null,
    };
  }

  const cls = standard.classifications.find((c) => c.id === classId)!;
  const rangeLabel = heightWeightRangeForClass(classId, input.heightCm as number, input.massDisplayUnit);

  return {
    standardId: standard.standardId,
    standardVersion: standard.version,
    classificationPurpose: standard.classificationPurpose,
    sourceTitle: standard.sourceTitle,
    contextLabel: "BMI screening (CDC / WHO)",
    segments,
    markerPosition: bmiAxisPosition(bmi),
    markerLabel: cls.displayLabel,
    classifiedId: classId,
    accessibleSummary: `Weight. ${cls.displayLabel}. ${formatBmiRangeLabel(
      cls.lowerInclusive,
      cls.upperExclusive,
    )}. BMI screening using CDC and WHO adult categories, standard ${standard.version}.${
      rangeLabel ? ` Height-specific weight range ${rangeLabel}.` : ""
    }`,
    heightSpecificWeightRangeLabel: rangeLabel,
  };
}

/** Body Fat — always fail closed until proposed standard is approved. */
export function resolveBodyFatStandardPresentation(
  _input: BodyMetricStandardResolveInput,
): BodyMetricStandardPresentationModel | null {
  if (BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB.runtimeAuthorization !== "approved_for_body_consumer_ui") {
    return null;
  }
  return null;
}

/** Lean Tissue — always fail closed until construct + standard are approved. */
export function resolveLeanTissueStandardPresentation(
  _input: BodyMetricStandardResolveInput,
): BodyMetricStandardPresentationModel | null {
  if (LEAN_TISSUE_PROPOSED_STANDARD_STUB.runtimeAuthorization !== "approved_for_body_consumer_ui") {
    return null;
  }
  return null;
}

export function resolveBodyMetricStandardPresentation(
  input: BodyMetricStandardResolveInput,
): BodyMetricStandardPresentationModel | null {
  switch (input.metric) {
    case "weight":
      return resolveWeightBmiScreeningPresentation(input);
    case "bodyFat":
      return resolveBodyFatStandardPresentation(input);
    case "leanTissue":
      return resolveLeanTissueStandardPresentation(input);
    default:
      return null;
  }
}
