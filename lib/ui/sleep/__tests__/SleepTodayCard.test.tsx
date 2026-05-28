import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";

import { SleepTodayCard } from "@/lib/ui/sleep/SleepTodayCard";
import type { SleepTodayDetailVm } from "@/lib/data/sleep/buildSleepTodayDetailVm";

function makeReadyVm(overrides?: Partial<SleepTodayDetailVm>): SleepTodayDetailVm {
  return {
    status: "ready",
    day: "2026-05-18",
    headlineWithUnit: "7h 32m Sleep",
    model: {
      day: "2026-05-18",
      headlineValueText: "7h 32m",
      scoreValueText: "82",
      ratingLabel: "Good",
      ratingTone: "good",
      summarySentence: "Sleep duration and efficiency look solid for this day.",
      metricRows: [
        { id: "deep_sleep", label: "Deep sleep", value: "1h 35m", detail: { title: "Deep sleep", value: "1h 35m", body: "" } },
        { id: "rem_sleep", label: "REM sleep", value: "1h 40m", detail: { title: "REM sleep", value: "1h 40m", body: "" } },
        { id: "sleep_efficiency", label: "Sleep efficiency", value: "91%", detail: { title: "Sleep efficiency", value: "91%", body: "" } },
        { id: "lowest_heart_rate", label: "Lowest heart rate", value: "52 bpm", detail: { title: "Lowest heart rate", value: "52 bpm", body: "" } },
        { id: "average_hrv", label: "Average HRV", value: "48 ms", detail: { title: "Average HRV", value: "48 ms", body: "" } },
      ],
      hasAnySignal: true,
      emptyStateTitle: null,
      emptyStateSubtitle: null,
      lastNightSubtitle: "Last night\u2019s sleep",
    },
    ...overrides,
  } as SleepTodayDetailVm;
}

describe("SleepTodayCard", () => {
  it("renders headline `7h 32m Sleep` and metric rows from the detail VM", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepTodayCard model={makeReadyVm()} />);
    });
    expect(tree.root.findByProps({ testID: "sleep-today-hero-metric" }).props.children).toBe(
      "7h 32m Sleep",
    );

    for (const id of [
      "deep_sleep",
      "rem_sleep",
      "sleep_efficiency",
      "lowest_heart_rate",
      "average_hrv",
    ]) {
      expect(tree.root.findByProps({ testID: `sleep-today-metric-row-${id}` })).toBeTruthy();
    }

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Deep sleep");
    expect(json).toContain("REM sleep");
    expect(json).toContain("Sleep efficiency");
    expect(json).toContain("Lowest heart rate");
    expect(json).toContain("Average HRV");
    expect(json).toContain("91%");
    expect(json).not.toContain("sleep-today-status-pill");
  });

  it("renders the empty/missing state without metric rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SleepTodayCard
          model={{
            status: "missing",
            day: "2026-05-18",
            message: "No completed sleep found for this day.",
          }}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "sleep-today-hero-metric" }).props.children).toBe(
      "\u2014 Sleep",
    );
    expect(tree.root.findAllByProps({ testID: "sleep-today-metric-rows" })).toHaveLength(0);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("No completed sleep found for this day.");
  });

  it("renders loading state while partial", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SleepTodayCard model={{ status: "partial", day: "2026-05-18" }} />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Loading sleep");
    expect(json).not.toContain("sleep-today-hero-metric");
  });

  it("gracefully renders dashes for missing metric values", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SleepTodayCard
          model={makeReadyVm({
            model: {
              ...makeReadyVm().model!,
              metricRows: [
                { id: "deep_sleep", label: "Deep sleep", value: "\u2014", detail: { title: "Deep sleep", value: "\u2014", body: "" } },
                { id: "rem_sleep", label: "REM sleep", value: "\u2014", detail: { title: "REM sleep", value: "\u2014", body: "" } },
                { id: "sleep_efficiency", label: "Sleep efficiency", value: "\u2014", detail: { title: "Sleep efficiency", value: "\u2014", body: "" } },
                { id: "lowest_heart_rate", label: "Lowest heart rate", value: "\u2014", detail: { title: "Lowest heart rate", value: "\u2014", body: "" } },
                { id: "average_hrv", label: "Average HRV", value: "\u2014", detail: { title: "Average HRV", value: "\u2014", body: "" } },
              ],
            },
          } as Partial<SleepTodayDetailVm>)}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Deep sleep");
    expect(json.match(/\u2014/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});
