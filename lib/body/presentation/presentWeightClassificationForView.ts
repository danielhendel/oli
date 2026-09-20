/**
 * Remap one CDC/WHO adult BMI screening classification into mass or BMI face labels.
 * Does not re-classify — marker segment and within-segment position stay fixed.
 */

import type {
  BodyMetricClassificationChartModel,
  BodyMetricClassificationChartSegment,
} from "@/lib/body/presentation/bodyMetricCardTypes";
import type { WeightPrimaryView } from "@/lib/body/presentation/bodyMetricPrimaryViews";
import type { BodyMetricStandardPresentationModel } from "@/lib/body/standards/bodyMetricStandardTypes";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";

const BMI_RANGE_BY_CLASS: Record<string, string> = {
  underweight: "<18.5",
  healthy_weight: "18.5–24.9",
  overweight: "25.0–29.9",
  obesity: "≥30.0",
};

function formatBmiFace(bmi: number): string {
  const one = bmi.toFixed(1);
  return one.endsWith(".0") ? one.slice(0, -2) : one;
}

/**
 * Build chart model for mass or BMI presentation from one resolved classification.
 */
export function presentWeightClassificationChartForView(input: {
  readonly presentation: BodyMetricStandardPresentationModel;
  readonly view: WeightPrimaryView;
  readonly weightKg: number | null;
  readonly bmi: number | null;
  readonly massDisplayUnit: "lb" | "kg";
}): BodyMetricClassificationChartModel {
  const { presentation, view } = input;
  const segments: BodyMetricClassificationChartSegment[] = presentation.segments.map((s) => ({
    id: s.id,
    label: s.displayLabel,
    formattedRange:
      view === "bmi"
        ? (BMI_RANGE_BY_CLASS[s.id] ?? s.numericRangeLabel)
        : s.numericRangeLabel,
    tone:
      s.tone === "cool" ||
      s.tone === "reference" ||
      s.tone === "caution" ||
      s.tone === "elevated" ||
      s.tone === "neutral"
        ? s.tone
        : "neutral",
    lowerBound: s.lowerBound,
    upperBound: s.upperBound,
    lowerInclusive: s.lowerInclusive,
    upperInclusive: s.upperInclusive,
  }));

  let markerFormattedValue: string | null = null;
  if (presentation.classifiedId != null) {
    if (view === "bmi" && input.bmi != null && Number.isFinite(input.bmi) && input.bmi > 0) {
      markerFormattedValue = formatBmiFace(input.bmi);
    } else if (
      view === "mass" &&
      input.weightKg != null &&
      Number.isFinite(input.weightKg) &&
      input.weightKg > 0
    ) {
      markerFormattedValue = formatBodyWeight(input.weightKg, input.massDisplayUnit);
    } else {
      markerFormattedValue = presentation.markerFormattedValue;
    }
  }

  const marker =
    presentation.classifiedId != null &&
    presentation.markerLabel != null &&
    markerFormattedValue != null
      ? {
          kind: "classification" as const,
          formattedValue: markerFormattedValue,
          showValueLabel: false,
          segmentId: presentation.classifiedId,
          withinSegmentPosition: presentation.withinSegmentPosition,
          accessibleLabel: presentation.markerLabel,
        }
      : null;

  const viewHint =
    view === "bmi"
      ? "BMI screening view. Adult BMI categories shown as BMI cutoffs."
      : "Weight view. Height-specific weight ranges from adult BMI screening.";

  return {
    standardId: presentation.standardId,
    standardVersion: presentation.standardVersion,
    contextLabel: presentation.contextLabel,
    segments,
    marker,
    accessibleSummary: `${viewHint} ${presentation.accessibleSummary}`,
  };
}

/** Face value for Weight card under the selected primary view. */
export function presentWeightFaceValue(input: {
  readonly view: WeightPrimaryView;
  readonly weightKg: number | null;
  readonly bmi: number | null;
  readonly massDisplayUnit: "lb" | "kg";
}): {
  readonly displayValue: string | null;
  readonly displayUnit: string | null;
  readonly formattedValue: string | null;
  readonly unavailableReason: string | null;
} {
  if (input.view === "mass") {
    if (input.weightKg == null || !Number.isFinite(input.weightKg) || input.weightKg <= 0) {
      return {
        displayValue: null,
        displayUnit: input.massDisplayUnit,
        formattedValue: null,
        unavailableReason: "Weight is missing.",
      };
    }
    const formatted = formatBodyWeight(input.weightKg, input.massDisplayUnit);
    const numeric = formatted.replace(/\s*(lb|kg)\s*$/i, "").trim();
    return {
      displayValue: numeric,
      displayUnit: input.massDisplayUnit,
      formattedValue: formatted,
      unavailableReason: null,
    };
  }

  if (input.bmi == null || !Number.isFinite(input.bmi) || input.bmi <= 0) {
    return {
      displayValue: null,
      displayUnit: "BMI",
      formattedValue: null,
      unavailableReason: "BMI requires valid height and Weight.",
    };
  }
  const face = formatBmiFace(input.bmi);
  return {
    displayValue: face,
    displayUnit: "BMI",
    formattedValue: `BMI ${face}`,
    unavailableReason: null,
  };
}
