import { describe, expect, it } from "@jest/globals";
import { UI_PROGRESS_TRACK_EMPTY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import type { InterpretationBarModel } from "../bodyOverviewInterpretationBar";
import {
  BODY_ZONE_TO_VISUAL_SEGMENT_INDEX,
  bodyInterpretationZoneQuartileBand,
  computeBodyOverviewDisplayMarker01,
  getBodyOverviewBarDisplay,
} from "../bodyOverviewBarDisplay";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";

const SEG = 5;

function assertMarkerInsideSegment(bar: InterpretationBarModel): void {
  const idx = BODY_ZONE_TO_VISUAL_SEGMENT_INDEX[bar.zone];
  const d = computeBodyOverviewDisplayMarker01(bar);
  const start = idx / SEG;
  const end = (idx + 1) / SEG;
  expect(d).toBeGreaterThanOrEqual(start);
  expect(d).toBeLessThanOrEqual(end);
}

describe("bodyOverviewBarDisplay", () => {
  it("maps each Body zone to the expected shared visual segment index (orange unused)", () => {
    expect(BODY_ZONE_TO_VISUAL_SEGMENT_INDEX).toEqual({
      out_of_range: 0,
      fair: 1,
      good: 3,
      optimal: 4,
    });
  });

  it("keeps quartile bands aligned with interpretationZoneFromMarker01", () => {
    expect(bodyInterpretationZoneQuartileBand("out_of_range")).toEqual({ lo: 0, hi: 0.25 });
    expect(bodyInterpretationZoneQuartileBand("fair")).toEqual({ lo: 0.25, hi: 0.5 });
    expect(bodyInterpretationZoneQuartileBand("good")).toEqual({ lo: 0.5, hi: 0.75 });
    expect(bodyInterpretationZoneQuartileBand("optimal")).toEqual({ lo: 0.75, hi: 1 });
  });

  it("places display marker inside the mapped segment for every zone at band extremes", () => {
    assertMarkerInsideSegment({
      marker01: 0,
      zone: "out_of_range",
      displayLabel: "Out of range",
      hasValue: true,
    });
    assertMarkerInsideSegment({
      marker01: 0.249,
      zone: "out_of_range",
      displayLabel: "Out of range",
      hasValue: true,
    });
    assertMarkerInsideSegment({
      marker01: 0.25,
      zone: "fair",
      displayLabel: "Fair",
      hasValue: true,
    });
    assertMarkerInsideSegment({
      marker01: 0.499,
      zone: "fair",
      displayLabel: "Fair",
      hasValue: true,
    });
    assertMarkerInsideSegment({
      marker01: 0.5,
      zone: "good",
      displayLabel: "Good",
      hasValue: true,
    });
    assertMarkerInsideSegment({
      marker01: 0.749,
      zone: "good",
      displayLabel: "Good",
      hasValue: true,
    });
    assertMarkerInsideSegment({
      marker01: 0.75,
      zone: "optimal",
      displayLabel: "Optimal",
      hasValue: true,
    });
    assertMarkerInsideSegment({
      marker01: 1,
      zone: "optimal",
      displayLabel: "Optimal",
      hasValue: true,
    });
  });

  it("maps optimal at raw 0.76 into the blue segment (not green)", () => {
    const bar: InterpretationBarModel = {
      marker01: 0.76,
      zone: "optimal",
      displayLabel: "Optimal",
      hasValue: true,
    };
    const d = computeBodyOverviewDisplayMarker01(bar);
    expect(d).toBeGreaterThanOrEqual(0.8);
    expect(d).toBeLessThanOrEqual(1);
  });

  it("derives pill and marker colors from the same Strength chrome row as the visual segment", () => {
    const zones = ["out_of_range", "fair", "good", "optimal"] as const;
    for (const zone of zones) {
      const bar: InterpretationBarModel = {
        marker01: 0.5,
        zone,
        displayLabel: "x",
        hasValue: true,
      };
      const idx = BODY_ZONE_TO_VISUAL_SEGMENT_INDEX[zone];
      const chrome = MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[idx];
      const d = getBodyOverviewBarDisplay(bar);
      expect(d.pillBg).toBe(chrome.pillBg);
      expect(d.pillFg).toBe(chrome.pillFg);
      expect(d.markerDotColor).toBe(chrome.pillFg);
      expect(d.visualSegmentIndex).toBe(idx);
    }
  });

  it("uses neutral pill when there is no measurement", () => {
    const d = getBodyOverviewBarDisplay({
      marker01: 0.5,
      zone: "fair",
      displayLabel: "No data",
      hasValue: false,
    });
    expect(d.visualSegmentIndex).toBeNull();
    expect(d.pillBg).toBe(UI_PROGRESS_TRACK_EMPTY);
    expect(d.pillFg).toBe(UI_TEXT_TERTIARY_LABEL);
  });
});
