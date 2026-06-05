/**
 * Shared pure helpers for body-weight trend selectors (Today / This Week / Baseline / Yearly).
 *
 * Single source of truth for "one weight value per calendar day" — every trend card derives from
 * the **latest reading (by `observedAt`) within each day**, matching the snapshot policy used by
 * {@link useBodyOverviewData} (which sorts each day's points descending by `observedAt`).
 *
 * No React, no network — deterministic from pre-filtered weight samples.
 */

export type BodyWeightSample = {
  /** Local calendar day key `YYYY-MM-DD`. */
  dayKey: string;
  /** ISO timestamp from the raw event; used to pick the latest reading per day + ordering. */
  observedAt: string;
  weightKg: number;
};

const LBS_PER_KG = 2.2046226218;

/** One weight value per day (the latest reading by `observedAt`), keyed by day. */
export function latestWeightByDay(
  samples: readonly BodyWeightSample[],
): Map<string, number> {
  const latestObservedAt = new Map<string, string>();
  const weight = new Map<string, number>();
  for (const s of samples) {
    if (!Number.isFinite(s.weightKg) || s.weightKg <= 0) continue;
    const prev = latestObservedAt.get(s.dayKey);
    if (prev == null || s.observedAt.localeCompare(prev) >= 0) {
      latestObservedAt.set(s.dayKey, s.observedAt);
      weight.set(s.dayKey, s.weightKg);
    }
  }
  return weight;
}

/** Daily-latest weight series sorted ascending by day key. */
export function dailyLatestWeightSeries(
  samples: readonly BodyWeightSample[],
): { dayKey: string; weightKg: number }[] {
  return Array.from(latestWeightByDay(samples).entries())
    .map(([dayKey, weightKg]) => ({ dayKey, weightKg }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/** Convert a kilogram value to the display unit. */
export function weightInUnit(kg: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? kg * LBS_PER_KG : kg;
}

/**
 * Signed delta label such as `"+0.7 lb"`, `"-1.2 lb"`, or `"0.0 lb"`.
 * Input is a kilogram delta; output is rounded to one decimal in the display unit.
 */
export function formatSignedWeightDeltaLabel(deltaKg: number, unit: "kg" | "lb"): string {
  const v = weightInUnit(deltaKg, unit);
  const rounded = Number(v.toFixed(1));
  const magnitude = Math.abs(rounded).toFixed(1);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${magnitude} ${unit}`;
}

/** Spoken delta form for VoiceOver, e.g. `"plus 0.7 pounds"` / `"minus 1.2 kilograms"`. */
export function formatSignedWeightDeltaAccessibilityLabel(
  deltaKg: number,
  unit: "kg" | "lb",
): string {
  const v = weightInUnit(deltaKg, unit);
  const rounded = Number(v.toFixed(1));
  const magnitude = Math.abs(rounded).toFixed(1);
  const word = unit === "lb" ? "pounds" : "kilograms";
  const sign = rounded > 0 ? "plus " : rounded < 0 ? "minus " : "";
  return `${sign}${magnitude} ${word}`;
}
