import React from "react";
import renderer, { act } from "react-test-renderer";

import { StrengthBaselineCard } from "../StrengthBaselineCard";
import type { StrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { buildStrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE } from "../strengthBaselineCopy";

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
});
