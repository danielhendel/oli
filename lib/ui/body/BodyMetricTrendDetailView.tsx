import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricTrendDetailModel } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import { buildBodyMetricTrendAccessibilitySummary } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import {
  buildWeightTrendInspection,
  WEIGHT_TREND_INSPECTION_IDLE,
  type WeightTrendInspection,
} from "@/lib/body/presentation/buildWeightTrendInspection";
import {
  formatWeightTrendCurrentDate,
  formatWeightTrendObservedCoverageLabel,
  WEIGHT_TREND_NO_DATA_AVAILABLE,
} from "@/lib/body/presentation/formatWeightTrendDates";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import { WeightTrendStatsPanel } from "@/lib/ui/body/WeightTrendStatsPanel";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import {
  WeightTrendChart,
  type WeightTrendChartInspectPoint,
} from "@/lib/ui/WeightTrendChart";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  SYSTEM_ACCENT_LUMINOUS,
  SYSTEM_ACCENT_NAVY_DEPTH,
} from "@/lib/ui/theme/systemAccent";
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

const RANGE_SHORT: Record<WeightRangeKey, string> = {
  "7D": "7D",
  "30D": "30D",
  "90D": "90D",
  "6M": "6M",
  "1Y": "1Y",
  YTD: "YTD",
  "3Y": "3Y",
  "5Y": "5Y",
  All: "All",
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
 * Chart inspection uses the fixed hero region (no floating tooltip).
 */
export function BodyMetricTrendDetailView(props: BodyMetricTrendDetailViewProps) {
  const [inspection, setInspection] = useState<WeightTrendInspection>(
    WEIGHT_TREND_INSPECTION_IDLE,
  );

  const displayModel =
    props.model.status === "partial" &&
    props.retainChartWhileLoading &&
    props.previousReadyModel != null &&
    (props.previousReadyModel.status === "ready" ||
      props.previousReadyModel.status === "insufficient")
      ? props.previousReadyModel
      : props.model;

  useEffect(() => {
    setInspection(WEIGHT_TREND_INSPECTION_IDLE);
  }, [props.range, displayModel.points]);

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

  const observedCoverageLabel = useMemo(() => {
    const extent = displayModel.observedExtent;
    if (extent?.firstDayKey == null || extent.lastDayKey == null) return null;
    return formatWeightTrendObservedCoverageLabel({
      firstDayKey: extent.firstDayKey,
      lastDayKey: extent.lastDayKey,
    });
  }, [displayModel.observedExtent]);

  const inspecting = inspection.status === "active";
  const heroValueLabel = inspecting ? inspection.formattedValue : latestLabel;
  const heroDateLabel = inspecting
    ? inspection.formattedTime
      ? `${inspection.formattedDate} · ${inspection.formattedTime}`
      : inspection.formattedDate
    : displayModel.latest != null
      ? formatWeightTrendCurrentDate(displayModel.latest.dayKey)
      : null;

  const a11y = buildBodyMetricTrendAccessibilitySummary({
    metricTitle: props.metricTitle,
    rangeLabel: RANGE_LABELS[props.range] ?? props.range,
    latestLabel: inspecting ? inspection.formattedValue : latestLabel,
    changeLabel: inspecting ? null : changeLabel,
    averageLabel,
    highLabel,
    lowLabel,
    status: displayModel.status,
    changeUnavailableDueToPartialCoverage: inspecting
      ? false
      : displayModel.changeUnavailableDueToPartialCoverage,
    observedCoverageLabel,
  });

  const showTrend =
    displayModel.latest != null &&
    (displayModel.status === "ready" || displayModel.status === "insufficient");

  const rangeShort = RANGE_SHORT[props.range] ?? props.range;
  const changeDisplay = changeLabel ?? "—";
  const changePeriodLabel =
    props.range === "All" ? "All-time change" : `${rangeShort} change`;

  const handleInspectChange = useCallback(
    (point: WeightTrendChartInspectPoint | null) => {
      if (point == null) {
        setInspection(WEIGHT_TREND_INSPECTION_IDLE);
        return;
      }
      const sameDayPointCount = displayModel.points.filter((p) => p.dayKey === point.dayKey)
        .length;
      setInspection(
        buildWeightTrendInspection({
          point,
          formatValue: props.formatValue,
          sameDayPointCount,
          metricTitle: props.metricTitle,
        }),
      );
    },
    [displayModel.points, props.formatValue, props.metricTitle],
  );

  const handleChangeRange = useCallback(
    (next: WeightRangeKey) => {
      setInspection(WEIGHT_TREND_INSPECTION_IDLE);
      props.onChangeRange(next);
    },
    [props],
  );

  return (
    <View
      style={styles.root}
      testID="body-metric-trend-detail"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={
        inspecting && inspection.status === "active" ? inspection.accessibilityLabel : a11y
      }
    >
      <WeightRangeSelector value={props.range} onChange={handleChangeRange} />

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
          <Text
            style={styles.noDataPrimary}
            testID="body-metric-trend-no-data"
            accessibilityRole="text"
          >
            {WEIGHT_TREND_NO_DATA_AVAILABLE}
          </Text>
          <Text style={styles.noDataSecondary}>
            {`No ${props.metricTitle} measurements were found in this period.`}
          </Text>
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
        <View style={styles.heroSummary} testID="body-metric-trend-latest">
          <View style={styles.currentLeft}>
            <Text
              style={styles.latestValue}
              accessibilityLabel={
                inspecting && inspection.status === "active"
                  ? inspection.accessibilityLabel
                  : `Latest ${heroValueLabel ?? ""}`
              }
            >
              {heroValueLabel}
            </Text>
            <Text style={styles.latestDate}>{heroDateLabel}</Text>
          </View>
          {inspecting && inspection.status === "active" ? (
            <View
              style={styles.changeChip}
              testID="body-metric-trend-inspection-chip"
              accessible
              accessibilityLabel={
                inspection.sourceLabel
                  ? `Historical, ${inspection.sourceLabel}`
                  : "Historical"
              }
            >
              <Text style={styles.changeValue}>Historical</Text>
              {inspection.sourceLabel ? (
                <Text style={styles.changePeriod}>{inspection.sourceLabel}</Text>
              ) : null}
            </View>
          ) : (
            <View
              style={styles.changeChip}
              testID="body-metric-trend-period-change"
              accessible
              accessibilityLabel={
                displayModel.changeUnavailableDueToPartialCoverage
                  ? `${changePeriodLabel} unavailable`
                  : `${changePeriodLabel}, ${changeDisplay}`
              }
            >
              <Text style={styles.changeValue}>{changeDisplay}</Text>
              <Text style={styles.changePeriod}>{changePeriodLabel}</Text>
            </View>
          )}
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
            onInspectChange={handleInspectChange}
          />
          {observedCoverageLabel ? (
            <Text
              style={styles.observedCoverage}
              testID="body-metric-trend-observed-coverage"
              accessibilityLabel={`${props.metricTitle} data shown from ${observedCoverageLabel}`}
            >
              {observedCoverageLabel}
            </Text>
          ) : null}
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
  heroSummary: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 4,
  },
  currentLeft: {
    flexShrink: 1,
    gap: 4,
  },
  changeChip: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 108,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT_NAVY_DEPTH,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(91, 140, 255, 0.28)",
  },
  latestValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -0.9,
  },
  latestDate: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "500",
  },
  changeValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  changePeriod: {
    color: "rgba(168, 188, 230, 0.78)",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  chartWrap: {
    marginTop: 14,
    minHeight: 320,
    backgroundColor: "transparent",
  },
  observedCoverage: {
    marginTop: 12,
    marginBottom: 4,
    textAlign: "center",
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
  statsWrap: {
    marginTop: 20,
  },
  emptyBlock: {
    gap: 10,
    paddingVertical: 36,
    alignItems: "center",
  },
  noDataPrimary: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  noDataSecondary: {
    color: UI_TEXT_MUTED,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  addBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 20,
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
