import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import { SleepEfficiencyGuidelineBar } from "@/lib/ui/sleep/SleepEfficiencyGuidelineBar";
import {
  UI_SLEEP_EFFICIENCY_BELOW_FILL,
  UI_SLEEP_EFFICIENCY_MEETS_FILL,
} from "@/lib/ui/theme/uiTokens";

const baseProps = {
  belowLabel: "Below Guideline",
  meetsLabel: "Meets Guideline",
  belowRangeText: "<85%",
  meetsRangeText: "≥85%",
  zoneFractions: { below: 0.625, meets: 0.375 },
  currentMarkerPosition01: 0.825,
  accessibilitySummary:
    "93 percent. The general sleep-efficiency guideline is 85 percent or higher. This result meets the typical guideline.",
};

describe("SleepEfficiencyGuidelineBar", () => {
  it("renders two zones, one marker, and no Above/legend/red semantics", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SleepEfficiencyGuidelineBar {...baseProps} />);
    });

    const flat = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children))
      .join("|");
    expect(flat).toContain("Below Guideline");
    expect(flat).toContain("Meets Guideline");
    expect(flat).toContain("<85%");
    expect(flat).toContain("≥85%");
    expect(flat).not.toContain("Above");
    expect(flat).not.toContain("Typical");
    expect(flat).not.toContain("Optimal");
    expect(flat).not.toContain("Today");
    expect(flat).not.toContain("90-day");

    const meets = tree.root.findByProps({ testID: "sleep-efficiency-guideline-meets-zone" });
    const below = tree.root.findByProps({ testID: "sleep-efficiency-guideline-below-zone" });
    expect(meets.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_SLEEP_EFFICIENCY_MEETS_FILL }),
      ]),
    );
    expect(below.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_SLEEP_EFFICIENCY_BELOW_FILL }),
      ]),
    );
    expect(tree.root.findByProps({ testID: "sleep-efficiency-guideline-marker" })).toBeDefined();
    expect(() =>
      tree.root.findByProps({ testID: "sleep-efficiency-guideline-ninety-day-marker" }),
    ).toThrow();
    expect(() => tree.root.findByProps({ testID: "sleep-efficiency-guideline-legend" })).toThrow();
    expect(() =>
      tree.root.findByProps({ testID: "sleep-efficiency-guideline-above-zone" }),
    ).toThrow();

    const bar = tree.root.findByProps({ testID: "sleep-efficiency-guideline-bar" });
    expect(bar.props.accessibilityLabel).toContain("85 percent or higher");
    expect(bar.props.accessibilityLabel).not.toMatch(/Optimal|Good|Fair|color|red/i);
  });
});
