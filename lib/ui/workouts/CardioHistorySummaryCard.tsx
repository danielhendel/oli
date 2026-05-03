import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  CardioHistoryRangeKey,
  CardioHistorySummaryModel,
  CardioHistorySummaryRowLabel,
} from "@/lib/data/workouts/cardioHistorySummaryModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  baselineOverviewHistoryCardLayoutStyles,
} from "@/lib/ui/workouts/baselineOverviewHistoryCardLayout";
import { baselineOverviewExplainerStyles } from "@/lib/ui/workouts/baselineOverviewExplainerStyle";
import { StrengthBaselineFrequencyTrack } from "@/lib/ui/workouts/StrengthBaselineFrequencyTrack";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";

/** Explainer under the Cardio Baseline section title (overview card only). */
export const CARDIO_BASELINE_CARD_EXPLAINER_COPY =
  "Your cardio baseline is the average cardio distance across key time ranges.";

/** Context when the user opens the Cardio range explainer from a row pill (presentation-only). */
export type CardioBaselineTierPillPressContext = {
  rowKey: CardioHistoryRangeKey;
  rowLabel: CardioHistorySummaryRowLabel;
  tierLabel: string;
  averageMilesPerWeek: number | null;
  tierIndexForBar: number;
  displayValue: string;
};

type CardProps = {
  model: CardioHistorySummaryModel;
  onPressViewMore?: () => void;
  /** Opens Cardio range explainer; omit to render non-interactive pills (e.g. tests). */
  onPressCardioRangeExplainer?: (ctx: CardioBaselineTierPillPressContext) => void;
};

export function CardioHistorySummaryCard({
  model,
  onPressViewMore,
  onPressCardioRangeExplainer,
}: CardProps) {
  return (
    <View style={styles.card} testID="cardio-history-summary-card">
      <View style={styles.headingBlock}>
        <View style={baselineOverviewHistoryCardLayoutStyles.headingExplainerStack}>
          <View style={styles.baselineHeaderRow}>
            <Text style={styles.cardHeading} accessibilityRole="header">
              Cardio Baseline
            </Text>
            {onPressViewMore != null ? (
              <Pressable
                onPress={onPressViewMore}
                accessibilityRole="button"
                accessibilityLabel="View Cardio Analytics"
                hitSlop={8}
                style={({ pressed }) => [
                  workoutOverviewInCardHeaderStyles.linkHit,
                  styles.viewMoreHit,
                  pressed && workoutOverviewInCardHeaderStyles.linkPressed,
                ]}
                testID="cardio-history-summary-view-more"
              >
                <Text style={workoutOverviewInCardHeaderStyles.link}>View More →</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={baselineOverviewExplainerStyles.explainer} testID="cardio-history-baseline-explainer">
            {CARDIO_BASELINE_CARD_EXPLAINER_COPY}
          </Text>
        </View>
      </View>
      <View style={baselineOverviewHistoryCardLayoutStyles.metricGroups} testID="cardio-history-metric-groups">
        {model.rows.map((row) => {
          const chrome = row.tierIndexForBar != null ? ACTIVITY_STEP_RATING_TIERS[row.tierIndexForBar] : null;
          const a11y = row.tierLabel
            ? `${row.label}. ${row.tierLabel}. ${row.displayValue}.`
            : `${row.label}. ${row.displayValue}.`;
          const pillInteractive =
            onPressCardioRangeExplainer != null &&
            row.tierLabel != null &&
            chrome != null &&
            row.tierIndexForBar != null;
          return (
            <View key={row.key} style={baselineOverviewHistoryCardLayoutStyles.metricBlock} accessible accessibilityLabel={a11y}>
              <View style={[moduleOverviewMetricLayoutStyles.topRow, baselineOverviewHistoryCardLayoutStyles.rowTop]}>
                <View style={styles.titlePillLeftGroup}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {row.label}
                  </Text>
                  {row.tierLabel && chrome ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View cardio range explanation"
                      disabled={!pillInteractive}
                      onPress={() => {
                        if (!pillInteractive || row.tierIndexForBar == null || row.tierLabel == null) return;
                        onPressCardioRangeExplainer({
                          rowKey: row.key,
                          rowLabel: row.label,
                          tierLabel: row.tierLabel,
                          averageMilesPerWeek: row.averageMilesPerWeek,
                          tierIndexForBar: row.tierIndexForBar,
                          displayValue: row.displayValue,
                        });
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                      style={({ pressed }) => [styles.tierPillHit, pressed && pillInteractive && styles.tierPillHitPressed]}
                      testID={`cardio-history-tier-pill-${row.key}`}
                    >
                      <ActivityRatingPill
                        label={row.tierLabel}
                        color={chrome.color}
                        backgroundColor={chrome.backgroundColor}
                        emphasis="subtle"
                        compactChrome
                        opticalBaselineNudge={false}
                        labelTypography={ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                        testID={`cardio-history-tier-${row.key}`}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <Text style={row.hasEnoughData ? styles.rowFigure : styles.rowNonNumeric} numberOfLines={1}>
                  {row.displayValue}
                </Text>
              </View>
              {row.helperText ? <Text style={styles.helperText}>{row.helperText}</Text> : null}
              <StrengthBaselineFrequencyTrack
                testID={`cardio-history-progress-${row.key}`}
                tierIndex={row.tierIndexForBar ?? 0}
                fillWidth01={row.progressFill01 ?? 0}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    gap: 0,
    ...elevatedCardSurfaceStyle,
  },
  headingBlock: {
    marginBottom: BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  },
  baselineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  titlePillLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierPillHit: {
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  tierPillHitPressed: {
    opacity: 0.72,
  },
  rowLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.26,
  },
  rowFigure: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#1C1C1E",
    letterSpacing: -0.26,
    flexShrink: 1,
    textAlign: "right",
  },
  rowNonNumeric: {
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.26,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 17,
    color: "#8E8E93",
    letterSpacing: -0.08,
  },
});
