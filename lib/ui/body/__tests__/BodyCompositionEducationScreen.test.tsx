import React from "react";
import renderer, { act } from "react-test-renderer";

import { BODY_COMPOSITION_EDUCATION_MODEL } from "@/lib/body/education/bodyCompositionEducationModel";
import { BodyCompositionEducationScreen } from "@/lib/ui/body/BodyCompositionEducationScreen";
import { BodyCompositionReferenceModelCard } from "@/lib/ui/body/BodyCompositionReferenceModelCard";

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

function renderEducation(overrides: {
  hasAnyExistingBodyMeasurement?: boolean;
  appleHealthSlot?: React.ReactNode;
  measurementsSlot?: React.ReactNode;
  onPressAddWeight?: () => void;
  onPressHref?: (href: string) => void;
  onPressOpenPlan?: () => void;
} = {}) {
  const onPressAddWeight = overrides.onPressAddWeight ?? jest.fn();
  const onPressHref = overrides.onPressHref ?? jest.fn();
  const onPressOpenPlan = overrides.onPressOpenPlan ?? jest.fn();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      React.createElement(BodyCompositionEducationScreen, {
        hasAnyExistingBodyMeasurement: overrides.hasAnyExistingBodyMeasurement ?? false,
        appleHealthSlot: overrides.appleHealthSlot ?? React.createElement("Text", null, "AH_SLOT"),
        measurementsSlot:
          overrides.measurementsSlot ?? React.createElement("Text", null, "MEASUREMENTS_SLOT"),
        onPressAddWeight,
        onPressHref,
        onPressOpenPlan,
      }),
    );
  });
  return { tree, onPressAddWeight, onPressHref, onPressOpenPlan };
}

describe("BodyCompositionEducationScreen", () => {
  it("renders purpose, educational reference, markers, tiers, baseline, trust, influences, and Plan", () => {
    const { tree } = renderEducation();
    const text = collectText(tree);
    expect(text).toContain(BODY_COMPOSITION_EDUCATION_MODEL.purpose);
    expect(text).toContain("Educational reference");
    expect(text).toContain("Health Protection");
    expect(text).toContain("Performance Support");
    expect(text).toContain("Central Adiposity");
    expect(text).toContain("Body Fat");
    expect(text).toContain("Lean Mass");
    expect(text).toContain("Visceral Adiposity");
    expect(text).toContain("Screening");
    expect(text).toContain("Composition");
    expect(text).toContain("Advanced");
    expect(text).toContain("Build your baseline");
    expect(text).toContain("Why the measurement method matters");
    expect(text).toContain("What influences Body Composition");
    expect(text).toContain("Open Plan");
    expect(tree.root.findByProps({ testID: "body-composition-reference-model" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-marker-section" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-evidence-tiers" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-baseline-section" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-measurement-trust" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-influence-section" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-composition-plan-boundary" })).toBeDefined();
  });

  it("places the educational reference before the Apple Health slot", () => {
    const { tree } = renderEducation({
      appleHealthSlot: React.createElement("Text", null, "APPLE_HEALTH_CONNECT_CARD"),
    });
    const text = collectText(tree);
    expect(text.indexOf("Educational reference")).toBeLessThan(
      text.indexOf("APPLE_HEALTH_CONNECT_CARD"),
    );
    expect(text.indexOf("Health Protection")).toBeLessThan(text.indexOf("APPLE_HEALTH_CONNECT_CARD"));
  });

  it("does not show a personal marker, score, rating, or recommendation", () => {
    const { tree } = renderEducation({ hasAnyExistingBodyMeasurement: true });
    const text = collectText(tree);
    expect(text).not.toMatch(/You are here|Body score|Optimized|Excellence|recommended for you/i);
    expect(tree.root.findAllByProps({ testID: "body-composition-personal-marker" })).toHaveLength(0);
  });

  it("does not promote a dead DEXA upload action", () => {
    const { tree } = renderEducation();
    const text = collectText(tree);
    expect(text).not.toMatch(/Upload DEXA/i);
    expect(text).toMatch(/not available in this release/i);
  });

  it("routes Open Plan and influence links", () => {
    const onPressHref = jest.fn();
    const onPressOpenPlan = jest.fn();
    const { tree } = renderEducation({ onPressHref, onPressOpenPlan });
    act(() => {
      tree.root.findByProps({ testID: "body-composition-open-plan" }).props.onPress();
    });
    expect(onPressOpenPlan).toHaveBeenCalledTimes(1);
    act(() => {
      tree.root.findByProps({ testID: "body-composition-influence-strength" }).props.onPress();
    });
    expect(onPressHref).toHaveBeenCalledWith("/(app)/workouts");
  });

  it("keeps education visible while measurements slot shows an error", () => {
    const { tree } = renderEducation({
      measurementsSlot: React.createElement("Text", null, "MEASUREMENT_LOAD_ERROR"),
    });
    const text = collectText(tree);
    expect(text).toContain("Educational reference");
    expect(text).toContain("MEASUREMENT_LOAD_ERROR");
  });
});

describe("BodyCompositionReferenceModelCard personalization invariant", () => {
  it("renders an identical educational reference across missing and partial fixtures", () => {
    const texts: string[] = [];
    for (const hasData of [false, true]) {
      let tree!: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          React.createElement(BodyCompositionEducationScreen, {
            hasAnyExistingBodyMeasurement: hasData,
            appleHealthSlot: null,
            measurementsSlot: React.createElement("Text", null, hasData ? "HAS_DATA" : "NO_DATA"),
            onPressAddWeight: jest.fn(),
            onPressHref: jest.fn(),
            onPressOpenPlan: jest.fn(),
          }),
        );
      });
      const ref = tree.root.findByProps({ testID: "body-composition-reference-model" });
      const refText = ref
        .findAllByType("Text")
        .flatMap((node) => node.children)
        .filter((x) => typeof x === "string")
        .join(" ");
      texts.push(refText);
      expect(tree.root.findAllByProps({ testID: "body-composition-personal-marker" })).toHaveLength(0);
      expect(refText).not.toMatch(/You are here|Body score|Optimized|Excellence/i);
    }
    expect(texts[0]).toBe(texts[1]);
  });

  it("exposes complete accessible summaries without decorative segment announcements", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(BodyCompositionReferenceModelCard, {
          educationalReferenceLabel: BODY_COMPOSITION_EDUCATION_MODEL.educationalReferenceLabel,
          independenceCopy: BODY_COMPOSITION_EDUCATION_MODEL.referenceIndependenceCopy,
          placementCopy: BODY_COMPOSITION_EDUCATION_MODEL.referencePlacementCopy,
          dimensions: BODY_COMPOSITION_EDUCATION_MODEL.dimensions,
        }),
      );
    });
    const summaries = tree.root.findAll(
      (node) => node.props.accessibilityRole === "summary",
    );
    expect(summaries).toHaveLength(2);
    expect(summaries[0].props.accessibilityLabel).toMatch(/No personal result is available/);
    expect(summaries[1].props.accessibilityLabel).toMatch(/No personal result is available/);
  });
});
