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

function strengthDayWithDuration(day: string, id: string, durationMinutes: number) {
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
        durationMinutes,
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
    expect(baselineYesterday.avgMinutesPerWeek).toBeCloseTo((30 * 7) / 90, 10);
    expect(baselineYesterday.compactValuePrimary).toBe("0.1 wo · 2 min/wk");

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
    expect(oneToday.avgMinutesPerWeek).toBe(twoToday.avgMinutesPerWeek);
  });

  it("does not double count workout durations when session duration already exists", () => {
    const day = "2026-06-14";
    const model = buildStrengthBaselineCardModel({
      strengthCalendarDays: [
        {
          day: day as `${string}-${string}-${string}`,
          workouts: [
            {
              id: "s1",
              observedAt: `${day}T10:00:00.000Z`,
              sourceId: "apple_health",
              title: "Lift",
              workoutType: "strength" as const,
              start: `${day}T10:00:00.000Z`,
              end: `${day}T10:45:00.000Z`,
              durationMinutes: 45,
              calories: null,
            },
            {
              id: "s2",
              observedAt: `${day}T10:05:00.000Z`,
              sourceId: "apple_health",
              title: "Lift",
              workoutType: "strength" as const,
              start: `${day}T10:05:00.000Z`,
              end: `${day}T10:40:00.000Z`,
              durationMinutes: 35,
              calories: null,
            },
          ],
        },
      ],
      todayDayKey: today,
    });
    expect(model.totalMinutes90d).toBe(45);
    expect(model.compactValuePrimary).toBe("0.1 wo · 4 min/wk");
  });

  it("computes baseline minutes/week as total90d divided by 90/7", () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const dayNum = i + 1;
      const day = `2026-05-${String(dayNum).padStart(2, "0")}`;
      return strengthDayWithDuration(day, `d-${i}`, 30);
    });
    const model = buildStrengthBaselineCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
    });
    expect(model.totalMinutes90d).toBe(900);
    expect(model.avgMinutesPerWeek).toBeCloseTo(70, 10);
    expect(model.compactValuePrimary).toContain("70 min/wk");
  });
});
