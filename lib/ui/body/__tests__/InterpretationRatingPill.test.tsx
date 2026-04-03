import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";
import { Text } from "react-native";
import { InterpretationRatingPill } from "../InterpretationRatingPill";

describe("InterpretationRatingPill", () => {
  it("renders zone label text", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <InterpretationRatingPill
          bar={{
            marker01: 0.8,
            zone: "optimal",
            displayLabel: "Optimal",
            hasValue: true,
          }}
        />,
      );
    });
    expect(tree.root.findAllByType(Text).some((n) => n.props.children === "Optimal")).toBe(true);
  });

  it("renders No data when metric has no value", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <InterpretationRatingPill
          bar={{
            marker01: 0.5,
            zone: "fair",
            displayLabel: "No data",
            hasValue: false,
          }}
        />,
      );
    });
    expect(tree.root.findAllByType(Text).some((n) => n.props.children === "No data")).toBe(true);
  });
});
