import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  buildWeeklyHypertrophyStimulusCardModel,
  WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE,
  WEEKLY_HYPERTROPHY_STIMULUS_CARD_TITLE,
} from "@/lib/ui/workouts/buildWeeklyHypertrophyStimulusCardModel";
import { WeeklyHypertrophyStimulusCard } from "@/lib/ui/workouts/WeeklyHypertrophyStimulusCard";
import { buildHypertrophyStimulusWeekSummary } from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusWeekSummary";

function seededWeekModel() {
  const summary = buildHypertrophyStimulusWeekSummary({
    weekStart: "2026-03-09",
    sessions: [
      {
        sessionId: "session-1",
        completedAt: "2026-03-10T12:00:00.000Z",
        sets: [
          { exerciseId: "bench_press", reps: 8, rpe: 8 },
          { exerciseId: "squat", reps: 5, rpe: 9 },
        ],
      },
    ],
  });
  return buildWeeklyHypertrophyStimulusCardModel(summary)!;
}

describe("WeeklyHypertrophyStimulusCard", () => {
  it("renders title, subtitle, regions, and workload bands", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyHypertrophyStimulusCard model={seededWeekModel()} />);
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain(WEEKLY_HYPERTROPHY_STIMULUS_CARD_TITLE);
    expect(json).toContain(WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE);
    expect(json).toContain("Top regions");
    expect(json).toContain("Weekly fatigue");
    expect(json).toContain("Recovery demand");
    expect(tree.root.findAllByProps({ testID: "weekly-hypertrophy-stimulus-card" }).length).toBeGreaterThan(0);
  });

  it("is not tappable without onPress", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyHypertrophyStimulusCard model={seededWeekModel()} />);
    });

    expect(() => tree.root.findByProps({ accessibilityRole: "button" })).toThrow();
  });

  it("is tappable with onPress and exposes accessible button label", async () => {
    const onPress = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyHypertrophyStimulusCard model={seededWeekModel()} onPress={onPress} />,
      );
    });

    const button = tree.root.findByProps({ accessibilityRole: "button" });
    expect(button.props.accessibilityLabel).toBe("Open weekly muscle stimulus details");
    await act(async () => {
      button.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders fallback note when provided", async () => {
    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-mixed",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "bench_press", reps: 8, rpe: 8 },
            { exerciseId: "pec_stretch", reps: 10, rpe: 7 },
            { exerciseId: "unknown_move", reps: 8, rpe: 8 },
          ],
        },
      ],
    });
    const model = buildWeeklyHypertrophyStimulusCardModel(summary)!;

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyHypertrophyStimulusCard model={model} />);
    });

    expect(
      tree.root.findAllByProps({ testID: "weekly-hypertrophy-stimulus-fallback-note" }).length,
    ).toBeGreaterThan(0);
  });
});
