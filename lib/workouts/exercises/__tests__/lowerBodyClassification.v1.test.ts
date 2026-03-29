import type { CalvesExerciseClassificationV1 } from "../classificationTypes";
import type { CalvesMovementPattern } from "../classificationTypes";
import type { GlutesExerciseClassificationV1 } from "../classificationTypes";
import type { GlutesMovementPattern } from "../classificationTypes";
import type { HamstringsExerciseClassificationV1 } from "../classificationTypes";
import type { HamstringsMovementPattern } from "../classificationTypes";
import type { LegPlane } from "../classificationTypes";
import type { QuadsExerciseClassificationV1 } from "../classificationTypes";
import type { QuadsMovementPattern } from "../classificationTypes";
import {
  CALVES_CLASSIFICATION_BY_EXERCISE_ID,
  GLUTES_CLASSIFICATION_BY_EXERCISE_ID,
  HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID,
  QUADS_CLASSIFICATION_BY_EXERCISE_ID,
  listCalvesClassificationExerciseIds,
  listGlutesClassificationExerciseIds,
  listHamstringsClassificationExerciseIds,
  listQuadsClassificationExerciseIds,
} from "../classificationsLowerBody.v1";
import {
  getExpectedCalvesSliceExerciseIds,
  getExpectedGlutesSliceExerciseIds,
  getExpectedHamstringsSliceExerciseIds,
  getExpectedQuadsSliceExerciseIds,
} from "../lowerBodySliceRules";
import {
  mergeExerciseIntelligenceForId,
  resolveCalvesClassification,
  resolveGlutesClassification,
  resolveHamstringsClassification,
  resolveQuadsClassification,
  validateCalvesClassificationRegistry,
  validateGlutesClassificationRegistry,
  validateHamstringsClassificationRegistry,
  validateQuadsClassificationRegistry,
} from "../classificationResolvers";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseMuscleContributions } from "../muscleContributions";

const QUADS_PATTERNS: ReadonlySet<QuadsMovementPattern> = new Set([
  "squat_pattern",
  "lunge_pattern",
  "knee_extension_isolation",
  "leg_press_pattern",
  "sled_push_pattern",
  "conditioning_gait_quads",
  "cardio_cycling_quads",
  "mobility_stretch_quad",
]);

const HAM_PATTERNS: ReadonlySet<HamstringsMovementPattern> = new Set([
  "hip_hinge_posterior",
  "knee_flexion_curl",
  "nordic_knee_flexion",
  "glute_ham_raise_pattern",
  "mobility_stretch_hamstring",
]);

const GLUTE_PATTERNS: ReadonlySet<GlutesMovementPattern> = new Set([
  "hip_thrust_bridge_pattern",
  "hip_abduction",
  "hip_adduction",
  "kickback_extension",
  "lunge_glute_bias",
  "mobility_stretch_hip",
]);

const CALF_PATTERNS: ReadonlySet<CalvesMovementPattern> = new Set([
  "plantarflexion_standing",
  "plantarflexion_seated",
  "plantarflexion_leg_press",
  "dorsiflexion_tibialis",
  "mobility_stretch_calf",
]);

const EVIDENCE: ReadonlySet<QuadsExerciseClassificationV1["evidenceLevel"]> = new Set([
  "library_derived",
  "heuristic",
  "expert_curated",
]);

const LATERALITY: ReadonlySet<QuadsExerciseClassificationV1["laterality"]> = new Set([
  "bilateral",
  "alternating",
  "unilateral_each_side",
]);

