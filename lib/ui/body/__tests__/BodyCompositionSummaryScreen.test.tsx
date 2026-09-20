import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildBodyMetricSummaryCards } from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { BodyCompositionSummaryScreen } from "@/lib/ui/body/BodyCompositionSummaryScreen";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/lib/ui/body/BodyMetricClassificationChart", () => {
  const ReactLocal = require("react");
  return {
    BodyMetricClassificationChart: (props: { testID?: string }) =>
      ReactLocal.createElement("View", { testID: props.testID ?? "chart" }),
  };
});

jest.mock("@/lib/ui/body/BodyMetricEducationalReferenceChart", () => {
  const ReactLocal = require("react");
  return {
    BodyMetricEducationalReferenceChart: (props: { testID?: string }) =>
      ReactLocal.createElement("View", { testID: props.testID ?? "educational" }),
  };
});

jest.mock("@/lib/ui/body/BodyMetricUnclassifiedScaffold", () => {
  const ReactLocal = require("react");
  return {
    BodyMetricUnclassifiedScaffold: (props: { testID?: string }) =>
      ReactLocal.createElement("View", { testID: props.testID ?? "scaffold" }),
  };
});

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

const baseScreenProps = {
  connectionAction: { kind: "sync_now" as const, label: "Sync now" },
  onPressCard: jest.fn(),
  onPressAddWeight: jest.fn(),
  onPressConnectionAction: jest.fn(),
  massDisplayUnit: "lb" as const,
  weightPrimaryView: "mass" as const,
  onChangeWeightPrimaryView: jest.fn(),
  bodyFatPrimaryView: "percentage" as const,
  onChangeBodyFatPrimaryView: jest.fn(),
  leanMassPrimaryView: "mass" as const,
  onChangeLeanMassPrimaryView: jest.fn(),
};

describe("BodyCompositionSummaryScreen — visual cards", () => {
  const cards = buildBodyMetricSummaryCards({
    overview: {
      overviewDay: "2026-09-18",
      weightKg: 80,
      bodyFatPercent: 18,
      leanBodyMassKg: 60,
      bmi: 24.2,
      hasAnyMetric: true,
    },
    profile: { heightCm: 175, ageYears: 32, sex: "male" },
    unit: "lb",
  });

  it("renders Total Mass and Components hierarchy with three metric cards", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          ...baseScreenProps,
          cards,
        }),
      );
    });
    const text = collectText(tree);
    expect(tree.root.findByProps({ testID: "body-composition-heading-total-mass" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-heading-components" })).toBeDefined();
    expect(text).toContain("Total Mass");
    expect(text).toContain("Components");
    expect(text).toContain("Weight");
    expect(text).toContain("Body Fat");
    expect(text).toContain("Lean Mass");
    expect(text).not.toContain("Add or connect measurements");
    expect(text).not.toContain("View measurement history");
    expect(text).not.toContain("Learn about measurement ranges");
    expect(tree.root.findAllByProps({ testID: "body-composition-actions" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-composition-bottom-clearance" })).toBeDefined();
    expect(text.indexOf("Total Mass")).toBeLessThan(text.indexOf("Weight"));
    expect(text.indexOf("Weight")).toBeLessThan(text.indexOf("Components"));
    expect(text.indexOf("Components")).toBeLessThan(text.indexOf("Body Fat"));
    expect(text.indexOf("Body Fat")).toBeLessThan(text.indexOf("Lean Mass"));
  });

  it("Weight toggle exposes lb|BMI for imperial preference", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          ...baseScreenProps,
          cards,
          massDisplayUnit: "lb",
        }),
      );
    });
    expect(tree.root.findByProps({ testID: "body-metric-view-weight-mass" }).props.children).toBeDefined();
    const massSeg = tree.root.findByProps({ testID: "body-metric-view-weight-mass" });
    const bmiSeg = tree.root.findByProps({ testID: "body-metric-view-weight-bmi" });
    expect(massSeg.props.accessibilityLabel).toMatch(/pounds/i);
    expect(bmiSeg.props.accessibilityLabel).toMatch(/BMI/i);
  });

  it("Weight toggle exposes kg|BMI for metric preference", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          ...baseScreenProps,
          cards,
          massDisplayUnit: "kg",
        }),
      );
    });
    expect(
      tree.root.findByProps({ testID: "body-metric-view-weight-mass" }).props.accessibilityLabel,
    ).toMatch(/kilograms/i);
  });
});
