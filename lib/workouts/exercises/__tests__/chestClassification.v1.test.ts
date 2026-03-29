import type { ChestExerciseClassificationV1 } from "../classificationTypes";
import type { ChestMovementPattern } from "../classificationTypes";
import {
  CHEST_CLASSIFICATION_BY_EXERCISE_ID,
  listChestClassificationExerciseIds,
} from "../classifications.v1";
import {
  getLibraryChestExerciseIds,
  mergeExerciseIntelligenceForId,
  resolveChestClassification,
  validateChestClassificationRegistry,
} from "../classificationResolvers";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseMuscleContributions } from "../muscleContributions";

const CHEST_PATTERNS: ReadonlySet<ChestMovementPattern> = new Set([
  "horizontal_press",
  "incline_press",
  "decline_press",
  "fly_adduction",
  "cable_crossover",
  "push_up",
  "floor_press",
  "pullover",
  "mobility_stretch",
  "power_chest_throw",
]);

const EVIDENCE: ReadonlySet<ChestExerciseClassificationV1["evidenceLevel"]> = new Set([
  "library_derived",
  "heuristic",
  "expert_curated",
]);

const LATERALITY: ReadonlySet<ChestExerciseClassificationV1["laterality"]> = new Set([
  "bilateral",
  "alternating",
  "unilateral_each_side",
]);

const LOAD: ReadonlySet<ChestExerciseClassificationV1["loadModality"]> = new Set([
  "barbell",
  "dumbbell",
  "machine_selectorized",
  "machine_smith",
  "cable",
  "band",
  "bodyweight",
  "bodyweight_rings",
  "kettlebell",
  "medicine_ball",
  "other",
]);

const COMPOUND: ReadonlySet<ChestExerciseClassificationV1["compoundIsolation"]> = new Set([
  "compound",
  "isolation",
  "mixed",
]);

const PLANE: ReadonlySet<ChestExerciseClassificationV1["plane"]> = new Set([
  "horizontal",
  "incline",
  "decline",
  "transverse_adduction",
  "multi",
  "na",
]);

const JOINT: ReadonlySet<ChestExerciseClassificationV1["jointsPrimary"][number]> = new Set([
  "shoulder",
  "elbow",
  "wrist",
  "scapulothoracic",
  "spine",
  "hip",
  "knee",
  "ankle",
]);

function assertValidClassificationRow(id: string, row: ChestExerciseClassificationV1): void {
  expect(row.schemaVersion).toBe(1);
  expect(row.categoryKey).toBe("chest");
  expect(row.primaryMuscleGroup).toBe("chest");
  expect(EVIDENCE.has(row.evidenceLevel)).toBe(true);
  expect(CHEST_PATTERNS.has(row.primaryPattern)).toBe(true);
  if (row.secondaryPatterns) {
    for (const p of row.secondaryPatterns) {
      expect(CHEST_PATTERNS.has(p)).toBe(true);
    }
  }
  expect(LATERALITY.has(row.laterality)).toBe(true);
  expect(LOAD.has(row.loadModality)).toBe(true);
  expect(COMPOUND.has(row.compoundIsolation)).toBe(true);
  expect(PLANE.has(row.plane)).toBe(true);
  expect(row.jointsPrimary.length).toBeGreaterThan(0);
  for (const j of row.jointsPrimary) {
    expect(JOINT.has(j)).toBe(true);
  }
}

