/**
 * Resolves Body metric standard presentation models.
 * Fail closed when applicability or authorization fails.
 * Graph components must only consume the returned presentation model.
 */

import type { MassDisplayUnit } from "@/lib/body/bodyCompositionShared";
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
  CDC_WHO_ADULT_BMI_SCREENING_STANDARD,
  bmiFromWeightAndHeight,
  classifyCdcWhoAdultBmi,
  weightKgForBmiAtHeight,
} from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import {
  assertCdcWhoHeightWeightRangesContiguous,
  buildCdcWhoHeightWeightDisplayTicks,
  formatCdcWhoWeightRangeForClass,
} from "@/lib/body/standards/cdcWhoHeightWeightRangeDisplay";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";

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

const OPEN_ENDED_WITHIN_SEGMENT = 0.42;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/**
 * Categorical equal-width bands (not a continuous BMI axis).
 * Scientific meaning lives in labels + numeric ranges, not band width.
 */
function buildWeightCategoricalSegments(
  ticks: ReturnType<typeof buildCdcWhoHeightWeightDisplayTicks>,
): readonly BodyMetricResolvedClassificationSegment[] {
  const defs = [
    {
      id: "underweight" as const,
      label: "Underweight",
      tone: "cool" as const,
      lowerBound: null as number | null,
      upperBound: 18.5,
      lowerInclusive: false,
      upperInclusive: false,
    },
    {
      id: "healthy_weight" as const,
      label: "Healthy Weight",
      tone: "reference" as const,
      lowerBound: 18.5,
      upperBound: 25,
      lowerInclusive: true,
      upperInclusive: false,
    },
    {
      id: "overweight" as const,
      label: "Overweight",
      tone: "caution" as const,
      lowerBound: 25,
      upperBound: 30,
      lowerInclusive: true,
      upperInclusive: false,
    },
    {
      id: "obesity" as const,
      label: "Obesity",
      tone: "elevated" as const,
      lowerBound: 30,
      upperBound: null as number | null,
      lowerInclusive: true,
      upperInclusive: false,
    },
  ];
  const n = defs.length;
  return defs.map((d, i) => {
    const heightRange = formatCdcWhoWeightRangeForClass(d.id, ticks);
    return {
      id: d.id,
      displayLabel: d.label,
      // Height-specific ranges only; BMI labels stay off the primary visual card.
      numericRangeLabel: heightRange,
      unit: ticks != null ? ticks.unit : "kg/m²",
      start: i / n,
      end: (i + 1) / n,
      tone: d.tone,
      lowerBound: d.lowerBound,
      upperBound: d.upperBound,
      lowerInclusive: d.lowerInclusive,
      upperInclusive: d.upperInclusive,
    };
  });
}

function withinSegmentForBmi(
  classId: "underweight" | "healthy_weight" | "overweight" | "obesity",
  bmi: number,
): number {
  if (classId === "underweight" || classId === "obesity") {
    return OPEN_ENDED_WITHIN_SEGMENT;
  }
  if (classId === "healthy_weight") {
    return clamp01((bmi - 18.5) / (25 - 18.5));
  }
  return clamp01((bmi - 25) / (30 - 25));
}

function markerAxisPosition(
  classId: string,
  within: number,
  segmentCount: number,
): number {
  const idx = ["underweight", "healthy_weight", "overweight", "obesity"].indexOf(classId);
  if (idx < 0) return 0.5;
  const start = idx / segmentCount;
  const width = 1 / segmentCount;
  return clamp01(start + within * width);
}

function formatRangeAnnouncement(
  segments: readonly BodyMetricResolvedClassificationSegment[],
): string {
  return segments
    .map((s) => {
      const range = s.numericRangeLabel ? ` ${s.numericRangeLabel}` : "";
      return `${s.displayLabel}${range}`;
    })
    .join(". ");
}

/**
 * Resolve Weight BMI screening presentation.
 * Returns null when adult standard must not be shown (under-20 / unknown age).
 */
