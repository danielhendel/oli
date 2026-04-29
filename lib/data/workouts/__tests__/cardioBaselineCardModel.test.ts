import { buildCardioBaselineCardModel } from "../cardioBaselineCardModel";

function cardioWorkout(day: string, id: string, miles: number) {
  return {
    day: day as `${string}-${string}-${string}`,
    workouts: [
      {
        id,
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        title: "Run",
        workoutType: "cardio" as const,
        start: `${day}T10:00:00.000Z`,
        end: `${day}T10:30:00.000Z`,
        durationMinutes: 30,
        calories: null,
        distanceMeters: miles * 1609.344,
      },
    ],
  };
}

describe("buildCardioBaselineCardModel", () => {
  const today = "2026-06-15" as const;

  it("uses trailing 90 completed days and excludes today", () => {
    const model = buildCardioBaselineCardModel({
      cardioCalendarDays: [
        cardioWorkout("2026-06-14", "y", 10),
        cardioWorkout("2026-06-15", "t", 20),
      ],
      todayDayKey: today,
    });
    expect(model.kind).toBe("ready");
    if (model.kind !== "ready") return;
    expect(model.totalMiles90d).toBeCloseTo(10, 5);
    expect(model.averageMilesPerWeek90d).toBeCloseTo((10 * 7) / 90, 10);
  });

  it("computes weekly average from total 90-day miles", () => {
    const model = buildCardioBaselineCardModel({
      cardioCalendarDays: [
        cardioWorkout("2026-04-01", "a", 5),
        cardioWorkout("2026-05-01", "b", 10),
      ],
      todayDayKey: today,
    });
    expect(model.kind).toBe("ready");
    if (model.kind !== "ready") return;
    expect(model.totalMiles90d).toBeCloseTo(15, 5);
    expect(model.averageMilesPerWeek90d).toBeCloseTo((15 * 7) / 90, 10);
    expect(model.totalMinutes90d).toBe(60);
    expect(model.averageMinutesPerWeek90d).toBeCloseTo((60 * 7) / 90, 10);
    expect(model.formattedAverageMilesPerWeek).toBe("1.2 mi/wk");
    expect(model.formattedAverageMinutesPerWeek).toBe("5 min/wk");
    expect(model.headlineLabel).toBe("1.2 mi · 5 min/wk");
  });

  it("returns insufficient_data when no cardio distance is available", () => {
    const model = buildCardioBaselineCardModel({
      cardioCalendarDays: [],
      todayDayKey: today,
    });
    expect(model).toEqual({ kind: "insufficient_data" });
  });

  it("maps CDC/AHA product tier boundaries", () => {
    const cases = [
      { milesPerWeek: 2.4, tier: "very_low" },
      { milesPerWeek: 2.5, tier: "low" },
      { milesPerWeek: 7.4, tier: "low" },
      { milesPerWeek: 7.5, tier: "active" },
      { milesPerWeek: 14.9, tier: "active" },
      { milesPerWeek: 15, tier: "high" },
      { milesPerWeek: 24.9, tier: "high" },
      { milesPerWeek: 25, tier: "very_high" },
    ] as const;

    for (const entry of cases) {
      const totalMiles90d = (entry.milesPerWeek * 90) / 7;
      const model = buildCardioBaselineCardModel({
        cardioCalendarDays: [cardioWorkout("2026-06-14", `c-${entry.milesPerWeek}`, totalMiles90d)],
        todayDayKey: today,
      });
      expect(model.kind).toBe("ready");
      if (model.kind !== "ready") continue;
      expect(model.tier).toBe(entry.tier);
    }
  });

  it("returns minutes-only headline when distance is unavailable", () => {
    const day = "2026-06-14";
    const model = buildCardioBaselineCardModel({
      cardioCalendarDays: [
        {
          day: day as `${string}-${string}-${string}`,
          workouts: [
            {
              id: "m-only",
              observedAt: `${day}T10:00:00.000Z`,
              sourceId: "apple_health",
              title: "Run",
              workoutType: "cardio" as const,
              start: `${day}T10:00:00.000Z`,
              end: `${day}T10:30:00.000Z`,
              durationMinutes: 30,
              calories: null,
            },
          ],
        },
      ],
      todayDayKey: today,
    });
    expect(model.kind).toBe("ready");
    if (model.kind !== "ready") return;
    expect(model.totalMiles90d).toBe(0);
    expect(model.totalMinutes90d).toBe(30);
    expect(model.headlineLabel).toBe("2 min/wk");
  });
});
