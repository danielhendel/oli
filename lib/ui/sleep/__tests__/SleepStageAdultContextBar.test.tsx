import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import { SleepStageAdultContextBar } from "@/lib/ui/sleep/SleepStageAdultContextBar";
import {
  UI_STAGE_ADULT_CONTEXT_OUTER_FILL,
  UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL,
} from "@/lib/ui/theme/uiTokens";

const baseProps = {
  belowLabel: "Below Typical",
  typicalLabel: "Typical",
  aboveLabel: "Above Typical",
  belowRangeText: "<16%",
  typicalRangeText: "16–20%",
  aboveRangeText: ">20%",
  zoneFractions: { below: 0.4, typical: 0.2, above: 0.4 },
  currentMarkerPosition01: 0.2,
  ninetyDayMarkerPosition01: 0.28 as number | null,
  accessibilitySummary:
    "Below typical range. The typical range is 16 to 20 percent. Today is 11 percent. Your 90-day average is 13 percent.",
};

describe("SleepStageAdultContextBar", () => {
  it("renders short TYPICAL labels without visible status sentence", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SleepStageAdultContextBar {...baseProps} />);
    });

    const flat = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children))
      .join("|");
    expect(flat).toContain("Below Typical");
    expect(flat).toContain("Typical");
    expect(flat).toContain("Above Typical");
    expect(flat).toContain("Today");
    expect(flat).toContain("90-day average");
    expect(flat).not.toContain("Below typical range");
    expect(flat).not.toContain("In typical range");
    expect(flat).not.toContain("Typical Range");
    expect(flat).not.toMatch(/TYPICAL RA|Recommended|Optimal|Good|Fair|Low|Personal context/);

    const typical = tree.root.findByProps({ testID: "sleep-stage-adult-context-typical-zone" });
    const below = tree.root.findByProps({ testID: "sleep-stage-adult-context-below-zone" });
    const above = tree.root.findByProps({ testID: "sleep-stage-adult-context-above-zone" });
    expect(typical.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL }),
      ]),
    );
    expect(below.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_STAGE_ADULT_CONTEXT_OUTER_FILL }),
      ]),
    );
    expect(above.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_STAGE_ADULT_CONTEXT_OUTER_FILL }),
      ]),
    );
    expect(tree.root.findByProps({ testID: "sleep-stage-adult-context-marker" })).toBeDefined();
    expect(
      tree.root.findByProps({ testID: "sleep-stage-adult-context-ninety-day-marker" }),
    ).toBeDefined();
    expect(() => tree.root.findByProps({ testID: "sleep-stage-adult-context-status" })).toThrow();

    const bar = tree.root.findByProps({ testID: "sleep-stage-adult-context-bar" });
    expect(bar.props.accessibilityLabel).toContain("Below typical range");
    expect(bar.props.accessibilityLabel).toContain("Today is 11 percent");
  });

  it("omits 90-day marker and legend entry when unavailable", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageAdultContextBar
          {...baseProps}
          belowRangeText="<21%"
          typicalRangeText="21–30%"
          aboveRangeText=">30%"
          zoneFractions={{ below: 0.34, typical: 0.28, above: 0.38 }}
          currentMarkerPosition01={0.55}
          ninetyDayMarkerPosition01={null}
          accessibilitySummary="In typical range. The typical range is 21 to 30 percent. Today is 30 percent."
        />,
      );
    });
    const flat = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children))
      .join("|");
    expect(flat).toContain("Today");
    expect(flat).not.toContain("90-day average");
    expect(flat).not.toContain("In typical range");
    expect(() =>
      tree.root.findByProps({ testID: "sleep-stage-adult-context-ninety-day-marker" }),
    ).toThrow();
  });
});
