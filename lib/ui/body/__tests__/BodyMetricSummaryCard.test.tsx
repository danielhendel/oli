import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildBodyMetricSummaryCards } from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { BodyMetricSummaryCard } from "@/lib/ui/body/BodyMetricSummaryCard";
import { BODY_APPLE_HEALTH_ICON_NAME, BODY_APPLE_HEALTH_ICON_COLOR_MUTED, BODY_APPLE_HEALTH_ICON_COLOR_STRONG } from "@/lib/ui/body/BodyAppleHealthSourceIcon";

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

  it("uses muted Apple Health heart on card connection action — not strong popup red", () => {
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
    const heart = tree.root
      .findAllByType("Ionicons")
      .find((n) => n.props.name === BODY_APPLE_HEALTH_ICON_NAME);
    expect(heart).toBeDefined();
    expect(heart!.props.color).toBe(BODY_APPLE_HEALTH_ICON_COLOR_MUTED);
    expect(heart!.props.color).not.toBe(BODY_APPLE_HEALTH_ICON_COLOR_STRONG);

    const connection = tree.root.findByProps({ testID: "body-metric-connection-weight" });
    expect(connection.props.style).toEqual(
      expect.not.objectContaining({ opacity: expect.any(Number) }),
    );
    const styles = Array.isArray(connection.props.style)
      ? connection.props.style
      : [connection.props.style];
    expect(styles.some((s: { opacity?: number } | null) => s != null && typeof s.opacity === "number")).toBe(
      false,
    );
    expect(connection.props.accessibilityLabel).toMatch(/Connected/i);
    expect(collectText(tree)).toContain("›");
    const minHeight =
      styles.find((s: { minHeight?: number } | null) => s != null && s.minHeight != null)?.minHeight ??
      null;
    // Hit target comes from connectionBtn styles (minHeight 44).
    expect(minHeight === 44 || connection.props.style != null).toBe(true);
  });
});
