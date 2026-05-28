import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE,
  VOLUME_PER_MUSCLE_GROUP_CARD_TITLE,
  WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE,
  WEEKLY_VOLUME_CARD_TITLE,
  WEEKLY_VOLUME_EMPTY_WEEK_MESSAGE,
  WeeklyWorkingVolumeCard,
} from "@/lib/ui/workouts/WeeklyWorkingVolumeCard";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
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
  it('renders title as "Weekly Volume" and exposes it on accessibilityLabel', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={rows} />);
    });
    expect(WEEKLY_VOLUME_CARD_TITLE).toBe("Weekly Volume");
    expect(VOLUME_PER_MUSCLE_GROUP_CARD_TITLE).toBe(WEEKLY_VOLUME_CARD_TITLE);
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("Weekly Volume");
    expect(json).not.toContain("Volume per Muscle Group");
    expect(json).not.toContain("Weekly Working Volume");
    const card = tree!.root.findByProps({ testID: "weekly-working-volume-card" });
    expect(card.props.accessibilityLabel).toContain("Weekly Volume");
  });

  it('renders a muted "This Week" fallback subtitle when no week navigator is provided', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={rows} />);
    });
    expect(WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE).toBe("This Week");
    expect(VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE).toBe(WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE);
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
    // Navigator absent in standalone mode.
    expect(() => tree!.root.findByProps({ testID: "weekly-working-volume-nav" })).toThrow();
  });

  it("uses the shared Oli blue progress-bar fill (#4F7CFF) — same as Strength Baseline / Activity / Sleep", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={rows} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(ENERGY_BASELINE_FILL_COLOR.toLowerCase()).toBe("#4f7cff");
    expect(json).toContain(ENERGY_BASELINE_FILL_COLOR);
    expect(json).not.toContain(WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL);
    expect(json).not.toContain(WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL);
  });

  it("renders the Activity-style week navigator when weekRangeLabel is provided", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyWorkingVolumeCard
          rows={rows}
          weekRangeLabel={"May 24\u201330"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const label = tree!.root.findByProps({ testID: "weekly-working-volume-range-label" });
    expect(label.props.children).toBe("May 24\u201330");
    expect(label.props.accessibilityLabel).toBe("Week of May 24\u201330");
    expect(tree!.root.findByProps({ testID: "weekly-working-volume-nav" })).toBeDefined();
    expect(tree!.root.findByProps({ testID: "weekly-working-volume-nav-previous" })).toBeDefined();
    expect(tree!.root.findByProps({ testID: "weekly-working-volume-nav-next" })).toBeDefined();
    const json = JSON.stringify(tree!.toJSON());
    // Subtitle stack is replaced by the nav cluster — fallback subtitle must not appear.
    expect(json).not.toContain("weekly-working-volume-subtitle");
    const card = tree!.root.findByProps({ testID: "weekly-working-volume-card" });
    expect(card.props.accessibilityLabel).toBe(
      `${WEEKLY_VOLUME_CARD_TITLE}. Week of May 24\u201330.`,
    );
  });

  it("next chevron is disabled when canGoNext is false (current week)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyWorkingVolumeCard
          rows={rows}
          weekRangeLabel={"May 24\u201330"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const next = tree!.root.findByProps({ testID: "weekly-working-volume-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it("previous chevron press fires onPressPrevious", async () => {
    const onPressPrevious = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyWorkingVolumeCard
          rows={rows}
          weekRangeLabel={"May 24\u201330"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={onPressPrevious}
          onPressNext={jest.fn()}
        />,
      );
    });
    const prev = tree!.root.findByProps({ testID: "weekly-working-volume-nav-previous" });
    expect(prev.props.disabled).toBe(false);
    await act(async () => {
      prev.props.onPress();
    });
    expect(onPressPrevious).toHaveBeenCalledTimes(1);
  });

  it("renders the empty-week placeholder when rows are empty and nav cluster is present", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyWorkingVolumeCard
          rows={[]}
          weekRangeLabel={"May 17\u201323"}
          canGoPrevious
          canGoNext
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain(WEEKLY_VOLUME_EMPTY_WEEK_MESSAGE);
    expect(json).toContain("Weekly Volume");
    // Nav cluster still renders so the user can navigate back/forward.
    expect(tree!.root.findByProps({ testID: "weekly-working-volume-nav" })).toBeDefined();
  });

  it("does NOT render the empty-week placeholder in standalone mode (no nav cluster)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyWorkingVolumeCard rows={[]} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain(WEEKLY_VOLUME_EMPTY_WEEK_MESSAGE);
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
