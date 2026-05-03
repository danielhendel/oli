import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CardioMonthlyMilesAnalyticsModel } from "@/lib/data/workouts/cardioMonthlyMilesAnalyticsModel";
import { overviewAccentForTab } from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import {
  strengthMetricCardTitleTextStyle,
  strengthYearlyAnalyticsCardShellStyle,
} from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { StrengthYearlyWorkloadBars } from "@/lib/ui/workouts/StrengthYearlyWorkloadBars";

const BAR_TRACK_HEIGHT_STRENGTH_YEARLY = 176;
const MONTH_LABEL_STACK_HEIGHT = 20;
const CHART_PLOT_INSET_H = 8;

function formatMilesChartLabel(v: number): string {
  const x = Math.round(v * 10) / 10;
  const nearest = Math.round(x);
  if (Math.abs(x - nearest) < 0.05) return String(nearest);
  return x.toFixed(1);
}

export type CardioMilesAnalyticsCardProps = {
  model: CardioMonthlyMilesAnalyticsModel;
  testID?: string;
};

export function CardioMilesAnalyticsCard({
  model,
  testID = "cardio-miles-analytics-card",
}: CardioMilesAnalyticsCardProps) {
  const accent = overviewAccentForTab("cardio");

  return (
    <View style={[styles.cardShell, strengthYearlyAnalyticsCardShellStyle]} testID={testID}>
      <Text style={strengthMetricCardTitleTextStyle} accessibilityRole="header">
        {model.headerTitle}
      </Text>

      <View style={[styles.chartPlotRowYearlyFill, { minHeight: BAR_TRACK_HEIGHT_STRENGTH_YEARLY + MONTH_LABEL_STACK_HEIGHT + 26 + 12 }]}>
        <View style={styles.chartBarsBlock}>
          <View style={styles.chartBarsInnerStrengthYearly}>
            <StrengthYearlyWorkloadBars
              points={model.points}
              barTrackHeight={BAR_TRACK_HEIGHT_STRENGTH_YEARLY}
              fillColorGood={accent.barColor}
              maxScale={model.maxScale}
              baselineMonthlyAvg={0}
              todayMonthKey={model.todayMonthKey}
              formatValueLabel={formatMilesChartLabel}
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
