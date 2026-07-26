import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepEfficiencyDetailViewModel } from "@/lib/data/sleep/buildSleepEfficiencyDetailViewModel";
import { SleepEfficiencyDetailSheet } from "@/lib/ui/sleep/SleepEfficiencyDetailSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

function baseVm(
  over: Partial<SleepEfficiencyDetailViewModel> = {},
): SleepEfficiencyDetailViewModel {
  return {
    metricId: "sleep_efficiency",
    selectedDay: "2026-05-18",
    title: "Sleep Efficiency",
    currentNormalizedPercent: 93,
    currentDisplayPercent: 93,
    currentFormatted: "93%",
    currentPresence: "present",
    guidelineResult: {
      status: "meets_guideline",
      label: "Meets typical guideline",
      thresholdPercent: 85,
      normalizedPercent: 93,
      modelId: "sleep-efficiency-guideline",
      modelVersion: "sleep-efficiency-guideline-v1",
      evidenceIds: ["nsf-sleep-quality-efficiency-2017"],
    },
    statusSentence: "Meets typical guideline",
    guideline: {
      status: "meets_guideline",
      statusLabel: "Meets typical guideline",
      belowLabel: "Below Guideline",
      meetsLabel: "Meets Guideline",
      belowRangeText: "<85%",
      meetsRangeText: "≥85%",
      zoneFractions: { below: 0.625, meets: 0.375 },
      currentMarkerPosition01: 0.825,
      currentPercentDisplay: 93,
      accessibilitySummary:
        "93 percent. The general sleep-efficiency guideline is 85 percent or higher. This result meets the typical guideline.",
    },
    sevenDay: null,
    thirtyDay: null,
    ninetyDay: null,
    pattern: {
      heading: "Your Pattern",
      sevenDay: {
        id: "7d",
        label: "7-day average",
        value: "91%",
        statusLabel: "Meets guideline",
        accessibilitySummary: "Your 7-day average is 91 percent and meets the guideline.",
      },
      thirtyDay: {
        id: "30d",
        label: "30-day average",
        value: "90%",
        statusLabel: "Meets guideline",
        accessibilitySummary: "Your 30-day average is 90 percent and meets the guideline.",
      },
      ninetyDay: {
        id: "90d",
        label: "90-day average",
        value: "89%",
        statusLabel: "Meets guideline",
        accessibilitySummary: "Your 90-day average is 89 percent and meets the guideline.",
      },
    },
    explainers: [
      { heading: "What it measures", body: "Sleep efficiency is the percentage of your time in bed that your wearable estimated you were asleep." },
      { heading: "How to understand it", body: "An efficiency of about 85% or higher is commonly used as a general sleep-quality guideline." },
      { heading: "What can help", body: "Give yourself enough time to sleep." },
    ],
    dataAccuracyBody:
      "This is your wearable’s reported sleep-efficiency estimate. Wearable estimates may differ from a clinical sleep study and may change after synchronization.",
    dataAccuracyContextLine: null,
    sourceLine: null,
    historyStatus: "ready",
    historyErrorMessage: null,
    canRetryHistory: false,
    isHistoryLoading: false,
    accessibilitySummary:
      "Sleep Efficiency. 93 percent. Meets typical guideline. The general sleep-efficiency guideline is 85 percent or higher.",
    ...over,
  };
}

describe("SleepEfficiencyDetailSheet", () => {
  it("renders hero, guideline bar, pattern, education, and Done", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepEfficiencyDetailSheet visible onClose={() => undefined} vm={baseVm()} />,
      );
    });
    const sheet = tree.root.findByProps({ testID: "sleep-efficiency-detail-sheet" });
    expect(sheet.props.visible).toBe(true);
    expect(tree.root.findByProps({ testID: "sleep-efficiency-guideline" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-efficiency-pattern-7d" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-efficiency-detail-sheet-done" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-efficiency-detail-sheet-close" })).toBeDefined();

    const flat = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children))
      .join("|");
    expect(flat).toContain("93%");
    expect(flat).toContain("Meets typical guideline");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("What it measures");
    expect(flat).toContain("Data & accuracy");
    expect(flat).not.toMatch(/Optimal|Good|Fair|Elite|Insomnia|sourceDocumentId|evidenceIds/);
    expect(flat).not.toMatch(/\d+ of \d+ nights/);
  });

  it("shows history retry on error and skeletons while loading", () => {
    const onRetry = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepEfficiencyDetailSheet
          visible
          onClose={() => undefined}
          onRetryHistory={onRetry}
          vm={baseVm({
            pattern: null,
            historyStatus: "error",
            canRetryHistory: true,
            isHistoryLoading: false,
            historyErrorMessage: "Could not load recent sleep averages.",
          })}
        />,
      );
    });
    const retry = tree.root.findByProps({ testID: "sleep-efficiency-history-retry" });
    act(() => {
      retry.props.onPress();
    });
    expect(onRetry).toHaveBeenCalled();

    act(() => {
      tree.update(
        <SleepEfficiencyDetailSheet
          visible
          onClose={() => undefined}
          vm={baseVm({
            pattern: null,
            historyStatus: "loading",
            isHistoryLoading: true,
            canRetryHistory: false,
          })}
        />,
      );
    });
    expect(
      tree.root.findByProps({ testID: "sleep-efficiency-pattern-7d-skeleton" }),
    ).toBeDefined();
  });

  it("omits guideline bar when current efficiency is unavailable", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepEfficiencyDetailSheet
          visible
          onClose={() => undefined}
          vm={baseVm({
            currentFormatted: "Not available",
            currentPresence: "absent",
            statusSentence: null,
            guideline: null,
            guidelineResult: null,
            currentNormalizedPercent: null,
            currentDisplayPercent: null,
          })}
        />,
      );
    });
    expect(() =>
      tree.root.findByProps({ testID: "sleep-efficiency-guideline" }),
    ).toThrow();
  });
});
