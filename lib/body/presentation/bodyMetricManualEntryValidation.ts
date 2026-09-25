/**
 * Metric-specific validation for Body Composition manual-entry sheets.
 * Mirrors existing domain contracts — no invented physiological constraints.
 */

export type BodyMetricManualEntryMetric = "weight" | "bodyFat" | "leanMass";

export function parseManualEntryDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

/** Weight: finite and strictly positive (matches weightKg contract). */
export function isValidManualWeightValue(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Body Fat %: finite, > 0, and ≤ 100.
 * Dedicated Body Fat sheet rejects zero/empty; optional BF on weight is no longer offered.
 */
export function isValidManualBodyFatPercent(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 100;
}

/** Lean Mass: finite and strictly positive (fact-only path requires leanBodyMassKg > 0). */
export function isValidManualLeanMassValue(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function manualEntryValidationMessage(
  metric: BodyMetricManualEntryMetric,
): string {
  switch (metric) {
    case "weight":
      return "Enter a valid weight.";
    case "bodyFat":
      return "Enter a valid Body Fat percentage.";
    case "leanMass":
      return "Enter a valid Lean Mass.";
  }
}

export const MANUAL_ENTRY_SAVE_ERROR_MESSAGE =
  "Couldn't save measurement. Try again.";
