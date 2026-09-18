import React from "react";
import renderer, { act } from "react-test-renderer";

import type { BodyMetricClassificationChartModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { BodyMetricClassificationChart } from "@/lib/ui/body/BodyMetricClassificationChart";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

function baseModel(
  overrides: Partial<BodyMetricClassificationChartModel> = {},
): BodyMetricClassificationChartModel {
  return {
    standardId: "cdc-who-adult-bmi-screening",
    standardVersion: "2024.1",
    contextLabel: "Adult BMI screening classification",
    segments: [
      {
        id: "underweight",
        label: "Underweight",
        formattedRange: "<122 lb",
        tone: "cool",
        lowerBound: null,
        upperBound: 18.5,
        lowerInclusive: false,
        upperInclusive: false,
      },
      {
        id: "healthy_weight",
        label: "Healthy Weight",
        formattedRange: "122–164 lb",
        tone: "reference",
        lowerBound: 18.5,
        upperBound: 25,
        lowerInclusive: true,
        upperInclusive: false,
      },
      {
        id: "overweight",
        label: "Overweight",
        formattedRange: "165–197 lb",
        tone: "caution",
        lowerBound: 25,
        upperBound: 30,
        lowerInclusive: true,
        upperInclusive: false,
      },
      {
        id: "obesity",
        label: "Obesity",
        formattedRange: "≥198 lb",
        tone: "elevated",
        lowerBound: 30,
        upperBound: null,
        lowerInclusive: true,
        upperInclusive: false,
      },
    ],
    marker: null,
    accessibleSummary: "Weight classification chart. Adult BMI screening.",
    ...overrides,
  };
}

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("BodyMetricClassificationChart", () => {
  it("renders four Weight segments with exact labels and ranges", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricClassificationChart, { model: baseModel() }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Underweight");
    expect(text).toContain("Healthy Weight");
    expect(text).toContain("Overweight");
    expect(text).toContain("Obesity");
    expect(text).toContain("<122 lb");
    expect(text).toContain("122–164 lb");
    expect(text).toContain("165–197 lb");
    expect(text).toContain("≥198 lb");
    expect(tree.root.findByProps({ testID: "body-metric-classification-chart" }).props.accessibilityLabel)
      .toMatch(/Adult BMI screening/i);
  });

  it("omits marker when null and shows marker in the classified segment when valid", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricClassificationChart, { model: baseModel() }),
      );
    });
    expect(tree.root.findAllByProps({ testID: "body-metric-classification-marker" })).toHaveLength(0);

    act(() => {
      tree.update(
        React.createElement(BodyMetricClassificationChart, {
          model: baseModel({
            marker: {
              formattedValue: "170 lb",
              segmentId: "overweight",
              withinSegmentPosition: 0.4,
              accessibleLabel: "Overweight",
            },
          }),
        }),
      );
    });
    expect(tree.root.findByProps({ testID: "body-metric-classification-marker" })).toBeDefined();
    expect(collectText(tree)).toContain("170 lb");
  });

  it("supports variable segment counts", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricClassificationChart, {
          model: baseModel({
            segments: [
              {
                id: "a",
                label: "A",
                formattedRange: "<10",
                tone: "cool",
                lowerBound: null,
                upperBound: 10,
                lowerInclusive: false,
                upperInclusive: false,
              },
              {
                id: "b",
                label: "B",
                formattedRange: "≥10",
                tone: "elevated",
                lowerBound: 10,
                upperBound: null,
                lowerInclusive: true,
                upperInclusive: false,
              },
            ],
          }),
        }),
      );
    });
    expect(collectText(tree)).toContain("A");
    expect(collectText(tree)).toContain("B");
  });

  it("fails closed for empty, duplicate, impossible, or unknown marker segment", () => {
    const cases: BodyMetricClassificationChartModel[] = [
      baseModel({ segments: [] }),
      baseModel({
        segments: [
          ...baseModel().segments.slice(0, 1),
          { ...baseModel().segments[0], id: "underweight" },
        ],
      }),
      baseModel({
        segments: [
          {
            id: "bad",
            label: "Bad",
            formattedRange: null,
            tone: "neutral",
            lowerBound: 40,
            upperBound: 10,
            lowerInclusive: true,
            upperInclusive: false,
          },
        ],
      }),
      baseModel({
        marker: {
          formattedValue: "1",
          segmentId: "missing",
          withinSegmentPosition: 0.5,
          accessibleLabel: "x",
        },
      }),
    ];
    for (const model of cases) {
      let tree!: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          React.createElement(BodyMetricClassificationChart, { model }),
        );
      });
      expect(tree.root.findByProps({ testID: "body-metric-classification-chart" }).props.accessibilityLabel)
        .toBe("Classification chart unavailable");
      expect(collectText(tree)).not.toContain("Underweight");
    }
  });

  it("hides decorative bands from accessibility and exposes one summary", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricClassificationChart, { model: baseModel() }),
      );
    });
    const root = tree.root.findByProps({ testID: "body-metric-classification-chart" });
    expect(root.props.accessible).toBe(true);
    expect(root.props.accessibilityLabel).toBeTruthy();
    const hidden = tree.root.findAll(
      (n) => n.props?.accessibilityElementsHidden === true || n.props?.importantForAccessibility === "no-hide-descendants",
    );
    expect(hidden.length).toBeGreaterThan(0);
  });
});
