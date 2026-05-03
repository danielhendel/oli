import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityMonthlyStepsAnalyticsModel } from "@/lib/data/activity/activityMonthlyStepsAnalyticsModel";
import {
  strengthMetricCardTitleTextStyle,
  strengthYearlyAnalyticsCardShellStyle,
} from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { StrengthYearlyWorkloadBars } from "@/lib/ui/workouts/StrengthYearlyWorkloadBars";
import { STEP_TIER_COLORS } from "@/lib/utils/activityStepTierVisual";

const BAR_TRACK_HEIGHT_STRENGTH_YEARLY = 176;
const MONTH_LABEL_STACK_HEIGHT = 20;
const CHART_PLOT_INSET_H = 8;

function formatStepsAxisLabel(v: number): string {
  const r = Math.round(v);
  if (r >= 10_000) return `${Math.round(r / 1000)}k`;
  return r.toLocaleString();
}

export type ActivityStepsAnalyticsCardProps = {
  model: ActivityMonthlyStepsAnalyticsModel;
  testID?: string;
};

export function ActivityStepsAnalyticsCard({ model, testID = "activity-steps-analytics-card" }: ActivityStepsAnalyticsCardProps) {
  const baselineLine = model.baselineMeanStepsPerDay ?? 0;

  return (
    <View style={[styles.cardShell, strengthYearlyAnalyticsCardShellStyle]} testID={testID}>
      <Text style={strengthMetricCardTitleTextStyle} accessibilityRole="header">
        {model.headerTitle}
      </Text>

      <View style={[styles.chartPlotRowYearlyFill, { minHeight: BAR_TRACK_HEIGHT_STRENGTH_YEARLY + MONTH_LABEL_STACK_HEIGHT + 26 + 12 }]}>
        <View style={styles.chartBarsBlock}>
          <View style={[styles.chartBarsInnerStrengthYearly]}>
            <StrengthYearlyWorkloadBars
              points={model.points}
              barTrackHeight={BAR_TRACK_HEIGHT_STRENGTH_YEARLY}
              fillColorGood={STEP_TIER_COLORS.good}
              maxScale={model.maxScale}
              baselineMonthlyAvg={baselineLine}
              todayMonthKey={model.todayMonthKey}
              formatValueLabel={formatStepsAxisLabel}
            />
            <View style={styles.monthLabelsRow}>
              {model.points.map((p) => (
                <View key={p.monthKey} style={styles.monthLabelCol}>
                  <Text style={styles.barLabel} accessibilityLabel={`Month ${p.monthKey}`}>
                    {p.displayLabel}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    width: "100%",
  },
  chartPlotRowYearlyFill: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    minHeight: 150,
    marginTop: 4,
  },
  chartBarsBlock: {
    flex: 1,
    minWidth: 0,
  },
  chartBarsInnerStrengthYearly: {
    width: "100%",
    paddingLeft: 12,
    paddingRight: 12,
  },
  monthLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    paddingHorizontal: CHART_PLOT_INSET_H,
  },
  monthLabelCol: {
    width: 20,
    alignItems: "center",
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: "#AEAEB2",
    textAlign: "center",
  },
});
