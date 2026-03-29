import { computeStrengthVolumeKgFromStrengthWorkoutPayload } from "@/lib/data/workouts/strengthWorkoutVolumeKg";

describe("computeStrengthVolumeKgFromStrengthWorkoutPayload", () => {
  it("sums non-warmup sets only", () => {
    const payload = {
      startedAt: "2026-01-01T10:00:00.000Z",
      timeZone: "UTC",
      exercises: [
        {
          name: "Squat",
          sets: [
            { reps: 5, load: 100, unit: "kg" as const, isWarmup: true },
            { reps: 5, load: 140, unit: "kg" as const },
          ],
        },
      ],
    };
    expect(computeStrengthVolumeKgFromStrengthWorkoutPayload(payload)).toBe(700);
  });
});
