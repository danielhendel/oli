import { buildCardioMonthlyMilesAnalyticsModel } from "@/lib/data/workouts/cardioMonthlyMilesAnalyticsModel";
import { WORKOUT_OVERVIEW_ANALYTICS_YEAR } from "@/lib/data/workouts/workoutsCalendarModel";

function cardioDay(day: string, id: string, miles: number, title = "Running") {
  return {
    day: day as `${string}-${string}-${string}`,
    workouts: [
      {
        id,
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        title,
        workoutType: "cardio" as const,
        start: `${day}T10:00:00.000Z`,
        end: `${day}T10:30:00.000Z`,
        durationMinutes: 30,
        calories: null,
        distanceMeters: miles * 1609.344,
        activityName: title,
      },
    ],
  };
}

describe("buildCardioMonthlyMilesAnalyticsModel", () => {
  it("sums total miles per month from supported displayable cardio sessions", () => {
    const m = buildCardioMonthlyMilesAnalyticsModel({
      todayDayKey: "2026-03-20",
      analyticsYear: WORKOUT_OVERVIEW_ANALYTICS_YEAR,
      cardioCalendarDays: [
        cardioDay("2026-03-05", "a", 2),
        cardioDay("2026-03-10", "b", 3),
        cardioDay("2026-02-01", "c", 5),
      ],
    });

    expect(m.headerTitle).toBe("2026 Cardio Miles");
    expect(m.points.find((p) => p.monthKey === "2026-03")?.value).toBeCloseTo(5, 5);
    expect(m.points.find((p) => p.monthKey === "2026-02")?.value).toBeCloseTo(5, 5);
  });

  it("excludes unsupported modality rows from totals", () => {
    const m = buildCardioMonthlyMilesAnalyticsModel({
      todayDayKey: "2026-03-20",
      analyticsYear: WORKOUT_OVERVIEW_ANALYTICS_YEAR,
      cardioCalendarDays: [
        cardioDay("2026-03-10", "run", 4, "Running"),
        cardioDay("2026-03-11", "other", 50, "Other"),
      ],
    });
    expect(m.points.find((p) => p.monthKey === "2026-03")?.value).toBeCloseTo(4, 5);
  });

  it("returns zero miles for calendar months entirely after today", () => {
    const m = buildCardioMonthlyMilesAnalyticsModel({
      todayDayKey: "2026-03-15",
      analyticsYear: WORKOUT_OVERVIEW_ANALYTICS_YEAR,
      cardioCalendarDays: [cardioDay("2026-03-10", "a", 2)],
    });
    expect(m.points.find((p) => p.monthKey === "2026-04")?.value).toBe(0);
    expect(m.points.find((p) => p.monthKey === "2026-12")?.value).toBe(0);
  });
});
