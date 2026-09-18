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

jest.mock("@/lib/ui/body/BodyMetricClassificationChart", () => {
  const React = require("react");
  return {
    BodyMetricClassificationChart: (props: {
      model: { segments: { label: string; formattedRange: string | null }[]; marker: unknown };
      testID?: string;
    }) =>
      React.createElement(
        "View",
        { testID: props.testID ?? "body-metric-classification-chart" },
        props.model.segments.map((s) =>
          React.createElement(
            "Text",
            { key: s.label },
            `${s.label} ${s.formattedRange ?? ""}`,
          ),
        ),
        props.model.marker
          ? React.createElement("Text", null, "MARKER")
          : null,
      ),
  };
});

jest.mock("@/lib/ui/body/BodyMetricUnclassifiedScaffold", () => {
  const React = require("react");
  return {
    BodyMetricUnclassifiedScaffold: (props: { testID?: string; accessibilityLabel: string }) =>
      React.createElement("View", {
        testID: props.testID ?? "body-metric-unclassified-scaffold",
        accessibilityLabel: props.accessibilityLabel,
      }),
  };
});

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

const connectionAction = { kind: "sync_now" as const, label: "Sync now" };

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

  it("renders three cards without landing subtitle", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          cards,
          appleHealthSlot: React.createElement("Text", null, "AH_SLOT"),
          connectionAction,
          onPressCard: jest.fn(),
          onPressAddWeight: jest.fn(),
          onPressConnectionAction: jest.fn(),
          onPressHref: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(text).not.toContain("Track weight, body fat, and lean tissue.");
    expect(tree.root.findAllByProps({ testID: "body-composition-purpose" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-metric-card-weight" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-bodyFat" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-leanTissue" })).toBeDefined();
    expect(text.indexOf("Weight")).toBeLessThan(text.indexOf("Body Fat"));
    expect(text.indexOf("Body Fat")).toBeLessThan(text.indexOf("Lean Tissue"));
  });

  it("shows Weight chart labels and omits BF/Lean classification charts", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          cards,
          appleHealthSlot: null,
          connectionAction,
          onPressCard: jest.fn(),
          onPressAddWeight: jest.fn(),
          onPressConnectionAction: jest.fn(),
          onPressHref: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(tree.root.findByProps({ testID: "body-metric-chart-weight" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-chart-bodyFat" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-chart-leanTissue" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "body-metric-scaffold-bodyFat" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-scaffold-leanTissue" })).toBeDefined();
    expect(text).toContain("Underweight");
    expect(text).toContain("Healthy Weight");
    expect(text).toContain("Overweight");
    expect(text).toContain("Obesity");
    expect(text).not.toContain("BMI SCREENING");
    expect(text).not.toContain("cdc-who-adult-bmi-screening");
    expect(text).not.toContain("No measurement yet");
    expect(text).not.toContain("Personal screening placement unavailable");
    expect(text).not.toMatch(/Optimal|Ideal|Target|Excellence|Body score/i);
  });

  it("keeps Add measurement left and Sync now right", () => {
    const onPressAddWeight = jest.fn();
    const onPressConnectionAction = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          cards,
          appleHealthSlot: React.createElement("Text", null, "CONNECT_AH"),
          connectionAction,
          onPressCard: jest.fn(),
          onPressAddWeight,
          onPressConnectionAction,
          onPressHref: jest.fn(),
        }),
      );
    });
    act(() => {
      tree.root.findByProps({ testID: "body-metric-add-weight" }).props.onPress({ stopPropagation: jest.fn() });
    });
    expect(onPressAddWeight).toHaveBeenCalledTimes(1);
    act(() => {
      tree.root
        .findByProps({ testID: "body-metric-connection-weight" })
        .props.onPress({ stopPropagation: jest.fn() });
    });
    expect(onPressConnectionAction).toHaveBeenCalledTimes(1);
    expect(collectText(tree)).toContain("Sync now");
    expect(collectText(tree)).toContain("Add measurement");
  });
});
