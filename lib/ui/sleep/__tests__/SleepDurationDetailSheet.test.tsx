import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepDurationDetailViewModel } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { classifySleepDurationReference } from "@/lib/data/sleep/sleepDurationReference";
import { SleepDurationDetailSheet } from "@/lib/ui/sleep/SleepDurationDetailSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

function baseVm(over: Partial<SleepDurationDetailViewModel> = {}): SleepDurationDetailViewModel {
  const rangeResult = classifySleepDurationReference({ durationMinutes: 391, ageYears: 30 });
  return {
    metricId: "sleep_duration",
    selectedDay: "2026-05-18",
    title: "Duration",
    currentValueMinutes: 391,
    currentFormatted: "6h 31m",
    currentPresence: "present",
    rangeResult,
    rangeModelVersion: rangeResult?.modelVersion ?? null,
    statusSentence: "29 min below the recommended range.",
    ageYears: 30,
    rangeWithheldReason: "none",
    sevenDay: {
      window: "7d",
      averageMinutes: 412,
      formattedAverage: "6h 52m",
      validNightCount: 6,
      expectedNightCount: 7,
      hasEnoughData: true,
      coverageLabel: "6 of 7 nights",
      displayValue: "6h 52m",
      accessibilitySummary: "7 days average 6h 52m, based on 6 of 7 nights.",
    },
    thirtyDay: {
      window: "30d",
      averageMinutes: 428,
      formattedAverage: "7h 8m",
      validNightCount: 27,
      expectedNightCount: 30,
      hasEnoughData: true,
      coverageLabel: "27 of 30 nights",
      displayValue: "7h 8m",
      accessibilitySummary: "30 days average 7h 8m, based on 27 of 30 nights.",
    },
    explainers: [
      { heading: "What it measures", body: "Estimated time asleep." },
      { heading: "How to understand it", body: "Patterns give context." },
    ],
    dataAccuracyBody: "Wearable estimate.",
    dataAccuracyContextLine: "Sleep night: 2026-05-18",
    sourceLine: "Canonical SleepNight duration (main sleep when present).",
    historyStatus: "ready",
    historyErrorMessage: null,
    canRetryHistory: false,
    isHistoryLoading: false,
    accessibilitySummary: "Sleep Duration 6h 31m.",
    ...over,
  };
}

function allText(root: renderer.ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => {
      const ch = t.props.children;
      if (typeof ch === "string") return ch;
      if (Array.isArray(ch)) return ch.filter((x): x is string => typeof x === "string").join("");
      return "";
    })
    .join("|");
}

describe("SleepDurationDetailSheet", () => {
  it("renders hero, averages, explainers, close and done", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepDurationDetailSheet visible onClose={onClose} vm={baseVm()} />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("Duration");
    expect(flat).toContain("6h 31m");
    expect(flat).toContain("29 min below the recommended range.");
    expect(flat).toContain("6h 52m");
    expect(flat).toContain("6 of 7 nights");
    expect(flat).toContain("27 of 30 nights");
    expect(flat).toContain("What it measures");
    expect(flat).toContain("Data & accuracy");
    expect(flat).not.toContain("YTD");
    expect(flat).not.toMatch(/Optimal|Good|Fair|Low/);

    const shell = tree.root.findByProps({ testID: "sleep-duration-detail-sheet" });
    expect(shell.props.visible).toBe(true);

    const close = tree.root.findByProps({ testID: "sleep-duration-detail-sheet-close" });
    expect(close.props.accessibilityLabel).toBe("Close");
    act(() => {
      close.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();

    const done = tree.root.findByProps({ testID: "sleep-duration-detail-sheet-done" });
    expect(done.props.accessibilityLabel).toBe("Done");
  });

  it("shows history skeleton while loading and retry on error", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepDurationDetailSheet
          visible
          onClose={jest.fn()}
          vm={baseVm({
            isHistoryLoading: true,
            historyStatus: "loading",
            sevenDay: null,
            thirtyDay: null,
          })}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "sleep-duration-averages-7d-skeleton" })).toBeDefined();

    const onRetry = jest.fn();
    act(() => {
      tree.update(
        <SleepDurationDetailSheet
          visible
          onClose={jest.fn()}
          onRetryHistory={onRetry}
          vm={baseVm({
            isHistoryLoading: false,
            historyStatus: "error",
            canRetryHistory: true,
            historyErrorMessage: "Could not load recent sleep averages.",
            sevenDay: null,
            thirtyDay: null,
          })}
        />,
      );
    });
    const retry = tree.root.findByProps({ testID: "sleep-duration-history-retry" });
    act(() => {
      retry.props.onPress();
    });
    expect(onRetry).toHaveBeenCalled();
  });

  it("omits range bar when range withheld", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepDurationDetailSheet
          visible
          onClose={jest.fn()}
          vm={baseVm({
            rangeResult: null,
            statusSentence: null,
            rangeWithheldReason: "unknown_age",
          })}
        />,
      );
    });
    expect(() => tree.root.findByProps({ testID: "sleep-duration-reference-bar" })).toThrow();
  });
});
