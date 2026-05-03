import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import type { StrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { buildStrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE } from "../strengthBaselineCopy";
import { StrengthBaselineCard } from "../StrengthBaselineCard";

const model: StrengthBaselineCardModel = buildStrengthBaselineCardModel({
  strengthCalendarDays: [
    {
      day: "2026-04-20" as const,
      workouts: [
        {
          id: "a",
          observedAt: "2026-04-20T10:00:00.000Z",
          sourceId: "apple_health",
          title: "Lift",
          workoutType: "strength" as const,
          start: "2026-04-20T10:00:00.000Z",
          end: "2026-04-20T10:30:00.000Z",
          durationMinutes: 30,
          calories: null,
        },
      ],
    },
  ],
  todayDayKey: "2026-04-21" as const,
});

describe("StrengthBaselineCard", () => {
  it("renders title, bar, 0–7 marker row, and the fixed definition sentence", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthBaselineCard loading={false} model={model} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("Strength Baseline");
    expect(json).toContain("strength-baseline-frequency-bar");
    expect(json).toContain("strength-baseline-frequency-markers");
    expect(json).toContain("90 Day Avg");
    for (const d of [0, 1, 2, 3, 4, 5, 6, 7] as const) {
      expect(json).toContain(`"children":["${d}"]`);
    }
    expect(json).toContain(STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE);
    expect(json).toContain("/wk");
    expect(json).toContain("wo");
    expect(json).toContain("min/wk");
    expect(json).not.toContain("workouts / week");
  });

  it("uses semantic text tokens for the baseline row label/value and footer explainer", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthBaselineCard loading={false} model={model} />);
    });
    const label = tree!.root.findByProps({ children: "90 Day Avg" });
    expect(StyleSheet.flatten(label.props.style).color).toBe(UI_TEXT_PRIMARY);
    const value = tree!.root.findByProps({ children: model.compactValuePrimary });
    expect(StyleSheet.flatten(value.props.style).color).toBe(UI_TEXT_PRIMARY);
    const footer = tree!.root.findByProps({ children: STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE });
    expect(StyleSheet.flatten(footer.props.style).color).toBe(UI_TEXT_SECONDARY);
  });
});
