import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepDurationPatternComparison } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { SleepDurationPatternComparisonView } from "@/lib/ui/sleep/SleepDurationPatternComparison";
import {
  METRIC_DETAIL_SECTION_BREAK,
  METRIC_DETAIL_SECTION_HEADING_GAP,
} from "@/lib/ui/common/metricDetailShellLayout";

const pattern: SleepDurationPatternComparison = {
  heading: "Your Pattern",
  sevenDay: {
    id: "7d",
    label: "7-day average",
    value: "7h 27m",
    statusLabel: "Recommended",
    accessibilitySummary: "7-day average 7h 27m. Recommended.",
  },
  thirtyDay: {
    id: "30d",
    label: "30-day average",
    value: "7h 43m",
    statusLabel: "Recommended",
    accessibilitySummary: "30-day average 7h 43m. Recommended.",
  },
  ninetyDay: {
    id: "90d",
    label: "90-day average",
    value: "Not enough data",
    statusLabel: null,
    accessibilitySummary: "90-day average Not enough data.",
  },
};

describe("SleepDurationPatternComparisonView", () => {
  it("renders 7/30/90 without Today or coverage subtext", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SleepDurationPatternComparisonView pattern={pattern} />);
    });
    const text = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children ?? ""))
      .join("|");
    expect(text).toContain("Your Pattern");
    expect(text).toContain("7-day average");
    expect(text).toContain("30-day average");
    expect(text).toContain("90-day average");
    expect(text).toContain("Not enough data");
    expect(text).not.toContain("Today");
    expect(text).not.toContain("7 of 7 nights");
    expect(text).not.toContain("30 of 30 nights");
    expect(text).not.toContain("90 of 90 nights");
    expect(text).not.toContain("YTD");
    expect(() => tree.root.findByProps({ testID: "sleep-duration-pattern-today" })).toThrow();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-7d" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-30d" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "sleep-duration-pattern-90d" })).toBeDefined();

    const wrap = tree.root.findByProps({ testID: "sleep-duration-pattern" });
    const flat = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.filter(Boolean))
      : wrap.props.style;
    expect(flat.marginTop).toBe(METRIC_DETAIL_SECTION_BREAK);
    expect(flat.gap).toBe(METRIC_DETAIL_SECTION_HEADING_GAP);
  });
});
