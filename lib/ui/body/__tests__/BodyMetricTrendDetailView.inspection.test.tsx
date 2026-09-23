/**
 * @jest-environment jsdom
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyMetricTrendDetailView } from "@/lib/ui/body/BodyMetricTrendDetailView";
import type { BodyMetricTrendDetailModel } from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

const chartPropsRef: { current: Record<string, unknown> | null } = { current: null };

jest.mock("@/lib/ui/WeightTrendChart", () => ({
  WeightTrendChart: (props: Record<string, unknown>) => {
    chartPropsRef.current = props;
    const ReactLocal = require("react");
    return ReactLocal.createElement("View", { testID: "chart" });
  },
}));

jest.mock("@/lib/ui/WeightRangeSelector", () => ({
  WeightRangeSelector: (props: { value: string; onChange: (r: string) => void }) => {
    const ReactLocal = require("react");
    return ReactLocal.createElement(
      "View",
      { testID: "range" },
      ReactLocal.createElement("Pressable", {
        testID: "range-90D",
        onPress: () => props.onChange("90D"),
      }),
    );
  },
}));

jest.mock("@/lib/ui/body/WeightTrendStatsPanel", () => ({
  WeightTrendStatsPanel: () => {
    const ReactLocal = require("react");
    return ReactLocal.createElement("View", { testID: "stats" });
  },
}));

jest.mock("@/lib/ui/ScreenStates", () => ({
  LoadingState: () => null,
  ErrorState: () => null,
  EmptyState: () => null,
}));

const readyModel: BodyMetricTrendDetailModel = {
  range: "30D",
  points: [
    {
      dayKey: "2026-09-01",
      observedAt: "2026-09-01T12:00:00.000Z",
      weightKg: 74,
      sourceId: "apple_health",
    },
    {
      dayKey: "2026-09-21",
      observedAt: "2026-09-21T12:00:00.000Z",
      weightKg: 73,
      sourceId: "apple_health",
    },
  ],
  latest: {
    valueKg: 73,
    observedAt: "2026-09-21T12:00:00.000Z",
    dayKey: "2026-09-21",
  },
  change: -1,
  average: 73.5,
  high: 74,
  low: 73,
  status: "ready",
  errorMessage: null,
  sameDayPolicy: "all_observations_by_observedAt",
  coverage: {
    status: "complete",
    requestedStart: "2026-08-22",
    requestedEnd: "2026-09-21",
    baselinePoint: {
      dayKey: "2026-08-22",
      observedAt: "2026-08-22T12:00:00.000Z",
      weightKg: 74,
      sourceId: "apple_health",
    },
    latestPoint: {
      dayKey: "2026-09-21",
      observedAt: "2026-09-21T12:00:00.000Z",
      weightKg: 73,
      sourceId: "apple_health",
    },
    deltaKg: -1,
  },
  observedExtent: {
    firstObservedAt: "2026-09-01T12:00:00.000Z",
    lastObservedAt: "2026-09-21T12:00:00.000Z",
    firstDayKey: "2026-09-01",
    lastDayKey: "2026-09-21",
  },
  changeUnavailableDueToPartialCoverage: false,
};

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("BodyMetricTrendDetailView — hero inspection", () => {
  beforeEach(() => {
    chartPropsRef.current = null;
  });

  it("idle hero shows change chip; inspection replaces it and release restores", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricTrendDetailView, {
          metricTitle: "Weight",
          model: readyModel,
          range: "30D",
          onChangeRange: jest.fn(),
          formatValue: (kg: number) => `${kg.toFixed(1)} kg`,
          formatChange: (d: number) => `${d.toFixed(1)} kg`,
          unitLabel: "kg",
          valueKind: "mass",
        }),
      );
    });

    expect(tree.root.findByProps({ testID: "body-metric-trend-period-change" })).toBeDefined();
    expect(collectText(tree)).toMatch(/30D change/);
    expect(chartPropsRef.current?.onInspectChange).toEqual(expect.any(Function));

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)({
        observedAt: "2026-09-01T12:00:00.000Z",
        dayKey: "2026-09-01",
        weightKg: 74,
        sourceId: "apple_health",
      });
    });

    expect(tree.root.findByProps({ testID: "body-metric-trend-inspection-chip" })).toBeDefined();
    expect(collectText(tree)).toMatch(/Historical/);
    expect(collectText(tree)).toMatch(/Apple Health/);
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-period-change" })).toHaveLength(0);

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)(null);
    });
    expect(tree.root.findByProps({ testID: "body-metric-trend-period-change" })).toBeDefined();
  });

  it("range switch resets inspection via onChangeRange wrapper", () => {
    const onChangeRange = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricTrendDetailView, {
          metricTitle: "Weight",
          model: readyModel,
          range: "30D",
          onChangeRange,
          formatValue: (kg: number) => `${kg.toFixed(1)} kg`,
          unitLabel: "kg",
          valueKind: "mass",
        }),
      );
    });

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)({
        observedAt: "2026-09-01T12:00:00.000Z",
        dayKey: "2026-09-01",
        weightKg: 74,
        sourceId: "apple_health",
      });
    });
    expect(tree.root.findByProps({ testID: "body-metric-trend-inspection-chip" })).toBeDefined();

    act(() => {
      tree.root.findByProps({ testID: "range-90D" }).props.onPress();
    });
    expect(onChangeRange).toHaveBeenCalledWith("90D");
    expect(tree.root.findByProps({ testID: "body-metric-trend-period-change" })).toBeDefined();
  });
});
