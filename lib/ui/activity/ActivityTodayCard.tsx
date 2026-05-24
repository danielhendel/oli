import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import type { ActivityTodayOverviewCardModel } from "@/lib/data/activity/activityTodayOverviewCardModel";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
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

/** Display policy (Daily Energy parity): only buckets with contribution > 0. */
function buildVisibleAllocationRows(
  allocation: NonNullable<ActivityTodayOverviewCardModel["stepsAllocation"]>,
): AllocationRowSpec[] {
  return buildAllocationRows(allocation).filter((row) => row.value > 0);
}

function buildAllocationA11ySuffix(
  allocation: NonNullable<ActivityTodayOverviewCardModel["stepsAllocation"]>,
): string {
  const rows = buildVisibleAllocationRows(allocation);
  if (rows.length === 0) return "";
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

  const allocationA11ySuffix =
    !loading && error == null && model != null && model.stepsAllocation != null
      ? buildAllocationA11ySuffix(model.stepsAllocation)
      : "";
  const allocationA11y = allocationA11ySuffix.length > 0 ? ` ${allocationA11ySuffix}` : "";

  const rootA11y =
    loading || model == null
      ? "Today activity summary. Loading."
      : error != null
        ? `Today. ${error.message}`
        : `Today. ${model.compactStatsSummaryForA11y}.${model.subtitle ? ` ${model.subtitle}` : ""} Step level ${pct} percent.${allocationA11y}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Today
        </Text>
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
          <Text
            style={styles.stepsMetric}
            numberOfLines={1}
            testID="activity-today-steps-metric"
          >
            {`${model.stepsDigits ?? "\u2014"} Steps`}
          </Text>
          <ActivityTierProgressTrack
            testID="activity-today-tier-progress"
            tierIndex={model.activityTierIndexForBar}
            fillWidth01Override={model.fillWidth01Override}
            fillColorOverride={ENERGY_BASELINE_FILL_COLOR}
            wrapperProps={{
              accessibilityRole: "progressbar",
              accessibilityLabel: `Today step activity level, ${pct} percent of tier scale`,
              accessibilityValue: { now: pct, min: 0, max: 100 },
            }}
          />
          {model.subtitle != null && model.subtitle.length > 0 ? (
            <Text style={styles.subtitle} testID="activity-today-subtitle">
              {model.subtitle}
            </Text>
          ) : null}
          {model.stepsAllocation != null &&
          buildVisibleAllocationRows(model.stepsAllocation).length > 0 ? (
            <View
              style={styles.allocation}
              testID="activity-today-allocation"
              accessibilityRole="list"
            >
              {buildVisibleAllocationRows(model.stepsAllocation).map((row) => {
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
    paddingTop: 13,
    paddingBottom: 14,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  body: {
    gap: 8,
    paddingTop: 2,
  },
  /**
   * Combined hero metric (`"{digits} Steps"`) — left-aligned above the progress bar. Mirrors the
   * Daily Energy hero range typography (`DailyEnergyCard.rangeValue`: 34 / 40 / 700 / -0.2) so the
   * Activity Today headline reads as the dominant element on the card, with the unit word "Steps"
   * paired naturally beside the digits. Tabular numerics keep the figure stable as live HK updates
   * stream in.
   */
  stepsMetric: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
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
