import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityOverviewCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { getStepRating, getStepRatingTierIndex, stepsFromLocaleDigitString } from "@/lib/utils/activityStepRating";

type ActivityOverviewCardProps = {
  loading: boolean;
  error: { message: string; requestId: string | null; onRetry: () => void } | null;
  model: ActivityOverviewCardModel | null;
};

/**
 * View-only: model still ships `…/day`; strip suffix for large figure (matches Today’s Steps digit treatment).
 */
function overviewRowFigureDisplay(compactStatsSummary: string): { numeric: true; digits: string } | { numeric: false; text: string } {
  const s = compactStatsSummary.trim();
  const m = s.match(/^([\d,]+)\/day$/);
  if (m) return { numeric: true, digits: m[1]! };
  return { numeric: false, text: s };
}

function ActivityOverviewTierProgressTrack({ testID, tierIndex }: { testID: string; tierIndex: number | null }) {
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

/**
 * Activity overview rows — fixed-tier step bars and rating pills (no section title; spacing via card gap).
 */
export function ActivityOverviewCard({ loading, error, model }: ActivityOverviewCardProps) {
  return (
    <View style={styles.card}>
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
        <View style={moduleOverviewMetricLayoutStyles.metricGroups}>
          {model.timeframes.map((tf) => {
            const figure = overviewRowFigureDisplay(tf.compactStatsSummary);
            const rowSteps = figure.numeric ? stepsFromLocaleDigitString(figure.digits) : null;
            const rating = rowSteps != null ? getStepRating(rowSteps) : null;
            const tierIndex = rowSteps != null ? getStepRatingTierIndex(rowSteps) : null;
            const a11y =
              rating != null
                ? `${tf.label}. ${rating.label}. ${tf.compactStatsSummary}.`
                : `${tf.label}. ${tf.compactStatsSummary}.`;
            return (
              <View key={tf.key} style={moduleOverviewMetricLayoutStyles.metricBlock} accessible accessibilityLabel={a11y}>
                <View style={moduleOverviewMetricLayoutStyles.topRow}>
                  <View style={styles.labelPillCluster}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {tf.label}
                    </Text>
                    {rating != null ? (
                      <ActivityRatingPill
                        label={rating.label}
                        color={rating.color}
                        backgroundColor={rating.backgroundColor}
                        emphasis="subtle"
                        testID={`activity-overview-rating-${tf.key}`}
                      />
                    ) : null}
                  </View>
                  {figure.numeric ? (
                    <Text style={styles.rowFigure} numberOfLines={1}>
                      {figure.digits}
                    </Text>
                  ) : (
                    <Text style={styles.rowNonNumeric} numberOfLines={1} ellipsizeMode="tail">
                      {figure.text}
                    </Text>
                  )}
                </View>
                <ActivityOverviewTierProgressTrack testID={`activity-overview-steps-bar-${tf.key}`} tierIndex={tierIndex} />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Matches Today’s Steps card title / step figure sizing (see ActivityDailyDetailsCard). */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...elevatedCardSurfaceStyle,
  },
  labelPillCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 21,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.38,
  },
  rowFigure: {
    fontSize: 23,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.42,
    flexShrink: 0,
  },
  rowNonNumeric: {
    flexShrink: 1,
    maxWidth: "52%",
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.12,
    textAlign: "right",
  },
});
