// lib/data/health-assessment/__tests__/buildCurrentStateProfile.test.ts
import { buildCurrentStateProfile } from "@/lib/data/health-assessment/buildCurrentStateProfile";
import { buildEmptyHealthAssessmentState } from "@/lib/data/health-assessment/healthAssessmentStore";
import type { HealthAssessmentState } from "@/lib/data/health-assessment/types";

function withAnswers(
  partial: Record<string, HealthAssessmentState["answers"][string]["value"]>,
): HealthAssessmentState {
  const base = buildEmptyHealthAssessmentState();
  const answers = { ...base.answers };
  for (const [questionId, value] of Object.entries(partial)) {
    const category = questionId.split("-")[0];
    const mappedCategory =
      category === "identity"
        ? "identity"
        : category === "goals"
          ? "goals"
          : category === "history"
            ? "health-history"
            : category === "fitness"
              ? "fitness"
              : category === "nutrition"
                ? "nutrition"
                : category === "recovery"
                  ? "recovery"
                  : "biomarkers";
    answers[questionId] = {
      questionId,
      category: mappedCategory as HealthAssessmentState["answers"][string]["category"],
      value,
    };
  }
  return { ...base, answers };
}

describe("buildCurrentStateProfile", () => {
  it("returns expected profile for an advanced muscle-gain user", () => {
    const state = withAnswers({
      "goals-primary": "muscle-gain",
      "goals-secondary": ["performance", "body-composition"],
      "goals-timeframe": "12-weeks",
      "goals-focus": "body-composition",
      "fitness-experience": "advanced",
      "fitness-days-available": 5,
      "fitness-cardio-level": "moderate",
      "nutrition-protein-consistency": "very-consistent",
      "nutrition-calorie-awareness": "very-consistent",
      "nutrition-eating-pattern": "high-protein",
      "nutrition-alcohol": "occasional",
      "nutrition-meal-prep": "some",
      "recovery-sleep-duration": 8,
      "recovery-sleep-quality": "excellent",
      "recovery-stress": "low",
      "recovery-soreness": "rarely",
      "identity-occupation-activity": "moderate",
    });

    const profile = buildCurrentStateProfile(state);

    expect(profile.primaryGoal).toBe("muscle-gain");
    expect(profile.trainingExperience).toBe("advanced");
    expect(profile.recoveryCapacity).toBe("high");
    expect(profile.nutritionConsistency).toBe("consistent");
    expect(profile.readinessToStart).toBe("ready");
    expect(profile.primaryLimiters).not.toContain("doctor-restriction");
    expect(profile.recommendedStartingFocus).toContain("resistance training");
    expect(profile.completionPercent).toBeGreaterThan(0);
    expect(profile.completedCategories).toEqual(
      expect.arrayContaining(["goals", "fitness", "nutrition", "recovery"]),
    );
  });

  it("returns conservative defaults for incomplete assessment", () => {
    const state = buildEmptyHealthAssessmentState();
    const profile = buildCurrentStateProfile(state);

    expect(profile.primaryGoal).toBeNull();
    expect(profile.readinessToStart).toBe("unknown");
    expect(profile.trainingExperience).toBe("beginner");
    expect(profile.recoveryCapacity).toBe("unknown");
    expect(profile.nutritionConsistency).toBe("unknown");
    expect(profile.riskFlags).toEqual([]);
    expect(profile.primaryLimiters).toEqual([]);
    expect(profile.completionPercent).toBe(0);
    expect(profile.completedCategories).toEqual([]);
    expect(profile.recommendedStartingFocus).toContain("Foundational");
  });

  it("is cautious when doctor restrictions are reported", () => {
    const state = withAnswers({
      "goals-primary": "general-health",
      "fitness-experience": "intermediate",
      "history-doctor-restrictions": "yes",
    });

    const profile = buildCurrentStateProfile(state);

    expect(profile.readinessToStart).toBe("not-ready");
    expect(profile.primaryLimiters).toContain("doctor-restriction");
    expect(profile.riskFlags.some((f) => f.includes("Doctor restrictions"))).toBe(true);
    expect(profile.recommendedStartingFocus).toContain("clinician");
  });

  it("is deterministic", () => {
    const state = withAnswers({
      "goals-primary": "fat-loss",
      "fitness-experience": "beginner",
      "recovery-sleep-duration": 6,
      "recovery-stress": "high",
    });
    expect(buildCurrentStateProfile(state)).toEqual(buildCurrentStateProfile(state));
  });
});
