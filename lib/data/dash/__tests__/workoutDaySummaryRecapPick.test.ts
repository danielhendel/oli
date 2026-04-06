import { describe, expect, it } from "@jest/globals";
import { pickWorkoutDaySummaryItemForDay } from "../workoutDaySummaryRecapPick";
import type { WorkoutDaySummariesResponseDto } from "@oli/contracts";

describe("pickWorkoutDaySummaryItemForDay", () => {
  it("returns the item for the requested day", () => {
    const res: WorkoutDaySummariesResponseDto = {
      start: "2026-04-05",
      end: "2026-04-05",
      expectedDayCount: 1,
      complete: true,
      items: [
        {
          schemaVersion: 2,
          day: "2026-04-05",
          computedAt: "2026-04-06T00:00:00.000Z",
          reconcileVersion: "2",
          hasStrength: false,
          hasCardio: true,
          rawWorkoutCount: 1,
          strengthSessionCount: 0,
          cardioSessionCount: 1,
        },
      ],
    };
    expect(pickWorkoutDaySummaryItemForDay(res, "2026-04-05")?.cardioSessionCount).toBe(1);
  });

  it("returns null when the day is absent", () => {
    const res: WorkoutDaySummariesResponseDto = {
      start: "2026-04-05",
      end: "2026-04-05",
      expectedDayCount: 1,
      complete: false,
      items: [],
    };
    expect(pickWorkoutDaySummaryItemForDay(res, "2026-04-05")).toBeNull();
  });
});
