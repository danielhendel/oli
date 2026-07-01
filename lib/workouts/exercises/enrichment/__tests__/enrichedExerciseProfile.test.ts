import { EXERCISE_LIBRARY_V1 } from "../../library.v1";
import { buildEnrichedExerciseProfile } from "../buildEnrichedExerciseProfile";

describe("buildEnrichedExerciseProfile", () => {
  it("bench_press profile preserves canonical exerciseId", () => {
    const profile = buildEnrichedExerciseProfile("bench_press");
    expect(profile?.exerciseId).toBe("bench_press");
  });

  it("canonical name and equipment remain from EXERCISE_LIBRARY_V1", () => {
    const canonical = EXERCISE_LIBRARY_V1.find((r) => r.exerciseId === "bench_press")!;
    const profile = buildEnrichedExerciseProfile("bench_press");
    expect(profile?.name).toBe(canonical.name);
    expect(profile?.equipment).toBe(canonical.equipment);
  });

  it("enriched profile includes movement, media, and coaching profiles", () => {
    const profile = buildEnrichedExerciseProfile("bench_press");
    expect(profile?.hasEnrichment).toBe(true);
    expect(profile?.enrichment?.movementProfile.movementPattern).toBe("horizontal-press");
    expect(profile?.enrichment?.mediaProfile.keyframeRequirements.length).toBeGreaterThanOrEqual(4);
    expect(profile?.enrichment?.coachingProfile.setupCues.length).toBeGreaterThan(0);
  });

  it("missing enrichment returns explicit fallback", () => {
    const profile = buildEnrichedExerciseProfile("pause_squat");
    expect(profile?.hasEnrichment).toBe(false);
    expect(profile?.enrichment).toBeNull();
    expect(profile?.readinessSummary.label).toBe("not-started");
    expect(profile?.readinessSummary.knownGaps[0]).toContain("No enrichment");
  });

  it("enrichment cannot override canonical identity", () => {
    const profile = buildEnrichedExerciseProfile("squat");
    const canonical = EXERCISE_LIBRARY_V1.find((r) => r.exerciseId === "squat")!;
    expect(profile?.exerciseId).toBe(canonical.exerciseId);
    expect(profile?.name).toBe(canonical.name);
  });

  it("returns null for unknown exerciseId", () => {
    expect(buildEnrichedExerciseProfile("not_in_library_xyz")).toBeNull();
  });
});
