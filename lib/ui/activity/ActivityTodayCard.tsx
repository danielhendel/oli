import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import type { ActivityTodayOverviewCardModel } from "@/lib/data/activity/activityTodayOverviewCardModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { RECENT_WORKOUT_ROW_META_TEXT_STYLE } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";

/** Phase 2B — display string for one allocation bucket. */
function formatAllocationStepsValue(value: number): string {
  return `${Math.round(value).toLocaleString()} steps`;
}

type AllocationRowSpec = {
  key: "neat" | "strength" | "cardio";
  label: string;
  value: number;
  testID: string;
};

function buildAllocationRows(
  allocation: NonNullable<ActivityTodayOverviewCardModel["stepsAllocation"]>,
): AllocationRowSpec[] {
  return [
    {
      key: "neat",
      label: "NEAT",
      value: allocation.neatSteps,
      testID: "activity-today-allocation-row-neat",
    },
    {
      key: "strength",
      label: "Strength",
      value: allocation.strengthSteps,
      testID: "activity-today-allocation-row-strength",
    },
    {
      key: "cardio",
      label: "Cardio",
      value: allocation.cardioSteps,
      testID: "activity-today-allocation-row-cardio",
    },
  ];
}

function buildAllocationA11ySuffix(
  allocation: NonNullable<ActivityTodayOverviewCardModel["stepsAllocation"]>,
): string {
  const rows = buildAllocationRows(allocation);
  return rows.map((r) => `${r.label} ${formatAllocationStepsValue(r.value)}`).join(". ") + ".";
}
export type ActivityTodayCardProps = {
  loading: boolean;
  model: ActivityTodayOverviewCardModel | null;
  error?: ActivityRollupInlineError | null;
  testID?: string;
};

export function ActivityTodayCard({
  loading,
  model,
  error,
  testID = "activity-today-card",
}: ActivityTodayCardProps) {
  const pct =
    model != null
      ? activityTierProgressAccessibilityPercent(model.activityTierIndexForBar, {
          fillWidth01Override: model.fillWidth01Override,
        })
      : 0;

  const allocationA11y =
    !loading && error == null && model != null && model.stepsAllocation != null
      ? ` ${buildAllocationA11ySuffix(model.stepsAllocation)}`
      : "";

  const rootA11y =
    loading || model == null
      ? "Today activity summary. Loading."
      : error != null
        ? `Today. ${error.message}`
        : `Today. ${model.tierPill.label}. Steps. ${model.compactStatsSummaryForA11y}.${model.subtitle ? ` ${model.subtitle}` : ""} Step level ${pct} percent.${allocationA11y}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>Today</Text>
        {!loading && model != null ? (
          <ActivityRatingPill
            label={model.tierPill.label}
            color={model.tierPill.color}
            backgroundColor={model.tierPill.backgroundColor}
            emphasis="subtle"
            compactChrome
            labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
            testID="activity-today-tier-pill"
          />
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

      {!loading && error == null && model != null ? (
        <View style={styles.body}>
          <View style={styles.stepsRow}>
            <Text style={styles.stepsLabel}>Steps</Text>
            <Text style={styles.stepsFigure} numberOfLines={1}>
              {model.stepsDigits ?? "—"}
            </Text>
          </View>
          <ActivityTierProgressTrack
            testID="activity-today-tier-progress"
            tierIndex={model.activityTierIndexForBar}
            fillWidth01Override={model.fillWidth01Override}
            wrapperProps={{
              accessibilityRole: "progressbar",
              accessibilityLabel: `Today step activity level, ${model.tierPill.label}, ${pct} percent of tier scale`,
              accessibilityValue: { now: pct, min: 0, max: 100 },
            }}
          />
          {model.subtitle != null && model.subtitle.length > 0 ? (
            <Text style={styles.subtitle} testID="activity-today-subtitle">
              {model.subtitle}
            </Text>
          ) : null}
          {model.stepsAllocation != null ? (
            <View
              style={styles.allocation}
              testID="activity-today-allocation"
              accessibilityRole="list"
            >
              {buildAllocationRows(model.stepsAllocation).map((row) => {
                const displayValue = formatAllocationStepsValue(row.value);
                return (
                  <View
                    key={row.key}
                    style={styles.allocationRow}
                    testID={row.testID}
                    accessible
                    accessibilityLabel={`${row.label}, ${displayValue}`}
                  >
                    <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
                    <Text style={dashMetricRowValueTextStyle}>{displayValue}</Text>
                  </View>
                );
              })}
            </View>
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
  stepsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  stepsLabel: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.38,
    flexShrink: 1,
  },
  stepsFigure: {
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
  allocation: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 2,
  },
  allocationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
});
