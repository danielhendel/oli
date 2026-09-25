import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import { WeightRangeSelector } from "@/lib/ui/WeightRangeSelector";
import {
  bodySegmentedControlStyles,
  bodyWeightRangeSelectorStyles,
} from "@/lib/ui/body/bodySegmentedControlChrome";
import * as fs from "node:fs";
import * as path from "node:path";

const RANGE_KEYS = ["7D", "30D", "90D", "6M", "1Y", "3Y", "5Y", "All"] as const;

describe("bodyWeightRangeSelectorStyles", () => {
  it("is taller than the card toggle with larger type and >=44 touch height", () => {
    expect(bodyWeightRangeSelectorStyles.track.minHeight).toBeGreaterThanOrEqual(56);
    expect(bodyWeightRangeSelectorStyles.track.minHeight).toBeLessThanOrEqual(60);
    expect(bodyWeightRangeSelectorStyles.track.padding).toBeGreaterThanOrEqual(2);
    expect(bodyWeightRangeSelectorStyles.track.padding).toBeLessThanOrEqual(4);
    expect(bodyWeightRangeSelectorStyles.segment.minHeight).toBeGreaterThanOrEqual(44);
    expect(bodyWeightRangeSelectorStyles.text.fontSize).toBeGreaterThanOrEqual(16);
    expect(bodyWeightRangeSelectorStyles.text.fontSize).toBeLessThanOrEqual(17);
    expect(bodyWeightRangeSelectorStyles.segmentActive.backgroundColor).toBe("#000000");
    expect(bodyWeightRangeSelectorStyles.segmentActive.backgroundColor).toBe(
      bodySegmentedControlStyles.segmentActive.backgroundColor,
    );
    // Card toggle stays compact — shared chrome unchanged for lb/BMI.
    expect(bodySegmentedControlStyles.track.minHeight).toBe(44);
    expect(bodySegmentedControlStyles.text.fontSize).toBe(13);
  });
});

describe("WeightRangeSelector", () => {
  it("renders all eight equal-width ranges with selected state and a11y labels", async () => {
    const onChange = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(WeightRangeSelector, { value: "30D", onChange }),
      );
    });

    const track = tree.root.findByProps({ testID: "weight-range-selector" });
    expect(track.props.accessibilityRole).toBe("tablist");

    for (const key of RANGE_KEYS) {
      const seg = tree.root.findByProps({ testID: `weight-range-${key}` });
      expect(seg.props.style[0].flex).toBe(1);
      expect(seg.props.accessibilityRole).toBe("tab");
      expect(seg.props.accessibilityState.selected).toBe(key === "30D");
    }

    expect(tree.root.findByProps({ testID: "weight-range-7D" }).props.accessibilityLabel).toBe(
      "7 days",
    );
    expect(tree.root.findByProps({ testID: "weight-range-All" }).props.accessibilityLabel).toBe(
      "All history",
    );

    await act(async () => {
      tree.root.findByProps({ testID: "weight-range-1Y" }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith("1Y");
  });
});

describe("Weight detail header-to-selector spacing", () => {
  it("adds breathing room below the header without changing Safe Area ownership", () => {
    const metricSrc = fs.readFileSync(
      path.join(__dirname, "../../../app/(app)/body/metric/[metric].tsx"),
      "utf8",
    );
    expect(metricSrc).toMatch(/paddingTop:\s*16/);
    expect(metricSrc).not.toMatch(/paddingTop:\s*4,/);
    expect(metricSrc).toContain("Header owns top Safe Area");
  });
});
