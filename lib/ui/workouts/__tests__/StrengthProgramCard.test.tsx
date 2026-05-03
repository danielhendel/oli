import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet } from "react-native";

import { PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL } from "@/lib/ui/workouts/programPrimaryCtaBarStyles";
import { StrengthProgramCard } from "@/lib/ui/workouts/StrengthProgramCard";

describe("StrengthProgramCard", () => {
  it("renders Program header, empty state title, body copy, and Create Program CTA", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrengthProgramCard onCreateProgram={jest.fn()} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Program");
    expect(json).toContain("No Active Program");
    expect(json).toContain("Create Program");
    expect(json).toContain(
      "Create a structured plan to track progress, progressive overload, and consistency.",
    );
  });

  it("calls onCreateProgram when CTA is pressed", () => {
    const onCreateProgram = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrengthProgramCard onCreateProgram={onCreateProgram} />);
    });
    const cta = tree.root.findByProps({ testID: "strength-program-card-create" });
    act(() => {
      cta.props.onPress();
    });
    expect(onCreateProgram).toHaveBeenCalledTimes(1);
  });

  it("exposes button accessibility on the primary CTA", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrengthProgramCard onCreateProgram={jest.fn()} />);
    });
    const cta = tree.root.findByProps({ testID: "strength-program-card-create" });
    expect(cta.props.accessibilityRole).toBe("button");
    expect(typeof cta.props.accessibilityLabel).toBe("string");
    expect((cta.props.accessibilityLabel as string).length).toBeGreaterThan(0);
  });

  it("uses PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL for card horizontal inset (This Week alignment)", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrengthProgramCard onCreateProgram={jest.fn()} />);
    });
    const card = tree.root.findByProps({ testID: "strength-program-card" });
    const flat = StyleSheet.flatten(card.props.style ?? {});
    expect(flat.paddingHorizontal).toBe(PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL);
  });
});
