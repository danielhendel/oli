/**
 * Pure resolvers for Stage 3C Body Fat / Lean Mass composition-share graphs.
 * Reuses Stage 3B compatibility pairing — does not invent classification.
 */

import {
  BODY_COMPOSITION_SHARE_CAPTION,
  type BodyCompositionShareGraphModel,
} from "@/lib/body/presentation/bodyCompositionShareGraphTypes";
import type { BodyMassDisplayUnit } from "@/lib/body/presentation/bodyMetricPrimaryViews";
import {
  resolveCompatibleFatMassKg,
  resolveCompatibleLeanMassPercentage,
  type BodyCompositionPairingEvidence,
} from "@/lib/body/presentation/resolveCompatibleBodyCompositionDerivation";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";

function finitePercent(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n >= 0 && n <= 100;
}

function finitePositive(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 0;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function formatPercentLabel(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

function formatMassLabel(kg: number, unit: BodyMassDisplayUnit): string {
  return formatBodyWeight(kg, unit);
}

function emptyShare(input: {
  metric: "bodyFat" | "leanMass";
  status: BodyCompositionShareGraphModel["status"];
  accessibleSummary: string;
}): BodyCompositionShareGraphModel {
  return {
    kind: "composition_share",
    metric: input.metric,
    status: input.status,
    normalizedPosition: null,
    valueLabel: null,
    caption: BODY_COMPOSITION_SHARE_CAPTION,
    meaning: null,
    personalClassification: null,
    target: null,
    accessibleSummary: input.accessibleSummary,
  };
}

/**
 * Body Fat share of total mass.
 * Position always comes from measured Body Fat percentage when valid.
 * Mass-view capsule label uses compatible fat mass when available.
 */
export function resolveBodyFatCompositionShareGraph(input: {
  readonly evidence: BodyCompositionPairingEvidence;
  readonly view: "percentage" | "fatMass";
  readonly massDisplayUnit: BodyMassDisplayUnit;
}): BodyCompositionShareGraphModel {
  const percent = input.evidence.bodyFatPercent;
  if (percent == null || !Number.isFinite(percent)) {
    return emptyShare({
      metric: "bodyFat",
      status: "missing",
      accessibleSummary:
        "No compatible Body Fat percentage is available. Share of total mass is not shown. No personal classification is shown.",
    });
  }
  if (percent < 0 || percent > 100) {
    return emptyShare({
      metric: "bodyFat",
      status: "error",
      accessibleSummary:
        "Body Fat percentage is out of range. Share of total mass is not shown. No personal classification is shown.",
    });
  }

  const normalizedPosition = clamp01(percent / 100);
  const percentLabel = formatPercentLabel(percent);

  if (input.view === "percentage") {
    return {
      kind: "composition_share",
      metric: "bodyFat",
      status: "ready",
      normalizedPosition,
      valueLabel: percentLabel,
      caption: BODY_COMPOSITION_SHARE_CAPTION,
      meaning: "measured_percentage",
      personalClassification: null,
      target: null,
      accessibleSummary: `Body Fat is ${percentLabel.replace("%", " percent")} of compatible total mass. This graph shows quantity, not a health or performance classification. ${BODY_COMPOSITION_SHARE_CAPTION}.`,
    };
  }

  const fatMass = resolveCompatibleFatMassKg(input.evidence);
  if (fatMass.status !== "ready") {
    const status =
      fatMass.status === "missing"
        ? "missing"
        : fatMass.status === "conflicting"
          ? "conflicting"
          : fatMass.status === "error"
            ? "error"
            : "incompatible";
    return {
      kind: "composition_share",
      metric: "bodyFat",
      status,
      // Percentage position remains valid; mass capsule withheld.
      normalizedPosition,
      valueLabel: null,
      caption: BODY_COMPOSITION_SHARE_CAPTION,
      meaning: "measured_percentage",
      personalClassification: null,
      target: null,
      accessibleSummary: `${fatMass.reason} Percentage share remains ${percentLabel.replace("%", " percent")}. No personal classification is shown.`,
    };
  }

  const massLabel = formatMassLabel(fatMass.valueKg, input.massDisplayUnit);
  return {
    kind: "composition_share",
    metric: "bodyFat",
    status: "ready",
    normalizedPosition,
    valueLabel: massLabel,
    caption: BODY_COMPOSITION_SHARE_CAPTION,
    meaning: "measured_percentage",
    personalClassification: null,
    target: null,
    accessibleSummary: `Body Fat fat mass is ${massLabel}, ${percentLabel.replace("%", " percent")} of compatible total mass. This graph shows quantity, not a health or performance classification. ${BODY_COMPOSITION_SHARE_CAPTION}.`,
  };
}

/**
 * Lean Mass share of total mass.
 * Position requires a compatible Lean Mass percentage (Lean / Weight).
 * Mass-only without compatible Weight: value may display on the card, but the
 * share graph fails closed (no invented percentage position).
 */
export function resolveLeanMassCompositionShareGraph(input: {
  readonly evidence: BodyCompositionPairingEvidence;
  readonly view: "mass" | "percentage";
  readonly massDisplayUnit: BodyMassDisplayUnit;
}): BodyCompositionShareGraphModel {
  const leanKg = input.evidence.leanBodyMassKg;
  if (!finitePositive(leanKg)) {
    return emptyShare({
      metric: "leanMass",
      status: "missing",
      accessibleSummary:
        "No compatible Lean Mass percentage is available. Share of total mass is not shown. This graph shows total Lean Mass quantity, not skeletal muscle or a health or performance classification.",
    });
  }

  const derived = resolveCompatibleLeanMassPercentage(input.evidence);
  if (derived.status !== "ready" || derived.percent == null || !finitePercent(derived.percent)) {
    const status =
      derived.status === "missing"
        ? "missing"
        : derived.status === "conflicting"
          ? "conflicting"
          : derived.status === "error"
            ? "error"
            : "incompatible";
    const reason =
      derived.status === "ready"
        ? "A compatible Weight measurement is needed to calculate Lean Mass percentage."
        : derived.reason;
    return emptyShare({
      metric: "leanMass",
      status,
      accessibleSummary: `${reason} No personal classification is shown. This graph shows total Lean Mass quantity, not skeletal muscle.`,
    });
  }

  const percent = derived.percent;
  const normalizedPosition = clamp01(percent / 100);
  const percentLabel = formatPercentLabel(percent);

  if (input.view === "percentage") {
    return {
      kind: "composition_share",
      metric: "leanMass",
      status: "ready",
      normalizedPosition,
      valueLabel: percentLabel,
      caption: BODY_COMPOSITION_SHARE_CAPTION,
      meaning: "compatible_calculated_percentage",
      personalClassification: null,
      target: null,
      accessibleSummary: `Lean Mass is ${percentLabel.replace("%", " percent")} of compatible total mass. This graph shows total Lean Mass quantity, not skeletal muscle or a health or performance classification. ${BODY_COMPOSITION_SHARE_CAPTION}.`,
    };
  }

  const massLabel = formatMassLabel(leanKg, input.massDisplayUnit);
  return {
    kind: "composition_share",
    metric: "leanMass",
    status: "ready",
    normalizedPosition,
    valueLabel: massLabel,
    caption: BODY_COMPOSITION_SHARE_CAPTION,
    meaning: "compatible_calculated_percentage",
    personalClassification: null,
    target: null,
    accessibleSummary: `Lean Mass is ${massLabel}, ${percentLabel.replace("%", " percent")} of compatible total mass. This graph shows total Lean Mass quantity, not skeletal muscle or a health or performance classification. ${BODY_COMPOSITION_SHARE_CAPTION}.`,
  };
}