describe("chest classification v1", () => {
  it("registry matches every library exercise with primaryBucket Chest", () => {
    expect(validateChestClassificationRegistry()).toEqual([]);
    const libChest = getLibraryChestExerciseIds();
    const reg = listChestClassificationExerciseIds();
    expect(reg.length).toBe(libChest.length);
    expect(reg).toEqual(libChest);
  });

  it("every chest row passes enum / shape validation", () => {
    for (const id of listChestClassificationExerciseIds()) {
      const row = CHEST_CLASSIFICATION_BY_EXERCISE_ID[id];
      expect(row).toBeDefined();
      assertValidClassificationRow(id, row!);
    }
  });

  it("preferExistingMuscleContributionMap is true only where contributions exist", () => {
    for (const id of listChestClassificationExerciseIds()) {
      const row = CHEST_CLASSIFICATION_BY_EXERCISE_ID[id]!;
      const hasMap = getExerciseMuscleContributions(id) != null;
      expect(row.preferExistingMuscleContributionMap).toBe(hasMap);
    }
  });

  it("mergeExerciseIntelligenceForId returns null chest for non-chest library exercises", () => {
    const squat = mergeExerciseIntelligenceForId("squat");
    expect(squat.libraryItem?.exerciseId).toBe("squat");
    expect(squat.chestClassification).toBeNull();
    expect(squat.backClassification).toBeNull();
    expect(squat.shouldersClassification).toBeNull();
    expect(squat.bicepsClassification).toBeNull();
    expect(squat.tricepsClassification).toBeNull();
    expect(squat.forearmsClassification).toBeNull();
    expect(squat.quadsClassification?.primaryPattern).toBe("squat_pattern");
    expect(squat.hamstringsClassification).toBeNull();
    expect(squat.glutesClassification).toBeNull();
    expect(squat.calvesClassification).toBeNull();
    expect(squat.coreClassification).toBeNull();
    expect(squat.meta.primary).toBe("Legs");
  });

  it("mergeExerciseIntelligenceForId returns stable merged view for bench_press", () => {
    const m = mergeExerciseIntelligenceForId("bench_press");
    expect(m.exerciseId).toBe("bench_press");
    expect(m.libraryItem?.name).toBe("Bench Press");
    expect(m.meta.primary).toBe("Chest");
    expect(m.chestClassification?.primaryPattern).toBe("horizontal_press");
    expect(m.chestClassification?.preferExistingMuscleContributionMap).toBe(true);
    expect(m.backClassification).toBeNull();
    expect(m.shouldersClassification).toBeNull();
    expect(m.bicepsClassification).toBeNull();
    expect(m.tricepsClassification).toBeNull();
    expect(m.forearmsClassification).toBeNull();
    expect(m.quadsClassification).toBeNull();
    expect(m.hamstringsClassification).toBeNull();
    expect(m.glutesClassification).toBeNull();
    expect(m.calvesClassification).toBeNull();
    expect(m.coreClassification).toBeNull();
  });

  it("unknown exercise ids do not throw and yield null library + default meta + null chest", () => {
    const m = mergeExerciseIntelligenceForId("totally_unknown_exercise_id");
    expect(m.libraryItem).toBeNull();
    expect(m.chestClassification).toBeNull();
    expect(m.backClassification).toBeNull();
    expect(m.shouldersClassification).toBeNull();
    expect(m.bicepsClassification).toBeNull();
    expect(m.tricepsClassification).toBeNull();
    expect(m.forearmsClassification).toBeNull();
    expect(m.quadsClassification).toBeNull();
    expect(m.hamstringsClassification).toBeNull();
    expect(m.glutesClassification).toBeNull();
    expect(m.calvesClassification).toBeNull();
    expect(m.coreClassification).toBeNull();
    expect(m.meta.primary).toBe("Full body");
  });

  it("custom-style ids resolve safely", () => {
    expect(resolveChestClassification("custom_user_foo")).toBeNull();
    const m = mergeExerciseIntelligenceForId("custom_user_foo");
    expect(m.chestClassification).toBeNull();
    expect(m.backClassification).toBeNull();
    expect(m.shouldersClassification).toBeNull();
    expect(m.bicepsClassification).toBeNull();
    expect(m.tricepsClassification).toBeNull();
    expect(m.forearmsClassification).toBeNull();
    expect(m.quadsClassification).toBeNull();
    expect(m.hamstringsClassification).toBeNull();
    expect(m.glutesClassification).toBeNull();
    expect(m.calvesClassification).toBeNull();
    expect(m.coreClassification).toBeNull();
  });

  it("chest count matches grep-derived expectation from library", () => {
    const n = EXERCISE_LIBRARY_V1.filter((x) => x.primaryBucket === "Chest").length;
    expect(n).toBe(listChestClassificationExerciseIds().length);
    expect(n).toBeGreaterThanOrEqual(50);
  });
});
