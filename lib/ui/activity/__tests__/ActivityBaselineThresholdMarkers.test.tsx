import React from "react";
import renderer, { act } from "react-test-renderer";

import { ActivityBaselineThresholdMarkers } from "@/lib/ui/activity/ActivityBaselineThresholdMarkers";

describe("ActivityBaselineThresholdMarkers", () => {
  it("renders bounded-scale labels including 0, 2.5k, and canonical tier thresholds", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ActivityBaselineThresholdMarkers />);
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("activity-baseline-threshold-markers");
    expect(str).toContain('["0"]');
    expect(str).toContain("2.5k");
    expect(str).toContain("5k");
    expect(str).toContain("7.5k");
    expect(str).toContain("10k");
    expect(str).toContain("12.5k");
    expect(str).toContain("15k");
  });
});
