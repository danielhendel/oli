import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricTrendDetailModel } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import { buildBodyMetricTrendAccessibilitySummary } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
import type { BodyFatAxisTicksModel } from "@/lib/body/presentation/buildBodyFatAxisTicks";
import type { WeightAxisTicksModel } from "@/lib/body/presentation/buildWeightAxisTicks";
import {
  BodyMetricDisplayModeToggle,
  type BodyMetricDisplayModeOption,
} from "@/lib/ui/body/BodyMetricDisplayModeToggle";
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
import { diagnoseBodyFatExtentFromObservedAts } from "@/lib/body/presentation/diagnoseBodyFatExtent";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";
import { WeightTrendStatsPanel } from "@/lib/ui/body/WeightTrendStatsPanel";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import {
  WeightTrendChart,
  type WeightTrendChartInspectPoint,
} from "@/lib/ui/WeightTrendChart";
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
  valueKind: "mass" | "generic" | "percent";
  onRetry?: () => void;
  onPressAddMeasurement?: () => void;
  /** When true, show last-known chart while refreshing. */
  retainChartWhileLoading?: boolean;
  previousReadyModel?: BodyMetricTrendDetailModel | null;
  /**
   * Locked Weight Y-axis from full available history — shared across all period selectors.
   */
  sharedMassAxis?: WeightAxisTicksModel | null;
  /**
   * Locked Body Fat % Y-axis from full available history — shared across all period selectors.
   */
  sharedPercentAxis?: BodyFatAxisTicksModel | null;
  /**
   * Compact display-mode toggle (lb|BMI, %|lb, …) — right of the hero result.
   */
  displayModeToggle?: {
    readonly options: readonly BodyMetricDisplayModeOption<string>[];
    readonly selected: string;
    readonly onChange: (next: string) => void;
    readonly testID?: string;
  } | null;
  /** Content key that changes when display mode changes — clears inspection. */
  displayModeKey?: string;
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

  /** Content key — avoid resetting inspection on array identity churn alone. */
  const pointsContentKey = useMemo(
    () =>
      displayModel.points
        .map((p) => `${p.observedAt}\0${p.weightKg}\0${p.dayKey}\0${p.sourceId}`)
        .join("|"),
    [displayModel.points],
  );

  useEffect(() => {
    setInspection(WEIGHT_TREND_INSPECTION_IDLE);
  }, [props.range, pointsContentKey, props.displayModeKey]);

  useEffect(() => {
    if (props.valueKind !== "percent") return;
    if (
      displayModel.status !== "ready" &&
      displayModel.status !== "insufficient"
    ) {
      return;
    }
    diagnoseBodyFatExtentFromObservedAts(
      "rendered",
      displayModel.points.map((p) => p.observedAt),
      {
        requestedRange: props.range,
        operation: "BodyMetricTrendDetailView",
      },
    );
  }, [displayModel.points, displayModel.status, props.range, props.valueKind]);

  useEffect(() => {
    if (inspection.status !== "active") return;
    const stillPresent = displayModel.points.some(
      (p) => p.observedAt === inspection.pointId,
    );
    if (!stillPresent) {
      setInspection(WEIGHT_TREND_INSPECTION_IDLE);
    }
  }, [displayModel.points, inspection]);

  const formatChange = props.formatChange ?? props.formatValue;

  const latestLabel =
    displayModel.latest != null ? props.formatValue(displayModel.latest.valueKg) : null;
  const changeLabel =
    displayModel.change != null ? formatChange(displayModel.change) : null;
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
  const heroSourceLabel =
    inspecting && inspection.status === "active" ? inspection.sourceLabel : null;

  const a11y = buildBodyMetricTrendAccessibilitySummary({
    metricTitle: props.metricTitle,
    rangeLabel: RANGE_LABELS[props.range] ?? props.range,
    latestLabel: inspecting ? inspection.formattedValue : latestLabel,
    changeLabel: inspecting ? null : changeLabel,
    averageLabel: null,
    highLabel,
    lowLabel,
    status: displayModel.status,
    changeUnavailableDueToPartialCoverage: false,
    observedCoverageLabel,
  });

  const chartA11y = a11y;

  const showTrend =
    displayModel.latest != null &&
    (displayModel.status === "ready" || displayModel.status === "insufficient");

  const changeDisplay = changeLabel ?? "—";
  const changeA11y =
    displayModel.change == null
      ? "Change unavailable"
      : `Change ${changeDisplay}`;

  const chartFormatValue = useCallback(
    (v: number) => {
      const label = props.formatValue(v);
      const suffix = props.unitLabel;
      return suffix ? label.replace(` ${suffix}`, "") : label;
    },
    [props.formatValue, props.unitLabel],
  );

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
    [props.onChangeRange],
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
          {props.displayModeToggle != null ? (
            <View style={styles.emptyToggleRow}>
              <View style={{ flex: 1 }} />
              <BodyMetricDisplayModeToggle
                options={props.displayModeToggle.options}
                selected={props.displayModeToggle.selected}
                onChange={props.displayModeToggle.onChange}
                {...(props.displayModeToggle.testID != null
                  ? { testID: props.displayModeToggle.testID }
                  : {})}
              />
            </View>
          ) : null}
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
          <View style={styles.heroRow} testID="body-metric-trend-hero-row">
            <View style={styles.heroTextCol} testID="body-metric-trend-hero-value">
              <Text
                style={styles.latestValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                accessibilityLabel={
                  inspecting && inspection.status === "active"
                    ? inspection.accessibilityLabel
                    : `Latest ${heroValueLabel ?? ""}`
                }
              >
                {heroValueLabel}
              </Text>
              <Text style={styles.latestDate} numberOfLines={1}>
                {heroDateLabel}
              </Text>
              {heroSourceLabel ? (
                <Text
                  style={styles.latestSource}
                  numberOfLines={1}
                  testID="body-metric-trend-inspection-source"
                >
                  {heroSourceLabel}
                </Text>
              ) : inspecting ? (
                <Text
                  style={styles.latestSource}
                  numberOfLines={1}
                  testID="body-metric-trend-inspection-source"
                >
                  Historical
                </Text>
              ) : null}
            </View>
            {props.displayModeToggle != null ? (
              <View style={styles.heroToggleCol} testID="body-metric-trend-hero-toggle">
                <BodyMetricDisplayModeToggle
                  options={props.displayModeToggle.options}
                  selected={props.displayModeToggle.selected}
                  onChange={props.displayModeToggle.onChange}
                  {...(props.displayModeToggle.testID != null
                    ? { testID: props.displayModeToggle.testID }
                    : {})}
                />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {displayModel.points.length > 0 && showTrend ? (
        <View style={styles.chartWrap} testID="body-metric-trend-chart">
          <WeightTrendChart
            points={displayModel.points}
            unitLabel={props.unitLabel}
            valueKind={props.valueKind}
            formatValue={chartFormatValue}
            range={props.range}
            accentColor={SYSTEM_ACCENT_LUMINOUS}
            emphasizeLatestPoint
            accessibilityLabel={chartA11y}
            chartHeight={320}
            onInspectChange={handleInspectChange}
            highContrastLine={
              props.valueKind === "mass" || props.valueKind === "percent"
            }
            sharedMassAxis={props.sharedMassAxis ?? null}
            sharedPercentAxis={props.sharedPercentAxis ?? null}
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
                key: "low",
                label: "Low",
                value: lowLabel ?? "—",
                testID: "body-metric-trend-stat-low",
              },
              {
                key: "high",
                label: "High",
                value: highLabel ?? "—",
                testID: "body-metric-trend-stat-high",
              },
              {
                key: "change",
                label: "Change",
                value: changeDisplay,
                testID: "body-metric-trend-stat-change",
                accessibilityLabel: changeA11y,
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
    width: "100%",
    alignSelf: "stretch",
    gap: 0,
  },
  heroSummary: {
    width: "100%",
    marginTop: 22,
    alignItems: "stretch",
    gap: 4,
    paddingVertical: 4,
  },
  /**
   * Bounded flex row inside page content insets. flexWrap lets the toggle drop
   * to a trailing second row under large Dynamic Type / narrow widths instead
   * of clipping off-screen.
   */
  heroRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: 12,
    rowGap: 8,
  },
  heroTextCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: "100%",
    alignItems: "flex-start",
    gap: 4,
  },
  heroToggleCol: {
    flexGrow: 0,
    flexShrink: 0,
    marginLeft: "auto",
    paddingTop: 8,
  },
  latestValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -0.9,
    maxWidth: "100%",
  },
  latestDate: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "500",
    maxWidth: "100%",
  },
  latestSource: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
    maxWidth: "100%",
  },
  chartWrap: {
    marginTop: 14,
    minHeight: 320,
    backgroundColor: "transparent",
  },
  observedCoverage: {
    marginTop: 8,
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
  emptyToggleRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    flexShrink: 0,
    marginBottom: 8,
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
