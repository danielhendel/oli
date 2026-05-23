// lib/contracts/__tests__/dailyFacts.stepsAllocation.test.ts
import { describe, it, expect } from "@jest/globals";
import { dailyFactsDtoSchema } from "../dailyFacts";

const baseDoc = {
  schemaVersion: 1 as const,
  userId: "u1",
  date: "2025-01-01",
  computedAt: "2025-01-02T03:00:00.000Z",
};

const validAllocation = {
  modelVersion: "activity_steps_allocation_v1" as const,
  neatSteps: 5500,
  strengthSteps: 0,
  cardioSteps: 4500,
  inputsUsed: ["activity.steps", "workout.steps", "workout.classifiedCardio"],
  inputsMissing: [],
};

describe("DailyFactsDto activity.stepsAllocation (Phase 2A)", () => {
  it("accepts a valid stepsAllocation object", () => {
    const parsed = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: {
        steps: 10000,
        stepsAllocation: validAllocation,
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activity?.stepsAllocation).toEqual(validAllocation);
    }
  });

  it("accepts activity with no stepsAllocation (optional / additive)", () => {
    const parsed = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: { steps: 10000 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activity?.stepsAllocation).toBeUndefined();
    }
  });

  it("rejects stepsAllocation with missing modelVersion", () => {
    const { modelVersion: _omit, ...withoutVersion } = validAllocation;
    void _omit;
    const parsed = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: {
        steps: 10000,
        stepsAllocation: withoutVersion,
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects stepsAllocation with wrong modelVersion literal", () => {
    const parsed = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: {
        steps: 10000,
        stepsAllocation: { ...validAllocation, modelVersion: "v2" },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects negative bucket values", () => {
    const parsed = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: {
        steps: 10000,
        stepsAllocation: { ...validAllocation, cardioSteps: -1 },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-integer bucket values", () => {
    const parsed = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: {
        steps: 10000,
        stepsAllocation: { ...validAllocation, neatSteps: 5500.5 },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("strips unknown keys on stepsAllocation (.strip() inherited from object)", () => {
    const parsed = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: {
        steps: 10000,
        stepsAllocation: { ...validAllocation, extraField: "should-be-stripped" },
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const alloc = parsed.data.activity?.stepsAllocation as Record<string, unknown>;
      expect(alloc).toBeDefined();
      expect(alloc.extraField).toBeUndefined();
    }
  });

  it("requires inputsUsed and inputsMissing as arrays of strings", () => {
    const bad = dailyFactsDtoSchema.safeParse({
      ...baseDoc,
      activity: {
        steps: 10000,
        stepsAllocation: { ...validAllocation, inputsUsed: ["activity.steps", 42] },
      },
    });
    expect(bad.success).toBe(false);
  });
});
