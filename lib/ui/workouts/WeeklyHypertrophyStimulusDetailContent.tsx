import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  formatRegionalStimulusBand,
  formatWeeklyWorkloadBand,
  WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE,
} from "@/lib/ui/workouts/buildWeeklyHypertrophyStimulusCardModel";
import { dashMetricRowLabelTextStyle, dashMetricRowValueTextStyle } from "@/lib/ui/dash/dashMetricRowTextStyle";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import type { HypertrophyStimulusWeekDetail } from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusWeekDetail";

export const WEEKLY_MUSCLE_STIMULUS_DETAIL_EMPTY_MESSAGE =
  "No muscle stimulus data for this week yet." as const;

export const WEEKLY_MUSCLE_STIMULUS_DETAIL_FALLBACK_HEADING =
  "Some exercises are not yet covered by Exercise Intelligence." as const;

export type WeeklyHypertrophyStimulusDetailContentProps = {
  detail: HypertrophyStimulusWeekDetail;
  weekRangeLabel: string;
  testID?: string;
};

function formatSetCountLabel(setCount: number): string {
  if (!Number.isFinite(setCount) || setCount <= 0) return "0 sets";
  return setCount === 1 ? "1 set" : `${setCount} sets`;
}

export function WeeklyHypertrophyStimulusDetailContent({
  detail,
  weekRangeLabel,
  testID = "weekly-hypertrophy-stimulus-detail",
}: WeeklyHypertrophyStimulusDetailContentProps): React.ReactElement {
  const hasData =
    detail.sessionCount > 0 &&
    detail.workingSetCount > 0 &&
    detail.totalEstimatedStimulus > 0;

  if (!hasData) {
    return (
      <View style={styles.emptyWrap} testID={`${testID}-empty`}>
        <Text style={styles.emptyText}>{WEEKLY_MUSCLE_STIMULUS_DETAIL_EMPTY_MESSAGE}</Text>
      </View>
    );
  }

  const totalStimulusBand = formatRegionalStimulusBand(detail.totalEstimatedStimulus);
  const fatigueBand = formatWeeklyWorkloadBand(detail.estimatedFatigue);
  const recoveryBand = formatWeeklyWorkloadBand(detail.recoveryDemand);

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.weekRangeLabel} accessibilityLabel={`Week of ${weekRangeLabel}`}>
        {weekRangeLabel}
      </Text>
      <Text style={styles.subtitle}>{WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE}</Text>

      <View
        style={styles.summaryCard}
        accessible
        accessibilityLabel={`Summary. Total stimulus ${totalStimulusBand}. Weekly fatigue ${fatigueBand}. Recovery demand ${recoveryBand}. ${detail.sessionCount} completed sessions. ${detail.workingSetCount} working sets.`}
      >
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.metricRow}>
          <Text style={dashMetricRowLabelTextStyle}>Total stimulus</Text>
          <Text style={dashMetricRowValueTextStyle}>{totalStimulusBand}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={dashMetricRowLabelTextStyle}>Estimated fatigue</Text>
          <Text style={dashMetricRowValueTextStyle}>{fatigueBand}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={dashMetricRowLabelTextStyle}>Recovery demand</Text>
          <Text style={dashMetricRowValueTextStyle}>{recoveryBand}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={dashMetricRowLabelTextStyle}>Completed sessions</Text>
          <Text style={dashMetricRowValueTextStyle}>{String(detail.sessionCount)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={dashMetricRowLabelTextStyle}>Working sets</Text>
          <Text style={dashMetricRowValueTextStyle}>{String(detail.workingSetCount)}</Text>
        </View>
      </View>

      {detail.regions.map((region) => (
        <View
          key={region.region}
          style={styles.regionCard}
          accessible
          accessibilityLabel={`${region.label}. ${region.band}. ${region.percentOfWeekStimulus} percent of weekly stimulus.`}
        >
          <View style={styles.regionHeader}>
            <Text style={styles.regionTitle}>{region.label}</Text>
            <Text style={dashMetricRowValueTextStyle}>{region.band}</Text>
          </View>
          <Text style={styles.regionPercent}>{`${region.percentOfWeekStimulus}% of weekly stimulus`}</Text>

          {region.topExercises.length > 0 ? (
            <View style={styles.exerciseList} accessibilityRole="list">
              {region.topExercises.map((exercise) => (
                <View key={`${region.region}-${exercise.exerciseId}`} style={styles.exerciseRow}>
                  <Text style={dashMetricRowLabelTextStyle} numberOfLines={1}>
                    {exercise.exerciseName}
                  </Text>
                  <Text style={dashMetricRowValueTextStyle}>
                    {formatSetCountLabel(exercise.setCount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {detail.fallbackExercises.length > 0 ? (
        <View
          style={styles.fallbackCard}
          testID={`${testID}-fallback`}
          accessible
          accessibilityLabel={`${WEEKLY_MUSCLE_STIMULUS_DETAIL_FALLBACK_HEADING} ${detail.fallbackExercises.map((exercise) => exercise.exerciseName).join(", ")}`}
        >
          <Text style={styles.fallbackHeading}>{WEEKLY_MUSCLE_STIMULUS_DETAIL_FALLBACK_HEADING}</Text>
          {detail.fallbackExercises.map((exercise) => (
            <View key={exercise.exerciseId} style={styles.exerciseRow}>
              <Text style={dashMetricRowLabelTextStyle} numberOfLines={1}>
                {exercise.exerciseName}
              </Text>
              <Text style={dashMetricRowValueTextStyle}>
                {formatSetCountLabel(exercise.setCount)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
    textAlign: "center",
  },
  weekRangeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 4,
    ...elevatedCardSurfaceStyle,
  },
  summaryTitle: {
    ...strengthMetricCardTitleTextStyle,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  regionCard: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 6,
    ...elevatedCardSurfaceStyle,
  },
  regionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  regionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    flexShrink: 1,
  },
  regionPercent: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
  },
  exerciseList: {
    gap: 2,
    marginTop: 4,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  fallbackCard: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 6,
    ...elevatedCardSurfaceStyle,
  },
  fallbackHeading: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
  },
});
