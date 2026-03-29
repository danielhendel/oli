import React from "react";
import renderer, { act } from "react-test-renderer";
import type { WeeklyInsightsCardModel } from "@/lib/data/workouts/weeklyInsightsCardModel";
import { WeeklyInsightsCard } from "@/lib/ui/workouts/WeeklyInsightsCard";

describe("WeeklyInsightsCard", () => {
  it("invokes onInsightPress with the tapped insight", () => {
    const onInsightPress = jest.fn();
    const model: WeeklyInsightsCardModel = {
      insights: [
        {
          kind: "balance",
          message: "Quads vs hamstrings",
          destination: { section: "weekly_muscle_group", emphasis: "balance", muscleGroup: "quads" },
        },
      ],
      fallbackMessage: "",
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WeeklyInsightsCard model={model} onInsightPress={onInsightPress} />);
    });
    const btn = tree.root.findByProps({ accessibilityRole: "button" });
    act(() => {
      btn.props.onPress();
    });
    expect(onInsightPress).toHaveBeenCalledTimes(1);
    expect(onInsightPress.mock.calls[0][0].destination.section).toBe("weekly_muscle_group");
  });

  it("does not use button role when onInsightPress is omitted", () => {
    const model: WeeklyInsightsCardModel = {
      insights: [
        {
          kind: "trend",
          message: "Up",
          destination: { section: "weekly_strength", emphasis: "trend" },
        },
      ],
      fallbackMessage: "",
    };
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<WeeklyInsightsCard model={model} />);
    });
    expect(() => tree.root.findByProps({ accessibilityRole: "button" })).toThrow();
  });
});
