import {
  buildDefaultWorkoutProgramDraft,
  buildWorkoutBuilderModel,
  WORKOUT_PREVIEW_EXERCISE_IDS,
} from "@/lib/data/program/buildWorkoutBuilderModel";
import { PROGRAM_MUSCLE_TARGET_ORDER } from "@/lib/data/program/workoutBuilderTypes";

describe("buildDefaultWorkoutProgramDraft", () => {
  it("is deterministic", () => {
    expect(buildDefaultWorkoutProgramDraft()).toEqual(buildDefaultWorkoutProgramDraft());
  });

  it("includes the Programming-style 7-day seed schedule in order", () => {
    const draft = buildDefaultWorkoutProgramDraft();
    expect(draft.schedule.map((d) => d.weekday)).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
    expect(draft.schedule.map((d) => d.sessionName)).toEqual([
      "Upper A",
      "Lower A",
      "Cardio",
      "Upper B",
      "Cardio",
      "Lower B",
      "Full Body + VO₂",
    ]);
    expect(draft.schedule.map((d) => d.type)).toEqual([
      "upper",
      "lower",
      "cardio",
      "upper",
      "cardio",
      "lower",
      "full_body",
    ]);
  });

  it("includes the twelve weekly muscle volume targets", () => {
    const draft = buildDefaultWorkoutProgramDraft();
    expect(draft.volumeTargets.map((t) => t.muscle)).toEqual([...PROGRAM_MUSCLE_TARGET_ORDER]);
    expect(draft.volumeTargets).toHaveLength(12);
    for (const target of draft.volumeTargets) {
      expect(target.label.length).toBeGreaterThan(0);
      expect(target.targetSetsPerWeek).toBeGreaterThan(0);
    }
    // delts are split for programming volume planning
    const muscles = draft.volumeTargets.map((t) => t.muscle);
    expect(muscles).toEqual(expect.arrayContaining(["side_delts", "rear_delts", "front_delts"]));
  });
});

describe("buildWorkoutBuilderModel", () => {
  it("is deterministic for the default draft", () => {
    const a = buildWorkoutBuilderModel(buildDefaultWorkoutProgramDraft());
    const b = buildWorkoutBuilderModel(buildDefaultWorkoutProgramDraft());
    expect(a).toEqual(b);
  });

  it("surfaces the five named example exercise prescriptions with full detail", () => {
    const model = buildWorkoutBuilderModel(buildDefaultWorkoutProgramDraft());
    expect(model.exercisePreview.map((e) => e.id)).toEqual([...WORKOUT_PREVIEW_EXERCISE_IDS]);
    expect(model.exercisePreview.map((e) => e.name)).toEqual([
      "Incline DB Press",
      "Chest Supported Row",
      "Safety Bar Squat",
      "Bench Press",
      "Hack Squat",
    ]);
    for (const exercise of model.exercisePreview) {
      expect(exercise.sets).toBeGreaterThan(0);
      expect(exercise.reps.length).toBeGreaterThan(0);
      expect(exercise.tempo.length).toBeGreaterThan(0);
      expect(exercise.restSeconds).toBeGreaterThan(0);
      expect(exercise.rir).toBeGreaterThanOrEqual(0);
    }
  });

  it("derives day summaries with non-zero exercise and set counts", () => {
    const model = buildWorkoutBuilderModel(buildDefaultWorkoutProgramDraft());
    expect(model.daySummaries).toHaveLength(5);
    for (const day of model.daySummaries) {
      expect(day.exerciseCount).toBeGreaterThan(0);
      expect(day.estimatedSets).toBeGreaterThan(0);
      expect(day.editable).toBe(false);
    }
  });

  it("builds a review summary with save disabled and correct counts", () => {
    const model = buildWorkoutBuilderModel(buildDefaultWorkoutProgramDraft());
    const expectedWeeklySets = model.draft.days.reduce(
      (total, day) => total + day.exercises.reduce((s, e) => s + e.sets, 0),
      0,
    );
    expect(model.review.saveEnabled).toBe(false);
    expect(model.review.saveHint).toBe("Saving is coming soon");
    expect(model.review.trainingDays).toBe(5);
    expect(model.review.cardioSessions).toBe(2);
    expect(model.review.recoveryRestDays).toBe(0);
    expect(model.review.weeklySets).toBe(expectedWeeklySets);
  });
});