export function resolveWeightBmiScreeningPresentation(
  input: BodyMetricStandardResolveInput,
): BodyMetricStandardPresentationModel | null {
  const standard = CDC_WHO_ADULT_BMI_SCREENING_STANDARD;
  if (standard.runtimeAuthorization !== "approved_for_body_consumer_ui") return null;
  if (standard.classifications.length < 2) return null;

  const ageOk =
    input.ageYears != null &&
    Number.isFinite(input.ageYears) &&
    input.ageYears >= (standard.applicableAge.minimumYears ?? 20);

  // Adult categories require known age ≥ 20. Unknown or under-20: fail closed (no adult graph).
  if (!ageOk) {
    return null;
  }

  const heightOk = input.heightCm != null && Number.isFinite(input.heightCm) && input.heightCm > 0;
  const weightOk = input.weightKg != null && Number.isFinite(input.weightKg) && input.weightKg > 0;

  const ticks = heightOk
    ? buildCdcWhoHeightWeightDisplayTicks(input.heightCm as number, input.massDisplayUnit)
    : null;
  if (ticks != null && !assertCdcWhoHeightWeightRangesContiguous(ticks)) {
    return null;
  }

  const segments = buildWeightCategoricalSegments(ticks);
  const rangeAnnouncement = formatRangeAnnouncement(segments);
  const educationalSummary = `Weight classification chart. Adult BMI screening. ${rangeAnnouncement}. This is screening context, not a direct Body Composition measurement.`;

  let bmi = input.bmi != null && Number.isFinite(input.bmi) && input.bmi > 0 ? input.bmi : null;
  if (bmi == null && weightOk && heightOk) {
    bmi = bmiFromWeightAndHeight(input.weightKg as number, input.heightCm as number);
  }

  // Chart may remain without a personal marker when weight or BMI incomplete.
  if (!weightOk || !heightOk || bmi == null) {
    return {
      standardId: standard.standardId,
      standardVersion: standard.version,
      classificationPurpose: standard.classificationPurpose,
      sourceTitle: standard.sourceTitle,
      contextLabel: "Adult BMI screening classification",
      segments,
      markerPosition: null,
      markerLabel: null,
      classifiedId: null,
      withinSegmentPosition: null,
      markerFormattedValue: null,
      accessibleSummary: `${educationalSummary} No current measurement.`,
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
      contextLabel: "Adult BMI screening classification",
      segments,
      markerPosition: null,
      markerLabel: null,
      classifiedId: null,
      withinSegmentPosition: null,
      markerFormattedValue: null,
      accessibleSummary: `${educationalSummary} Classification could not be resolved.`,
      heightSpecificWeightRangeLabel: null,
    };
  }

  const cls = standard.classifications.find((c) => c.id === classId)!;
  const within = withinSegmentForBmi(classId, bmi);
  const formattedValue = formatBodyWeight(input.weightKg as number, input.massDisplayUnit);
  const heightRange = formatCdcWhoWeightRangeForClass(classId, ticks);

  return {
    standardId: standard.standardId,
    standardVersion: standard.version,
    classificationPurpose: standard.classificationPurpose,
    sourceTitle: standard.sourceTitle,
    contextLabel: "Adult BMI screening classification",
    segments,
    markerPosition: markerAxisPosition(classId, within, segments.length),
    markerLabel: cls.displayLabel,
    classifiedId: classId,
    withinSegmentPosition: within,
    markerFormattedValue: formattedValue,
    accessibleSummary: `Weight classification chart. Current weight ${formattedValue}, classified as ${cls.displayLabel} under the adult BMI screening standard. This is screening context, not a direct Body Composition measurement. ${rangeAnnouncement}.`,
    heightSpecificWeightRangeLabel: heightRange,
  };
}

/** Body Fat — always fail closed until proposed standard is approved. */
export function resolveBodyFatStandardPresentation(
  input: BodyMetricStandardResolveInput,
): BodyMetricStandardPresentationModel | null {
  void input;
  if (BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB.runtimeAuthorization !== "approved_for_body_consumer_ui") {
    return null;
  }
  return null;
}

/** Lean Tissue — always fail closed until construct + standard are approved. */
export function resolveLeanTissueStandardPresentation(
  input: BodyMetricStandardResolveInput,
): BodyMetricStandardPresentationModel | null {
  void input;
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

/** Re-export for tests that verify height conversion remains pure. */
export { weightKgForBmiAtHeight };
