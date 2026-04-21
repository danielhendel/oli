/** Upper bound for Strength Baseline progress-track display (workouts/week). */
export const STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX = 7;

export type StrengthWeeklyFrequencyRatingBucket = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Maps measurable average weekly frequency to the product copy ladder (pill label only).
 */
export function strengthWeeklyFrequencyRatingLabelFromBucket(
  bucket: StrengthWeeklyFrequencyRatingBucket,
): string {
  switch (bucket) {
    case 0:
      return "None";
    case 1:
      return "Very Low";
    case 2:
      return "Low";
    case 3:
      return "Moderate";
    case 4:
      return "High";
    case 5:
    case 6:
      return "Very High";
    case 7:
      return "Max Frequency";
    default:
      return "None";
  }
}

/**
 * Buckets `avgWorkoutsPerWeek` with half-up rounding, clamped to 0–7 (same ladder as marker scale).
 */
export function strengthWeeklyFrequencyRatingBucketFromAvg(
  avgWorkoutsPerWeek: number,
): StrengthWeeklyFrequencyRatingBucket {
  const n = Number.isFinite(avgWorkoutsPerWeek) ? avgWorkoutsPerWeek : 0;
  const r = Math.round(n);
  const clamped = Math.min(STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX, Math.max(0, r));
  return clamped as StrengthWeeklyFrequencyRatingBucket;
}

/**
 * Bounded 0 → {@link STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX} fill for the Strength Baseline bar.
 */
export function strengthWeeklyFrequencyDisplayScaleFill01(avgWorkoutsPerWeek: number): number {
  const n = Number.isFinite(avgWorkoutsPerWeek) ? Math.max(0, avgWorkoutsPerWeek) : 0;
  const max = STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX;
  return Math.min(1, n / max);
}

/**
 * Maps bucket → Activity tier palette index (0–5) so {@link ActivityTierProgressTrack} fill colors align
 * with the frequency ladder without changing Activity step thresholds.
 */
export function strengthWeeklyFrequencyActivityTierIndexForBar(bucket: StrengthWeeklyFrequencyRatingBucket): number {
  if (bucket <= 1) return 0;
  if (bucket === 2) return 1;
  if (bucket === 3) return 2;
  if (bucket === 4) return 3;
  if (bucket <= 6) return 4;
  return 5;
}
