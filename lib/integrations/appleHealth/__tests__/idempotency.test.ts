/**
 * Unit tests: idempotency key determinism and sanitization.
 * Keys must be deterministic (same input → same key) and Firestore-safe (no '/').
 */

import {
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  restingHeartRateIdempotencyKey,
  appleExerciseTimeIdempotencyKey,
  activeEnergyIdempotencyKey,
} from "../idempotency";

describe("appleHealth idempotency", () => {
  describe("stepsIdempotencyKey", () => {
    it("is deterministic for same day", () => {
      expect(stepsIdempotencyKey("2025-02-23")).toBe(stepsIdempotencyKey("2025-02-23"));
      expect(stepsIdempotencyKey("2025-02-23")).toBe("appleHealth:v2:steps:2025-02-23");
    });

    it("produces different keys for different days", () => {
      expect(stepsIdempotencyKey("2025-02-23")).not.toBe(stepsIdempotencyKey("2025-02-24"));
    });

    it("sanitizes day (no slash in output)", () => {
      const key = stepsIdempotencyKey("2025/02/23");
      expect(key).not.toContain("/");
      expect(key).toContain("2025_02_23");
    });

    it("throws if day is empty after trim", () => {
      expect(() => stepsIdempotencyKey("")).toThrow("day is required");
      expect(() => stepsIdempotencyKey("   ")).toThrow("day is required");
    });
  });

  describe("workoutIdempotencyKey", () => {
    it("is deterministic for same inputs", () => {
      const params = {
        startIso: "2025-02-23T10:00:00.000Z",
        endIso: "2025-02-23T11:00:00.000Z",
        activityId: 13,
        sourceId: "Watch",
      };
      expect(workoutIdempotencyKey(params)).toBe(workoutIdempotencyKey(params));
    });

    it("includes start, end, activityId, sourceId when present", () => {
      const key = workoutIdempotencyKey({
        startIso: "2025-02-23T10:00:00.000Z",
        endIso: "2025-02-23T11:00:00.000Z",
        activityId: 13,
        sourceId: "Watch",
      });
      expect(key).toMatch(/^appleHealth:v2:workout:/);
      expect(key).not.toContain("/");
      expect(key).toContain("2025-02-23T10:00:00.000Z");
      expect(key).toContain("2025-02-23T11:00:00.000Z");
      expect(key).toContain("13");
      expect(key).toContain("Watch");
    });

    it("works without sourceId", () => {
      const key = workoutIdempotencyKey({
        startIso: "2025-02-23T10:00:00.000Z",
        endIso: "2025-02-23T11:00:00.000Z",
        activityId: 1,
      });
      expect(key).not.toContain("/");
      expect(key).toBe(workoutIdempotencyKey({ startIso: "2025-02-23T10:00:00.000Z", endIso: "2025-02-23T11:00:00.000Z", activityId: 1 }));
    });

    it("sanitizes slashes in start/end/sourceId", () => {
      const key = workoutIdempotencyKey({
        startIso: "2025/02/23T10:00:00Z",
        endIso: "2025/02/23T11:00:00Z",
        activityId: 1,
        sourceId: "a/b",
      });
      expect(key).not.toContain("/");
    });

    it("throws if startIso or endIso empty", () => {
      expect(() =>
        workoutIdempotencyKey({
          startIso: "",
          endIso: "2025-02-23T11:00:00.000Z",
          activityId: 1,
        }),
      ).toThrow("startIso and endIso are required");
    });
  });

  describe("restingHeartRateIdempotencyKey", () => {
    it("is deterministic for same inputs", () => {
      expect(
        restingHeartRateIdempotencyKey({ timestampIso: "2025-02-23T08:00:00.000Z", sampleId: "id-1" }),
      ).toBe(
        restingHeartRateIdempotencyKey({ timestampIso: "2025-02-23T08:00:00.000Z", sampleId: "id-1" }),
      );
    });

    it("no slash in output", () => {
      const key = restingHeartRateIdempotencyKey({
        timestampIso: "2025-02-23T08:00:00.000Z",
        sampleId: "foo/bar",
      });
      expect(key).not.toContain("/");
    });

    it("works without sampleId", () => {
      const key = restingHeartRateIdempotencyKey({ timestampIso: "2025-02-23T08:00:00.000Z" });
      expect(key).toMatch(/^appleHealth:v2:restingHr:/);
      expect(key).not.toContain("/");
    });

    it("throws if timestampIso empty", () => {
      expect(() => restingHeartRateIdempotencyKey({ timestampIso: "" })).toThrow("timestampIso is required");
    });
  });

  describe("appleExerciseTimeIdempotencyKey", () => {
    it("is deterministic for same day", () => {
      expect(appleExerciseTimeIdempotencyKey("2025-02-23")).toBe(
        appleExerciseTimeIdempotencyKey("2025-02-23"),
      );
      expect(appleExerciseTimeIdempotencyKey("2025-02-23")).toBe("appleHealth:v2:appleExerciseTime:2025-02-23");
    });

    it("no slash in output", () => {
      expect(appleExerciseTimeIdempotencyKey("2025/02/23")).not.toContain("/");
    });
  });

  describe("activeEnergyIdempotencyKey", () => {
    it("is deterministic for same day", () => {
      expect(activeEnergyIdempotencyKey("2025-02-23")).toBe(activeEnergyIdempotencyKey("2025-02-23"));
      expect(activeEnergyIdempotencyKey("2025-02-23")).toBe("appleHealth:v2:activeEnergy:2025-02-23");
    });

    it("no slash in output", () => {
      expect(activeEnergyIdempotencyKey("2025/02/23")).not.toContain("/");
    });
  });
});
