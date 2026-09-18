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
          onPressCard: jest.fn(),
          onPressAddWeight: jest.fn(),
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

  it("does not render the dense educational hero sections", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          cards,
          appleHealthSlot: null,
          onPressCard: jest.fn(),
          onPressAddWeight: jest.fn(),
          onPressHref: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(text).not.toContain("Educational reference");
    expect(text).not.toContain("Health Protection");
    expect(text).not.toContain("Performance Support");
    expect(text).not.toContain("What determines Body Composition");
    expect(text).not.toContain("Evidence levels");
    expect(text).not.toContain("Central Adiposity");
    expect(text).not.toContain("Visceral Adiposity");
    expect(text).not.toContain("What influences Body Composition");
    expect(text).not.toContain("Open Plan");
    expect(text).toContain("Underweight");
    expect(text).toContain("Healthy Weight");
    expect(text).not.toMatch(/\bBelow\b/);
    expect(tree.root.findAllByProps({ testID: "body-composition-reference-model" })).toHaveLength(0);
  });

  it("keeps Apple Health below the metric cards and routes Add weight", () => {
    const onPressAddWeight = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionSummaryScreen, {
          cards,
          appleHealthSlot: React.createElement("Text", null, "CONNECT_AH"),
          onPressCard: jest.fn(),
          onPressAddWeight,
          onPressHref: jest.fn(),
        }),
      );
    });
    const text = collectText(tree);
    expect(text.indexOf("Lean Tissue")).toBeLessThan(text.indexOf("Add or connect measurements"));
    expect(text.indexOf("Add or connect measurements")).toBeLessThan(text.indexOf("CONNECT_AH"));
    act(() => {
      tree.root.findByProps({ testID: "body-composition-add-weight" }).props.onPress();
    });
    expect(onPressAddWeight).toHaveBeenCalledTimes(1);
  });
});
