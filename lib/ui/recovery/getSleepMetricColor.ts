import type { OuraRatingLabel } from "@/lib/format/ouraScore";

/** Neutral iOS-style track behind semantic fills. */
export const SLEEP_METRIC_TRACK_COLOR = "#E5E5EA";

export type SleepMetricSemanticColors = {
  trackColor: string;
  fillColor: string;
  /** Stronger ink for labels/icons when pairing with the fill (optional). */
  textColor?: string;
};

const SEMANTIC_FILL: Record<OuraRatingLabel, { fill: string; text: string }> = {
  Optimal: { fill: "#4F7CFF", text: "#3D62CC" },
  Good: { fill: "#34C759", text: "#248A3D" },
  Fair: { fill: "#FF9F0A", text: "#CC7700" },
  "Pay attention": { fill: "#FF3B30", text: "#D70015" },
};

/** Neutral bar when there is no rating / insufficient data for a semantic tier. */
const NEUTRAL_FILL = "#C7C7CC";
const NEUTRAL_TEXT = "#8E8E93";

/**
 * Semantic progress bar colors from the same Oura-style tier label used for pills.
 * When `rating` is absent, fill stays neutral gray (still readable on #E5E5EA track).
 */
export function getSleepMetricColor(rating: OuraRatingLabel | null | undefined): SleepMetricSemanticColors {
  if (rating == null) {
    return {
      trackColor: SLEEP_METRIC_TRACK_COLOR,
      fillColor: NEUTRAL_FILL,
      textColor: NEUTRAL_TEXT,
    };
  }
  const row = SEMANTIC_FILL[rating];
  return {
    trackColor: SLEEP_METRIC_TRACK_COLOR,
    fillColor: row.fill,
    textColor: row.text,
  };
}
