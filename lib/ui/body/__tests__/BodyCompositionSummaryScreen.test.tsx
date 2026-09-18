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

function collectText(test: renderer.ReactTestRenderer): string {
  return test.root
    .findAllByType("Text")
    .flatMap((node) => node.children)
    .filter((x) => typeof x === "string")
    .join(" ");
}

const connectionAction = { kind: "sync_now" as const, label: "Sync now" };

describe("BodyCompositionSummaryScreen", () => {
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

  it("renders purpose and exactly three primary metric cards in order", () => {
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
    expect(text).toContain("Track weight, body fat, and lean tissue.");
    expect(tree.root.findByProps({ testID: "body-metric-card-weight" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-bodyFat" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-card-leanTissue" })).toBeDefined();
    expect(text.indexOf("Weight")).toBeLessThan(text.indexOf("Body Fat"));
    expect(text.indexOf("Body Fat")).toBeLessThan(text.indexOf("Lean Tissue"));
    expect(text.indexOf("Weight")).toBeLessThan(text.indexOf("AH_SLOT"));
  });

  it("shows Weight CDC/WHO graph and omits Body Fat / Lean Tissue graphs", () => {
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
    expect(text).toContain("Underweight");
    expect(text).toContain("Healthy Weight");
    expect(text).toContain("Overweight");
    expect(text).toContain("Obesity");
    expect(tree.root.findByProps({ testID: "body-metric-bar-weight" })).toBeDefined();
    expect(tree.root.findAllByProps({ testID: "body-metric-bar-bodyFat" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "body-metric-bar-leanTissue" })).toHaveLength(0);
    expect(text).not.toContain("Educational reference");
    expect(text).not.toContain("Health Protection");
    expect(text).not.toContain("Performance Support");
    expect(text).not.toMatch(/\bBelow\b/);
    expect(text).not.toMatch(/Optimal|Ideal|Target|Excellence/i);
  });

  it("keeps Add measurement left and Sync now right on each card", () => {
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
    const text = collectText(tree);
    expect(text.indexOf("Lean Tissue")).toBeLessThan(text.indexOf("Add or connect measurements"));
    expect(text.indexOf("Add or connect measurements")).toBeLessThan(text.indexOf("CONNECT_AH"));

    const weightActions = tree.root.findByProps({ testID: "body-metric-actions-weight" });
    expect(weightActions.props.style.justifyContent).toBe("space-between");
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
