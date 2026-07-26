import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepStageDetailViewModel } from "@/lib/data/sleep/buildSleepStageDetailViewModel";
import { SleepStageDetailSheet } from "@/lib/ui/sleep/SleepStageDetailSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

function baseVm(over: Partial<SleepStageDetailViewModel> = {}): SleepStageDetailViewModel {
  return {
    metricId: "deep_sleep",
    selectedDay: "2026-05-18",
    title: "Deep Sleep",
    currentValueMinutes: 50,
    currentFormatted: "50m",
    currentPresence: "present",
    percentOfTotalSleepSentence: "11% of total sleep",
    currentPercentDisplay: 11,
    personalComparison: {
      heading: "Personal context",
      currentFormatted: "50m",
      baselineFormatted: "52m",
      baselineLabel: "90-day average",
      differenceMinutes: -2,
      differenceSentence: "2m below your recent average",
      accessibilitySummary:
        "Current 50m. Your 90-day average is 52m. This result is 2m below your recent average.",
    },
    sevenDay: {
      window: "7d",
      averageMinutes: 50,
      formattedAverage: "50m",
      averagePercent: 11,
      formattedAveragePercent: "11% of total sleep",
      validNightCount: 6,
      validPercentNightCount: 6,
      expectedNightCount: 7,
      minimumRequiredNightCount: 3,
      hasEnoughData: true,
      hasEnoughPercentData: true,
      coverageLabel: "6 of 7 nights",
      displayValue: "50m",
      displayPercentValue: "11% of total sleep",
      accessibilitySummary: "7 days average 50m. 11% of total sleep.",
    },
    thirtyDay: {
      window: "30d",
      averageMinutes: 54,
      formattedAverage: "54m",
      averagePercent: 12,
      formattedAveragePercent: "12% of total sleep",
      validNightCount: 27,
      validPercentNightCount: 27,
      expectedNightCount: 30,
      minimumRequiredNightCount: 10,
      hasEnoughData: true,
      hasEnoughPercentData: true,
      coverageLabel: "27 of 30 nights",
      displayValue: "54m",
      displayPercentValue: "12% of total sleep",
      accessibilitySummary: "30 days average 54m. 12% of total sleep.",
    },
    ninetyDay: {
      window: "90d",
      averageMinutes: 52,
      formattedAverage: "52m",
      averagePercent: 11,
      formattedAveragePercent: "11% of total sleep",
      validNightCount: 80,
      validPercentNightCount: 80,
      expectedNightCount: 90,
      minimumRequiredNightCount: 30,
      hasEnoughData: true,
      hasEnoughPercentData: true,
      coverageLabel: "80 of 90 nights",
      displayValue: "52m",
      displayPercentValue: "11% of total sleep",
      accessibilitySummary: "90 days average 52m. 11% of total sleep.",
    },
    pattern: {
      heading: "Your Pattern",
      sevenDay: {
        id: "7d",
        label: "7-day average",
        value: "50m",
        secondaryValue: "11% of total sleep",
        accessibilitySummary: "7 days average 50m. 11% of total sleep.",
      },
      thirtyDay: {
        id: "30d",
        label: "30-day average",
        value: "54m",
        secondaryValue: "12% of total sleep",
        accessibilitySummary: "30 days average 54m. 12% of total sleep.",
      },
      ninetyDay: {
        id: "90d",
        label: "90-day average",
        value: "52m",
        secondaryValue: "11% of total sleep",
        accessibilitySummary: "90 days average 52m. 11% of total sleep.",
      },
    },
    explainers: [
      {
        heading: "What it measures",
        body: "Deep sleep is a stage of sleep associated with physical restoration and reduced responsiveness to the environment.",
      },
      {
        heading: "How to understand it",
        body: "Deep sleep naturally varies from night to night and often changes with age.",
      },
      {
        heading: "What can help",
        body: "A consistent sleep schedule, enough total sleep time, regular activity, and limiting late alcohol may support healthier sleep patterns.",
      },
    ],
    dataAccuracyBody:
      "Your wearable estimates sleep stages from signals such as movement and heart rate. Stage estimates may differ from a clinical sleep study.",
    dataAccuracyContextLine: null,
    sourceLine: null,
    historyStatus: "ready",
    historyErrorMessage: null,
    canRetryHistory: false,
    isHistoryLoading: false,
    accessibilitySummary: "Deep Sleep. 50m. 11% of total sleep.",
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

describe("SleepStageDetailSheet — Deep", () => {
  it("renders hero, percent, personal context, pattern, and education without population status", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageDetailSheet visible onClose={onClose} vm={baseVm()} />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("Deep Sleep");
    expect(flat).toContain("50m");
    expect(flat).toContain("11% of total sleep");
    expect(flat).toContain("Personal context");
    expect(flat).toContain("2m below your recent average");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("7-day average");
    expect(flat).toContain("30-day average");
    expect(flat).toContain("90-day average");
    expect(flat).toContain("What it measures");
    expect(flat).toContain("clinical sleep study");
    expect(flat).not.toMatch(
      /\bIn range\b|\bOptimal\b|\bGood\b|\bFair\b|\bLow\b|\bBelow Typical\b|sourceDocumentId|SleepNight/,
    );
    expect(tree.root.findByProps({ testID: "deep-sleep-detail-sheet" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "deep-sleep-personal-baseline" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "deep-sleep-pattern-7d-percent" }).props.children).toBe(
      "11% of total sleep",
    );
  });

  it("omits percent and personal rail when unavailable; shows history error with retry", () => {
    const onRetry = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageDetailSheet
          visible
          onClose={jest.fn()}
          onRetryHistory={onRetry}
          vm={baseVm({
            percentOfTotalSleepSentence: null,
            personalComparison: null,
            ninetyDay: null,
            pattern: null,
            historyStatus: "error",
            canRetryHistory: true,
            isHistoryLoading: false,
            historyErrorMessage: "Could not load recent sleep averages.",
          })}
        />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("50m");
    expect(flat).not.toContain("11% of total sleep");
    expect(() => tree.root.findByProps({ testID: "deep-sleep-personal-baseline" })).toThrow();
    const retry = tree.root.findByProps({ testID: "deep-sleep-history-retry" });
    expect(retry.props.style).toBeDefined();
    act(() => {
      retry.props.onPress();
    });
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows pattern skeleton while history loads", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageDetailSheet
          visible
          onClose={jest.fn()}
          vm={baseVm({
            isHistoryLoading: true,
            historyStatus: "loading",
            pattern: null,
            personalComparison: null,
            ninetyDay: null,
          })}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "deep-sleep-pattern-7d-skeleton" })).toBeDefined();
  });

  it("Done and backdrop close", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageDetailSheet visible onClose={onClose} vm={baseVm()} />,
      );
    });
    const done = tree.root.findByProps({ testID: "deep-sleep-detail-sheet-done" });
    act(() => {
      done.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
    const backdrop = tree.root.findByProps({ testID: "deep-sleep-detail-sheet-backdrop" });
    act(() => {
      backdrop.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("SleepStageDetailSheet — REM", () => {
  it("renders REM-specific title and copy test ids", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageDetailSheet
          visible
          onClose={jest.fn()}
          vm={baseVm({
            metricId: "rem_sleep",
            title: "REM Sleep",
            currentFormatted: "2h 12m",
            currentValueMinutes: 132,
            percentOfTotalSleepSentence: "29% of total sleep",
            explainers: [
              {
                heading: "What it measures",
                body: "REM sleep is a stage linked with dreaming, memory processing, learning, and emotional regulation.",
              },
            ],
          })}
        />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("REM Sleep");
    expect(flat).toContain("2h 12m");
    expect(flat).toContain("29% of total sleep");
    expect(flat).toContain("dreaming");
    expect(tree.root.findByProps({ testID: "rem-sleep-detail-sheet" })).toBeDefined();
  });
});
