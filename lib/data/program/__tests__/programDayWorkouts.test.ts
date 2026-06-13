import {
  assignExerciseSlotsToTrainingDays,
  spreadTrainingDays,
} from "@/lib/data/program/assignExerciseSlotsToTrainingDays";
import {
  buildProgramDayMoveTargets,
  buildProgramDayWorkouts,
} from "@/lib/data/program/buildProgramDayWorkouts";
import { buildProgrammingPrescription } from "@/lib/data/program/buildProgrammingPrescription";
import { getExerciseSwapOptions } from "@/lib/data/program/getExerciseSwapOptions";
import { getProgramExerciseDetails } from "@/lib/data/program/getProgramExerciseDetails";
import {
  clearProgramExerciseSlotDay,
  moveProgramExerciseSlotToDay,
} from "@/lib/data/program/moveProgramExerciseSlotToDay";
import { searchProgramExerciseOptions } from "@/lib/data/program/searchProgramExerciseOptions";
import { EXERCISE_LIBRARY_V1 } from "@/lib/workouts/exercises/library.v1";
import type { ProgrammingInputs } from "@/lib/data/program/programmingEngineTypes";

const SAMPLE_INPUTS: ProgrammingInputs = {
  sex: "male",
  age: 28,
  trainingLevel: "intermediate",
  trainingDays: 4,
  goal: "build_muscle",
  trainingType: "hypertrophy",
};

describe("spreadTrainingDays", () => {
  it("spreads frequency across the week (non-consecutive when possible)", () => {
    expect(spreadTrainingDays(4, 2)).toEqual([1, 3]);
    expect(spreadTrainingDays(6, 3)).toEqual([1, 3, 5]);
    expect(spreadTrainingDays(6, 2)).toEqual([1, 4]);
  });

  it("falls back to consecutive days only when frequency leaves no room", () => {
    expect(spreadTrainingDays(4, 3)).toEqual([1, 2, 3]);
    expect(spreadTrainingDays(3, 3)).toEqual([1, 2, 3]);
  });

  it("clamps frequency to the available day count and never duplicates", () => {
    const result = spreadTrainingDays(3, 5);
    expect(result).toEqual([1, 2, 3]);
    expect(new Set(result).size).toBe(result.length);
  });

  it("returns nothing for non-positive inputs", () => {
    expect(spreadTrainingDays(0, 2)).toEqual([]);
    expect(spreadTrainingDays(4, 0)).toEqual([]);
  });
});

describe("assignExerciseSlotsToTrainingDays", () => {
  it("assigns every trained slot to a valid split day", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);
    const assignment = assignExerciseSlotsToTrainingDays({ prescription });
    const validDayIds = new Set(prescription.weeklySplit.days.map((d) => d.id));
    expect(Object.keys(assignment).length).toBeGreaterThan(0);
    for (const entry of Object.values(assignment)) {
      expect(validDayIds.has(entry.dayId)).toBe(true);
      expect(entry.source).toBe("engine");
    }
  });

  it("spreads a multi-slot muscle group across distinct, non-consecutive days", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS, {
      muscleVolume: { upper_chest: 12 },
      frequency: { upper_chest: 2 },
    });
    const assignment = assignExerciseSlotsToTrainingDays({
      prescription,
      exerciseCountOverrides: { upper_chest: 2 },
    });
    const slot1 = assignment["upper_chest-slot-1"]!;
    const slot2 = assignment["upper_chest-slot-2"]!;
    expect(slot1.dayId).not.toBe(slot2.dayId);
    const index1 = prescription.weeklySplit.days.findIndex((d) => d.id === slot1.dayId);
    const index2 = prescription.weeklySplit.days.findIndex((d) => d.id === slot2.dayId);
    // Non-back-to-back: at least one rest day between the two exposures.
    expect(Math.abs(index1 - index2)).toBeGreaterThanOrEqual(2);
  });

  it("keeps day totals balanced — no training day is left empty", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);
    const workouts = buildProgramDayWorkouts({ prescription });
    for (const day of workouts) {
      expect(day.exerciseCount).toBeGreaterThan(0);
      expect(day.totalSets).toBeGreaterThan(0);
    }
  });

  it("splits high volume across multiple slots and multiple days", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS, {
      muscleVolume: { upper_chest: 20 },
      frequency: { upper_chest: 3 },
    });
    const assignment = assignExerciseSlotsToTrainingDays({
      prescription,
      exerciseCountOverrides: { upper_chest: 3 },
    });
    const days = new Set(
      Object.entries(assignment)
        .filter(([slotId]) => slotId.startsWith("upper_chest-slot-"))
        .map(([, entry]) => entry.dayId),
    );
    expect(days.size).toBeGreaterThanOrEqual(2);
  });

  it("manual slot→day moves win and are flagged manual", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS, {
      muscleVolume: { upper_chest: 12 },
      frequency: { upper_chest: 2 },
    });
    const assignment = assignExerciseSlotsToTrainingDays({
      prescription,
      exerciseCountOverrides: { upper_chest: 2 },
      slotDayOverrides: { upper_chest: { "upper_chest-slot-1": "day-4" } },
    });
    expect(assignment["upper_chest-slot-1"]).toEqual({ dayId: "day-4", source: "manual" });
  });
});

