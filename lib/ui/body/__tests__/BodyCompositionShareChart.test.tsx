import React from "react";
import renderer, { act } from "react-test-renderer";

import type { BodyCompositionShareGraphModel } from "@/lib/body/presentation/bodyCompositionShareGraphTypes";
import { BodyCompositionShareChart } from "@/lib/ui/body/BodyCompositionShareChart";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

const readyModel: BodyCompositionShareGraphModel = {
  kind: "composition_share",
  metric: "bodyFat",
  status: "ready",
  normalizedPosition: 0.182,
  valueLabel: "18.2%",
  caption: "Share of total mass",
  meaning: "measured_percentage",
  personalClassification: null,
  target: null,
  accessibleSummary:
    "Body Fat is 18.2 percent of compatible total mass. This graph shows quantity, not a health or performance classification. Share of total mass.",
};

describe("BodyCompositionShareChart", () => {
  it("renders share caption, fill, stem marker, and no classification labels", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionShareChart, { model: readyModel }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Share of total mass");
    // Value remains on the card face — chart marker is stem/knob only.
    expect(text).not.toContain("18.2%");
    expect(text).not.toMatch(/Essential|Athletic|Fitness|Average|Optimal|Elevated|High/i);
    expect(tree.root.findByProps({ testID: "body-composition-share-marker" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-share-marker-knob" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-share-fill" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-share-remainder" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-share-chart" }).props.accessibilityLabel).toMatch(
      /quantity, not a health/i,
    );
  });

  it("renders neutral rail without marker when position is null", () => {
    const missing: BodyCompositionShareGraphModel = {
      ...readyModel,
      status: "missing",
      normalizedPosition: null,
      valueLabel: null,
      meaning: null,
      accessibleSummary: "No compatible percentage is available. No personal classification is shown.",
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionShareChart, { model: missing }),
      );
    });
    expect(tree.root.findAllByProps({ testID: "body-composition-share-marker" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-composition-share-neutral" })).toBeDefined();
  });
});
