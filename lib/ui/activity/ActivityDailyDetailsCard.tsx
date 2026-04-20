import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { getStepRating, getStepRatingTierIndex, stepsFromLocaleDigitString } from "@/lib/utils/activityStepRating";

type ActivityDailyDetailsCardProps = {
  loading: boolean;
  error: { message: string; requestId: string | null; onRetry: () => void } | null;
  model: ActivityDailyDetailsCardModel | null;
  /** Visible card heading (defaults to Today’s Steps). */
  headingTitle?: string;
  ratingTestID?: string;
  stepsBarTestID?: string;
};

/** Parses `compactStatsSummary` for display only (e.g. `7,524 steps` → `7,524`). Hook output unchanged. */
function primaryStepsFigureFromCompactSummary(compactStatsSummary: string): string | null {
  const m = compactStatsSummary.trim().match(/^([\d,]+)\s+steps$/i);
  return m?.[1] ?? null;
}

/** Header phrase for a11y (matches Today’s Steps → Today’s steps). */
function headingSentenceLowerSteps(headingTitle: string): string {
  return headingTitle.endsWith(" Steps") ? `${headingTitle.slice(0, -" Steps".length)} steps` : headingTitle;
}

function DetailsTierProgressTrack({ testID, tierIndex }: { testID: string; tierIndex: number | null }) {
  const pct = activityTierProgressAccessibilityPercent(tierIndex);
  return (
    <ActivityTierProgressTrack
      testID={testID}
      tierIndex={tierIndex}
      wrapperProps={{
        accessibilityRole: "progressbar",
        accessibilityValue: { now: pct, min: 0, max: 100 },
      }}
    />
  );
}

export function ActivityDailyDetailsCard({
  loading,
  error,
  model,
  headingTitle = "Today’s Steps",
  ratingTestID = "activity-daily-details-rating",
  stepsBarTestID = "activity-daily-details-steps-bar",
}: ActivityDailyDetailsCardProps) {
  const digits = model != null ? primaryStepsFigureFromCompactSummary(model.compactStatsSummary) : null;
  const rating = digits != null ? getStepRating(stepsFromLocaleDigitString(digits)) : null;
  const headingA11y = headingSentenceLowerSteps(headingTitle);
  const titleRowA11y =
    loading || model == null
      ? headingTitle
      : digits != null
        ? rating != null
          ? `${headingA11y}, ${rating.label}, ${digits}`
          : `${headingA11y}, ${digits}`
        : `${headingA11y}, ${model.compactStatsSummary}`;

  return (
    <View style={styles.card}>
      <View
        style={[moduleOverviewMetricLayoutStyles.topRow, styles.titleNumberRow]}
        accessible
        accessibilityRole="header"
        accessibilityLabel={titleRowA11y}
      >
        <View style={styles.labelPillCluster}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {headingTitle}
          </Text>
          {!loading && model != null && rating != null ? (
            <ActivityRatingPill
              label={rating.label}
              color={rating.color}
              backgroundColor={rating.backgroundColor}
              emphasis="subtle"
              testID={ratingTestID}
            />
          ) : null}
        </View>
        {!loading && model != null && digits != null ? (
          <Text style={styles.stepCountFigure} numberOfLines={1}>
            {digits}
          </Text>
        ) : !loading && model != null && digits == null ? (
          <Text style={styles.stepCountPlaceholder} numberOfLines={1}>
            —
          </Text>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading steps…" /> : null}
      {!loading && error != null ? (
        <ErrorState
          variant="inline"
          message={error.message}
          requestId={error.requestId}
          onRetry={error.onRetry}
        />
      ) : null}
      {!loading && model != null ? (
        <View style={moduleOverviewMetricLayoutStyles.metricBlock}>
          <DetailsTierProgressTrack
            testID={stepsBarTestID}
            tierIndex={digits != null ? getStepRatingTierIndex(stepsFromLocaleDigitString(digits)) : null}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...elevatedCardSurfaceStyle,
  },
  titleNumberRow: {
    paddingBottom: 0,
  },
  labelPillCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 21,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.38,
  },
  stepCountFigure: {
    fontSize: 23,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.42,
    flexShrink: 0,
  },
  stepCountPlaceholder: {
    fontSize: 21,
    fontWeight: "600",
    color: "#8E8E93",
    flexShrink: 0,
  },
});
