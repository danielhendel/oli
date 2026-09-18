import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildBodyMetricSummaryCards } from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { BodyMetricSummaryCard } from "@/lib/ui/body/BodyMetricSummaryCard";
import { BODY_APPLE_HEALTH_ICON_NAME } from "@/lib/ui/body/BodyAppleHealthSourceIcon";

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
  const React = require("react");
  return {
    BodyMetricClassificationChart: (props: { testID?: string }) =>
      React.createElement("View", { testID: props.testID ?? "chart" }),
  };
});

jest.mock("@/lib/ui/body/BodyMetricUnclassifiedScaffold", () => {
  const React = require("react");
  return {
    BodyMetricUnclassifiedScaffold: (props: { testID?: string }) =>
      React.createElement("View", { testID: props.testID ?? "scaffold" }),
  };
});

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

describe("BodyMetricSummaryCard — unit toggle + Apple Health action", () => {
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
    onChangeMassDisplayUnit: jest.fn(),
    connectionAction: { kind: "sync_now" as const, label: "Sync now" },
  };

  beforeEach(() => {
    base.onPress.mockClear();
    base.onPressAddMeasurement.mockClear();
    base.onPressConnectionAction.mockClear();
    base.onChangeMassDisplayUnit.mockClear();
  });

  it("renders segmented lb/kg with selected state and separate chevron", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, { ...base, model: weight }),
      );
    });
    const lb = tree.root.findByProps({ testID: "body-metric-unit-lb" });
    const kg = tree.root.findByProps({ testID: "body-metric-unit-kg" });
    expect(lb.props.accessibilityState.selected).toBe(true);
    expect(kg.props.accessibilityState.selected).toBe(false);
    expect(tree.root.findByProps({ testID: "body-metric-chevron-weight" })).toBeDefined();
    act(() => {
      kg.props.onPress({ stopPropagation: jest.fn() });
    });
    expect(base.onChangeMassDisplayUnit).toHaveBeenCalledWith("kg");
    expect(base.onPress).not.toHaveBeenCalled();
  });

  it("keeps Body Fat as non-interactive percent", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, { ...base, model: bodyFat }),
      );
    });
    expect(tree.root.findAllByProps({ testID: "body-metric-unit-lb" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-unit-kg" })).toHaveLength(0);
    expect(collectText(tree)).toContain("%");
  });

  it("shows Apple Health heart icon with Sync now and blocks syncing taps", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, { ...base, model: lean }),
      );
    });
    const icons = tree.root.findAllByType("Ionicons");
    expect(icons.some((n) => n.props.name === BODY_APPLE_HEALTH_ICON_NAME)).toBe(true);
    expect(collectText(tree)).toContain("Sync now");
    const connection = tree.root.findByProps({ testID: "body-metric-connection-leanTissue" });
    expect(connection.props.accessibilityLabel).toMatch(/Apple Health/i);
    act(() => {
      connection.props.onPress({ stopPropagation: jest.fn() });
    });
    expect(base.onPressConnectionAction).toHaveBeenCalledTimes(1);
    expect(base.onPress).not.toHaveBeenCalled();

    act(() => {
      tree.update(
        React.createElement(BodyMetricSummaryCard, {
          ...base,
          model: lean,
          connectionAction: { kind: "syncing", label: "Syncing…" },
        }),
      );
    });
    base.onPressConnectionAction.mockClear();
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-connection-leanTissue" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(base.onPressConnectionAction).not.toHaveBeenCalled();
  });

  it("shows Connected without Sync now wording", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyMetricSummaryCard, {
          ...base,
          model: weight,
          connectionAction: { kind: "connected", label: "Connected" },
        }),
      );
    });
    const text = collectText(tree);
    expect(text).toContain("Connected");
    expect(text).not.toContain("Sync now");
  });
});
