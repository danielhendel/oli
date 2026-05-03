/**
 * Shared presentation fields for Strength Baseline + This Week frequency cards (0–7 fill scale, unified tier bands).
 */
export type StrengthWeeklyFrequencyCardDisplayModel = {
  compactValuePrimary: string;
  ratingLabel: string;
  activityTierIndexForBar: number;
  fillWidth01Override: number;
};
