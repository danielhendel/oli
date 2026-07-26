import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepDurationDetailViewModel } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { classifySleepDurationReference } from "@/lib/data/sleep/sleepDurationReference";
import { SleepDurationDetailSheet } from "@/lib/ui/sleep/SleepDurationDetailSheet";
import {
  METRIC_DETAIL_SECTION_BREAK,
  METRIC_DETAIL_SECTION_HEADING_GAP,
} from "@/lib/ui/common/metricDetailShellLayout";
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
      minimumRequiredNightCount: 3,
      hasEnoughData: true,
      coverageLabel: "6 of 7 nights",
      displayValue: "6h 52m",
      accessibilitySummary: "7 days average 6h 52m.",
    },
    thirtyDay: {
      window: "30d",
      averageMinutes: 428,
      formattedAverage: "7h 8m",
      validNightCount: 27,
      expectedNightCount: 30,
      minimumRequiredNightCount: 10,
      hasEnoughData: true,
      coverageLabel: "27 of 30 nights",
      displayValue: "7h 8m",
      accessibilitySummary: "30 days average 7h 8m.",
    },
    ninetyDay: {
      window: "90d",
      averageMinutes: 430,
      formattedAverage: "7h 10m",
      validNightCount: 80,
      expectedNightCount: 90,
      minimumRequiredNightCount: 30,
      hasEnoughData: true,
      coverageLabel: "80 of 90 nights",
      displayValue: "7h 10m",
      accessibilitySummary: "90 days average 7h 10m.",
    },
    pattern: {
      heading: "Your Pattern",
      sevenDay: {
        id: "7d",
        label: "7-day average",
        value: "6h 52m",
        statusLabel: "Below Typical",
        accessibilitySummary: "7-day average 6h 52m. Below Typical.",
      },
      thirtyDay: {
        id: "30d",
        label: "30-day average",
        value: "7h 8m",
        statusLabel: "In range",
        accessibilitySummary: "30-day average 7h 8m. In range.",
      },
      ninetyDay: {
        id: "90d",
        label: "90-day average",
        value: "7h 10m",
        statusLabel: "In range",
        accessibilitySummary: "90-day average 7h 10m. In range.",
      },
    },
    explainers: [
      {
        heading: "What it measures",
        body: "Sleep duration is the total time you were asleep during your main sleep period. It is different from time in bed, which can include time spent awake.",
      },
      {
        heading: "How to understand it",
        body: "Most adults need about 7–9 hours. Compare your recent averages to see whether this result was unusual or part of your normal pattern.",
      },
      {
        heading: "What can help",
        body: "Protect enough time for sleep and keep your bedtime and wake time consistent. Look for patterns across several nights rather than judging one result alone.",
      },
    ],
    dataAccuracyBody:
      "Your wearable estimates sleep using signals such as movement and heart rate. Results may change after syncing and may differ from a clinical sleep study.",
    dataAccuracyContextLine: null,
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
  it("renders 7/30/90 pattern without Today, coverage, or technical metadata", () => {
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
    expect(flat).toContain("In range");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("7-day average");
    expect(flat).toContain("30-day average");
    expect(flat).toContain("90-day average");
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-30d-status" }).props.children).toBe(
      "In range",
    );
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-90d-status" }).props.children).toBe(
      "In range",
    );
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-7d-status" }).props.children).toBe(
      "Below Typical",
    );
    expect(flat).toContain("Recommended");
    expect(flat).not.toContain("Today");
    expect(flat).not.toContain("7 of 7 nights");
    expect(flat).not.toContain("30 of 30 nights");
    expect(flat).not.toContain("90 of 90 nights");
    expect(flat).not.toMatch(/Sleep night:|Updated |Canonical SleepNight|mainSleepMinutes/i);
    expect(flat).toContain("What can help");
    expect(flat).toContain("Compare your recent averages");
    expect(flat).not.toContain("YTD");

    expect(() => tree.root.findByProps({ testID: "sleep-duration-pattern-today" })).toThrow();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-7d" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-30d" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-90d" })).toBeDefined();

    const pattern = tree.root.findByProps({ testID: "sleep-duration-pattern" });
    const patternStyle = Array.isArray(pattern.props.style)
      ? Object.assign({}, ...pattern.props.style.filter(Boolean))
      : pattern.props.style;
    expect(patternStyle.marginTop).toBe(METRIC_DETAIL_SECTION_BREAK);
    expect(patternStyle.gap).toBe(METRIC_DETAIL_SECTION_HEADING_GAP);

    const recommended = tree.root.findByProps({
      testID: "sleep-duration-reference-bar-recommended-zone",
    });
    const recStyle = Array.isArray(recommended.props.style)
      ? Object.assign({}, ...recommended.props.style.filter(Boolean))
      : recommended.props.style;
    expect(recStyle.backgroundColor).toBe(UI_RECOMMENDED_RANGE_FILL);

    act(() => {
      tree.root.findByProps({ testID: "sleep-duration-detail-sheet-close" }).props.onPress();
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
            ninetyDay: null,
            pattern: null,
          })}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-7d-skeleton" })).toBeDefined();

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
            ninetyDay: null,
            pattern: null,
          })}
        />,
      );
    });
    act(() => {
      tree.root.findByProps({ testID: "sleep-duration-history-retry" }).props.onPress();
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

  it("keeps range-bar Recommended heading and hero sentence while pattern uses In range", () => {
    const rangeResult = classifySleepDurationReference({ durationMinutes: 450, ageYears: 30 });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepDurationDetailSheet
          visible
          onClose={jest.fn()}
          vm={baseVm({
            currentValueMinutes: 450,
            currentFormatted: "7h 30m",
            rangeResult,
            rangeModelVersion: rangeResult?.modelVersion ?? null,
            statusSentence: "Within the recommended range.",
            pattern: {
              heading: "Your Pattern",
              sevenDay: {
                id: "7d",
                label: "7-day average",
                value: "7h 27m",
                statusLabel: "In range",
                accessibilitySummary: "7-day average 7h 27m. In range.",
              },
              thirtyDay: {
                id: "30d",
                label: "30-day average",
                value: "7h 43m",
                statusLabel: "In range",
                accessibilitySummary: "30-day average 7h 43m. In range.",
              },
              ninetyDay: {
                id: "90d",
                label: "90-day average",
                value: "7h 40m",
                statusLabel: "In range",
                accessibilitySummary: "90-day average 7h 40m. In range.",
              },
            },
          })}
        />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("Within the recommended range.");
    expect(flat).toContain("Recommended");
    expect(flat).toContain("In range");
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-7d-status" }).props.children).toBe(
      "In range",
    );
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-30d-status" }).props.children).toBe(
      "In range",
    );
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-90d-status" }).props.children).toBe(
      "In range",
    );
    for (const id of ["7d", "30d", "90d"] as const) {
      expect(
        tree.root.findByProps({ testID: `sleep-duration-pattern-${id}-status` }).props.children,
      ).not.toBe("Recommended");
    }
  });
});
