import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  StrengthHistoryRangeKey,
  StrengthHistorySummaryModel,
  StrengthHistorySummaryRowLabel,
} from "@/lib/data/workouts/strengthHistorySummaryModel";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_MUTED,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

/**
 * @deprecated Retained for backwards compatibility with any external references. The card no
 * longer renders this literal — it renders {@link StrengthHistorySummaryModel.personalizedExplainer}
 * instead. Mirrors the deprecation pattern used for Sleep / Activity baseline cards after their
 * parity refresh.
 */
export const STRENGTH_BASELINE_CARD_EXPLAINER_COPY =
  "Your strength baseline is the average strength workouts across key time ranges.";

/**
 * @deprecated Retained because external consumers may still import the type. The Strength
 * Baseline card no longer surfaces a per-row range-explainer entry point; the
 * `strength-range-explainer` route stays reachable directly via its own Stack screen.
 */
export type StrengthBaselineTierPillPressContext = {
  rowKey: StrengthHistoryRangeKey;
  rowLabel: StrengthHistorySummaryRowLabel;
  tierLabel: string;
  averageSessionsPerWeek: number | null;
  tierIndexForBar: number;
};

type Props = {
  model: StrengthHistorySummaryModel;
  /** Strength overview → Strength Analytics; omit to hide the header action (e.g. tests). */
  onPressViewMore?: () => void;
};

export function StrengthHistorySummaryCard({ model, onPressViewMore }: Props) {
  return (
    <View style={styles.card} testID="strength-history-summary-card">
      <View style={styles.headerRow}>
        <Text style={styles.cardHeading} accessibilityRole="header">
          Strength Baseline
        </Text>
        {onPressViewMore != null ? (
          <Pressable
            onPress={onPressViewMore}
            accessibilityRole="button"
            accessibilityLabel="View Strength Analytics"
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              styles.viewMoreHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
            testID="strength-history-summary-view-more"
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>View More →</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.subtitle} testID="strength-history-baseline-explainer">
        {model.personalizedExplainer}
      </Text>

      <View style={styles.rowsWrap} testID="strength-history-metric-groups">
        {model.rows.map((row) => {
          const fill01 = Math.min(1, Math.max(0, row.progressFill01 ?? 0));
          const pct = Math.round(fill01 * 100);
          const a11y = `${row.label}. ${row.displayValue}.`;
          return (
            <View key={row.key} style={styles.rowBlock} accessible accessibilityLabel={a11y}>
              <View style={styles.rowTop}>
                <View style={styles.titleLeftGroup}>
                  <Text style={[dashMetricRowLabelTextStyle, styles.rowLabel]} numberOfLines={1}>
                    {row.label}
                  </Text>
                </View>
                <Text
                  style={row.hasEnoughData ? [dashMetricRowValueTextStyle, styles.rowFigure] : styles.rowNonNumeric}
                  numberOfLines={1}
                >
                  {row.displayValue}
                </Text>
              </View>
              {row.helperText ? <Text style={styles.helperText}>{row.helperText}</Text> : null}
              <View
                style={styles.barTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{ now: pct, min: 0, max: 100 }}
                testID={`strength-history-progress-${row.key}`}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: ENERGY_BASELINE_FILL_COLOR,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Mirrors Dash Weekly Fitness card surface (`WeeklyFitnessCard.styles.card`). */
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 10,
    ...elevatedCardSurfaceStyle,
  },
  /** Title + View More — same rhythm as Weekly Fitness header row. */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeading: {
    ...strengthMetricCardTitleTextStyle,
    flexShrink: 1,
  },
  viewMoreHit: {
    minHeight: 44,
    justifyContent: "center",
    flexShrink: 0,
  },
  /** Muted secondary description — matches Weekly Fitness "This week's results" treatment. */
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    marginTop: 0,
  },
  /** Top hairline divider + tight row rhythm — same as Weekly Fitness `rowsWrap`. */
  rowsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 4,
    gap: 6,
    marginTop: 2,
  },
  rowBlock: {
    paddingVertical: 6,
    gap: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
  rowFigure: {
    flexShrink: 1,
    fontVariant: ["tabular-nums"],
  },
  rowNonNumeric: {
    flexShrink: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    textAlign: "right",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 17,
    color: UI_TEXT_MUTED,
    letterSpacing: -0.08,
  },
  /** Same bar geometry as Weekly Fitness rows (height 8, radius 4). */
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: UI_PROGRESS_TRACK_EMPTY,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
});
