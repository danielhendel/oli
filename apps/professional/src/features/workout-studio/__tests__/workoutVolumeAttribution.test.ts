import {
  addBlock,
  addExerciseFromLibrary,
  createEmptyWorkoutExperience,
  seedSampleWorkout,
} from "../workoutStudioDraft";
import { buildAppWorkoutDraftPayload } from "../buildAppWorkoutDraftPayload";
import {
  buildJointStressDetail,
  buildPrimaryVolumeDetail,
  buildSecondaryVolumeDetail,
} from "../buildVolumeAttributionDetail";
import { buildWorkoutProjectedVolume } from "../buildWorkoutProjectedVolume";
import { buildWorkoutVolumeAttribution } from "../buildWorkoutVolumeAttribution";
import { listCanonicalWorkoutLibraryExercises } from "../exerciseLibraryAdapter";

describe("buildWorkoutVolumeAttribution", () => {
  it("returns empty attribution for empty workout", () => {
    const attribution = buildWorkoutVolumeAttribution(createEmptyWorkoutExperience());
    expect(attribution.primary).toEqual([]);
    expect(attribution.secondary).toEqual([]);
    expect(attribution.stabilizers).toEqual([]);
    expect(attribution.jointStress).toEqual([]);
    expect(attribution.totalPrimarySets).toBe(0);
    expect(attribution.totalSecondarySets).toBe(0);
  });

  it("attributes primary chest volume from intelligence for bench press", () => {
    const sample = seedSampleWorkout();
    const attribution = buildWorkoutVolumeAttribution(sample);
    const chest = attribution.primary.find((row) => row.muscleGroup === "Chest");
    expect(chest?.sets).toBe(3);
    expect(attribution.totalPrimarySets).toBe(3);
    expect(attribution.totalExercisesWithIntelligence).toBe(1);
  });

  it("attributes secondary triceps and shoulders for bench press", () => {
    const sample = seedSampleWorkout();
    const attribution = buildWorkoutVolumeAttribution(sample);
    const triceps = attribution.secondary.find((row) => row.muscleGroup === "Triceps");
    const shoulders = attribution.secondary.find((row) => row.muscleGroup === "Shoulders");
    expect(triceps?.sets).toBe(3);
    expect(shoulders?.sets).toBe(3);
    expect(attribution.totalSecondarySets).toBe(3);
  });

  it("aggregates stabilizer and joint stress exposure", () => {
    const sample = seedSampleWorkout();
    const attribution = buildWorkoutVolumeAttribution(sample);
    expect(attribution.stabilizers.some((row) => row.stabilizer.includes("Scapular"))).toBe(true);
    expect(attribution.jointStress.some((row) => row.joint === "shoulder")).toBe(true);
    expect(attribution.jointStress.some((row) => row.joint === "elbow")).toBe(true);
  });

  it("falls back to projected primary logic when intelligence is missing", () => {
    let workout = addBlock(createEmptyWorkoutExperience(), "set");
    const blockId = workout.blocks[0]?.id;
    const bench = listCanonicalWorkoutLibraryExercises().find(
      (item) => item.exerciseId === "bench_press",
    );
    workout = addExerciseFromLibrary(workout, blockId!, bench!);
    const exerciseId = workout.blocks[0]?.exercises[0]?.id;
    workout = {
      ...workout,
      blocks: workout.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              exercises: block.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      exerciseId: "non_intelligence_exercise",
                      source: "custom" as const,
                      primaryMuscles: ["Chest"],
                    }
                  : exercise,
              ),
            }
          : block,
      ),
    };

    const attribution = buildWorkoutVolumeAttribution(workout);
    const chest = attribution.primary.find((row) => row.muscleGroup === "Chest");
    expect(chest?.sets).toBe(3);
    expect(attribution.totalExercisesMissingIntelligence).toBe(1);
    expect(attribution.secondary).toEqual([]);
  });

  it("builds contributor detail for primary rows", () => {
    const sample = seedSampleWorkout();
    const attribution = buildWorkoutVolumeAttribution(sample);
    const detail = buildPrimaryVolumeDetail(attribution, "Chest");
    expect(detail?.contributors[0]?.exerciseName.toLowerCase()).toContain("bench");
    expect(detail?.whyItMatters).toContain("Academy Intelligence");
  });

  it("populates all three attribution groups simultaneously for bench press", () => {
    const attribution = buildWorkoutVolumeAttribution(seedSampleWorkout());
    expect(attribution.primary.length).toBeGreaterThan(0);
    expect(attribution.secondary.length).toBeGreaterThan(0);
    expect(attribution.stabilizers.length).toBeGreaterThan(0);
    expect(attribution.jointStress.length).toBeGreaterThan(0);
  });

  it("builds detail models for secondary and joint rows", () => {
    const attribution = buildWorkoutVolumeAttribution(seedSampleWorkout());
    const secondary = buildSecondaryVolumeDetail(attribution, "Triceps");
    const joint = buildJointStressDetail(attribution, "shoulder", "moderate");
    expect(secondary?.title).toContain("Secondary");
    expect(joint?.title).toContain("Shoulder");
    expect(joint?.whyItMatters).toContain("coaching guidance");
  });

  it("preserves existing buildWorkoutProjectedVolume behavior", () => {
    const sample = seedSampleWorkout();
    const projected = buildWorkoutProjectedVolume(sample);
    expect(projected.totalSets).toBe(3);
    expect(projected.muscleGroupSetCounts.find((row) => row.muscleGroupKey === "chest")?.sets).toBe(
      3,
    );
  });
});

describe("draft payload volume attribution summary", () => {
  it("includes compact attribution and intelligence version", () => {
    const payload = buildAppWorkoutDraftPayload(seedSampleWorkout());
    expect(payload.volumeAttribution.academyIntelligenceVersion).toBe("intelligence-v1");
    expect(payload.volumeAttribution.totalPrimarySets).toBeGreaterThan(0);
    expect(payload.volumeAttribution.primaryMuscleSummary.some((row) => row.muscleGroup === "Chest")).toBe(
      true,
    );
    expect(payload.volumeAttribution.secondaryMuscleSummary.length).toBeGreaterThan(0);
    expect(payload.projectedVolume.totalSets).toBeGreaterThan(0);
  });
});
