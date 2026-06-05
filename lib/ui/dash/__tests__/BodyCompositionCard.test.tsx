import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

import type { BuiltBodyCompositionDashCard } from "@/lib/data/dash/buildBodyCompositionDashCardModel";
import { BODY_METRIC_RANGES_EXPLAINER_HREF } from "@/lib/data/body/bodyCompositionMetricRoutes";
import { BodyCompositionCard } from "@/lib/ui/dash/BodyCompositionCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

const goalsHref = "/(app)/body/settings";

const sampleReadyBuilt: BuiltBodyCompositionDashCard = {
  tag: "ready",
  weightPrimaryLabel: "159 lb",
  readingAsOfLabel: "As of today",
  rows: [
    {
      key: "bmi",
      label: "BMI",
      valueLabel: "23.1",
      bar: {
        marker01: 0.72,
        zone: "good",
        displayLabel: "Good",
        hasValue: true,
      },
      accessibilityLabel: "Open BMI ranges.",
    },
    {
      key: "bodyFat",
      label: "Body Fat",
      valueLabel: "18.0%",
      bar: {
        marker01: 0.65,
        zone: "fair",
        displayLabel: "Fair",
        hasValue: true,
      },
      accessibilityLabel: "Open Body Fat ranges.",
    },
    {
      key: "leanMass",
      label: "Lean Mass",
      valueLabel: "130.4 lb",
      bar: {
        marker01: 0.55,
        zone: "optimal",
        displayLabel: "Optimal",
        hasValue: true,
      },
      accessibilityLabel: "Open Lean ranges.",
    },
  ],
  cardAccessibilityLabel: "Body composition card.",
};

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("BodyCompositionCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders header, weight value, reading subtitle, and metric rows when ready", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={sampleReadyBuilt}
        />,
      );
    });
    const text = collectAllText(test);
    expect(text).toContain("Body Composition");
    expect(text).toContain("My goal");
    expect(text).toContain("159 lb");
    expect(text).toContain("As of today");
    expect(text).toContain("BMI");
    expect(text).toContain("Body Fat");
    expect(text).toContain("Lean Mass");
    expect(text).toContain("23.1");
    expect(text).toContain("18.0%");
    expect(text).toContain("130.4 lb");
  });

  it("does not render Optimal range/status pills", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={sampleReadyBuilt}
        />,
      );
    });
    const text = collectAllText(test);
    expect(text).not.toContain("Optimal");
    expect(text).not.toContain("Good");
    expect(text).not.toContain("Fair");
  });

  it("renders the weight value", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={sampleReadyBuilt}
        />,
      );
    });
    const weight = test.root.findByProps({ testID: "body-composition-weight-primary" });
    expect(weight.children).toContain("159 lb");
  });

  it("tapping the weight value navigates to the Body Composition page", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={sampleReadyBuilt}
        />,
      );
    });
    const press = test.root.findByProps({ testID: "body-composition-weight-press" });
    expect(press.props.accessibilityRole).toBe("button");
    expect(press.props.accessibilityLabel).toBe("Open Body Composition");
    press.props.onPress();
    expect(mockPush).toHaveBeenCalledWith("/(app)/body");
  });

  it("shows loading copy while hydrating", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={null}
        />,
      );
    });
    expect(collectAllText(test)).toContain("Loading body composition");
  });

  it("shows inline error when upstream fails", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error="Offline"
          hasUser
          goalsHref={goalsHref}
          built={null}
        />,
      );
    });
    expect(collectAllText(test)).toContain("Offline");
  });

  it("shows empty copy when metrics are missing", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={{
            tag: "missing",
            cardAccessibilityLabel: "Body composition. Add body data to see your composition.",
          }}
        />,
      );
    });
    expect(collectAllText(test)).toContain("Add body data to see your composition.");
  });

  it("metric row opens modal explainer route", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={sampleReadyBuilt}
        />,
      );
    });
    const row = test.root.findByProps({ testID: "body-composition-row-bmi" });
    row.props.onPress();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: BODY_METRIC_RANGES_EXPLAINER_HREF,
      params: { metric: "bmi" },
    });
  });

  it("My goal navigates to goalsHref", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BodyCompositionCard
          loading={false}
          error={null}
          hasUser
          goalsHref={goalsHref}
          built={sampleReadyBuilt}
        />,
      );
    });
    const btn = test.root.findByProps({ testID: "body-composition-my-goal" });
    btn.props.onPress();
    expect(mockPush).toHaveBeenCalledWith(goalsHref);
  });
});
