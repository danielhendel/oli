import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import { SleepStageAdultContextBar } from "@/lib/ui/sleep/SleepStageAdultContextBar";
import {
  UI_STAGE_ADULT_CONTEXT_ABOVE_FILL,
  UI_STAGE_ADULT_CONTEXT_BELOW_FILL,
  UI_STAGE_ADULT_CONTEXT_BELOW_TEXT,
  UI_STAGE_ADULT_CONTEXT_TYPICAL_FILL,
  UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT,
} from "@/lib/ui/theme/uiTokens";

describe("SleepStageAdultContextBar", () => {
  it("renders written zones, typical center green, and below caution without Recommended", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageAdultContextBar
          status="below_typical"
          statusLabel="Below typical adult context"
          typicalPercentRangeText="16–20% of total sleep"
          equivalentMinutesSentence="About 1h 12m–1h 30m for this sleep duration"
          belowLabel="Below typical"
          typicalLabel="Typical adult context"
          aboveLabel="Above typical"
          belowRangeText="<16%"
          typicalRangeText="16–20%"
          aboveRangeText=">20%"
          zoneFractions={{ below: 0.44, typical: 0.12, above: 0.44 }}
          markerPosition01={0.3}
          accessibilitySummary="Below typical adult context."
        />,
      );
    });

    const flat = tree.root
      .findAllByType(Text)
      .map((t) => String(t.props.children))
      .join("|");
    expect(flat).toContain("Below typical adult context");
    expect(flat).toContain("Typical adult context");
    expect(flat).toContain("Below typical");
    expect(flat).toContain("Above typical");
    expect(flat).not.toMatch(/Recommended|Optimal|Good|Fair|Low/);

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
        expect.objectContaining({ backgroundColor: UI_STAGE_ADULT_CONTEXT_BELOW_FILL }),
      ]),
    );
    expect(above.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_STAGE_ADULT_CONTEXT_ABOVE_FILL }),
      ]),
    );
    expect(tree.root.findByProps({ testID: "sleep-stage-adult-context-marker" })).toBeDefined();
  });

  it("colors within-typical status green", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SleepStageAdultContextBar
          status="within_typical"
          statusLabel="Within typical adult context"
          typicalPercentRangeText="21–30% of total sleep"
          equivalentMinutesSentence="About 1h 35m–2h 15m for this sleep duration"
          belowLabel="Below typical"
          typicalLabel="Typical adult context"
          aboveLabel="Above typical"
          belowRangeText="<21%"
          typicalRangeText="21–30%"
          aboveRangeText=">30%"
          zoneFractions={{ below: 0.41, typical: 0.18, above: 0.41 }}
          markerPosition01={0.5}
          accessibilitySummary="Within typical adult context."
        />,
      );
    });
    const status = tree.root.findByProps({ testID: "sleep-stage-adult-context-status" });
    expect(status.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: UI_STAGE_ADULT_CONTEXT_WITHIN_TEXT }),
      ]),
    );
  });
});
