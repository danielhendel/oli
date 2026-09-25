import React from "react";
import renderer, { act } from "react-test-renderer";

import { resolveBodyMetricEducationalReferencePresentation } from "@/lib/body/standards/resolveEducationalReferencePresentation";
import { BodyMetricEducationalReferenceChart } from "@/lib/ui/body/BodyMetricEducationalReferenceChart";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1, absoluteFillObject: {} },
}));

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("BodyMetricEducationalReferenceChart", () => {
  it("renders Body Fat educational reference without a personal marker", () => {
    const model = resolveBodyMetricEducationalReferencePresentation({
      metric: "bodyFat",
      hasMeasuredValue: true,
      measurementMethod: null,
    });
    expect(model).not.toBeNull();

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricEducationalReferenceChart, { model: model! }),
      );
    });

    const text = collectText(tree);
    expect(text).toMatch(/Educational reference/i);
    expect(text).toMatch(/Body fat percentage/i);
    expect(text).toMatch(/\bHigher\b/);
    expect(text).toMatch(/Mid-range/);
    expect(text).toMatch(/\bLower\b/);
    expect(text).not.toMatch(/\bTypical\b/);
    expect(text).not.toMatch(/You are here|Optimal|Excellence|Elite|Underfat|Healthy|Athletic/i);
    expect(tree.root.findAllByProps({ testID: "body-metric-classification-marker" })).toHaveLength(0);

    act(() => {
      tree.root.findByProps({ testID: "body-metric-educational-disclosure" }).props.onPress();
    });
    const expanded = collectText(tree);
    expect(expanded).toMatch(/Population/i);
    expect(expanded).toMatch(/Methods/i);
    expect(expanded).toMatch(/Evidence Oli currently has/i);
    expect(expanded).toMatch(/Why personal placement is withheld/i);
  });

  it("renders Lean Mass educational reference with total-lean construct honesty", () => {
    const model = resolveBodyMetricEducationalReferencePresentation({
      metric: "leanTissue",
      hasMeasuredValue: false,
      measurementMethod: null,
    });
    expect(model).not.toBeNull();

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricEducationalReferenceChart, {
          model: model!,
          testID: "lean-edu",
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toMatch(/Total lean mass/i);
    expect(text).toMatch(/not identical to skeletal muscle/i);
    expect(text).toMatch(/Mid-range lean-mass context/i);
    expect(text).not.toMatch(/\bTypical\b/);
    expect(text).not.toMatch(/You are here|Optimal|Excellence|Elite|Healthy|Athletic|Sarcopenic/i);
  });
});
