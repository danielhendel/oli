import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ActivityThisWeekCardModel } from "@/lib/data/activity/activityThisWeekCardModel";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { StrengthFrequencyMetricCard } from "@/lib/ui/workouts/StrengthFrequencyMetricCard";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

import { UI_BORDER_SUBTLE, UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
export type ActivityThisWeekCardProps = {
  loading: boolean;
  model: ActivityThisWeekCardModel | null;
  onPressViewAll?: () => void;
};

export function ActivityThisWeekCard({ loading, model, onPressViewAll }: ActivityThisWeekCardProps) {
  return (
    <View style={styles.wrap}>
      <StrengthFrequencyMetricCard
        variant="embedded"
        headingTitle="This Week"
        loading={loading}
        model={
          loading || model == null
            ? null
            : {
                compactValuePrimary: model.compactValuePrimary,
                ratingLabel: model.ratingLabel,
                activityTierIndexForBar: model.activityTierIndexForBar,
                fillWidth01Override: model.fillWidth01Override,
              }
        }
        footerCaption=""
        showFrequencyTrack={false}
        showFrequencyMarkers={false}
        showFooterCaption={false}
        compactTitlePillSpacing
        titleRowTrailing={
          onPressViewAll != null ? (
            <Pressable
              onPress={onPressViewAll}
              accessibilityRole="button"
              accessibilityLabel="View activity history"
              hitSlop={8}
              style={({ pressed }) => [
                workoutOverviewInCardHeaderStyles.linkHit,
                pressed && workoutOverviewInCardHeaderStyles.linkPressed,
              ]}
              testID="activity-this-week-view-all"
            >
              <Text style={workoutOverviewInCardHeaderStyles.link}>View All →</Text>
            </Pressable>
          ) : null
        }
        ratingPillTestID="activity-this-week-rating-pill"
        frequencyBarTestID="activity-this-week-frequency-bar"
        instrumentClusterTestID="activity-this-week-instrument-cluster"
      />
      <View style={styles.divider} />
      {loading ? <LoadingState variant="inline" message="Loading steps…" /> : null}
      {!loading && model != null && model.isEmpty ? (
        <Text style={styles.placeholder}>No activity data this week yet</Text>
      ) : null}
      {!loading && model != null && !model.isEmpty
        ? model.days.map((row, rowIndex) => {
            const deltaPart = row.deltaText != null ? ` Delta ${row.deltaText} versus baseline.` : "";
            const a11y = `${row.dateLabel}. ${row.stepsDigits} steps.${deltaPart}`;
            return (
              <View
                key={row.dayKey}
                style={[styles.row, rowIndex === 0 && styles.rowFirst]}
                accessible
                accessibilityLabel={a11y}
              >
                <Text style={styles.recentDate}>{row.dateLabel}</Text>
                <View style={styles.mainRow}>
                  <Text style={styles.stepsLine} numberOfLines={1}>
                    {row.stepsDigits} steps
                  </Text>
                  {row.deltaText != null ? (
                    <Text style={styles.deltaFigure} numberOfLines={1} accessibilityElementsHidden importantForAccessibility="no">
                      {row.deltaText}
                    </Text>
                  ) : (
                    <View style={styles.deltaPlaceholder} />
                  )}
                </View>
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 0,
    ...elevatedCardSurfaceStyle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_SUBTLE,
    marginVertical: 12,
    alignSelf: "stretch",
  },
  placeholder: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    paddingBottom: 4,
  },
  row: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_SUBTLE,
  },
  rowFirst: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  recentDate: {
    fontSize: 13,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    marginBottom: 6,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stepsLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
  },
  deltaFigure: {
    fontSize: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
    flexShrink: 0,
    textAlign: "right",
    minWidth: 72,
  },
  deltaPlaceholder: {
    minWidth: 72,
  },
});
