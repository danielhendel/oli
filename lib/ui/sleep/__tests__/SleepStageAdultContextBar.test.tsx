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
  accessibilitySummary:
    "11 percent of total sleep. The typical range is 16 to 20 percent. This result is below the typical range.",
};

describe("SleepStageAdultContextBar", () => {
  it("renders single today marker without 90-day marker or legend", () => {
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
    expect(flat).not.toContain("Today");
    expect(flat).not.toContain("90-day average");
    expect(flat).not.toContain("Below typical range");
    expect(flat).not.toMatch(/TYPICAL RA|Recommended|Optimal|Good|Fair|Low/);

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
    expect(() =>
      tree.root.findByProps({ testID: "sleep-stage-adult-context-ninety-day-marker" }),
    ).toThrow();
    expect(() => tree.root.findByProps({ testID: "sleep-stage-adult-context-legend" })).toThrow();

    const bar = tree.root.findByProps({ testID: "sleep-stage-adult-context-bar" });
    expect(bar.props.accessibilityLabel).toContain("11 percent of total sleep");
    expect(bar.props.accessibilityLabel).toContain("This result is below the typical range");
    expect(bar.props.accessibilityLabel).not.toMatch(/90-day|Today is/);
  });

  it("keeps short TYPICAL labels for REM-style bands", () => {
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
          accessibilitySummary="30 percent of total sleep. The typical range is 21 to 30 percent. This result is in the typical range."
        />,
      );
    });
    const flat = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children))
      .join("|");
    expect(flat).toContain("Typical");
    expect(flat).not.toContain("Today");
    expect(flat).not.toContain("90-day average");
    expect(flat).not.toContain("In typical range");
  });
});
