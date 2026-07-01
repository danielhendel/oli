import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";

import { buildEnrichedExerciseAcademyProfile } from "../buildEnrichedExerciseAcademyProfile";

describe("buildEnrichedExerciseAcademyProfile", () => {
  it("bench_press returns academy entry and enrichment", () => {
    const profile = buildEnrichedExerciseAcademyProfile("bench_press");
    expect(profile?.exerciseId).toBe("bench_press");
    expect(profile?.academyEntry).not.toBeNull();
    expect(profile?.enrichment).not.toBeNull();
    expect(profile?.intelligence).not.toBeNull();
  });

  it("top25 enriched exercise returns media requirement summary", () => {
    for (const id of TOP25_EXERCISE_ENRICHMENT_IDS.slice(0, 5)) {
      const profile = buildEnrichedExerciseAcademyProfile(id);
      expect(profile?.mediaRequirementSummary).toContain("keyframe poses planned");
      expect(profile?.enrichment).not.toBeNull();
    }
  });

  it("non-enriched exercise reports missing enrichment", () => {
    const profile = buildEnrichedExerciseAcademyProfile("pause_squat");
    expect(profile?.enrichment).toBeNull();
    expect(profile?.gaps.some((g) => g.includes("Missing exercise library enrichment"))).toBe(true);
  });

  it("readiness does not imply expert approval unless reviewStatus is expert-reviewed", () => {
    const profile = buildEnrichedExerciseAcademyProfile("bench_press");
    expect(profile?.enrichment?.reviewStatus).toBe("ready-for-expert-review");
    expect(profile?.readinessLabel).not.toBe("expert-reviewed");
    expect(profile?.gaps.some((g) => g.includes("expert review"))).toBe(true);
  });
});
