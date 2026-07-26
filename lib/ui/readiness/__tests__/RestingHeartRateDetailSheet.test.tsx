import React, { act } from "react";
import { Text } from "react-native";
import renderer, { type ReactTestInstance } from "react-test-renderer";

import type { RestingHeartRateDetailViewModel } from "@/lib/data/readiness/buildRestingHeartRateDetailViewModel";
import { RestingHeartRateDetailSheet } from "@/lib/ui/readiness/RestingHeartRateDetailSheet";

const mockOnClose = jest.fn();

function allVisibleText(root: ReactTestInstance): string {
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

function baseVm(
  over: Partial<RestingHeartRateDetailViewModel> = {},
): RestingHeartRateDetailViewModel {
  return {
    metricId: "resting_heart_rate",
    selectedDay: "2026-05-18",
    title: "Resting Heart Rate",
    currentBpm: 49,
    currentDisplayBpm: 49,
    currentFormatted: "49 bpm",
    currentPresence: "present",
    isBuildingBaseline: false,
    personalRangeResult: {
      status: "in_usual",
      label: "In your usual range",
      lowerBoundBpm: 48,
      upperBoundBpm: 54,
      medianBpm: 51,
      validSampleCount: 40,
      modelId: "resting-heart-rate-personal-range",
      modelVersion: "resting-heart-rate-personal-range-v1",
    },
    personalRangeBounds: {
      lowerBoundBpm: 48,
      upperBoundBpm: 54,
      medianBpm: 51,
      validSampleCount: 40,
      modelId: "resting-heart-rate-personal-range",
      modelVersion: "resting-heart-rate-personal-range-v1",
    },
    statusSentence: "In your usual range",
    personalRange: {
      status: "in_usual",
      statusLabel: "In your usual range",
      belowLabel: "Below Usual",
      usualLabel: "Your Usual",
      aboveLabel: "Above Usual",
      belowRangeText: "<48 bpm",
      usualRangeText: "48–54 bpm",
      aboveRangeText: ">54 bpm",
      zoneFractions: { below: 0.3, usual: 0.4, above: 0.3 },
      currentMarkerPosition01: 0.4,
      currentDisplayBpm: 49,
      accessibilitySummary: "49 beats per minute. This is in your usual range.",
    },
    sevenDay: null,
    thirtyDay: null,
    ninetyDay: null,
    pattern: {
      heading: "Your Pattern",
      sevenDay: {
        id: "7d",
        label: "7-day average",
        value: "50 bpm",
        statusLabel: "In usual range",
        accessibilitySummary: "Your 7-day average is 50 beats per minute and is in your usual range.",
      },
      thirtyDay: {
        id: "30d",
        label: "30-day average",
        value: "51 bpm",
        statusLabel: "In usual range",
        accessibilitySummary: "Your 30-day average is 51 beats per minute and is in your usual range.",
      },
      ninetyDay: {
        id: "90d",
        label: "90-day average",
        value: "52 bpm",
        statusLabel: "In usual range",
        accessibilitySummary: "Your 90-day average is 52 beats per minute and is in your usual range.",
      },
    },
    explainers: [
      { heading: "What it measures", body: "Overnight lowest heart rate." },
      { heading: "How to understand it", body: "Compare with your pattern." },
      { heading: "What can help", body: "Look for repeated patterns." },
    ],
    dataAccuracyBody: "Wearable overnight estimate.",
    dataAccuracyContextLine: null,
    sourceLine: null,
    historyStatus: "ready",
    historyErrorMessage: null,
    canRetryHistory: false,
    isHistoryLoading: false,
    accessibilitySummary: "Resting Heart Rate. 49 beats per minute.",
    ...over,
  };
}

describe("RestingHeartRateDetailSheet", () => {
  beforeEach(() => {
    mockOnClose.mockReset();
  });

  it("renders hero, personal range, pattern, and education", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <RestingHeartRateDetailSheet visible onClose={mockOnClose} vm={baseVm()} />,
      );
    });
    const flat = allVisibleText(root.root);
    expect(flat).toContain("Resting Heart Rate");
    expect(flat).toContain("49 bpm");
    expect(flat).toContain("In your usual range");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("7-day average");
    expect(flat).toContain("What it measures");
    expect(flat).not.toMatch(/Optimal|bradycardia|modelVersion|lowestHeartRateBpm/);
    expect(root.root.findByProps({ testID: "resting-heart-rate-personal-range-marker" })).toBeDefined();
  });

  it("omits bar while building baseline and shows history error retry", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <RestingHeartRateDetailSheet
          visible
          onClose={mockOnClose}
          vm={baseVm({
            isBuildingBaseline: true,
            statusSentence: "Building your usual range",
            personalRange: null,
            personalRangeResult: null,
            historyStatus: "error",
            historyErrorMessage: "Could not load recent heart-rate averages.",
            canRetryHistory: true,
            isHistoryLoading: false,
            pattern: null,
          })}
          onRetryHistory={jest.fn()}
        />,
      );
    });
    expect(allVisibleText(root.root)).toContain("Building your usual range");
    expect(() =>
      root.root.findByProps({ testID: "resting-heart-rate-personal-range-marker" }),
    ).toThrow();
    expect(root.root.findByProps({ testID: "resting-heart-rate-history-retry" })).toBeDefined();
  });
});
