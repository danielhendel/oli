import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import type { SleepDurationPatternComparison } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import { SleepDurationPatternComparisonView } from "@/lib/ui/sleep/SleepDurationPatternComparison";
import {
  METRIC_DETAIL_SECTION_BREAK,
  METRIC_DETAIL_SECTION_HEADING_GAP,
} from "@/lib/ui/common/metricDetailShellLayout";
import {
  UI_DURATION_STATUS_ABOVE_TYPICAL_TEXT,
  UI_DURATION_STATUS_BELOW_TYPICAL_TEXT,
  UI_DURATION_STATUS_RECOMMENDED_TEXT,
} from "@/lib/ui/theme/uiTokens";

const pattern: SleepDurationPatternComparison = {
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
    value: "7h 27m",
    statusLabel: "Recommended",
    accessibilitySummary: "30-day average 7h 27m. Recommended.",
  },
  ninetyDay: {
    id: "90d",
    label: "90-day average",
    value: "9h 20m",
    statusLabel: "Above Typical",
    accessibilitySummary: "90-day average 9h 20m. Above Typical.",
  },
};

function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.filter(Boolean));
  return (style as Record<string, unknown>) ?? {};
}

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
    expect(text).not.toContain("Today");
    expect(text).not.toContain("7 of 7 nights");
    expect(text).not.toContain("YTD");
    expect(() => tree.root.findByProps({ testID: "sleep-duration-pattern-today" })).toThrow();

    const wrap = tree.root.findByProps({ testID: "sleep-duration-pattern" });
    const flat = flatStyle(wrap.props.style);
    expect(flat.marginTop).toBe(METRIC_DETAIL_SECTION_BREAK);
    expect(flat.gap).toBe(METRIC_DETAIL_SECTION_HEADING_GAP);
  });

  it("color-codes Recommended / Below Typical / Above Typical status text", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SleepDurationPatternComparisonView pattern={pattern} />);
    });

    const below = flatStyle(
      tree.root.findByProps({ testID: "sleep-duration-pattern-7d-status" }).props.style,
    );
    const recommended = flatStyle(
      tree.root.findByProps({ testID: "sleep-duration-pattern-30d-status" }).props.style,
    );
    const above = flatStyle(
      tree.root.findByProps({ testID: "sleep-duration-pattern-90d-status" }).props.style,
    );

    expect(below.color).toBe(UI_DURATION_STATUS_BELOW_TYPICAL_TEXT);
    expect(recommended.color).toBe(UI_DURATION_STATUS_RECOMMENDED_TEXT);
    expect(above.color).toBe(UI_DURATION_STATUS_ABOVE_TYPICAL_TEXT);
    expect(recommended.color).not.toBe(below.color);
  });

  it("omits status styling when statusLabel is null (insufficient data)", () => {
    const insufficient: SleepDurationPatternComparison = {
      heading: "Your Pattern",
      sevenDay: {
        id: "7d",
        label: "7-day average",
        value: "Not enough data",
        statusLabel: null,
        accessibilitySummary: "7-day average Not enough data.",
      },
      thirtyDay: {
        id: "30d",
        label: "30-day average",
        value: "Not enough data",
        statusLabel: null,
        accessibilitySummary: "30-day average Not enough data.",
      },
      ninetyDay: {
        id: "90d",
        label: "90-day average",
        value: "Not enough data",
        statusLabel: null,
        accessibilitySummary: "90-day average Not enough data.",
      },
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SleepDurationPatternComparisonView pattern={insufficient} />);
    });
    expect(() => tree.root.findByProps({ testID: "sleep-duration-pattern-7d-status" })).toThrow();
    expect(() => tree.root.findByProps({ testID: "sleep-duration-pattern-30d-status" })).toThrow();
    expect(() => tree.root.findByProps({ testID: "sleep-duration-pattern-90d-status" })).toThrow();
  });
});
