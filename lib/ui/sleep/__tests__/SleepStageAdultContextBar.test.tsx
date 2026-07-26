import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import { SleepStageAdultContextBar } from "@/lib/ui/sleep/SleepStageAdultContextBar";
import {
  UI_STAGE_ADULT_CONTEXT_BELOW_TEXT,
  UI_STAGE_ADULT_CONTEXT_OUTER_FILL,
  UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL,
  UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT,
} from "@/lib/ui/theme/uiTokens";

const baseProps = {
  belowLabel: "Below Typical",
  typicalLabel: "Typical Range",
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
  it("renders short labels, gray/green/gray zones, dual markers, and legend", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageAdultContextBar
          status="below_typical"
          statusLabel="Below typical range"
          {...baseProps}
        />,
      );
    });

    const flat = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children))
      .join("|");
    expect(flat).toContain("Below typical range");
    expect(flat).toContain("Below Typical");
    expect(flat).toContain("Typical Range");
    expect(flat).toContain("Above Typical");
    expect(flat).toContain("Today");
    expect(flat).toContain("90-day average");
    expect(flat).not.toMatch(/Typical adult context|Recommended|Optimal|Good|Fair|Low|Personal context/);
    expect(flat).not.toContain("for this sleep duration");

    const status = tree.root.findByProps({ testID: "sleep-stage-adult-context-status" });
    expect(status.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: UI_STAGE_ADULT_CONTEXT_BELOW_TEXT })]),
    );

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
    expect(tree.root.findByProps({ testID: "sleep-stage-adult-context-legend" })).toBeDefined();

    const bar = tree.root.findByProps({ testID: "sleep-stage-adult-context-bar" });
    expect(bar.props.accessibilityLabel).toContain("Today is 11 percent");
    expect(bar.props.accessibilityLabel).toContain("90-day average is 13 percent");
  });

  it("omits 90-day marker and legend entry when unavailable", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageAdultContextBar
          status="within_typical"
          statusLabel="In typical range"
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
    expect(() =>
      tree.root.findByProps({ testID: "sleep-stage-adult-context-ninety-day-marker" }),
    ).toThrow();
    const status = tree.root.findByProps({ testID: "sleep-stage-adult-context-status" });
    expect(status.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT }),
      ]),
    );
  });
});
