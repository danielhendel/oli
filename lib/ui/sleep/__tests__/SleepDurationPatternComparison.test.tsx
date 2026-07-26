import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepDurationPatternComparison } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { SleepDurationPatternComparisonView } from "@/lib/ui/sleep/SleepDurationPatternComparison";

const pattern: SleepDurationPatternComparison = {
  heading: "Your Pattern",
  today: {
    id: "today",
    label: "Today",
    value: "7h 26m",
    statusLabel: "Recommended",
    coverageLabel: null,
    emphasized: true,
    accessibilitySummary: "Today 7h 26m. Recommended.",
  },
  sevenDay: {
    id: "7d",
    label: "7-day average",
    value: "7h 27m",
    statusLabel: "Recommended",
    coverageLabel: "7 of 7 nights",
    emphasized: false,
    accessibilitySummary: "7-day average 7h 27m. 7 of 7 nights. Recommended.",
  },
  thirtyDay: {
    id: "30d",
    label: "30-day average",
    value: "Not enough data",
    statusLabel: null,
    coverageLabel: "2 of 30 nights",
    emphasized: false,
    accessibilitySummary: "30-day average Not enough data. 2 of 30 nights.",
  },
};

describe("SleepDurationPatternComparisonView", () => {
  it("renders Your Pattern rows with coverage and no YTD/chart", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SleepDurationPatternComparisonView pattern={pattern} />);
    });
    const text = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children ?? ""))
      .join("|");
    expect(text).toContain("Your Pattern");
    expect(text).toContain("Today");
    expect(text).toContain("7-day average");
    expect(text).toContain("30-day average");
    expect(text).toContain("7 of 7 nights");
    expect(text).toContain("2 of 30 nights");
    expect(text).toContain("Not enough data");
    expect(text).not.toContain("YTD");
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-today" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-7d" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-30d" })).toBeDefined();
  });
});
