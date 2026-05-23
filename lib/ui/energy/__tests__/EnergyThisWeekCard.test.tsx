import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";

import { buildWeeklyEnergyVm } from "@/lib/data/dash/buildWeeklyEnergyVm";
import { EnergyThisWeekCard } from "@/lib/ui/energy/EnergyThisWeekCard";
import type { DayKey } from "@/lib/ui/calendar/types";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  getTodayDayKeyLocal: () => "2026-05-20",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    return React.createElement("Text", { testID: `icon-${name}` }, name);
  },
}));

jest.mock("@/lib/ui/energy/EnergyWeeklyRangeBars", () => ({
  EnergyWeeklyRangeBars: () => null,
}));

jest.mock("@/lib/ui/ScreenStates", () => ({
  LoadingState: ({ message }: { message: string }) => {
    const React = require("react");
    return React.createElement("Text", null, message);
  },
}));

const week: DayKey[] = [
  "2026-05-17",
  "2026-05-18",
  "2026-05-19",
  "2026-05-20",
  "2026-05-21",
  "2026-05-22",
  "2026-05-23",
] as DayKey[];

function allText(root: renderer.ReactTestInstance): string {
  return root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((c): c is string => typeof c === "string")
    .join(" ");
}

describe("EnergyThisWeekCard", () => {
  it("renders title and average range with avg / day qualifier", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-20",
      weekDayKeys: week,
      energyByDay: {
        "2026-05-18": {
          settled: true,
          energy: {
            modelVersion: "v1",
            computedAt: "t",
            day: "2026-05-18",
            estimatedKcal: { low: 2521, high: 3107, midpoint: 2814 },
            variancePct: 0.08,
            confidence: "moderate",
            factors: {},
            missingRequiredInputs: [],
          },
        },
      },
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyThisWeekCard loading={false} model={model} />);
    });

    const flat = allText(tree.root);
    expect(flat).toContain("This Week's Energy");
    expect(flat).toContain("2,521–3,107 kcal");
    expect(flat).toContain("avg / day");
    expect(tree.root.findByProps({ testID: "energy-this-week-average-metric-value" })).toBeDefined();
  });

  it("renders one chart plot when not empty", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-20",
      weekDayKeys: week,
      energyByDay: {
        "2026-05-18": {
          settled: true,
          energy: {
            modelVersion: "v1",
            computedAt: "t",
            day: "2026-05-18",
            estimatedKcal: { low: 2000, high: 2500, midpoint: 2250 },
            variancePct: 0.05,
            confidence: "high",
            factors: {},
            missingRequiredInputs: [],
          },
        },
      },
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyThisWeekCard loading={false} model={model} />);
    });
    expect(tree.root.findByProps({ testID: "energy-this-week-chart-plot" })).toBeDefined();
    expect(model.chartPoints).toHaveLength(7);
  });

  it("hides the navigation cluster entirely when no weekRangeLabel is provided (backwards-compatible default)", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-20",
      weekDayKeys: week,
      energyByDay: {},
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyThisWeekCard loading={false} model={model} />);
    });
    expect(tree.root.findAllByProps({ testID: "energy-this-week-nav" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "energy-this-week-range-label" })).toHaveLength(0);
  });

  it("renders the week range label and both navigation buttons when weekRangeLabel is provided", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-20",
      weekDayKeys: week,
      energyByDay: {},
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyThisWeekCard
          loading={false}
          model={model}
          weekRangeLabel={"May 17\u201323"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("May 17\u201323");
    const prev = tree.root.findByProps({ testID: "energy-this-week-nav-previous" });
    const next = tree.root.findByProps({ testID: "energy-this-week-nav-next" });
    expect(prev.props.accessibilityLabel).toBe("Previous week");
    expect(prev.props.accessibilityRole).toBe("button");
    expect(next.props.accessibilityLabel).toBe("Next week");
    expect(next.props.accessibilityRole).toBe("button");
  });

  it("disables Next on the current week (canGoNext={false})", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-20",
      weekDayKeys: week,
      energyByDay: {},
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyThisWeekCard
          loading={false}
          model={model}
          weekRangeLabel={"May 17\u201323"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const next = tree.root.findByProps({ testID: "energy-this-week-nav-next" });
    // React Native blocks press handlers at runtime when `disabled` is true; the test asserts
    // the contract end-to-end: both the explicit `disabled` prop and the accessibilityState
    // reflect the disabled state so assistive tech and the press dispatcher agree.
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it("enables Next once the user navigates back (canGoNext={true}) and fires the callback", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-13",
      weekDayKeys: [
        "2026-05-10",
        "2026-05-11",
        "2026-05-12",
        "2026-05-13",
        "2026-05-14",
        "2026-05-15",
        "2026-05-16",
      ] as DayKey[],
      energyByDay: {},
    });
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyThisWeekCard
          loading={false}
          model={model}
          weekRangeLabel={"May 10\u201316"}
          canGoPrevious
          canGoNext
          onPressPrevious={onPrevious}
          onPressNext={onNext}
        />,
      );
    });
    const next = tree.root.findByProps({ testID: "energy-this-week-nav-next" });
    expect(next.props.disabled).toBe(false);
    expect(next.props.accessibilityState).toEqual({ disabled: false });
    act(() => {
      next.props.onPress?.();
    });
    expect(onNext).toHaveBeenCalledTimes(1);

    const prev = tree.root.findByProps({ testID: "energy-this-week-nav-previous" });
    act(() => {
      prev.props.onPress?.();
    });
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("treats missing onPress callbacks as a disabled control even when canGo* is true", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-20",
      weekDayKeys: week,
      energyByDay: {},
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyThisWeekCard
          loading={false}
          model={model}
          weekRangeLabel={"May 17\u201323"}
          canGoPrevious
          canGoNext
        />,
      );
    });
    expect(
      tree.root.findByProps({ testID: "energy-this-week-nav-previous" }).props.disabled,
    ).toBe(true);
    expect(tree.root.findByProps({ testID: "energy-this-week-nav-next" }).props.disabled).toBe(
      true,
    );
  });

  it("renders cleanly with no chart data for a navigated-back week (missing-day-safe)", () => {
    const model = buildWeeklyEnergyVm({
      todayDayKey: "2026-05-20",
      weekAnchorDay: "2026-05-10",
      weekDayKeys: [
        "2026-05-10",
        "2026-05-11",
        "2026-05-12",
        "2026-05-13",
        "2026-05-14",
        "2026-05-15",
        "2026-05-16",
      ] as DayKey[],
      energyByDay: {},
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyThisWeekCard
          loading={false}
          model={model}
          weekRangeLabel={"May 10\u201316"}
          canGoPrevious
          canGoNext
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("This Week's Energy");
    expect(flat).toContain("No daily energy this week yet");
    expect(flat).toContain("May 10\u201316");
    expect(model.isEmpty).toBe(true);
  });
});
