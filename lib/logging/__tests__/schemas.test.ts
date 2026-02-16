// lib/logging/__tests__/schemas.test.ts
import {
  toWorkoutPayload,
  toCardioPayload,
  toNutritionPayload,
  toRecoveryPayload,
  type ValidationResult,
} from "../../logging/transformers";

/** Assert helper: ensures ok=true; afterwards you can safely read res.data */
function assertOk(res: ValidationResult<unknown>): asserts res is { ok: true; data: unknown } {
  if (!res.ok) {
    const msg = res.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error(`Expected ok=true but got issues: ${msg}`);
  }
}

describe("transformers", () => {
  it("workout payload", () => {
    const res = toWorkoutPayload({
      exercises: [{ name: "Bench", sets: [{ reps: 10, weight: 60 }] }],
    });

    type WorkoutPayload = {
      exercises: { name?: string; sets: { reps?: number; weight?: number }[] }[];
      durationMs?: number;
      startedAtMs?: number;
    };

    assertOk(res);
    const data = res.data as WorkoutPayload;

    expect(data.exercises.length).toBeGreaterThan(0);
    expect(data.exercises[0]?.name).toBe("Bench");
  });

  it("cardio payload", () => {
    const res = toCardioPayload({
      modality: "run",
      distanceKm: 5.1,
      rpe: 7,
      durationMs: 1_800_000,
    });

    type CardioPayload = {
      distanceKm?: number;
      durationMs?: number;
      rpe?: number;
      modality?: string;
      startedAtMs?: number;
    };

    assertOk(res);
    const data = res.data as CardioPayload;

    expect(data.distanceKm).toBeCloseTo(5.1);
  });

  it("nutrition payload", () => {
    const res = toNutritionPayload({
      totals: { calories: 1900, protein: 130 },
      meals: { breakfast: { calories: 500, protein: 30 } },
    });

    type NutritionPayload = {
      totals?: { calories?: number; protein?: number };
      meals?: {
        breakfast?: { calories?: number; protein?: number };
        lunch?: { calories?: number; protein?: number };
        dinner?: { calories?: number; protein?: number };
        snacks?: { calories?: number; protein?: number };
      };
    };

    assertOk(res);
    const data = res.data as NutritionPayload;

    expect(data.totals?.calories).toBe(1900);
    expect(data.totals?.protein).toBe(130);
  });

  it("recovery payload", () => {
    const res = toRecoveryPayload({ sleepMin: 420, hrv: 60, rhr: 60 });

    type RecoveryPayload = { sleepMin?: number; hrv?: number; rhr?: number };

    assertOk(res);
    const data = res.data as RecoveryPayload;

    expect(data.sleepMin).toBe(420);
  });
});
