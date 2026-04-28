/**
 * Pure view-model for the Body “Weight Baseline” card (and future Dash reuse).
 * No React, no network — deterministic from pre-filtered samples + current snapshot weight.
 */

const LBS_PER_KG = 2.2046226218;

/** Absolute delta (kg) that corresponds to 3 lb — used for Maintaining / Gaining / Losing boundaries. */
export const WEIGHT_BASELINE_THREE_LB_DELTA_KG = 3 / LBS_PER_KG;

export type WeightBaselineClassification = "maintaining" | "gaining" | "losing";

/**
 * Maintaining includes the closed interval [-3 lb, +3 lb] relative to the reference (inclusive).
 * Gaining: delta &gt; +3 lb. Losing: delta &lt; -3 lb. Boundaries use {@link WEIGHT_BASELINE_THREE_LB_DELTA_KG}.
 */
export function classifyWeightChangeFromReferenceKg(deltaKg: number): WeightBaselineClassification {
  if (deltaKg > WEIGHT_BASELINE_THREE_LB_DELTA_KG) return "gaining";
  if (deltaKg < -WEIGHT_BASELINE_THREE_LB_DELTA_KG) return "losing";
  return "maintaining";
}

/**
 * Position of `currentKg` on [lowKg, highKg] for marker layout (0 = low, 1 = high).
 * Clamps outside the span; returns 0.5 when low === high (stable center).
 */
export function weightBaselineMarkerFill01(lowKg: number, highKg: number, currentKg: number): number {
  if (!Number.isFinite(lowKg) || !Number.isFinite(highKg) || !Number.isFinite(currentKg)) return 0.5;
  if (highKg <= lowKg) return 0.5;
  const t = (currentKg - lowKg) / (highKg - lowKg);
  return Math.min(1, Math.max(0, t));
}

export type WeightBaselineWindowSample = {
  weightKg: number;
  observedAt: string;
};

export type WeightBaselineCardModel =
  | { kind: "insufficient_data"; reason: "no_current_weight" | "no_samples_in_window" }
  | {
      kind: "ready";
      currentWeightKg: number;
      /** Reference vs which classification is computed (90-day mean if ≥2 samples, else the sole sample). */
      referenceWeightKg: number;
      ninetyDayLowKg: number;
      ninetyDayHighKg: number;
      changeFromReferenceKg: number;
      classification: WeightBaselineClassification;
      /** 0–1 for marker along low→high track ({@link weightBaselineMarkerFill01}). */
      markerFill01: number;
    };

export type BuildWeightBaselineCardModelInput = {
  currentWeightKg: number | null;
  windowSamples: readonly WeightBaselineWindowSample[];
};

function meanKg(samples: readonly WeightBaselineWindowSample[]): number {
  const sum = samples.reduce((s, p) => s + p.weightKg, 0);
  return sum / samples.length;
}

/**
 * Builds the card model from Apple Health–filtered series samples already restricted to the 90-day window
 * and the overview snapshot current weight (kg).
 */
export function buildWeightBaselineCardModel(input: BuildWeightBaselineCardModelInput): WeightBaselineCardModel {
  const { currentWeightKg, windowSamples } = input;
  if (currentWeightKg == null || !Number.isFinite(currentWeightKg)) {
    return { kind: "insufficient_data", reason: "no_current_weight" };
  }
  if (windowSamples.length === 0) {
    return { kind: "insufficient_data", reason: "no_samples_in_window" };
  }

  const sorted = [...windowSamples].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const weights = sorted.map((s) => s.weightKg);
  const ninetyDayLowKg = Math.min(...weights);
  const ninetyDayHighKg = Math.max(...weights);

  const referenceWeightKg = sorted.length >= 2 ? meanKg(sorted) : sorted[0]!.weightKg;

  const changeFromReferenceKg = currentWeightKg - referenceWeightKg;
  const classification = classifyWeightChangeFromReferenceKg(changeFromReferenceKg);
  const markerFill01 = weightBaselineMarkerFill01(ninetyDayLowKg, ninetyDayHighKg, currentWeightKg);

  return {
    kind: "ready",
    currentWeightKg,
    referenceWeightKg,
    ninetyDayLowKg,
    ninetyDayHighKg,
    changeFromReferenceKg,
    classification,
    markerFill01,
  };
}
