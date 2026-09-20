import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyMetricUnclassifiedScaffold } from "@/lib/ui/body/BodyMetricUnclassifiedScaffold";
import {
  BODY_METRIC_UNCLASSIFIED_NEUTRAL_FILL,
  BODY_METRIC_UNCLASSIFIED_SPECTRUM,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

jest.mock("react-native", () => ({
  View: "View",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1, absoluteFillObject: {} },
}));

describe("BodyMetricUnclassifiedScaffold", () => {
  it("uses a single neutral rail without multi-band classification colors", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricUnclassifiedScaffold, {
          accessibilityLabel: "Body Fat. No approved classification.",
        }),
      );
    });
    const fills = tree.root
      .findAllByType("View")
      .map((n) => n.props.style)
      .flat()
      .filter((s): s is { backgroundColor?: string } => s != null && typeof s === "object")
      .map((s) => s.backgroundColor)
      .filter((c): c is string => typeof c === "string");
    expect(fills).toContain(BODY_METRIC_UNCLASSIFIED_NEUTRAL_FILL);
    for (const band of BODY_METRIC_UNCLASSIFIED_SPECTRUM) {
      expect(fills).not.toContain(band.fill);
    }
    expect(tree.root.findByProps({ testID: "body-metric-unclassified-scaffold" }).props.accessibilityLabel).toMatch(
      /No approved classification/,
    );
  });
});
