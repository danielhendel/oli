import { describe, expect, it } from "@jest/globals";
import {
  verifyWorkoutDaySummaryRebuild,
  verifyWorkoutMonthSummaryRebuild,
} from "@/lib/data/workouts/workoutSummaryVerification";
import type { WorkoutDaySummaryItemDto, WorkoutMonthSummaryItemDto } from "@oli/contracts";

describe("workoutSummaryVerification", () => {
  const baseDay: WorkoutDaySummaryItemDto = {
    schemaVersion: 3,
    day: "2026-04-01",
    computedAt: "2026-04-01T00:00:00.000Z",
    reconcileVersion: "3",
    hasStrength: true,
    hasCardio: false,
    rawWorkoutCount: 1,
    strengthSessionCount: 1,
    cardioSessionCount: 0,
  };

  it("flags session count regression on day summary", () => {
    const before = { ...baseDay, strengthSessionCount: 2 };
    const after = { ...baseDay, strengthSessionCount: 1 };
    const v = verifyWorkoutDaySummaryRebuild({ before, after });
    expect(v.ok).toBe(false);
    expect(v.findings.some((f) => f.code === "count_drop_strengthSessionCount")).toBe(true);
  });

  it("treats identical snapshots as ok (idempotent semantics for comparable fields)", () => {
    const v = verifyWorkoutDaySummaryRebuild({ before: baseDay, after: { ...baseDay, computedAt: "2026-04-02T00:00:00.000Z" } });
    expect(v.ok).toBe(true);
  });

  const baseMonth: WorkoutMonthSummaryItemDto = {
    schemaVersion: 2,
    monthKey: "2026-04",
    computedAt: "2026-04-01T00:00:00.000Z",
    reconcileVersion: "2",
    strengthSessionCount: 2,
    cardioSessionCount: 1,
    strengthWeekKeys: [],
    cardioWeekKeys: [],
    strengthDurationSumCapped: 60,
    strengthDurationCountCapped: 1,
    cardioDurationSumCapped: 30,
    cardioDurationCountCapped: 1,
  };

  it("flags taxonomy volume regression on month summary", () => {
    const before = {
      ...baseMonth,
      strengthTaxonomy: { strengthTrainingVolumeKg: 1000, muscleVolumeKgByGroup: {}, muscleSetCountByGroup: {}, movementVolumeKg: {}, equipmentVolumeKg: {} },
    };
    const after = {
      ...baseMonth,
      strengthTaxonomy: { strengthTrainingVolumeKg: 500, muscleVolumeKgByGroup: {}, muscleSetCountByGroup: {}, movementVolumeKg: {}, equipmentVolumeKg: {} },
    };
    const v = verifyWorkoutMonthSummaryRebuild({ before, after });
    expect(v.ok).toBe(false);
    expect(v.findings.some((f) => f.code === "month_strength_taxonomy_volume_drop")).toBe(true);
  });
});
