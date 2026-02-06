// lib/events/__tests__/manualStrengthWorkout.test.ts
import {
  buildManualStrengthWorkoutPayload,
  manualStrengthWorkoutIdempotencyKey,
  type ManualStrengthWorkoutInput,
} from "../manualStrengthWorkout";

describe("manualStrengthWorkout", () => {
  const baseInput: ManualStrengthWorkoutInput = {
    startedAt: "2025-02-06T14:00:00.000Z",
    timeZone: "America/New_York",
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { reps: 10, load: 135.5, unit: "lb" },
          { reps: 8, load: 155, unit: "lb", isWarmup: true },
          { reps: 5, load: 185.123, unit: "lb", rpe: 8.5, notes: "felt strong" },
        ],
      },
    ],
  };

  describe("buildManualStrengthWorkoutPayload", () => {
    it("returns payload with correct shape", () => {
      const payload = buildManualStrengthWorkoutPayload(baseInput);

      expect(payload.startedAt).toBe("2025-02-06T14:00:00.000Z");
      expect(payload.timeZone).toBe("America/New_York");
      expect(payload.exercises).toHaveLength(1);
      expect(payload.exercises[0]?.name).toBe("Bench Press");
      expect(payload.exercises[0]?.sets).toHaveLength(3);
    });

    it("rounds load to 2 decimals", () => {
      const payload = buildManualStrengthWorkoutPayload(baseInput);
      const sets = payload.exercises[0]?.sets ?? [];
      expect(sets[0]?.load).toBe(135.5);
      expect(sets[2]?.load).toBe(185.12); // 185.123 -> 185.12
    });

    it("trims exercise name", () => {
      const payload = buildManualStrengthWorkoutPayload({
        ...baseInput,
        exercises: [{ name: "  Squat  ", sets: [{ reps: 5, load: 225, unit: "lb" }] }],
      });
      expect(payload.exercises[0]?.name).toBe("Squat");
    });

    it("includes optional fields when present", () => {
      const payload = buildManualStrengthWorkoutPayload(baseInput);
      const sets = payload.exercises[0]?.sets ?? [];
      expect(sets[1]?.isWarmup).toBe(true);
      expect(sets[2]?.rpe).toBe(8.5);
      expect(sets[2]?.notes).toBe("felt strong");
    });

    it("omits optional fields when absent", () => {
      const payload = buildManualStrengthWorkoutPayload(baseInput);
      const set0 = payload.exercises[0]?.sets[0];
      expect(set0).not.toHaveProperty("isWarmup");
      expect(set0).not.toHaveProperty("rpe");
      expect(set0).not.toHaveProperty("rir");
      expect(set0).not.toHaveProperty("notes");
    });

    it("truncates notes to 256 chars", () => {
      const longNotes = "x".repeat(300);
      const payload = buildManualStrengthWorkoutPayload({
        ...baseInput,
        exercises: [
          {
            name: "DL",
            sets: [{ reps: 5, load: 315, unit: "lb", notes: longNotes }],
          },
        ],
      });
      expect(payload.exercises[0]?.sets[0]?.notes).toHaveLength(256);
    });

    it("handles multiple exercises", () => {
      const input: ManualStrengthWorkoutInput = {
        ...baseInput,
        exercises: [
          { name: "Squat", sets: [{ reps: 5, load: 225, unit: "kg" }] },
          { name: "Deadlift", sets: [{ reps: 3, load: 275, unit: "lb", rir: 2 }] },
        ],
      };
      const payload = buildManualStrengthWorkoutPayload(input);
      expect(payload.exercises).toHaveLength(2);
      expect(payload.exercises[0]?.name).toBe("Squat");
      expect(payload.exercises[0]?.sets[0]?.unit).toBe("kg");
      expect(payload.exercises[1]?.name).toBe("Deadlift");
      expect(payload.exercises[1]?.sets[0]?.rir).toBe(2);
    });
  });

  describe("manualStrengthWorkoutIdempotencyKey", () => {
    it("is deterministic for same payload", () => {
      const payload = buildManualStrengthWorkoutPayload(baseInput);
      const key1 = manualStrengthWorkoutIdempotencyKey(payload);
      const key2 = manualStrengthWorkoutIdempotencyKey(payload);
      expect(key1).toBe(key2);
    });

    it("starts with msw_ prefix", () => {
      const payload = buildManualStrengthWorkoutPayload(baseInput);
      const key = manualStrengthWorkoutIdempotencyKey(payload);
      expect(key.startsWith("msw_")).toBe(true);
    });

    it("includes startedAt in key", () => {
      const payload = buildManualStrengthWorkoutPayload(baseInput);
      const key = manualStrengthWorkoutIdempotencyKey(payload);
      expect(key).toContain("2025-02-06T14_00_00.000Z");

    });

    it("produces different keys for different payloads", () => {
      const p1 = buildManualStrengthWorkoutPayload(baseInput);
      const p2 = buildManualStrengthWorkoutPayload({
        ...baseInput,
        exercises: [
          {
            name: "Bench Press",
            sets: [
              { reps: 10, load: 135.5, unit: "lb" },
              { reps: 8, load: 155, unit: "lb" }, // different: no isWarmup
              { reps: 5, load: 185.12, unit: "lb", rpe: 8.5, notes: "felt strong" },
            ],
          },
        ],
      });
      const key1 = manualStrengthWorkoutIdempotencyKey(p1);
      const key2 = manualStrengthWorkoutIdempotencyKey(p2);
      expect(key1).not.toBe(key2);
    });

    it("produces different keys for different exercises", () => {
      const p1 = buildManualStrengthWorkoutPayload({
        ...baseInput,
        exercises: [{ name: "Squat", sets: [{ reps: 5, load: 225, unit: "lb" }] }],
      });
      const p2 = buildManualStrengthWorkoutPayload({
        ...baseInput,
        exercises: [{ name: "Deadlift", sets: [{ reps: 5, load: 225, unit: "lb" }] }],
      });
      expect(manualStrengthWorkoutIdempotencyKey(p1)).not.toBe(manualStrengthWorkoutIdempotencyKey(p2));
    });

    it("produces different keys for different startedAt", () => {
      const p1 = buildManualStrengthWorkoutPayload(baseInput);
      const p2 = buildManualStrengthWorkoutPayload({
        ...baseInput,
        startedAt: "2025-02-06T15:00:00.000Z",
      });
      expect(manualStrengthWorkoutIdempotencyKey(p1)).not.toBe(manualStrengthWorkoutIdempotencyKey(p2));
    });
  });
});
