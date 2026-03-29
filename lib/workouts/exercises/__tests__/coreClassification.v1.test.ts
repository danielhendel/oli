import type { CoreExerciseClassificationV1 } from "../classificationTypes";
import type { CoreMovementPattern } from "../classificationTypes";
import {
  CORE_CLASSIFICATION_BY_EXERCISE_ID,
  listCoreClassificationExerciseIds,
} from "../classificationsCore.v1";
import {
  getLibraryCoreExerciseIds,
  mergeExerciseIntelligenceForId,
  resolveCoreClassification,
  validateCoreClassificationRegistry,
} from "../classificationResolvers";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseMuscleContributions } from "../muscleContributions";

const CORE_PATTERNS: ReadonlySet<CoreMovementPattern> = new Set([
  "trunk_flexion",
  "trunk_rotation",
  "anti_rotation",
  "anti_extension_rollout",
  "anti_lateral_flexion",
  "trunk_stability_hold",
  "hollow_body_hold",
  "hip_flexion_emphasis_core",
  "loaded_carry_core",
  "spinal_mobility_trunk",
  "lateral_trunk_flexion",
  "rotational_power_throw",
  "gymnastics_compression_hold",
  "conditioning_core_mixed",
]);

const EVIDENCE: ReadonlySet<CoreExerciseClassificationV1["evidenceLevel"]> = new Set([
  "library_derived",
  "heuristic",
  "expert_curated",
]);

const LATERALITY: ReadonlySet<CoreExerciseClassificationV1["laterality"]> = new Set([
  "bilateral",
  "alternating",
  "unilateral_each_side",
]);

const LOAD: ReadonlySet<CoreExerciseClassificationV1["loadModality"]> = new Set([
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

const COMPOUND: ReadonlySet<CoreExerciseClassificationV1["compoundIsolation"]> = new Set([
  "compound",
  "isolation",
  "mixed",
]);

const PLANE: ReadonlySet<CoreExerciseClassificationV1["plane"]> = new Set([
  "sagittal",
  "frontal",
  "transverse",
  "multi",
  "na",
]);

const JOINT: ReadonlySet<CoreExerciseClassificationV1["jointsPrimary"][number]> = new Set([
  "shoulder",
  "elbow",
  "wrist",
  "scapulothoracic",
  "spine",
  "hip",
  "knee",
  "ankle",
]);

function assertValidCoreRow(id: string, row: CoreExerciseClassificationV1): void {
  expect(row.schemaVersion).toBe(1);
  expect(row.categoryKey).toBe("core");
  expect(row.primaryMuscleGroup).toBe("core");
  expect(EVIDENCE.has(row.evidenceLevel)).toBe(true);
  expect(CORE_PATTERNS.has(row.primaryPattern)).toBe(true);
  if (row.secondaryPatterns) {
    for (const p of row.secondaryPatterns) {
      expect(CORE_PATTERNS.has(p)).toBe(true);
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

describe("core classification v1", () => {
  it("registry matches every library exercise with primaryBucket Core", () => {
    expect(validateCoreClassificationRegistry()).toEqual([]);
    const libCore = getLibraryCoreExerciseIds();
    const reg = listCoreClassificationExerciseIds();
    expect(reg.length).toBe(libCore.length);
    expect(reg).toEqual(libCore);
  });

  it("every core row passes enum / shape validation", () => {
    for (const id of listCoreClassificationExerciseIds()) {
      const row = CORE_CLASSIFICATION_BY_EXERCISE_ID[id];
      expect(row).toBeDefined();
      assertValidCoreRow(id, row!);
    }
  });

  it("preferExistingMuscleContributionMap is true only where contributions exist", () => {
    for (const id of listCoreClassificationExerciseIds()) {
      const row = CORE_CLASSIFICATION_BY_EXERCISE_ID[id]!;
      const hasMap = getExerciseMuscleContributions(id) != null;
      expect(row.preferExistingMuscleContributionMap).toBe(hasMap);
    }
  });

  it("merge returns null core for non-core library exercises", () => {
    const bench = mergeExerciseIntelligenceForId("bench_press");
    expect(bench.coreClassification).toBeNull();
    const squat = mergeExerciseIntelligenceForId("squat");
    expect(squat.coreClassification).toBeNull();
  });

  it("merge returns stable merged view for plank", () => {
    const m = mergeExerciseIntelligenceForId("plank");
    expect(m.exerciseId).toBe("plank");
    expect(m.libraryItem?.primaryBucket).toBe("Core");
    expect(m.coreClassification?.primaryPattern).toBe("trunk_stability_hold");
    expect(m.coreClassification?.preferExistingMuscleContributionMap).toBe(true);
    expect(m.chestClassification).toBeNull();
  });

  it("unknown exercise ids do not throw and yield null core", () => {
    const m = mergeExerciseIntelligenceForId("totally_unknown_core_test_id");
    expect(m.coreClassification).toBeNull();
    expect(resolveCoreClassification("custom_core_foo")).toBeNull();
  });

  it("core count matches library filter", () => {
    const n = EXERCISE_LIBRARY_V1.filter((x) => x.primaryBucket === "Core").length;
    expect(n).toBe(listCoreClassificationExerciseIds().length);
    expect(n).toBeGreaterThanOrEqual(50);
  });
});
