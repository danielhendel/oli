import { describe, expect, it } from "@jest/globals";
import { DASH_RECAP_DISPLAY_PLACEMENT_CAPS, dashRecapPlacementMarker01 } from "../dashRecapDisplayPlacement";

describe("dashRecapPlacementMarker01", () => {
  it("clamps to 0–1", () => {
    expect(dashRecapPlacementMarker01(6000, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps)).toBe(0.5);
    expect(dashRecapPlacementMarker01(12000, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps)).toBe(1);
    expect(dashRecapPlacementMarker01(24000, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps)).toBe(1);
    expect(dashRecapPlacementMarker01(0, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps)).toBe(0);
  });
});
