import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import { WORKOUT_OVERVIEW_ANALYTICS_RANGE_END, WORKOUT_OVERVIEW_ANALYTICS_RANGE_START } from "@/lib/data/workouts/workoutsCalendarModel";

describe("computeWorkoutOverviewSharedCalendarRange", () => {
  it("returns bounds that include analytics window and device week around today", () => {
    const { start, end } = computeWorkoutOverviewSharedCalendarRange("2026-04-14");
    expect(start <= WORKOUT_OVERVIEW_ANALYTICS_RANGE_START).toBe(true);
    expect(end >= WORKOUT_OVERVIEW_ANALYTICS_RANGE_END).toBe(true);
    expect(start <= "2026-04-14").toBe(true);
    expect(end >= "2026-04-14").toBe(true);
  });
});
