import type { ArmPlane } from "../classificationTypes";
import type { BicepsExerciseClassificationV1 } from "../classificationTypes";
import type { BicepsMovementPattern } from "../classificationTypes";
import type { TricepsExerciseClassificationV1 } from "../classificationTypes";
import type { TricepsMovementPattern } from "../classificationTypes";
import {
  BICEPS_CLASSIFICATION_BY_EXERCISE_ID,
  FOREARMS_CLASSIFICATION_BY_EXERCISE_ID,
  TRICEPS_CLASSIFICATION_BY_EXERCISE_ID,
  listBicepsClassificationExerciseIds,
  listForearmsClassificationExerciseIds,
  listTricepsClassificationExerciseIds,
} from "../classificationsArms.v1";
import {
  getLibraryBicepsExerciseIds,
  getLibraryForearmsExerciseIds,
  getLibraryTricepsExerciseIds,
  mergeExerciseIntelligenceForId,
  resolveBicepsClassification,
  resolveForearmsClassification,
  resolveTricepsClassification,
  validateBicepsClassificationRegistry,
  validateForearmsClassificationRegistry,
  validateTricepsClassificationRegistry,
} from "../classificationResolvers";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseMuscleContributions } from "../muscleContributions";

const BICEPS_PATTERNS: ReadonlySet<BicepsMovementPattern> = new Set([
  "elbow_flexion_supinated",
  "elbow_flexion_neutral",
  "elbow_flexion_pronated",
  "elbow_flexion_mixed_rotation",
  "elbow_flexion_incline_supinated",
  "preacher_elbow_flexion",
  "concentration_elbow_flexion",
  "cable_elbow_flexion_high_line",
  "spider_elbow_flexion",
  "cross_body_elbow_flexion",
  "wrist_flexion_forearm",
  "wrist_extension_forearm",
  "wrist_mobility_arm",
]);

const TRICEPS_PATTERNS: ReadonlySet<TricepsMovementPattern> = new Set([
  "elbow_extension_pushdown",
  "elbow_extension_overhead",
  "elbow_extension_lying",
  "elbow_extension_kickback",
  "compound_press_triceps_bias",
  "jm_press_pattern",
  "dip_pattern_triceps",
  "bodyweight_triceps_push_pattern",
]);

const EVIDENCE_B: ReadonlySet<BicepsExerciseClassificationV1["evidenceLevel"]> = new Set([
  "library_derived",
  "heuristic",
  "expert_curated",
]);

const EVIDENCE_T: ReadonlySet<TricepsExerciseClassificationV1["evidenceLevel"]> = new Set([
  "library_derived",
  "heuristic",
  "expert_curated",
]);

const LATERALITY: ReadonlySet<BicepsExerciseClassificationV1["laterality"]> = new Set([
  "bilateral",
  "alternating",
  "unilateral_each_side",
]);

