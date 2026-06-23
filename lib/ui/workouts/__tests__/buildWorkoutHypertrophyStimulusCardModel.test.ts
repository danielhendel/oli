import {
  buildWorkoutHypertrophyStimulusCardModel,
  mapManualWorkoutExercisesToHypertrophyStimulusSets,
} from "@/lib/ui/workouts/buildWorkoutHypertrophyStimulusCardModel";

describe("buildWorkoutHypertrophyStimulusCardModel", () => {
  it("returns null for an empty session (card hidden)", () => {
    expect(
      buildWorkoutHypertrophyStimulusCardModel({
        sessionId: "session-empty",
        sets: [],
      }),
    ).toBeNull();
  });

  it("shows top regions for a seeded session", () => {
    const model = buildWorkoutHypertrophyStimulusCardModel({
      sessionId: "session-seeded",
      sets: [
        { exerciseId: "bench_press", reps: 8, rpe: 8 },
        { exerciseId: "squat", reps: 5, rpe: 9 },
      ],
    });

    expect(model).not.toBeNull();
    expect(model!.title).toBe("Muscle Stimulus");
    expect(model!.topRegions.length).toBeGreaterThan(0);
    expect(model!.topRegions.length).toBeLessThanOrEqual(3);
    expect(model!.estimatedFatigue).toMatch(/Minimal|Low|Moderate|High/);
    expect(model!.recoveryDemand).toMatch(/Minimal|Low|Moderate|High/);
    expect(model!.fallbackNote).toBeNull();
  });

  it("returns a fallback-safe model for unseeded-only sessions", () => {
    const model = buildWorkoutHypertrophyStimulusCardModel({
      sessionId: "session-fallback",
      sets: [{ exerciseId: "pec_stretch", reps: 10, rpe: 7 }],
    });

    expect(model).not.toBeNull();
    expect(model!.topRegions).toEqual([]);
    expect(model!.estimatedFatigue).toBe("Minimal");
    expect(model!.recoveryDemand).toBe("Minimal");
    expect(model!.fallbackNote).toBe(
      "Stimulus estimates aren't available for these exercises yet.",
    );
  });

  it("notes when many exercises lack intelligence in a mixed session", () => {
    const model = buildWorkoutHypertrophyStimulusCardModel({
      sessionId: "session-mixed",
      sets: [
        { exerciseId: "pec_stretch", reps: 10, rpe: 7 },
        { exerciseId: "cable_chest_fly", reps: 12, rpe: 8 },
        { exerciseId: "bench_press", reps: 8, rpe: 8 },
      ],
    });

    expect(model).not.toBeNull();
    expect(model!.topRegions.length).toBeGreaterThan(0);
    expect(model!.fallbackNote).toBe("Some exercises aren't in the stimulus catalog yet.");
  });

  it("ignores warmup sets when mapping manual workout exercises", () => {
    const sets = mapManualWorkoutExercisesToHypertrophyStimulusSets([
      {
        exerciseId: "bench_press",
        sets: [
          { reps: 20, weightKg: 60, intensity: 5, isWarmup: true },
          { reps: 8, weightKg: 100, intensity: 8, isWarmup: false },
        ],
      },
    ]);

    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ exerciseId: "bench_press", reps: 8 });
  });
});
