import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildBodyMetricSummaryCards } from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { BodyMetricSummaryCard } from "@/lib/ui/body/BodyMetricSummaryCard";
import { bodySegmentedControlStyles } from "@/lib/ui/body/bodySegmentedControlChrome";
import {
  BODY_APPLE_HEALTH_ICON_NAME,
  BODY_APPLE_HEALTH_ICON_COLOR_MUTED,
} from "@/lib/ui/body/BodyAppleHealthSourceIcon";

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

describe("bodySegmentedControlStyles — toggle label contract", () => {
  it("gives each segment enough minWidth for BMI / lb / kg / % on one line", () => {
    expect(bodySegmentedControlStyles.segmentComfortable.minWidth).toBeGreaterThanOrEqual(54);
    expect(bodySegmentedControlStyles.segmentComfortable.flexShrink).toBe(0);
    expect(bodySegmentedControlStyles.track.minHeight).toBeGreaterThanOrEqual(44);
  });

  it("uses a near-black selected pill shared by lb/BMI and Weight range selector", () => {
    expect(bodySegmentedControlStyles.segmentActive.backgroundColor).toBe("#000000");
  });
});

describe("BodyMetricSummaryCard — view toggles + Apple Health action", () => {
  const [weight, bodyFat, lean] = buildBodyMetricSummaryCards({
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

  const base = {
    onPress: jest.fn(),
    onPressAddMeasurement: jest.fn(),
    onPressConnectionAction: jest.fn(),
    massDisplayUnit: "lb" as const,
    weightPrimaryView: "mass" as const,
    onChangeWeightPrimaryView: jest.fn(),
    bodyFatPrimaryView: "percentage" as const,
    onChangeBodyFatPrimaryView: jest.fn(),
    leanMassPrimaryView: "mass" as const,
    onChangeLeanMassPrimaryView: jest.fn(),
    connectionAction: { kind: "sync_now" as const, label: "Sync now" },
  };

  beforeEach(() => {
    base.onPress.mockClear();
    base.onPressAddMeasurement.mockClear();
    base.onPressConnectionAction.mockClear();
    base.onChangeWeightPrimaryView.mockClear();
    base.onChangeBodyFatPrimaryView.mockClear();
    base.onChangeLeanMassPrimaryView.mockClear();
  });

  it("Weight lb|BMI toggle does not open detail", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, { ...base, model: weight }),
      );
    });
    const mass = tree.root.findByProps({ testID: "body-metric-view-weight-mass" });
    const bmi = tree.root.findByProps({ testID: "body-metric-view-weight-bmi" });
    expect(mass.props.accessibilityState.selected).toBe(true);
    expect(bmi.props.accessibilityState.selected).toBe(false);
    const bmiLabel = bmi.findByType("Text");
    expect(bmiLabel.children).toEqual(["BMI"]);
    expect(String(bmiLabel.children.join(""))).not.toMatch(/\n/);
    expect(tree.root.findByProps({ testID: "body-metric-chevron-weight" })).toBeDefined();
    act(() => {
      bmi.props.onPress({ stopPropagation: jest.fn() });
    });
    expect(base.onChangeWeightPrimaryView).toHaveBeenCalledWith("bmi");
    expect(base.onPress).not.toHaveBeenCalled();
  });

  it("Body Fat %|lb toggle is interactive", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, { ...base, model: bodyFat }),
      );
    });
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-view-bodyFat-fatMass" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(base.onChangeBodyFatPrimaryView).toHaveBeenCalledWith("fatMass");
    expect(base.onPress).not.toHaveBeenCalled();
  });

  it("Lean Mass title and %|lb toggle", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, { ...base, model: lean }),
      );
    });
    expect(collectText(tree)).toContain("Lean Mass");
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-view-leanTissue-percentage" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(base.onChangeLeanMassPrimaryView).toHaveBeenCalledWith("percentage");
  });

  it("connection action uses muted heart and does not open card detail", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, { ...base, model: weight }),
      );
    });
    const icon = tree.root.findByType("Ionicons");
    expect(icon.props.name).toBe(BODY_APPLE_HEALTH_ICON_NAME);
    expect(icon.props.color).toBe(BODY_APPLE_HEALTH_ICON_COLOR_MUTED);
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-connection-weight" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(base.onPressConnectionAction).toHaveBeenCalled();
    expect(base.onPress).not.toHaveBeenCalled();
  });
});
