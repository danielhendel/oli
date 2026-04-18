export type ActivityDayStripMeta = {
  /** True when rollup shows steps > 0 for that day (legacy strip semantics). */
  hasSteps: boolean;
  /**
   * Tier index 0–5 from {@link getStepRatingTierIndex} when rollup is numeric, steps > 0, and day is not in the future;
   * `null` → neutral ring (no rollup, absent, error, future day, zero steps, or rollup not ready).
   */
  ringTierIndex: number | null;
};
