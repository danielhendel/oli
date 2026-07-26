import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepDurationDetailViewModel } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { classifySleepDurationReference } from "@/lib/data/sleep/sleepDurationReference";
import { SleepDurationDetailSheet } from "@/lib/ui/sleep/SleepDurationDetailSheet";
import { UI_RECOMMENDED_RANGE_FILL } from "@/lib/ui/theme/uiTokens";

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
    pattern: {
      heading: "Your Pattern",
      today: {
        id: "today",
        label: "Today",
        value: "6h 31m",
        statusLabel: "Below Typical",
        coverageLabel: null,
        emphasized: true,
        accessibilitySummary: "Today 6h 31m. Below Typical.",
      },
      sevenDay: {
        id: "7d",
        label: "7-day average",
        value: "6h 52m",
        statusLabel: "Below Typical",
        coverageLabel: "6 of 7 nights",
        emphasized: false,
        accessibilitySummary: "7-day average 6h 52m. 6 of 7 nights. Below Typical.",
      },
      thirtyDay: {
        id: "30d",
        label: "30-day average",
        value: "7h 8m",
        statusLabel: "Recommended",
        coverageLabel: "27 of 30 nights",
        emphasized: false,
        accessibilitySummary: "30-day average 7h 8m. 27 of 30 nights. Recommended.",
      },
    },
    explainers: [
      {
        heading: "What it measures",
        body: "Sleep duration is the total time you were asleep during your main sleep period. It is different from time in bed, which can include time spent awake.",
      },
      {
        heading: "How to understand it",
        body: "Most adults need about 7–9 hours. Compare tonight with your 7- and 30-day averages to see whether it was one unusual night or part of your usual pattern.",
      },
      {
        heading: "What can help",
        body: "Protect enough time for sleep and keep your bedtime and wake time consistent. Look for patterns across several nights rather than judging one result alone.",
      },
    ],
    dataAccuracyBody:
      "Your wearable estimates sleep using signals such as movement and heart rate. Results may change after syncing and may differ from a clinical sleep study.",
    dataAccuracyContextLine: "Sleep night: 2026-05-18",
    sourceLine: null,
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
  it("renders result-first hierarchy with Your Pattern and simplified copy", () => {
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
    expect(flat).toContain("Below Typical");
    expect(flat).not.toContain("Below recommended");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("Today");
    expect(flat).toContain("7-day average");
    expect(flat).toContain("30-day average");
    expect(flat).toContain("6 of 7 nights");
    expect(flat).toContain("27 of 30 nights");
    expect(flat).toContain("What it measures");
    expect(flat).toContain("What can help");
    expect(flat).toContain("main sleep period");
    expect(flat).toContain("Data & accuracy");
    expect(flat).not.toContain("YTD");
    expect(flat).not.toMatch(/Optimal|Good|Fair|Low/);
    expect(flat).not.toMatch(/Canonical SleepNight|mainSleepMinutes|totalSleepMinutes/i);

    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-today" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-7d" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-30d" })).toBeDefined();

    const recommended = tree.root.findByProps({
      testID: "sleep-duration-reference-bar-recommended-zone",
    });
    const recStyle = Array.isArray(recommended.props.style)
      ? Object.assign({}, ...recommended.props.style.filter(Boolean))
      : recommended.props.style;
    expect(recStyle.backgroundColor).toBe(UI_RECOMMENDED_RANGE_FILL);

    const close = tree.root.findByProps({ testID: "sleep-duration-detail-sheet-close" });
    act(() => {
      close.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows pattern skeleton while loading and retry on error", () => {
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
            pattern: null,
          })}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-today-skeleton" })).toBeDefined();

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
            pattern: null,
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
