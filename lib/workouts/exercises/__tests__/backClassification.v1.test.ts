import type { BackExerciseClassificationV1 } from "../classificationTypes";
import type { BackMovementPattern } from "../classificationTypes";
import {
  BACK_CLASSIFICATION_BY_EXERCISE_ID,
  listBackClassificationExerciseIds,
} from "../classificationsBack.v1";
import {
  getLibraryBackExerciseIds,
  mergeExerciseIntelligenceForId,
  resolveBackClassification,
  validateBackClassificationRegistry,
} from "../classificationResolvers";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseMuscleContributions } from "../muscleContributions";

const BACK_PATTERNS: ReadonlySet<BackMovementPattern> = new Set([
  "pull_vertical",
  "pull_horizontal_row",
  "hip_hinge_pull",
  "hip_extension_spinal",
  "shrug_vertical",
  "face_pull_external_rotation",
  "scapular_isolation_raise",
  "scapular_retraction_horizontal",
  "scapular_stability_mobility",
  "mobility_flexion",
  "mobility_extension",
  "mobility_rotation",
  "mobility_segmental_spine",
  "isometric_hold_spinal",
  "isometric_hold_vertical_pull",
  "rope_climb_vertical",
]);

const EVIDENCE: ReadonlySet<BackExerciseClassificationV1["evidenceLevel"]> = new Set([
  "library_derived",
  "heuristic",
  "expert_curated",
]);

const LATERALITY: ReadonlySet<BackExerciseClassificationV1["laterality"]> = new Set([
  "bilateral",
  "alternating",
  "unilateral_each_side",
]);

const LOAD: ReadonlySet<BackExerciseClassificationV1["loadModality"]> = new Set([
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

const COMPOUND: ReadonlySet<BackExerciseClassificationV1["compoundIsolation"]> = new Set([
  "compound",
  "isolation",
  "mixed",
]);

const PLANE: ReadonlySet<BackExerciseClassificationV1["plane"]> = new Set([
  "vertical",
  "horizontal",
  "sagittal_hinge",
  "transverse",
  "multi",
  "na",
]);

const JOINT: ReadonlySet<BackExerciseClassificationV1["jointsPrimary"][number]> = new Set([
  "shoulder",
  "elbow",
  "wrist",
  "scapulothoracic",
  "spine",
  "hip",
  "knee",
  "ankle",
]);

function assertValidBackRow(id: string, row: BackExerciseClassificationV1): void {
  expect(row.schemaVersion).toBe(1);
  expect(row.categoryKey).toBe("back");
  expect(row.primaryMuscleGroup).toBe("back");
  expect(EVIDENCE.has(row.evidenceLevel)).toBe(true);
  expect(BACK_PATTERNS.has(row.primaryPattern)).toBe(true);
  if (row.secondaryPatterns) {
    for (const p of row.secondaryPatterns) {
      expect(BACK_PATTERNS.has(p)).toBe(true);
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

describe("back classification v1", () => {
  it("registry matches every library exercise with primaryBucket Back", () => {
    expect(validateBackClassificationRegistry()).toEqual([]);
    const libBack = getLibraryBackExerciseIds();
    const reg = listBackClassificationExerciseIds();
    expect(reg.length).toBe(libBack.length);
    expect(reg).toEqual(libBack);
  });

  it("every back row passes enum / shape validation", () => {
    for (const id of listBackClassificationExerciseIds()) {
      const row = BACK_CLASSIFICATION_BY_EXERCISE_ID[id];
      expect(row).toBeDefined();
      assertValidBackRow(id, row!);
    }
  });

  it("preferExistingMuscleContributionMap is true only where contributions exist", () => {
    for (const id of listBackClassificationExerciseIds()) {
      const row = BACK_CLASSIFICATION_BY_EXERCISE_ID[id]!;
      const hasMap = getExerciseMuscleContributions(id) != null;
      expect(row.preferExistingMuscleContributionMap).toBe(hasMap);
    }
  });

  it("mergeExerciseIntelligenceForId returns null back for non-back library exercises", () => {
    const bench = mergeExerciseIntelligenceForId("bench_press");
    expect(bench.backClassification).toBeNull();
    expect(bench.chestClassification).not.toBeNull();
    expect(bench.shouldersClassification).toBeNull();
    expect(bench.bicepsClassification).toBeNull();
    expect(bench.tricepsClassification).toBeNull();
    expect(bench.forearmsClassification).toBeNull();
    expect(bench.quadsClassification).toBeNull();
    expect(bench.hamstringsClassification).toBeNull();
    expect(bench.glutesClassification).toBeNull();
    expect(bench.calvesClassification).toBeNull();
    expect(bench.coreClassification).toBeNull();
  });

  it("mergeExerciseIntelligenceForId returns stable merged view for barbell_row", () => {
    const m = mergeExerciseIntelligenceForId("barbell_row");
    expect(m.libraryItem?.exerciseId).toBe("barbell_row");
    expect(m.meta.primary).toBe("Back");
    expect(m.backClassification?.primaryPattern).toBe("pull_horizontal_row");
    expect(m.backClassification?.preferExistingMuscleContributionMap).toBe(true);
    expect(m.chestClassification).toBeNull();
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

  it("unknown ids do not throw; backClassification null", () => {
    const m = mergeExerciseIntelligenceForId("unknown_back_test_id");
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
    expect(resolveBackClassification("custom_xyz")).toBeNull();
  });

  it("back count matches library filter", () => {
    const n = EXERCISE_LIBRARY_V1.filter((x) => x.primaryBucket === "Back").length;
    expect(n).toBe(listBackClassificationExerciseIds().length);
    expect(n).toBe(102);
  });
});
