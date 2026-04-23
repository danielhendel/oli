import { manualStrengthWorkoutPayloadSchema } from "../rawEvent";

describe("manualStrengthWorkoutPayloadSchema", () => {
  const basePayload = {
    startedAt: "2026-04-01T18:00:00.000Z",
    timeZone: "UTC",
    exercises: [
      {
        name: "Bench Press",
        sets: [{ reps: 5, load: 60, unit: "kg" as const }],
      },
    ],
  };

  it("accepts legacy strength_workout payload without exerciseId", () => {
    const parsed = manualStrengthWorkoutPayloadSchema.safeParse(basePayload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.exercises[0]?.exerciseId).toBeUndefined();
  });

  it("accepts optional exerciseId on exercises", () => {
    const parsed = manualStrengthWorkoutPayloadSchema.safeParse({
      ...basePayload,
      exercises: [
        {
          name: "Bench Press",
          exerciseId: "bench_press",
          sets: [{ reps: 5, load: 60, unit: "kg" as const }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.exercises[0]?.exerciseId).toBe("bench_press");
  });

  it("rejects empty exerciseId when present", () => {
    const parsed = manualStrengthWorkoutPayloadSchema.safeParse({
      ...basePayload,
      exercises: [
        {
          name: "Bench Press",
          exerciseId: "",
          sets: [{ reps: 5, load: 60, unit: "kg" as const }],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
