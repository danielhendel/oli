import { StyleSheet } from "react-native";

/**
 * Shared spacing for overview Baseline history cards ({@link CardioHistorySummaryCard}, {@link StrengthHistorySummaryCard}).
 * Cardio is the reference; Strength reuses these tokens for identical vertical rhythm.
 */

/** Below heading section (title + explainer [+ Cardio legend]) → first metric row. */
export const BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM = 18;

export const baselineOverviewHistoryCardLayoutStyles = StyleSheet.create({
  /** Title row → explainer body. */
  headingExplainerStack: {
    gap: 10,
  },
  /** Progress bar → next row; same gap between all metric rows. */
  metricGroups: {
    gap: 15,
  },
  /** Row label line (+ pill / helper) → progress bar stack. */
  metricBlock: {
    gap: 10,
  },
  /** Merges with {@link moduleOverviewMetricLayoutStyles.topRow} — horizontal gap 10 for label cluster ↔ value. */
  rowTop: {
    alignItems: "center",
  },
});
