import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { EXERCISE_CATALOG_V1 } from "../catalog";
import { getExerciseMeta } from "../metadata";

describe("exercise library v1", () => {
  it("has 450+ exercises", () => {
    expect(EXERCISE_LIBRARY_V1.length).toBeGreaterThanOrEqual(450);
  });

  it("has unique snake_case exerciseIds", () => {
    const ids = EXERCISE_LIBRARY_V1.map((x) => x.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
  });

  it("catalog matches library ids and names", () => {
    expect(EXERCISE_CATALOG_V1.length).toBe(EXERCISE_LIBRARY_V1.length);
    const byId = new Map(EXERCISE_LIBRARY_V1.map((x) => [x.exerciseId, x.name]));
    for (const item of EXERCISE_CATALOG_V1) {
      expect(byId.get(item.exerciseId)).toBe(item.name);
    }
  });

  it("every catalog item has metadata with stable primary bucket", () => {
    for (const item of EXERCISE_CATALOG_V1) {
      const meta = getExerciseMeta(item.exerciseId);
      expect(meta.primary).toMatch(
        /^(Chest|Back|Legs|Shoulders|Biceps|Triceps|Core|Full body)$/
      );
      expect(meta.cues.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });

  it("equipmentSubtype flows from library to metadata for Machine/CardioMachine", () => {
    expect(getExerciseMeta("machine_chest_press").equipmentSubtype).toBe("ChestPress");
    expect(getExerciseMeta("machine_leg_press_vertical").equipmentSubtype).toBe("LegPress");
    expect(getExerciseMeta("treadmill_run").equipmentSubtype).toBe("Treadmill");
    expect(getExerciseMeta("rower").equipmentSubtype).toBe("Rower");
    expect(getExerciseMeta("bench_press").equipmentSubtype).toBeUndefined();
  });
});
