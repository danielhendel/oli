import type { ShoulderExerciseClassificationV1 } from "../classificationTypes";
import type { ShoulderMovementPattern } from "../classificationTypes";
import {
  listShouldersClassificationExerciseIds,
  SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID,
} from "../classificationsShoulders.v1";
import {
  getLibraryShouldersExerciseIds,
  mergeExerciseIntelligenceForId,
  resolveShouldersClassification,
  validateShouldersClassificationRegistry,
} from "../classificationResolvers";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseMuscleContributions } from "../muscleContributions";

const SHOULDER_PATTERNS: ReadonlySet<ShoulderMovementPattern> = new Set([
  "vertical_press_overhead",
  "vertical_press_arnold",
  "vertical_press_push_power",
  "raise_lateral",
  "raise_front",
  "rear_delt_horizontal_abduction",
  "upright_row",
  "scaption_raise",
  "rotator_external_rotation",
  "rotator_internal_rotation",
  "overhead_calisthenics_press",
  "shoulder_skill_balance",
  "isometric_overhead_hold",
  "mobility_shoulder_circle",
  "mobility_shoulder_rotation_halo",
]);

const EVIDENCE: ReadonlySet<ShoulderExerciseClassificationV1["evidenceLevel"]> = new Set([
  "library_derived",
  "heuristic",
  "expert_curated",
]);

const LATERALITY: ReadonlySet<ShoulderExerciseClassificationV1["laterality"]> = new Set([
  "bilateral",
  "alternating",
  "unilateral_each_side",
]);

const LOAD: ReadonlySet<ShoulderExerciseClassificationV1["loadModality"]> = new Set([
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

const COMPOUND: ReadonlySet<ShoulderExerciseClassificationV1["compoundIsolation"]> = new Set([
  "compound",
  "isolation",
  "mixed",
]);

const PLANE: ReadonlySet<ShoulderExerciseClassificationV1["plane"]> = new Set([
  "vertical",
  "horizontal_front",
  "horizontal_rear",
  "scapular_plane",
  "multi",
  "na",
]);

const JOINT: ReadonlySet<ShoulderExerciseClassificationV1["jointsPrimary"][number]> = new Set([
  "shoulder",
  "elbow",
  "wrist",
  "scapulothoracic",
  "spine",
  "hip",
  "knee",
  "ankle",
]);

function assertValidShoulderRow(id: string, row: ShoulderExerciseClassificationV1): void {
  expect(row.schemaVersion).toBe(1);
  expect(row.categoryKey).toBe("shoulders");
  expect(row.primaryMuscleGroup).toBe("shoulders");
  expect(EVIDENCE.has(row.evidenceLevel)).toBe(true);
  expect(SHOULDER_PATTERNS.has(row.primaryPattern)).toBe(true);
  if (row.secondaryPatterns) {
    for (const p of row.secondaryPatterns) {
      expect(SHOULDER_PATTERNS.has(p)).toBe(true);
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

describe("shoulders classification v1", () => {
  it("registry matches every library exercise with primaryBucket Shoulders", () => {
    expect(validateShouldersClassificationRegistry()).toEqual([]);
    const lib = getLibraryShouldersExerciseIds();
    const reg = listShouldersClassificationExerciseIds();
    expect(reg.length).toBe(lib.length);
    expect(reg).toEqual(lib);
  });

  it("every shoulders row passes enum / shape validation", () => {
    for (const id of listShouldersClassificationExerciseIds()) {
      const row = SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID[id];
      expect(row).toBeDefined();
      assertValidShoulderRow(id, row!);
    }
  });

  it("preferExistingMuscleContributionMap is true only where contributions exist", () => {
    for (const id of listShouldersClassificationExerciseIds()) {
      const row = SHOULDERS_CLASSIFICATION_BY_EXERCISE_ID[id]!;
      const hasMap = getExerciseMuscleContributions(id) != null;
      expect(row.preferExistingMuscleContributionMap).toBe(hasMap);
    }
  });

  it("merge returns null shoulders for chest/back-primary exercises", () => {
    expect(mergeExerciseIntelligenceForId("bench_press").shouldersClassification).toBeNull();
    expect(mergeExerciseIntelligenceForId("barbell_row").shouldersClassification).toBeNull();
    const bench = mergeExerciseIntelligenceForId("bench_press");
    expect(bench.bicepsClassification).toBeNull();
    expect(bench.tricepsClassification).toBeNull();
    expect(bench.forearmsClassification).toBeNull();
    expect(bench.quadsClassification).toBeNull();
    expect(bench.hamstringsClassification).toBeNull();
    expect(bench.glutesClassification).toBeNull();
    expect(bench.calvesClassification).toBeNull();
    expect(bench.coreClassification).toBeNull();
  });

  it("merge returns stable view for overhead_press and lateral_raise", () => {
    const ohp = mergeExerciseIntelligenceForId("overhead_press");
    expect(ohp.shouldersClassification?.primaryPattern).toBe("vertical_press_overhead");
    expect(ohp.shouldersClassification?.preferExistingMuscleContributionMap).toBe(true);
    expect(ohp.chestClassification).toBeNull();
    expect(ohp.backClassification).toBeNull();
    expect(ohp.bicepsClassification).toBeNull();
    expect(ohp.tricepsClassification).toBeNull();
    expect(ohp.forearmsClassification).toBeNull();
    expect(ohp.quadsClassification).toBeNull();
    expect(ohp.hamstringsClassification).toBeNull();
    expect(ohp.glutesClassification).toBeNull();
    expect(ohp.calvesClassification).toBeNull();
    expect(ohp.coreClassification).toBeNull();

    const lat = mergeExerciseIntelligenceForId("lateral_raise");
    expect(lat.shouldersClassification?.primaryPattern).toBe("raise_lateral");
    expect(lat.shouldersClassification?.preferExistingMuscleContributionMap).toBe(true);
    expect(lat.bicepsClassification).toBeNull();
    expect(lat.tricepsClassification).toBeNull();
    expect(lat.forearmsClassification).toBeNull();
    expect(lat.quadsClassification).toBeNull();
    expect(lat.hamstringsClassification).toBeNull();
    expect(lat.glutesClassification).toBeNull();
    expect(lat.calvesClassification).toBeNull();
    expect(lat.coreClassification).toBeNull();
  });

  it("unknown ids resolve safely", () => {
    expect(resolveShouldersClassification("custom_xyz")).toBeNull();
    expect(mergeExerciseIntelligenceForId("unknown_shoulder_test").shouldersClassification).toBeNull();
  });

  it("count is 45", () => {
    expect(EXERCISE_LIBRARY_V1.filter((x) => x.primaryBucket === "Shoulders").length).toBe(45);
  });
});
