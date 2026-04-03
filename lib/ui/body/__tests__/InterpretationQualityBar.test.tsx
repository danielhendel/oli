import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";
import { View } from "react-native";
import {
  InterpretationQualityBar,
  interpretationBarAccessibilityLabel,
} from "../InterpretationQualityBar";

describe("interpretationBarAccessibilityLabel", () => {
  it("describes interpretation and marker percent when valued", () => {
    const label = interpretationBarAccessibilityLabel(
      {
        marker01: 0.62,
        zone: "good",
        displayLabel: "Good",
        hasValue: true,
      },
      "Weight",
    );
    expect(label).toContain("Weight interpretation: Good");
    expect(label).toMatch(/62 percent/);
  });

  it("uses no-measurement copy when hasValue is false", () => {
    expect(
      interpretationBarAccessibilityLabel(
        {
          marker01: 0.5,
          zone: "fair",
          displayLabel: "No data",
          hasValue: false,
        },
        "BMI",
      ),
    ).toBe("BMI: no measurement; interpretation not available.");
  });
});

describe("InterpretationQualityBar", () => {
  it("does not render a separate rating label under the track", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <InterpretationQualityBar
          bar={{
            marker01: 0.62,
            zone: "good",
            displayLabel: "Good",
            hasValue: true,
          }}
        />,
      );
    });
    const texts = tree.root.findAllByType("Text");
    expect(texts.length).toBe(0);
  });

  it("exposes onLayout on the track wrapper for width-driven dot placement", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <InterpretationQualityBar
          bar={{
            marker01: 0,
            zone: "out_of_range",
            displayLabel: "Out of range",
            hasValue: true,
          }}
        />,
      );
    });
    const withLayout = tree.root.findAllByType(View).find((v) => typeof v.props.onLayout === "function");
    expect(withLayout).toBeDefined();
  });
});
