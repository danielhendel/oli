import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepStageDetailViewModel } from "@/lib/data/sleep/buildSleepStageDetailViewModel";
import { SleepStageDetailSheet } from "@/lib/ui/sleep/SleepStageDetailSheet";
import {
  UI_STAGE_ADULT_CONTEXT_BELOW_TEXT,
  UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT,
} from "@/lib/ui/theme/uiTokens";

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
    adultContext: {
      status: "below_typical",
      statusLabel: "Below typical range",
      typicalPercentRangeText: "16–20% of total sleep",
      equivalentMinutesSentence: "About 1h 12m–1h 30m for this sleep duration",
      belowLabel: "Below Typical",
      typicalLabel: "Typical",
      aboveLabel: "Above Typical",
      belowRangeText: "<16%",
      typicalRangeText: "16–20%",
      aboveRangeText: ">20%",
      zoneFractions: { below: 0.4, typical: 0.2, above: 0.4 },
      markerPosition01: 0.2,
      currentMarkerPosition01: 0.2,
      currentPercentDisplay: 11,
      accessibilitySummary:
        "11 percent of total sleep. The typical range is 16 to 20 percent. This result is below the typical range.",
    },
    adultContextResult: {
      metricId: "deep_sleep",
      status: "below_typical",
      label: "Below typical range",
      lowerPercent: 16,
      upperPercent: 20,
      equivalentLowerMinutes: 72,
      equivalentUpperMinutes: 90,
      modelId: "sleep-stage-adult-context",
      modelVersion: "sleep-stage-adult-context-v1",
      evidenceIds: [
        "nsf-sleep-quality-architecture-2017",
        "adult-sleep-architecture-context",
      ],
    },
    adultContextWithheldReason: "none",
    ageYears: 30,
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
        value: "50m · 11%",
        secondaryValue: null,
        statusLabel: "Below range",
        accessibilitySummary: "7 days average 50m. 11% of total sleep. Below range.",
      },
      thirtyDay: {
        id: "30d",
        label: "30-day average",
        value: "54m · 12%",
        secondaryValue: null,
        statusLabel: "Below range",
        accessibilitySummary: "30 days average 54m. 12% of total sleep. Below range.",
      },
      ninetyDay: {
        id: "90d",
        label: "90-day average",
        value: "52m · 11%",
        secondaryValue: null,
        statusLabel: "Below range",
        accessibilitySummary: "90 days average 52m. 11% of total sleep. Below range.",
      },
    },
    explainers: [
      {
        heading: "What it measures",
        body: "Deep sleep is a stage of sleep associated with physical restoration and reduced responsiveness to the environment.",
      },
      {
        heading: "How to understand it",
        body: "Adults often spend roughly 16–20% of total sleep in deep sleep, but deep sleep changes with age and varies from night to night.",
      },
      {
        heading: "What can help",
        body: "Focus first on enough total sleep and a consistent sleep schedule.",
      },
    ],
    dataAccuracyBody:
      "Your wearable estimates sleep stages using signals such as movement and heart rate. Stage estimates may differ from a clinical sleep study.",
    dataAccuracyContextLine: null,
    sourceLine: null,
    historyStatus: "ready",
    historyErrorMessage: null,
    canRetryHistory: false,
    isHistoryLoading: false,
    accessibilitySummary:
      "Deep Sleep. 50m. 11% of total sleep. 11 percent of total sleep. The typical range is 16 to 20 percent. This result is below the typical range.",
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
  it("renders hero, percent, TYPICAL bar labels, and pattern statuses without legend or 90-day marker", () => {
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
    expect(flat).toContain("Below Typical");
    expect(flat).toContain("Typical");
    expect(flat).toContain("Above Typical");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("50m · 11%");
    expect(flat).toContain("Below range");
    expect(flat).toContain("90-day average");
    expect(flat).not.toContain("Below typical range");
    expect(flat).not.toContain("Typical Range");
    expect(flat).not.toContain("Personal context");
    // Legend "Today" must not appear; pattern rows still say "90-day average".
    expect(flat.split("|").filter((t) => t === "Today")).toHaveLength(0);
    expect(flat).not.toMatch(/TYPICAL RA|Recommended|Optimal|Good|Fair|Low/);
    expect(tree.root.findByProps({ testID: "deep-sleep-adult-context" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "deep-sleep-adult-context-marker" })).toBeDefined();
    expect(() =>
      tree.root.findByProps({ testID: "deep-sleep-adult-context-ninety-day-marker" }),
    ).toThrow();
    expect(() => tree.root.findByProps({ testID: "deep-sleep-adult-context-legend" })).toThrow();
    expect(() => tree.root.findByProps({ testID: "deep-sleep-adult-context-status" })).toThrow();
    const status7 = tree.root.findByProps({ testID: "deep-sleep-pattern-7d-status" });
    expect(status7.props.children).toBe("Below range");
    expect(status7.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: UI_STAGE_ADULT_CONTEXT_BELOW_TEXT }),
      ]),
    );
  });

  it("omits adult-context block when withheld without leaving Personal Context", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageDetailSheet
          visible
          onClose={jest.fn()}
          vm={baseVm({
            adultContext: null,
            adultContextResult: null,
            adultContextWithheldReason: "unknown_age",
            explainers: [
              {
                heading: "How to understand it",
                body: "Sleep-stage patterns change with age. Your current result and recent personal pattern are shown without a general adult-context classification.",
              },
            ],
          })}
        />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("50m");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("Below range");
    expect(flat).not.toContain("Personal context");
    expect(() => tree.root.findByProps({ testID: "deep-sleep-adult-context" })).toThrow();
  });

  it("omits percent when unavailable; shows history error with retry", () => {
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
            adultContext: null,
            adultContextResult: null,
            adultContextWithheldReason: "missing_inputs",
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
    const retry = tree.root.findByProps({ testID: "deep-sleep-history-retry" });
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
            adultContext: null,
            adultContextResult: null,
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
  it("renders REM without visible In typical range status and with pattern classification", () => {
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
            percentOfTotalSleepSentence: "30% of total sleep",
            adultContext: {
              status: "within_typical",
              statusLabel: "In typical range",
              typicalPercentRangeText: "21–30% of total sleep",
              equivalentMinutesSentence: "About 1h 35m–2h 15m for this sleep duration",
              belowLabel: "Below Typical",
              typicalLabel: "Typical",
              aboveLabel: "Above Typical",
              belowRangeText: "<21%",
              typicalRangeText: "21–30%",
              aboveRangeText: ">30%",
              zoneFractions: { below: 0.34, typical: 0.28, above: 0.38 },
              markerPosition01: 0.62,
              currentMarkerPosition01: 0.62,
              currentPercentDisplay: 30,
              accessibilitySummary:
                "30 percent of total sleep. The typical range is 21 to 30 percent. This result is in the typical range.",
            },
            pattern: {
              heading: "Your Pattern",
              sevenDay: {
                id: "7d",
                label: "7-day average",
                value: "1h 51m · 25%",
                secondaryValue: null,
                statusLabel: "In range",
                accessibilitySummary: "7 days average 1h 51m. 25% of total sleep. In range.",
              },
              thirtyDay: {
                id: "30d",
                label: "30-day average",
                value: "1h 51m · 24%",
                secondaryValue: null,
                statusLabel: "In range",
                accessibilitySummary: "30 days average 1h 51m. 24% of total sleep. In range.",
              },
              ninetyDay: {
                id: "90d",
                label: "90-day average",
                value: "1h 48m · 23%",
                secondaryValue: null,
                statusLabel: "In range",
                accessibilitySummary: "90 days average 1h 48m. 23% of total sleep. In range.",
              },
            },
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
    expect(flat).toContain("30% of total sleep");
    expect(flat).toContain("Typical");
    expect(flat).toContain("In range");
    expect(flat).toContain("1h 51m · 25%");
    expect(flat).toContain("90-day average");
    expect(flat).toContain("dreaming");
    expect(flat).not.toContain("In typical range");
    expect(flat).not.toContain("Typical Range");
    expect(flat.split("|").filter((t) => t === "Today")).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "rem-sleep-detail-sheet" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "rem-sleep-adult-context-marker" })).toBeDefined();
    expect(() =>
      tree.root.findByProps({ testID: "rem-sleep-adult-context-ninety-day-marker" }),
    ).toThrow();
    expect(() => tree.root.findByProps({ testID: "rem-sleep-adult-context-legend" })).toThrow();
    const status7 = tree.root.findByProps({ testID: "rem-sleep-pattern-7d-status" });
    expect(status7.props.children).toBe("In range");
    expect(status7.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT }),
      ]),
    );
  });
});
