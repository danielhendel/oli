import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE,
  VOLUME_PER_MUSCLE_GROUP_CARD_TITLE,
  WeeklyWorkingVolumeCard,
} from "@/lib/ui/workouts/WeeklyWorkingVolumeCard";
import {
  WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL,
  WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL,
} from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import type { WorkoutDetailMuscleRowSelection } from "@/lib/ui/workouts/WorkoutDetailMuscleSetVolumeRows";

const rows = [
  { muscleGroup: "back" as const, setCount: 9 },
  { muscleGroup: "biceps" as const, setCount: 3 },
];
const exercisesByMuscleGroup = {
  back: [
    { exerciseName: "Pull Up", setCount: 4 },
    { exerciseName: "Barbell Row", setCount: 3 },
    { exerciseName: "Lat Pulldown", setCount: 2 },
  ],
  biceps: [{ exerciseName: "Hammer Curl", setCount: 3 }],
};

describe("WeeklyWorkingVolumeCard", () => {
  it('renders title as "Volume per Muscle Group" and exposes it on accessibilityLabel', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={rows} />);
    });
    expect(VOLUME_PER_MUSCLE_GROUP_CARD_TITLE).toBe("Volume per Muscle Group");
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("Volume per Muscle Group");
    expect(json).not.toContain("Weekly Working Volume");
    const card = tree!.root.findByProps({ testID: "weekly-working-volume-card" });
    expect(card.props.accessibilityLabel).toContain("Volume per Muscle Group");
  });

  it('renders a muted "This Week" subtitle directly under the title', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={rows} />);
    });
    expect(VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE).toBe("This Week");
    const subtitle = tree!.root.findByProps({ testID: "weekly-working-volume-subtitle" });
    expect(subtitle.props.children).toBe("This Week");
    expect(subtitle.props.style).toEqual(
      expect.objectContaining({
        fontSize: 14,
        lineHeight: 20,
        fontWeight: "400",
        letterSpacing: -0.08,
      }),
    );
    const card = tree!.root.findByProps({ testID: "weekly-working-volume-card" });
    expect(card.props.accessibilityLabel).toContain("This Week");
  });

  it("uses the neutral progress-bar fill (not strength green)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={rows} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain(WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL);
    expect(json).not.toContain(WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL);
  });

  it("renders a chevron next to each set count when onSelectMuscleGroup is provided", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyWorkingVolumeCard
          rows={rows}
          exercisesByMuscleGroup={exercisesByMuscleGroup}
          onSelectMuscleGroup={jest.fn()}
        />,
      );
    });
    const backRow = tree!.root.findByProps({ testID: "weekly-working-volume-back" });
    expect(backRow.props.accessibilityRole).toBe("button");
    expect(backRow.props.accessibilityLabel).toContain("Back");
    expect(backRow.props.accessibilityLabel).toContain("9 sets");
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("\u203A");
  });

  it("does NOT render chevrons or interactive rows when no onSelectMuscleGroup is provided", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={rows} />);
    });
    const backRow = tree!.root.findByProps({ testID: "weekly-working-volume-back" });
    expect(backRow.props.accessibilityRole).toBeUndefined();
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain("\u203A");
  });

  it("fires onSelectMuscleGroup with the correct selection on full-row press", async () => {
    const onSelectMuscleGroup = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyWorkingVolumeCard
          rows={rows}
          exercisesByMuscleGroup={exercisesByMuscleGroup}
          onSelectMuscleGroup={onSelectMuscleGroup}
        />,
      );
    });
    const backRow = tree!.root.findByProps({ testID: "weekly-working-volume-back" });
    await act(async () => {
      backRow.props.onPress();
    });
    expect(onSelectMuscleGroup).toHaveBeenCalledTimes(1);
    const selection: WorkoutDetailMuscleRowSelection = onSelectMuscleGroup.mock.calls[0]![0];
    expect(selection.muscleGroup).toBe("back");
    expect(selection.label).toBe("Back");
    expect(selection.totalSetCount).toBe(9);
    expect(selection.exercises).toEqual(exercisesByMuscleGroup.back);
  });

  it("falls back to an empty exercise list when no breakdown is provided for the muscle", async () => {
    const onSelectMuscleGroup = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyWorkingVolumeCard rows={rows} onSelectMuscleGroup={onSelectMuscleGroup} />,
      );
    });
    const backRow = tree!.root.findByProps({ testID: "weekly-working-volume-back" });
    await act(async () => {
      backRow.props.onPress();
    });
    const selection: WorkoutDetailMuscleRowSelection = onSelectMuscleGroup.mock.calls[0]![0];
    expect(selection.exercises).toEqual([]);
  });
});
