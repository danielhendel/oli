import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyChartPositionMarker } from "@/lib/ui/body/BodyChartPositionMarker";
import { resolveBodyMetricClassificationBandChrome } from "@/lib/ui/theme/bodyMetricClassificationChrome";

jest.mock("react-native", () => ({
  View: "View",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

describe("BodyChartPositionMarker", () => {
  it("renders unified knob/stem geometry with segment-colored center fill", () => {
    const fill = resolveBodyMetricClassificationBandChrome("reference").fillStrong;
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyChartPositionMarker, {
          leftPercent: 42,
          centerFill: fill,
          testID: "marker",
          knobTestID: "knob",
        }),
      );
    });
    const knob = tree.root.findByProps({ testID: "knob" });
    expect(knob.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: fill })]),
    );
    expect(tree.root.findByProps({ testID: "marker" })).toBeDefined();
  });
});
