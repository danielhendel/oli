import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricTrendDetailModel } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import { buildBodyMetricTrendAccessibilitySummary } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import { formatBodyDayLabel } from "@/lib/ui/body/formatBodyDayLabel";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import { WeightTrendChart } from "@/lib/ui/WeightTrendChart";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
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
  unitLabel: string;
  valueKind: "mass" | "generic";
  onRetry?: () => void;
  onPressAddMeasurement?: () => void;
  /** When true, show last-known chart while refreshing. */
  retainChartWhileLoading?: boolean;
  previousReadyModel?: BodyMetricTrendDetailModel | null;
};

function StatCell(props: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.statCell} testID={props.testID}>
      <Text style={styles.statLabel}>{props.label}</Text>
      <Text style={styles.statValue}>{props.value}</Text>
    </View>
  );
}

/**
 * Single longitudinal trend surface for Body metric detail (Weight-first Stage 3C).
 * No Latest card, no embedded History list — chart + range + compact summary only.
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

  const latestLabel =
    displayModel.latest != null ? props.formatValue(displayModel.latest.valueKg) : null;
  const changeLabel =
    displayModel.change != null ? props.formatValue(displayModel.change) : null;
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
            description={`Add ${props.metricTitle} measurements to see your trend over time.`}
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

      {displayModel.latest != null &&
      (displayModel.status === "ready" || displayModel.status === "insufficient") ? (
        <View style={styles.latestBlock} testID="body-metric-trend-latest">
          <Text style={styles.latestValue}>{latestLabel}</Text>
          <Text style={styles.latestDate}>
            {formatBodyDayLabel(displayModel.latest.dayKey)}
          </Text>
        </View>
      ) : null}

      {displayModel.points.length > 0 &&
      (displayModel.status === "ready" || displayModel.status === "insufficient") ? (
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
            accentColor={BODY_INDIGO}
            emphasizeLatestPoint
            accessibilityLabel={a11y}
          />
          {displayModel.status === "insufficient" ? (
            <Text style={styles.insufficientNote} testID="body-metric-trend-insufficient">
              More measurements are needed to show a trend.
            </Text>
          ) : null}
        </View>
      ) : null}

      {displayModel.latest != null &&
      (displayModel.status === "ready" || displayModel.status === "insufficient") ? (
        <View style={styles.summaryRow} testID="body-metric-trend-summary">
          <StatCell
            label="Change"
            value={changeLabel ?? "—"}
            testID="body-metric-trend-stat-change"
          />
          <StatCell
            label="Average"
            value={averageLabel ?? "—"}
            testID="body-metric-trend-stat-average"
          />
          <StatCell
            label="High"
            value={highLabel ?? "—"}
            testID="body-metric-trend-stat-high"
          />
          <StatCell
            label="Low"
            value={lowLabel ?? "—"}
            testID="body-metric-trend-stat-low"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  latestBlock: {
    gap: 2,
  },
  latestValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  latestDate: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "500",
  },
  chartWrap: {
    minHeight: 220,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 6,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCell: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 72,
    gap: 2,
    paddingVertical: 8,
  },
  statLabel: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBlock: {
    gap: 12,
    paddingVertical: 8,
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
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
});
