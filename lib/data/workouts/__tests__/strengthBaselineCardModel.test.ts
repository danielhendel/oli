import { buildStrengthBaselineCardModel } from "../strengthBaselineCardModel";

/** Minimal calendar row matching existing Strength overview tests (resolves to strength sessions). */
function strengthDay(day: string, id: string) {
  return {
    day: day as `${string}-${string}-${string}`,
    workouts: [
      {
        id,
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        title: "Lift",
        workoutType: "strength" as const,
        start: `${day}T10:00:00.000Z`,
        end: `${day}T10:30:00.000Z`,
        durationMinutes: 30,
        calories: null,
      },
    ],
  };
}

describe("buildStrengthBaselineCardModel", () => {
  const today = "2026-06-15" as const;

  it("uses 90 completed local days ending yesterday (not today)", () => {
    const yesterday = "2026-06-14";
    const onlyToday = strengthDay(today, "t1");
    const onlyYesterday = strengthDay(yesterday, "y1");

    const baselineTodayOnly = buildStrengthBaselineCardModel({
      strengthCalendarDays: [onlyToday],
      todayDayKey: today,
    });
    expect(baselineTodayOnly.avgWorkoutsPerWeek).toBe(0);

    const baselineYesterday = buildStrengthBaselineCardModel({
      strengthCalendarDays: [onlyYesterday],
      todayDayKey: today,
    });
    expect(baselineYesterday.avgWorkoutsPerWeek).toBeCloseTo(7 / 90, 10);

    const regressionMerged = buildStrengthBaselineCardModel({
      strengthCalendarDays: [onlyYesterday, onlyToday],
      todayDayKey: today,
    });
    expect(regressionMerged.avgWorkoutsPerWeek).toBeCloseTo(7 / 90, 10);
  });

  it("regresses if today’s strength sessions affected the numerator: extra workouts on today do not move baseline", () => {
    const yesterday = "2026-06-14";
    const yesterdaySession = strengthDay(yesterday, "y1");
    const oneTodayWorkout = strengthDay(today, "t1");
    const twoTodayWorkouts = {
      ...oneTodayWorkout,
      workouts: [
        oneTodayWorkout.workouts[0]!,
        {
          ...oneTodayWorkout.workouts[0]!,
          id: "t2",
        },
      ],
    };

    const oneToday = buildStrengthBaselineCardModel({
      strengthCalendarDays: [yesterdaySession, oneTodayWorkout],
      todayDayKey: today,
    });
    const twoToday = buildStrengthBaselineCardModel({
      strengthCalendarDays: [yesterdaySession, twoTodayWorkouts],
      todayDayKey: today,
    });

    expect(oneToday.avgWorkoutsPerWeek).toBe(twoToday.avgWorkoutsPerWeek);
    expect(oneToday.avgWorkoutsPerWeek).toBeCloseTo(7 / 90, 10);
  });
});
