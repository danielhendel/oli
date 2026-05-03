import type { CardioDistanceTier } from "@/lib/data/workouts/cardioSessionPresentation";

/** Tier order for Cardio Baseline range explainer (matches activity bar palette indices 0–5). */
export const CARDIO_RANGE_EXPLAINER_TIER_ORDER: readonly CardioDistanceTier[] = [
  "very_low",
  "low",
  "active",
  "high",
  "very_high",
  "peak",
];

/** Range line shown next to each tier on the explainer (product ladder, mi/week). */
export const CARDIO_RANGE_DISPLAY_RANGE_LINE: Record<CardioDistanceTier, string> = {
  very_low: "0–2.5 mi/week",
  low: "2.5–7.5 mi/week",
  active: "7.5–15 mi/week",
  high: "15–25 mi/week",
  very_high: "25–40 mi/week",
  peak: "40+ mi/week",
};

/** Short explainer copy per tier (presentation-only). */
export const CARDIO_RANGE_TIER_EXPLANATIONS: Record<CardioDistanceTier, string> = {
  very_low: "Minimal weekly cardio distance. A good place to start building consistency.",
  low: "Light weekly cardio volume. Supports basic movement, but below an active baseline.",
  active: "Consistent cardio volume aligned with a strong weekly activity habit.",
  high: "High weekly cardio volume. Supports endurance and aerobic fitness.",
  very_high: "Very high cardio volume. Recovery and progression become increasingly important.",
  peak: "Elite-level weekly distance. Best supported by structured training and recovery.",
};
