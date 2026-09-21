import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricTrendDetailModel } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import { buildBodyMetricTrendAccessibilitySummary } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import { formatBodyDayLabel } from "@/lib/ui/body/formatBodyDayLabel";
import { WeightTrendStatsPanel } from "@/lib/ui/body/WeightTrendStatsPanel";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import { WeightTrendChart } from "@/lib/ui/WeightTrendChart";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { SYSTEM_ACCENT_LUMINOUS } from "@/lib/ui/theme/systemAccent";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

const RANGE_LABELS: Record<WeightRangeKey, string> = {
  "7D": "the past 7 days",
  "30D": "the past 30 days",
  "90D": "the past 90 days",
  "6M": "the past 6 months",
  "1Y": "the past year",
  YTD: "year to date",
  "3Y": "the past 3 years",
  "5Y": "the past 5 years",
  All: "all time",
};

export type BodyMetricTrendDetailViewProps = {
  metricTitle: string;
  model: BodyMetricTrendDetailModel;
  range: WeightRangeKey;
  onChangeRange: (range: WeightRangeKey) => void;
  formatValue: (valueKg: number) => string;
  /** Format a signed change (kg delta) — neutral, no judgment color. */
  formatChange?: (deltaKg: number) => string;
  unitLabel: string;
  valueKind: "mass" | "generic";
  onRetry?: () => void;
  onPressAddMeasurement?: () => void;
  /** When true, show last-known chart while refreshing. */
  retainChartWhileLoading?: boolean;
  previousReadyModel?: BodyMetricTrendDetailModel | null;
};

/**
 * Hero longitudinal trend surface for Body metric detail.
 * Chart lives on the page canvas — no heavy card chrome around the plot.
 */
export function BodyMetricTrendDetailView(props: BodyMetricTrendDetailViewProps) {
  const displayModel =
    props.model.status === "partial" &&
    props.retainChartWhileLoading &&
    props.previousReadyModel != null &&
    (props.previousReadyModel.status === "ready" ||
      props.previousReadyModel.status === "insufficient")
      ? props.previousReadyModel
      : props.model;

  const formatChange = props.formatChange ?? props.formatValue;

  const latestLabel =
    displayModel.latest != null ? props.formatValue(displayModel.latest.valueKg) : null;
  const changeLabel =
    displayModel.change != null ? formatChange(displayModel.change) : null;
  const averageLabel =
    displayModel.average != null ? props.formatValue(displayModel.average) : null;
  const highLabel =
    displayModel.high != null ? props.formatValue(displayModel.high) : null;
  const lowLabel =
    displayModel.low != null ? props.formatValue(displayModel.low) : null;

  const a11y = buildBodyMetricTrendAccessibilitySummary({
    metricTitle: props.metricTitle,
    rangeLabel: RANGE_LABELS[props.range] ?? props.range,
    latestLabel,
    changeLabel,
    averageLabel,
    highLabel,
    lowLabel,
    status: displayModel.status,
  });

  const showTrend =
    displayModel.latest != null &&
    (displayModel.status === "ready" || displayModel.status === "insufficient");

  return (
    <View
      style={styles.root}
      testID="body-metric-trend-detail"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11y}
    >
      <WeightRangeSelector value={props.range} onChange={props.onChangeRange} />

      {props.model.status === "partial" && displayModel === props.model ? (
        <LoadingState message="Loading chart…" />
      ) : null}

      {props.model.status === "error" && displayModel === props.model ? (
        <ErrorState
          message={`Couldn’t update ${props.metricTitle} history. Try again.`}
          {...(props.onRetry != null ? { onRetry: props.onRetry } : {})}
        />
      ) : null}

      {displayModel.status === "missing" ? (
        <View style={styles.emptyBlock} testID="body-metric-trend-empty">
          <EmptyState
            title={`No ${props.metricTitle} history yet`}
            description={`Log ${props.metricTitle} measurements to see your trend over time.`}
          />
          {props.onPressAddMeasurement ? (
            <Pressable
              style={styles.addBtn}
              onPress={props.onPressAddMeasurement}
              accessibilityRole="button"
              accessibilityLabel={`Add ${props.metricTitle} measurement`}
              testID="body-metric-trend-add"
            >
              <Text style={styles.addBtnText}>Add measurement</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showTrend ? (
        <View style={styles.latestBlock} testID="body-metric-trend-latest">
          <Text
            style={styles.latestValue}
            accessibilityLabel={`Latest ${latestLabel ?? ""}`}
          >
            {latestLabel}
          </Text>
          <Text style={styles.latestDate}>
            {formatBodyDayLabel(displayModel.latest!.dayKey)}
          </Text>
        </View>
      ) : null}

      {displayModel.points.length > 0 && showTrend ? (
        <View style={styles.chartWrap} testID="body-metric-trend-chart">
          <WeightTrendChart
            points={[...displayModel.points]}
            unitLabel={props.unitLabel}
            valueKind={props.valueKind}
            formatValue={(v) => {
              const label = props.formatValue(v);
              const suffix = props.unitLabel;
              return suffix ? label.replace(` ${suffix}`, "") : label;
            }}
            range={props.range}
            accentColor={SYSTEM_ACCENT_LUMINOUS}
            emphasizeLatestPoint
            accessibilityLabel={a11y}
            chartHeight={320}
          />
          {displayModel.status === "insufficient" ? (
            <Text style={styles.insufficientNote} testID="body-metric-trend-insufficient">
              More measurements are needed to show a trend.
            </Text>
          ) : null}
        </View>
      ) : null}

      {showTrend ? (
        <View style={styles.statsWrap}>
          <WeightTrendStatsPanel
            rows={[
              {
                key: "change",
                label: "Change",
                value: changeLabel ?? "—",
                testID: "body-metric-trend-stat-change",
              },
              {
                key: "average",
                label: "Average",
                value: averageLabel ?? "—",
                testID: "body-metric-trend-stat-average",
              },
              {
                key: "high",
                label: "High",
                value: highLabel ?? "—",
                testID: "body-metric-trend-stat-high",
              },
              {
                key: "low",
                label: "Low",
                value: lowLabel ?? "—",
                testID: "body-metric-trend-stat-low",
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  latestBlock: {
    marginTop: 22,
    gap: 4,
  },
  latestValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  latestDate: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "500",
  },
  chartWrap: {
    marginTop: 14,
    minHeight: 320,
    backgroundColor: "transparent",
  },
  statsWrap: {
    marginTop: 24,
  },
  emptyBlock: {
    gap: 12,
    paddingVertical: 20,
  },
  addBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: BODY_INDIGO,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  insufficientNote: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  },
});
