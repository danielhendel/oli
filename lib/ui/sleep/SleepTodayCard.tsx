import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepTodayVm } from "@/lib/data/sleep/buildSleepTodayVm";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { RECENT_WORKOUT_ROW_META_TEXT_STYLE } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type SleepTodayCardProps = {
  model: SleepTodayVm;
  testID?: string;
};

export function SleepTodayCard({ model, testID = "sleep-today-card" }: SleepTodayCardProps) {
  const rootA11y = model.loading
    ? "Today sleep summary. Loading."
    : model.durationText != null
      ? `Today. ${model.statusPill?.label ?? ""}. Sleep. ${model.compactStatsSummaryForA11y}. ${model.subtitle}`
      : `Today. ${model.subtitle}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>Today</Text>
        {!model.loading && model.statusPill != null ? (
          <ActivityRatingPill
            label={model.statusPill.label}
            color={model.statusPill.color}
            backgroundColor={model.statusPill.backgroundColor}
            emphasis="subtle"
            compactChrome
            labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
            testID="sleep-today-status-pill"
          />
        ) : null}
      </View>

      {model.loading ? <LoadingState variant="inline" message="Loading sleep…" /> : null}

      {!model.loading ? (
        <View style={styles.body}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Sleep</Text>
            <Text style={styles.metricFigure} numberOfLines={1}>
              {model.durationText ?? "—"}
            </Text>
          </View>
          {model.subtitle.length > 0 ? (
            <Text style={styles.subtitle} testID="sleep-today-subtitle">
              {model.subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 7,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  body: {
    gap: 6,
    paddingTop: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  metricLabel: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.38,
    flexShrink: 1,
  },
  metricFigure: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.44,
    flexShrink: 0,
  },
  subtitle: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 18,
  },
});
