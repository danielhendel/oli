import React from "react";
import renderer, { act } from "react-test-renderer";

import { STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE } from "@/lib/data/workouts/strengthTodayCardModel";

import { StrengthTodayCard, type StrengthTodayMuscleGroupSelection } from "../StrengthTodayCard";

describe("StrengthTodayCard", () => {
  it("renders fallback subtitle and includes it in accessibilityLabel", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "completed",
            pill: "Completed",
            primaryTitle: "Back Day",
            durationLabel: "43 min",
            sectionEyebrow: "Completed Today",
            subtitle: STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE,
            workingVolume: null,
          }}
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain(STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE);
    const card = tree!.root.findByProps({ testID: "strength-today-card" });
    expect(card.props.accessibilityLabel).toContain(STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE);
    expect(card.props.accessibilityLabel).toContain("Back Day");
    expect(card.props.accessibilityLabel).toContain("43 min");
  });

  it("renders detailed subtitle when present and exposes it on accessibilityLabel", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "completed",
            pill: "Completed",
            primaryTitle: "Push",
            durationLabel: "40 min",
            sectionEyebrow: "Completed Today",
            subtitle: "12 sets · Chest focused",
            workingVolume: null,
          }}
        />,
      );
    });
    expect(JSON.stringify(tree!.toJSON())).toContain("12 sets · Chest focused");
    const card = tree!.root.findByProps({ testID: "strength-today-card" });
    expect(card.props.accessibilityLabel).toContain("12 sets · Chest focused");
    expect(tree!.root.findAllByProps({ testID: "strength-today-working-volume" })).toHaveLength(0);
  });

  it("hides working volume section when completed but workingVolume is null", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "completed",
            pill: "Completed",
            primaryTitle: "Legs",
            durationLabel: "50 min",
            sectionEyebrow: "Completed Today",
            subtitle: "8 sets · Quads focused",
            workingVolume: null,
          }}
        />,
      );
    });
    expect(tree!.root.findAllByProps({ testID: "strength-today-working-volume" })).toHaveLength(0);
  });

  it("renders compact muscle rows without progress bars and without a section title", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "completed",
            pill: "Completed",
            primaryTitle: "Pull",
            durationLabel: "40 min",
            sectionEyebrow: "Completed Today",
            subtitle: "12 sets · Back focused",
            workingVolume: {
              title: "Working Volume",
              rows: [
                { muscleGroup: "back", setCount: 9 },
                { muscleGroup: "biceps", setCount: 3 },
              ],
              exercisesByMuscleGroup: {
                back: [
                  { exerciseName: "Pull Up", setCount: 4 },
                  { exerciseName: "Barbell Row", setCount: 3 },
                  { exerciseName: "Lat Pulldown", setCount: 2 },
                ],
                biceps: [{ exerciseName: "Hammer Curl", setCount: 3 }],
              },
            },
          }}
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("strength-today-working-volume-back");
    expect(json).toContain("strength-today-working-volume-biceps");
    expect(json).toContain("9 sets");
    expect(json).toContain("3 sets");
    expect(json).toContain("\u203A");
    expect(tree!.root.findAllByType(require("react-native").Text).map((n) => n.props.children).flat()).not.toContain(
      "Working Volume",
    );
    expect(tree!.root.findAllByProps({ testID: "strength-today-working-volume-bar-back" })).toHaveLength(0);
    expect(tree!.root.findAllByProps({ testID: "strength-today-working-volume-bar-biceps" })).toHaveLength(0);

    const backRow = tree!.root.findByProps({ testID: "strength-today-working-volume-back" });
    expect(backRow.props.accessibilityRole).toBe("button");
    expect(backRow.props.accessibilityLabel).toContain("Back");
    expect(backRow.props.accessibilityLabel).toContain("9 sets");
  });

  it("fires onSelectMuscleGroup with the row's selection when pressed", async () => {
    const onSelectMuscleGroup = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "completed",
            pill: "Completed",
            primaryTitle: "Pull",
            durationLabel: "40 min",
            sectionEyebrow: "Completed Today",
            subtitle: "12 sets · Back focused",
            workingVolume: {
              title: "Working Volume",
              rows: [{ muscleGroup: "back", setCount: 9 }],
              exercisesByMuscleGroup: {
                back: [
                  { exerciseName: "Pull Up", setCount: 4 },
                  { exerciseName: "Barbell Row", setCount: 3 },
                  { exerciseName: "Lat Pulldown", setCount: 2 },
                ],
              },
            },
          }}
          onSelectMuscleGroup={onSelectMuscleGroup}
        />,
      );
    });
    const row = tree!.root.findByProps({ testID: "strength-today-working-volume-back" });
    await act(async () => {
      row.props.onPress();
    });
    expect(onSelectMuscleGroup).toHaveBeenCalledTimes(1);
    const selection: StrengthTodayMuscleGroupSelection = onSelectMuscleGroup.mock.calls[0]![0];
    expect(selection.muscleGroup).toBe("back");
    expect(selection.label).toBe("Back");
    expect(selection.totalSetCount).toBe(9);
    expect(selection.exercises).toEqual([
      { exerciseName: "Pull Up", setCount: 4 },
      { exerciseName: "Barbell Row", setCount: 3 },
      { exerciseName: "Lat Pulldown", setCount: 2 },
    ]);
  });

  it("rest state does not render working volume", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "rest",
            pill: "Rest",
            primaryTitle: "No workout today",
            durationLabel: "",
            subtitle: "Log a session when you train",
          }}
        />,
      );
    });
    expect(tree!.root.findAllByProps({ testID: "strength-today-working-volume" })).toHaveLength(0);
  });
});
