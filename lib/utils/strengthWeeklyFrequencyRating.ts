/** Upper bound for Strength Baseline progress-track display (workouts/week). */
export const STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX = 7;

/**
 * Strength weekly frequency tiers for pills, bars, and legend — six bands aligned to the 0→7 display scale.
 * Indices match Activity tier bar palette indices 0–5 ({@link strengthWeeklyFrequencyActivityTierIndexForTierBand}).
 *
 * Bands (avg workouts / week): [0,1) Very Low; [1,2) Low; [2,3) Moderate; [3,4) High; [4,5) Very High; [5,∞) Peak Frequency (display capped at 7 for fill).
 */
export type StrengthWeeklyFrequencyTierBand = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Classifies measurable weekly frequency into tier bands using half-open intervals on the product ladder.
 */
export function strengthWeeklyFrequencyTierBandFromAvg(avgWorkoutsPerWeek: number): StrengthWeeklyFrequencyTierBand {
  const n = Number.isFinite(avgWorkoutsPerWeek) ? Math.max(0, avgWorkoutsPerWeek) : 0;
  if (n < 1) return 0;
  if (n < 2) return 1;
  if (n < 3) return 2;
  if (n < 4) return 3;
  if (n < 5) return 4;
  return 5;
}

export function strengthWeeklyFrequencyRatingLabelFromTierBand(band: StrengthWeeklyFrequencyTierBand): string {
  switch (band) {
    case 0:
      return "Very Low";
    case 1:
      return "Low";
    case 2:
      return "Moderate";
    case 3:
      return "High";
    case 4:
      return "Very High";
    case 5:
      return "Peak Frequency";
    default:
      return "Very Low";
  }
}

/** Compact workouts/wk range line for the Strength Baseline legend (matches tier boundaries). */
export function strengthWeeklyFrequencyTierBandRangeLabel(band: StrengthWeeklyFrequencyTierBand): string {
  switch (band) {
    case 0:
      return "0–1";
    case 1:
      return "1–2";
    case 2:
      return "2–3";
    case 3:
      return "3–4";
    case 4:
      return "4–5";
    case 5:
      return "5–7";
    default:
      return "";
  }
}

/**
 * Bounded 0 → {@link STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX} fill for the Strength Baseline bar.
 */
export function strengthWeeklyFrequencyDisplayScaleFill01(avgWorkoutsPerWeek: number): number {
  const n = Number.isFinite(avgWorkoutsPerWeek) ? Math.max(0, avgWorkoutsPerWeek) : 0;
  const max = STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX;
  return Math.min(1, n / max);
}

/** Activity tier palette index for bar fill — same as tier band for this ladder (0–5). */
export function strengthWeeklyFrequencyActivityTierIndexForTierBand(band: StrengthWeeklyFrequencyTierBand): number {
  return band;
}
