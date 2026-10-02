/**
 * Metric-specific validation for Body Composition manual-entry sheets.
 * Mirrors existing domain contracts — no invented physiological constraints.
 */

export type BodyMetricManualEntryMetric = "weight" | "bodyFat" | "leanMass" | "waist";

export type WaistLengthDisplayUnit = "in" | "cm";

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

/** Waist: finite and strictly positive (canonical store is cm). */
export function isValidManualWaistValue(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function isValidWaistLengthUnit(unit: string): unit is WaistLengthDisplayUnit {
  return unit === "in" || unit === "cm";
}

/** Measured-at must be a parseable instant (not fake / NaN). */
export function isParseableMeasuredAtIso(iso: string): boolean {
  if (typeof iso !== "string" || iso.trim().length === 0) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t);
}

/**
 * Manual Waist measuredAt policy: parseable and not after the injected clock.
 * Pure — callers must supply nowMs (no Date.now() inside).
 */
export function isValidManualWaistMeasuredAtIso(
  iso: string,
  nowMs: number,
): boolean {
  if (!Number.isFinite(nowMs)) return false;
  if (!isParseableMeasuredAtIso(iso)) return false;
  const t = Date.parse(iso);
  return t <= nowMs;
}

/**
 * @deprecated Prefer {@link isValidManualWaistMeasuredAtIso} with an injected clock for waist.
 * Parseability-only check retained for non-waist callers.
 */
export function isValidManualMeasuredAtIso(
  iso: string,
  clock?: { nowMs: number },
): boolean {
  if (!isParseableMeasuredAtIso(iso)) return false;
  if (clock != null) {
    return Date.parse(iso) <= clock.nowMs;
  }
  return true;
}

export const MANUAL_WAIST_FUTURE_DATE_MESSAGE =
  "Measurement time can’t be in the future.";

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
    case "waist":
      return "Enter a valid waist measurement.";
  }
}

export const MANUAL_ENTRY_SAVE_ERROR_MESSAGE =
  "Couldn't save measurement. Try again.";
