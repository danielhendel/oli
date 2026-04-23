import { describe, expect, it } from "@jest/globals";
import { workoutDaySummaryItemDtoSchema } from "@/lib/contracts/retrieval";
import { WORKOUT_DAY_SUMMARY_SCHEMA_VERSION } from "@/lib/contracts/workoutDaySummary";

describe("workoutDaySummaryItemDtoSchema", () => {
  it("accepts v2 items with tab session counts", () => {
    const row = {
      schemaVersion: 2,
      day: "2026-03-10",
      computedAt: "2026-03-10T12:00:00.000Z",
      reconcileVersion: "2",
      hasStrength: true,
      hasCardio: true,
      rawWorkoutCount: 3,
      strengthSessionCount: 1,
      cardioSessionCount: 2,
    };
    const parsed = workoutDaySummaryItemDtoSchema.safeParse(row);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.strengthSessionCount).toBe(1);
      expect(parsed.data.cardioSessionCount).toBe(2);
    }
  });

  it("accepts v3 items with optional strengthTaxonomy", () => {
    const row = {
      schemaVersion: WORKOUT_DAY_SUMMARY_SCHEMA_VERSION,
      day: "2026-03-10",
      computedAt: "2026-03-10T12:00:00.000Z",
      reconcileVersion: "3",
      hasStrength: true,
      hasCardio: false,
      rawWorkoutCount: 1,
      strengthSessionCount: 1,
      cardioSessionCount: 0,
      strengthTaxonomy: {
        muscleVolumeKgByGroup: { chest: 100 },
        muscleSetCountByGroup: { chest: 1 },
        movementVolumeKg: { push: 100 },
        equipmentVolumeKg: { Barbell: 100 },
        strengthTrainingVolumeKg: 100,
      },
    };
    expect(workoutDaySummaryItemDtoSchema.safeParse(row).success).toBe(true);
  });

  it("rejects v1-shaped docs without session counts", () => {
    const legacy = {
      schemaVersion: 1,
      day: "2026-03-10",
      computedAt: "2026-03-10T12:00:00.000Z",
      reconcileVersion: "1",
      hasStrength: false,
      hasCardio: false,
      rawWorkoutCount: 0,
    };
    expect(workoutDaySummaryItemDtoSchema.safeParse(legacy).success).toBe(false);
  });
});
