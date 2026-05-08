import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";
import { Text, View } from "react-native";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";
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
    const shell = tree.root.findByType(View);
    expect(shell.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[4].pillBg }),
      ]),
    );
    const label = tree.root.findAllByType(Text).find((n) => n.props.children === "Optimal");
    expect(label?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[4].pillFg }),
      ]),
    );
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