const LOAD: ReadonlySet<QuadsExerciseClassificationV1["loadModality"]> = new Set([
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

const COMPOUND: ReadonlySet<QuadsExerciseClassificationV1["compoundIsolation"]> = new Set([
  "compound",
  "isolation",
  "mixed",
]);

const LEG_PLANE: ReadonlySet<LegPlane> = new Set(["sagittal", "frontal", "transverse", "multi", "na"]);

const JOINT: ReadonlySet<QuadsExerciseClassificationV1["jointsPrimary"][number]> = new Set([
  "shoulder",
  "elbow",
  "wrist",
  "scapulothoracic",
  "spine",
  "hip",
  "knee",
  "ankle",
]);

function assertQuadsRow(id: string, row: QuadsExerciseClassificationV1): void {
  expect(row.schemaVersion).toBe(1);
  expect(row.categoryKey).toBe("quads");
  expect(row.primaryMuscleGroup).toBe("quads");
  expect(EVIDENCE.has(row.evidenceLevel)).toBe(true);
  expect(QUADS_PATTERNS.has(row.primaryPattern)).toBe(true);
  expect(LATERALITY.has(row.laterality)).toBe(true);
  expect(LOAD.has(row.loadModality)).toBe(true);
  expect(COMPOUND.has(row.compoundIsolation)).toBe(true);
  expect(LEG_PLANE.has(row.plane)).toBe(true);
  for (const j of row.jointsPrimary) expect(JOINT.has(j)).toBe(true);
}

function assertHamRow(id: string, row: HamstringsExerciseClassificationV1): void {
  expect(row.categoryKey).toBe("hamstrings");
  expect(HAM_PATTERNS.has(row.primaryPattern)).toBe(true);
  expect(LEG_PLANE.has(row.plane)).toBe(true);
  for (const j of row.jointsPrimary) expect(JOINT.has(j)).toBe(true);
}

function assertGluteRow(id: string, row: GlutesExerciseClassificationV1): void {
  expect(row.categoryKey).toBe("glutes");
  expect(GLUTE_PATTERNS.has(row.primaryPattern)).toBe(true);
  expect(LEG_PLANE.has(row.plane)).toBe(true);
  for (const j of row.jointsPrimary) expect(JOINT.has(j)).toBe(true);
}

function assertCalfRow(id: string, row: CalvesExerciseClassificationV1): void {
  expect(row.categoryKey).toBe("calves");
  expect(CALF_PATTERNS.has(row.primaryPattern)).toBe(true);
  expect(LEG_PLANE.has(row.plane)).toBe(true);
  for (const j of row.jointsPrimary) expect(JOINT.has(j)).toBe(true);
}

describe("lower body classification v1", () => {
  it("quads registry matches expected Legs-partition ids", () => {
    expect(validateQuadsClassificationRegistry()).toEqual([]);
    const exp = getExpectedQuadsSliceExerciseIds();
    expect(listQuadsClassificationExerciseIds()).toEqual(exp);
  });

  it("hamstrings registry matches Legs hamstrings + Back RDL exception set", () => {
    expect(validateHamstringsClassificationRegistry()).toEqual([]);
    const exp = getExpectedHamstringsSliceExerciseIds();
    expect(listHamstringsClassificationExerciseIds()).toEqual(exp);
  });

  it("glutes and calves registries match expected sets", () => {
    expect(validateGlutesClassificationRegistry()).toEqual([]);
    expect(validateCalvesClassificationRegistry()).toEqual([]);
    expect(listGlutesClassificationExerciseIds()).toEqual(getExpectedGlutesSliceExerciseIds());
    expect(listCalvesClassificationExerciseIds()).toEqual(getExpectedCalvesSliceExerciseIds());
  });

  it("every row passes shape checks", () => {
    for (const id of listQuadsClassificationExerciseIds()) {
      assertQuadsRow(id, QUADS_CLASSIFICATION_BY_EXERCISE_ID[id]!);
    }
    for (const id of listHamstringsClassificationExerciseIds()) {
      assertHamRow(id, HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID[id]!);
    }
    for (const id of listGlutesClassificationExerciseIds()) {
      assertGluteRow(id, GLUTES_CLASSIFICATION_BY_EXERCISE_ID[id]!);
    }
    for (const id of listCalvesClassificationExerciseIds()) {
      assertCalfRow(id, CALVES_CLASSIFICATION_BY_EXERCISE_ID[id]!);
    }
  });

  it("preferExistingMuscleContributionMap matches muscle contribution file", () => {
    const check = (id: string, row: { preferExistingMuscleContributionMap: boolean }) => {
      expect(row.preferExistingMuscleContributionMap).toBe(getExerciseMuscleContributions(id) != null);
    };
    for (const id of listQuadsClassificationExerciseIds()) check(id, QUADS_CLASSIFICATION_BY_EXERCISE_ID[id]!);
    for (const id of listHamstringsClassificationExerciseIds())
      check(id, HAMSTRINGS_CLASSIFICATION_BY_EXERCISE_ID[id]!);
    for (const id of listGlutesClassificationExerciseIds()) check(id, GLUTES_CLASSIFICATION_BY_EXERCISE_ID[id]!);
    for (const id of listCalvesClassificationExerciseIds()) check(id, CALVES_CLASSIFICATION_BY_EXERCISE_ID[id]!);
  });

  it("merge returns null lower-body slices for upper-only exercises", () => {
    const m = mergeExerciseIntelligenceForId("bench_press");
    expect(m.quadsClassification).toBeNull();
    expect(m.hamstringsClassification).toBeNull();
    expect(m.glutesClassification).toBeNull();
    expect(m.calvesClassification).toBeNull();
    expect(m.coreClassification).toBeNull();
  });

  it("merge returns representative lower-body slices", () => {
    expect(mergeExerciseIntelligenceForId("squat").quadsClassification?.primaryPattern).toBe("squat_pattern");
    expect(mergeExerciseIntelligenceForId("romanian_deadlift").hamstringsClassification?.primaryPattern).toBe(
      "hip_hinge_posterior",
    );
    expect(mergeExerciseIntelligenceForId("hip_thrust").glutesClassification?.primaryPattern).toBe(
      "hip_thrust_bridge_pattern",
    );
    expect(mergeExerciseIntelligenceForId("calf_raise").calvesClassification?.primaryPattern).toBe(
      "plantarflexion_standing",
    );
  });

  it("RDL keeps back slice and adds hamstrings slice", () => {
    const m = mergeExerciseIntelligenceForId("romanian_deadlift");
    expect(m.backClassification).not.toBeNull();
    expect(m.hamstringsClassification).not.toBeNull();
    expect(m.quadsClassification).toBeNull();
    expect(m.coreClassification).toBeNull();
  });

  it("unknown ids resolve safely", () => {
    expect(resolveQuadsClassification("x")).toBeNull();
    expect(resolveHamstringsClassification("x")).toBeNull();
    expect(resolveGlutesClassification("x")).toBeNull();
    expect(resolveCalvesClassification("x")).toBeNull();
  });

  it("Legs exercises are partitioned across four slices with no overlap", () => {
    const legs = EXERCISE_LIBRARY_V1.filter((r) => r.primaryBucket === "Legs").map((r) => r.exerciseId);
    const q = new Set(listQuadsClassificationExerciseIds());
    const h = new Set(listHamstringsClassificationExerciseIds());
    const g = new Set(listGlutesClassificationExerciseIds());
    const c = new Set(listCalvesClassificationExerciseIds());
    for (const id of legs) {
      const n = (q.has(id) ? 1 : 0) + (h.has(id) ? 1 : 0) + (g.has(id) ? 1 : 0) + (c.has(id) ? 1 : 0);
      expect(n).toBe(1);
    }
  });
});
