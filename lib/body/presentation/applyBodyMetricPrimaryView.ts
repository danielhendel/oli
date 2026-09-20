/**
 * Apply local primary-view selection onto a Body metric card model.
 * Pure — no I/O, no preference mutation, no HealthKit.
 */

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import type {
  BodyFatPrimaryView,
  BodyMassDisplayUnit,
  LeanMassPrimaryView,
  WeightPrimaryView,
} from "@/lib/body/presentation/bodyMetricPrimaryViews";
import {
  presentWeightClassificationChartForView,
  presentWeightFaceValue,
} from "@/lib/body/presentation/presentWeightClassificationForView";
import {
  resolveCompatibleFatMassKg,
  resolveCompatibleLeanMassPercentage,
  type BodyCompositionPairingEvidence,
} from "@/lib/body/presentation/resolveCompatibleBodyCompositionDerivation";
import { bmiFromWeightAndHeight } from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import {
  resolveWeightBmiScreeningPresentation,
  type BodyMetricStandardResolveInput,
} from "@/lib/body/standards/resolveBodyMetricStandardPresentation";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";

function formatMassFace(kg: number, unit: BodyMassDisplayUnit): string {
  const formatted = formatBodyWeight(kg, unit);
  return formatted.replace(/\s*(lb|kg)\s*$/i, "").trim();
}

function resolveBmi(input: BodyMetricStandardResolveInput): number | null {
  if (input.bmi != null && Number.isFinite(input.bmi) && input.bmi > 0) return input.bmi;
  if (input.weightKg == null || input.heightCm == null) return null;
  return bmiFromWeightAndHeight(input.weightKg, input.heightCm);
}

export function applyWeightPrimaryView(input: {
  readonly card: BodyMetricCardModel;
  readonly view: WeightPrimaryView;
  readonly resolveInput: BodyMetricStandardResolveInput;
}): BodyMetricCardModel {
  const presentation = resolveWeightBmiScreeningPresentation(input.resolveInput);
  const bmi = resolveBmi(input.resolveInput);
  const face = presentWeightFaceValue({
    view: input.view,
    weightKg: input.resolveInput.weightKg,
    bmi,
    massDisplayUnit: input.resolveInput.massDisplayUnit,
  });
  const classificationChart =
    presentation != null
      ? presentWeightClassificationChartForView({
          presentation,
          view: input.view,
          weightKg: input.resolveInput.weightKg,
          bmi,
          massDisplayUnit: input.resolveInput.massDisplayUnit,
        })
      : null;

  const a11y =
    face.formattedValue != null
      ? input.view === "bmi"
        ? `Weight BMI screening ${face.formattedValue}. Screening context, not complete Body Composition.`
        : (classificationChart?.accessibleSummary ??
          `Weight ${face.formattedValue}. Open weight details.`)
      : input.view === "bmi"
        ? "Weight. BMI unavailable. Requires valid height and Weight."
        : "Weight. No current measurement. Open weight details.";

  return {
    ...input.card,
    displayValue: face.displayValue,
    displayUnit: face.displayUnit,
    formattedValue: face.formattedValue,
    unit: face.displayUnit,
    classificationChart,
    accessibilityLabel: a11y,
  };
}

export function applyBodyFatPrimaryView(input: {
  readonly card: BodyMetricCardModel;
  readonly view: BodyFatPrimaryView;
  readonly massDisplayUnit: BodyMassDisplayUnit;
  readonly evidence: BodyCompositionPairingEvidence;
}): BodyMetricCardModel {
  if (input.view === "percentage") {
    return input.card;
  }
  const derived = resolveCompatibleFatMassKg(input.evidence);
  if (derived.status !== "ready") {
    return {
      ...input.card,
      displayValue: null,
      displayUnit: input.massDisplayUnit,
      formattedValue: null,
      value: null,
      unit: input.massDisplayUnit,
      accessibilityLabel: `Body Fat. Fat mass unavailable. ${derived.reason} Measured percentage remains available.`,
    };
  }
  const formatted = formatBodyWeight(derived.valueKg, input.massDisplayUnit);
  return {
    ...input.card,
    displayValue: formatMassFace(derived.valueKg, input.massDisplayUnit),
    displayUnit: input.massDisplayUnit,
    formattedValue: formatted,
    value:
      input.massDisplayUnit === "lb" ? derived.valueKg * 2.2046226218 : derived.valueKg,
    unit: input.massDisplayUnit,
    accessibilityLabel: `Body Fat fat mass ${formatted}. ${derived.provenanceLabel}. No approved classification.`,
  };
}

export function applyLeanMassPrimaryView(input: {
  readonly card: BodyMetricCardModel;
  readonly view: LeanMassPrimaryView;
  readonly massDisplayUnit: BodyMassDisplayUnit;
  readonly evidence: BodyCompositionPairingEvidence;
}): BodyMetricCardModel {
  if (input.view === "mass") {
    return input.card;
  }
  const derived = resolveCompatibleLeanMassPercentage(input.evidence);
  if (derived.status !== "ready" || derived.percent == null) {
    const reason = derived.status === "ready" ? "Calculation failed." : derived.reason;
    return {
      ...input.card,
      displayValue: null,
      displayUnit: "%",
      formattedValue: null,
      value: null,
      unit: "%",
      accessibilityLabel: `Lean Mass. Percentage unavailable. ${reason} Measured mass remains available.`,
    };
  }
  const face = derived.percent.toFixed(1);
  return {
    ...input.card,
    displayValue: face,
    displayUnit: "%",
    formattedValue: `${face}%`,
    value: derived.percent,
    unit: "%",
    accessibilityLabel: `Lean Mass ${face}%. ${derived.provenanceLabel}. Not skeletal muscle percentage. No approved classification.`,
  };
}