describe("buildProgramDayWorkouts", () => {
  it("returns one workout per split day with totals", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);
    const workouts = buildProgramDayWorkouts({ prescription });
    expect(workouts).toHaveLength(prescription.weeklySplit.days.length);
    workouts.forEach((day, index) => {
      expect(day.dayIndex).toBe(index + 1);
      expect(day.exerciseCount).toBe(day.slots.length);
      expect(day.totalSets).toBe(day.slots.reduce((sum, slot) => sum + slot.sets, 0));
    });
  });

  it("preserves manual exercise selections after day assignment", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);
    const workouts = buildProgramDayWorkouts({
      prescription,
      exerciseSelectionOverrides: { upper_chest: { "upper_chest-slot-1": "incline_bench_press" } },
    });
    const selected = workouts
      .flatMap((day) => day.slots)
      .find((slot) => slot.slotId === "upper_chest-slot-1");
    expect(selected?.selectedExerciseId).toBe("incline_bench_press");
    expect(selected?.source).toBe("manual");
  });

  it("moves a slot to a new day: it leaves the old day and appears on the new day", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS, {
      muscleVolume: { upper_chest: 12 },
      frequency: { upper_chest: 2 },
    });
    const base = buildProgramDayWorkouts({
      prescription,
      exerciseCountOverrides: { upper_chest: 2 },
    });
    const originalDay = base.find((day) =>
      day.slots.some((slot) => slot.slotId === "upper_chest-slot-2"),
    )!;
    expect(originalDay.dayId).not.toBe("day-2");

    const moved = buildProgramDayWorkouts({
      prescription,
      exerciseCountOverrides: { upper_chest: 2 },
      slotDayOverrides: { upper_chest: { "upper_chest-slot-2": "day-2" } },
    });
    const day2 = moved.find((day) => day.dayId === "day-2")!;
    const oldDay = moved.find((day) => day.dayId === originalDay.dayId)!;
    const movedSlot = day2.slots.find((slot) => slot.slotId === "upper_chest-slot-2");
    expect(movedSlot).toBeTruthy();
    expect(movedSlot!.dayAssignmentSource).toBe("manual");
    expect(oldDay.slots.some((slot) => slot.slotId === "upper_chest-slot-2")).toBe(false);
  });

  it("buildProgramDayMoveTargets flags the current day", () => {
    const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);
    const targets = buildProgramDayMoveTargets(prescription, "day-2");
    expect(targets).toHaveLength(prescription.weeklySplit.days.length);
    expect(targets.find((t) => t.dayId === "day-2")!.isCurrent).toBe(true);
    expect(targets.filter((t) => t.isCurrent)).toHaveLength(1);
  });
});

describe("moveProgramExerciseSlotToDay (pure reducer)", () => {
  it("records and clears a slot→day move immutably", () => {
    const moved = moveProgramExerciseSlotToDay({}, "upper_chest", "upper_chest-slot-1", "day-3");
    expect(moved.upper_chest?.["upper_chest-slot-1"]).toBe("day-3");

    const cleared = clearProgramExerciseSlotDay(moved, "upper_chest", "upper_chest-slot-1");
    expect(cleared.upper_chest).toBeUndefined();
  });
});

describe("searchProgramExerciseOptions", () => {
  const options = getExerciseSwapOptions({
    muscleGroupId: "upper_chest",
    trainingType: "hypertrophy",
    trainingLevel: "intermediate",
  });
  const getDetails = (id: string) => getProgramExerciseDetails(id);

  it("returns all options for a blank query (muscle filter stays active)", () => {
    expect(searchProgramExerciseOptions({ options, getDetails, query: "" })).toEqual(options);
    expect(searchProgramExerciseOptions({ options, getDetails, query: "   " })).toEqual(options);
  });

  it("filters by exercise name", () => {
    const result = searchProgramExerciseOptions({ options, getDetails, query: "incline" });
    expect(result.length).toBeGreaterThan(0);
    for (const option of result) {
      expect(option.name.toLowerCase()).toContain("incline");
    }
    expect(result.some((o) => o.exerciseId === "incline_bench_press")).toBe(true);
  });

  it("filters by truthful detail fields (equipment)", () => {
    const result = searchProgramExerciseOptions({ options, getDetails, query: "dumbbell" });
    expect(result.length).toBeGreaterThan(0);
    for (const option of result) {
      const item = EXERCISE_LIBRARY_V1.find((x) => x.exerciseId === option.exerciseId)!;
      expect(item.equipment).toBe("Dumbbell");
    }
  });

  it("returns no matches for an unrelated query", () => {
    expect(
      searchProgramExerciseOptions({ options, getDetails, query: "zzzznotanexercise" }),
    ).toHaveLength(0);
  });

  it("preserves stable exercise ids (never renames)", () => {
    const result = searchProgramExerciseOptions({ options, getDetails, query: "press" });
    for (const option of result) {
      expect(option.exerciseId).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
      expect(EXERCISE_LIBRARY_V1.some((x) => x.exerciseId === option.exerciseId)).toBe(true);
    }
  });
});
