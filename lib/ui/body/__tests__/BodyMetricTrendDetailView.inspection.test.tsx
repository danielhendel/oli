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
const statsRowsRef: { current: unknown } = { current: null };

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
  WeightTrendStatsPanel: (props: { rows: unknown }) => {
    statsRowsRef.current = props.rows;
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
      dayKey: "2026-09-12",
      observedAt: "2026-09-12T12:00:00.000Z",
      weightKg: 75.5,
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
  average: 74.166,
  high: 75.5,
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

function mount(model: BodyMetricTrendDetailModel = readyModel) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      React.createElement(BodyMetricTrendDetailView, {
        metricTitle: "Weight",
        model,
        range: "30D",
        onChangeRange: jest.fn(),
        formatValue: (kg: number) => `${kg.toFixed(1)} kg`,
        formatChange: (d: number) => `${d.toFixed(1)} kg`,
        unitLabel: "kg",
        valueKind: "mass",
      }),
    );
  });
  return tree;
}

describe("BodyMetricTrendDetailView — hero inspection", () => {
  beforeEach(() => {
    chartPropsRef.current = null;
    statsRowsRef.current = null;
  });

  it("idle hero shows latest Weight without right-side change chip", () => {
    const tree = mount();
    const text = collectText(tree);
    expect(text).toMatch(/73\.0 kg/);
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-period-change" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-inspection-chip" })).toHaveLength(
      0,
    );
    const rows = statsRowsRef.current as { key: string }[];
    expect(rows.map((r) => r.key)).toEqual(["change", "high", "low"]);
  });

  it("inspection callback selects point B → hero shows B value/date/source", () => {
    const tree = mount();
    expect(chartPropsRef.current?.onInspectChange).toEqual(expect.any(Function));

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)({
        observedAt: "2026-09-12T12:00:00.000Z",
        dayKey: "2026-09-12",
        weightKg: 75.5,
        sourceId: "apple_health",
      });
    });

    const text = collectText(tree);
    expect(text).toMatch(/75\.5 kg/);
    expect(text).toMatch(/Sat, Sep 12/);
    expect(text).toMatch(/Apple Health/);
    expect(tree.root.findByProps({ testID: "body-metric-trend-inspection-source" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-period-change" })).toHaveLength(0);
    // Coverage footer stays range-level, not scrub date.
    expect(text).toMatch(/Sep 1, 2026/);
    expect(text).toMatch(/Sep 21, 2026/);
  });

  it("idle → active → release restores latest Weight", () => {
    const tree = mount();

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)({
        observedAt: "2026-09-01T12:00:00.000Z",
        dayKey: "2026-09-01",
        weightKg: 74,
        sourceId: "apple_health",
      });
    });

    expect(collectText(tree)).toMatch(/74\.0 kg/);
    expect(tree.root.findByProps({ testID: "body-metric-trend-inspection-source" })).toBeDefined();

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)(null);
    });
    expect(collectText(tree)).toMatch(/73\.0 kg/);
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-inspection-source" })).toHaveLength(
      0,
    );
  });

  it("parent re-render with new points array identity does not clear active inspection", () => {
    const tree = mount();

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)({
        observedAt: "2026-09-12T12:00:00.000Z",
        dayKey: "2026-09-12",
        weightKg: 75.5,
        sourceId: "apple_health",
      });
    });
    expect(collectText(tree)).toMatch(/75\.5 kg/);

    const sameContentNewIdentity: BodyMetricTrendDetailModel = {
      ...readyModel,
      points: readyModel.points.map((p) => ({ ...p })),
    };

    act(() => {
      tree.update(
        React.createElement(BodyMetricTrendDetailView, {
          metricTitle: "Weight",
          model: sameContentNewIdentity,
          range: "30D",
          onChangeRange: jest.fn(),
          formatValue: (kg: number) => `${kg.toFixed(1)} kg`,
          formatChange: (d: number) => `${d.toFixed(1)} kg`,
          unitLabel: "kg",
          valueKind: "mass",
        }),
      );
    });

    expect(collectText(tree)).toMatch(/75\.5 kg/);
    expect(collectText(tree)).toMatch(/Sat, Sep 12/);
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
    expect(collectText(tree)).toMatch(/74\.0 kg/);

    act(() => {
      tree.root.findByProps({ testID: "range-90D" }).props.onPress();
    });
    expect(onChangeRange).toHaveBeenCalledWith("90D");
    expect(collectText(tree)).toMatch(/73\.0 kg/);
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-inspection-source" })).toHaveLength(
      0,
    );
  });

  it("data refresh that drops selected point resets inspection safely", () => {
    const tree = mount();

    act(() => {
      (chartPropsRef.current!.onInspectChange as (p: unknown) => void)({
        observedAt: "2026-09-12T12:00:00.000Z",
        dayKey: "2026-09-12",
        weightKg: 75.5,
        sourceId: "apple_health",
      });
    });
    expect(collectText(tree)).toMatch(/75\.5 kg/);

    const refreshed: BodyMetricTrendDetailModel = {
      ...readyModel,
      points: [readyModel.points[0]!, readyModel.points[2]!],
      average: 73.5,
      high: 74,
      low: 73,
      observedExtent: {
        firstObservedAt: "2026-09-01T12:00:00.000Z",
        lastObservedAt: "2026-09-21T12:00:00.000Z",
        firstDayKey: "2026-09-01",
        lastDayKey: "2026-09-21",
      },
    };

    act(() => {
      tree.update(
        React.createElement(BodyMetricTrendDetailView, {
          metricTitle: "Weight",
          model: refreshed,
          range: "30D",
          onChangeRange: jest.fn(),
          formatValue: (kg: number) => `${kg.toFixed(1)} kg`,
          formatChange: (d: number) => `${d.toFixed(1)} kg`,
          unitLabel: "kg",
          valueKind: "mass",
        }),
      );
    });

    expect(collectText(tree)).toMatch(/73\.0 kg/);
    expect(tree.root.findAllByProps({ testID: "body-metric-trend-inspection-source" })).toHaveLength(
      0,
    );
  });

  it("passes chart points by reference (no per-render copy)", () => {
    mount();
    expect(chartPropsRef.current?.points).toBe(readyModel.points);
  });
});