const LOAD: ReadonlySet<BicepsExerciseClassificationV1["loadModality"]> = new Set([
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

const COMPOUND: ReadonlySet<BicepsExerciseClassificationV1["compoundIsolation"]> = new Set([
  "compound",
  "isolation",
  "mixed",
]);

const ARM_PLANE: ReadonlySet<ArmPlane> = new Set(["sagittal", "frontal", "multi", "na"]);

const JOINT: ReadonlySet<BicepsExerciseClassificationV1["jointsPrimary"][number]> = new Set([
  "shoulder",
  "elbow",
  "wrist",
  "scapulothoracic",
  "spine",
  "hip",
  "knee",
  "ankle",
]);

function assertValidBicepsRow(id: string, row: BicepsExerciseClassificationV1): void {
  expect(row.schemaVersion).toBe(1);
  expect(row.categoryKey).toBe("biceps");
  expect(row.primaryMuscleGroup).toBe("biceps");
  expect(EVIDENCE_B.has(row.evidenceLevel)).toBe(true);
  expect(BICEPS_PATTERNS.has(row.primaryPattern)).toBe(true);
  if (row.secondaryPatterns) {
    for (const p of row.secondaryPatterns) {
      expect(BICEPS_PATTERNS.has(p)).toBe(true);
    }
  }
  expect(LATERALITY.has(row.laterality)).toBe(true);
  expect(LOAD.has(row.loadModality)).toBe(true);
  expect(COMPOUND.has(row.compoundIsolation)).toBe(true);
  expect(ARM_PLANE.has(row.plane)).toBe(true);
  expect(row.jointsPrimary.length).toBeGreaterThan(0);
  for (const j of row.jointsPrimary) {
    expect(JOINT.has(j)).toBe(true);
  }
}

function assertValidTricepsRow(id: string, row: TricepsExerciseClassificationV1): void {
  expect(row.schemaVersion).toBe(1);
  expect(row.categoryKey).toBe("triceps");
  expect(row.primaryMuscleGroup).toBe("triceps");
  expect(EVIDENCE_T.has(row.evidenceLevel)).toBe(true);
  expect(TRICEPS_PATTERNS.has(row.primaryPattern)).toBe(true);
  if (row.secondaryPatterns) {
    for (const p of row.secondaryPatterns) {
      expect(TRICEPS_PATTERNS.has(p)).toBe(true);
    }
  }
  expect(LATERALITY.has(row.laterality)).toBe(true);
  expect(LOAD.has(row.loadModality)).toBe(true);
  expect(COMPOUND.has(row.compoundIsolation)).toBe(true);
  expect(ARM_PLANE.has(row.plane)).toBe(true);
  expect(row.jointsPrimary.length).toBeGreaterThan(0);
  for (const j of row.jointsPrimary) {
    expect(JOINT.has(j)).toBe(true);
  }
}

describe("arms classification v1 (biceps / triceps / forearms registry)", () => {
  it("biceps registry matches every library exercise with primaryBucket Biceps", () => {
    expect(validateBicepsClassificationRegistry()).toEqual([]);
    const lib = getLibraryBicepsExerciseIds();
    const reg = listBicepsClassificationExerciseIds();
    expect(reg.length).toBe(lib.length);
    expect(reg).toEqual(lib);
  });

  it("triceps registry matches every library exercise with primaryBucket Triceps", () => {
    expect(validateTricepsClassificationRegistry()).toEqual([]);
    const lib = getLibraryTricepsExerciseIds();
    const reg = listTricepsClassificationExerciseIds();
    expect(reg.length).toBe(lib.length);
    expect(reg).toEqual(lib);
  });

  it("forearms registry is empty while library has no Forearms primaryBucket", () => {
    expect(getLibraryForearmsExerciseIds()).toEqual([]);
    expect(listForearmsClassificationExerciseIds()).toEqual([]);
    expect(validateForearmsClassificationRegistry()).toEqual([]);
    expect(Object.keys(FOREARMS_CLASSIFICATION_BY_EXERCISE_ID).length).toBe(0);
  });

  it("every biceps row passes enum / shape validation", () => {
    for (const id of listBicepsClassificationExerciseIds()) {
      const row = BICEPS_CLASSIFICATION_BY_EXERCISE_ID[id];
      expect(row).toBeDefined();
      assertValidBicepsRow(id, row!);
    }
  });

  it("every triceps row passes enum / shape validation", () => {
    for (const id of listTricepsClassificationExerciseIds()) {
      const row = TRICEPS_CLASSIFICATION_BY_EXERCISE_ID[id];
      expect(row).toBeDefined();
      assertValidTricepsRow(id, row!);
    }
  });

  it("preferExistingMuscleContributionMap is true only where contributions exist (arms)", () => {
    for (const id of listBicepsClassificationExerciseIds()) {
      const row = BICEPS_CLASSIFICATION_BY_EXERCISE_ID[id]!;
      const hasMap = getExerciseMuscleContributions(id) != null;
      expect(row.preferExistingMuscleContributionMap).toBe(hasMap);
    }
    for (const id of listTricepsClassificationExerciseIds()) {
      const row = TRICEPS_CLASSIFICATION_BY_EXERCISE_ID[id]!;
      const hasMap = getExerciseMuscleContributions(id) != null;
      expect(row.preferExistingMuscleContributionMap).toBe(hasMap);
    }
  });

  it("merge returns null arm slices for non-arm-primary exercises", () => {
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

  it("merge returns stable merged view for bicep_curl and tricep_pushdown", () => {
    const bc = mergeExerciseIntelligenceForId("bicep_curl");
    expect(bc.bicepsClassification?.primaryPattern).toBe("elbow_flexion_supinated");
    expect(bc.bicepsClassification?.preferExistingMuscleContributionMap).toBe(true);
    expect(bc.tricepsClassification).toBeNull();
    expect(bc.forearmsClassification).toBeNull();
    expect(bc.quadsClassification).toBeNull();
    expect(bc.hamstringsClassification).toBeNull();
    expect(bc.glutesClassification).toBeNull();
    expect(bc.calvesClassification).toBeNull();
    expect(bc.coreClassification).toBeNull();

    const tp = mergeExerciseIntelligenceForId("tricep_pushdown");
    expect(tp.tricepsClassification?.primaryPattern).toBe("elbow_extension_pushdown");
    expect(tp.tricepsClassification?.preferExistingMuscleContributionMap).toBe(true);
    expect(tp.bicepsClassification).toBeNull();
    expect(tp.forearmsClassification).toBeNull();
    expect(tp.quadsClassification).toBeNull();
    expect(tp.hamstringsClassification).toBeNull();
    expect(tp.glutesClassification).toBeNull();
    expect(tp.calvesClassification).toBeNull();
    expect(tp.coreClassification).toBeNull();
  });

  it("unknown ids resolve safely for arm resolvers", () => {
    expect(resolveBicepsClassification("custom_arm")).toBeNull();
    expect(resolveTricepsClassification("custom_arm")).toBeNull();
    expect(resolveForearmsClassification("custom_arm")).toBeNull();
    const m = mergeExerciseIntelligenceForId("unknown_arm_test");
    expect(m.bicepsClassification).toBeNull();
    expect(m.tricepsClassification).toBeNull();
    expect(m.forearmsClassification).toBeNull();
    expect(m.quadsClassification).toBeNull();
    expect(m.hamstringsClassification).toBeNull();
    expect(m.glutesClassification).toBeNull();
    expect(m.calvesClassification).toBeNull();
    expect(m.coreClassification).toBeNull();
  });

  it("library counts match registries", () => {
    const nb = EXERCISE_LIBRARY_V1.filter((x) => x.primaryBucket === "Biceps").length;
    const nt = EXERCISE_LIBRARY_V1.filter((x) => x.primaryBucket === "Triceps").length;
    expect(nb).toBe(listBicepsClassificationExerciseIds().length);
    expect(nt).toBe(listTricepsClassificationExerciseIds().length);
    expect(nb).toBe(38);
    expect(nt).toBe(28);
  });
});
