import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";

import type { SleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import type { WeeklySleepVm } from "@/lib/data/sleep/buildWeeklySleepVm";
import { SleepThisWeekCard } from "@/lib/ui/sleep/SleepThisWeekCard";

function makeWeeklyVm(): WeeklySleepVm {
  return {
    chartPoints: [
      { dayKey: "2026-04-05", displayLabel: "S", value: 0, isFutureDay: false },
      { dayKey: "2026-04-06", displayLabel: "M", value: 420, isFutureDay: false },
      { dayKey: "2026-04-07", displayLabel: "T", value: 0, isFutureDay: false },
      { dayKey: "2026-04-08", displayLabel: "W", value: 0, isFutureDay: true },
      { dayKey: "2026-04-09", displayLabel: "T", value: 0, isFutureDay: true },
      { dayKey: "2026-04-10", displayLabel: "F", value: 0, isFutureDay: true },
      { dayKey: "2026-04-11", displayLabel: "S", value: 0, isFutureDay: true },
    ],
    chartMaxScale: 420,
    weeklyAverageText: "7h 0m",
    isEmpty: false,
  };
}

function makeBaselineVm(): SleepBaselineVm {
  return {
    rows: [
      {
        key: "day7",
        label: "7 Day",
        hasEnoughData: true,
        averageMinutes: 420,
        displayValue: "7h/night",
        statusLabel: "Good",
        statusColor: "#248A3D",
        statusBackgroundColor: "#F0F8F4",
        progressFill01: 0.875,
      },
      {
        key: "day30",
        label: "30 Day",
        hasEnoughData: false,
        averageMinutes: null,
        displayValue: "—",
        statusLabel: null,
        statusColor: null,
        statusBackgroundColor: null,
        progressFill01: null,
      },
      {
        key: "day90",
        label: "90 Day",
        hasEnoughData: true,
        averageMinutes: 425,
        displayValue: "7h 5m/night",
        statusLabel: "Good",
        statusColor: "#248A3D",
        statusBackgroundColor: "#F0F8F4",
        progressFill01: 0.88,
      },
      {
        key: "ytd",
        label: "YTD",
        hasEnoughData: false,
        averageMinutes: null,
        displayValue: "—",
        statusLabel: null,
        statusColor: null,
        statusBackgroundColor: null,
        progressFill01: null,
      },
      {
        key: "month12",
        label: "12 Month",
        hasEnoughData: false,
        averageMinutes: null,
        displayValue: "—",
        statusLabel: null,
        statusColor: null,
        statusBackgroundColor: null,
        progressFill01: null,
      },
    ],
    personalizedExplainer: "stub",
  };
}

describe("SleepThisWeekCard week navigator", () => {
  it("renders chevrons + range label and calls handlers", async () => {
    const onPressPrevious = jest.fn();
    const onPressNext = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SleepThisWeekCard
          loading={false}
          model={makeWeeklyVm()}
          sleepBaselineVm={makeBaselineVm()}
          weekRangeLabel={"Apr 5\u201311"}
          canGoPrevious={true}
          canGoNext={false}
          onPressPrevious={onPressPrevious}
          onPressNext={onPressNext}
        />,
      );
    });

    expect(
      tree.root.findByProps({ testID: "sleep-this-week-range-label" }).props.children,
    ).toBe("Apr 5\u201311");

    const previous = tree.root.findByProps({ testID: "sleep-this-week-nav-previous" });
    await act(async () => {
      previous.props.onPress();
    });
    expect(onPressPrevious).toHaveBeenCalledTimes(1);

    const next = tree.root.findByProps({ testID: "sleep-this-week-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState.disabled).toBe(true);
  });

  it("omits the navigator when no weekRangeLabel is provided (back-compat path)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SleepThisWeekCard
          loading={false}
          model={makeWeeklyVm()}
          sleepBaselineVm={makeBaselineVm()}
        />,
      );
    });
    expect(tree.root.findAllByProps({ testID: "sleep-this-week-nav" })).toHaveLength(0);
  });
});
