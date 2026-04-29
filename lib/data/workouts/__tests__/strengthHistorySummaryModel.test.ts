import { buildStrengthHistorySummaryModel } from "../strengthHistorySummaryModel";

function strengthWorkout(day: string, id: string, durationMinutes: number) {
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

function strengthWorkoutNoDuration(day: string, id: string) {
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
        durationMinutes: null,
        calories: null,
      },
    ],
  };
}

describe("buildStrengthHistorySummaryModel", () => {
  it("builds 7/30/YTD rows with sessions and minutes per week", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-12-01",
      availableRangeEnd: "2026-03-12",
      strengthCalendarDays: [
        strengthWorkout("2026-03-10", "a", 40),
        strengthWorkout("2026-03-11", "b", 30),
      ],
    });
    const day7 = model.rows.find((row) => row.key === "day7");
    expect(day7?.hasEnoughData).toBe(true);
    expect(day7?.displayValue).toContain("wo ·");
    expect(day7?.displayValue).toContain("min/wk");
    expect(day7?.totalSessions).toBe(2);
    expect(day7?.totalMinutes).toBe(70);
  });

  it("computes 30 day minutes/week correctly", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-12",
      strengthCalendarDays: [
        strengthWorkout("2026-03-10", "a", 60),
        strengthWorkout("2026-03-11", "b", 30),
      ],
    });
    const day30 = model.rows.find((row) => row.key === "day30");
    expect(day30?.averageMinutesPerWeek).toBeCloseTo((90 * 7) / 30, 10);
    expect(day30?.displayValue).toBe("0.5 wo · 21 min/wk");
  });

  it("does not double count merged session durations", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-12",
      strengthCalendarDays: [
        {
          day: "2026-03-10",
          workouts: [
            {
              id: "x1",
              observedAt: "2026-03-10T10:00:00.000Z",
              sourceId: "apple_health",
              title: "Lift",
              workoutType: "strength" as const,
              start: "2026-03-10T10:00:00.000Z",
              end: "2026-03-10T10:45:00.000Z",
              durationMinutes: 45,
              calories: null,
            },
            {
              id: "x2",
              observedAt: "2026-03-10T10:05:00.000Z",
              sourceId: "apple_health",
              title: "Lift",
              workoutType: "strength" as const,
              start: "2026-03-10T10:05:00.000Z",
              end: "2026-03-10T10:40:00.000Z",
              durationMinutes: 35,
              calories: null,
            },
          ],
        },
      ],
    });
    const day7 = model.rows.find((row) => row.key === "day7");
    expect(day7?.totalMinutes).toBe(45);
  });

  it("falls back safely when durations are missing", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-12",
      strengthCalendarDays: [strengthWorkoutNoDuration("2026-03-10", "n1")],
    });
    const day7 = model.rows.find((row) => row.key === "day7");
    expect(day7?.displayValue).toBe("1.0 wo/wk");
  });

  it("computes YTD minutes/week from elapsed YTD days", () => {
    const ytdDays = [
      "2026-01-05",
      "2026-01-15",
      "2026-01-25",
      "2026-02-05",
      "2026-02-15",
      "2026-02-25",
      "2026-03-05",
      "2026-03-15",
      "2026-03-25",
      "2026-04-05",
    ];
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-05-01",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-05-01",
      strengthCalendarDays: ytdDays.map((day, idx) => strengthWorkout(day, `ytd-${idx}`, 120)),
    });
    const ytd = model.rows.find((row) => row.key === "ytd");
    expect(ytd?.totalMinutes).toBe(1200);
    expect(ytd?.averageMinutesPerWeek).toBeCloseTo(70, 10);
    expect(ytd?.displayValue).toContain("70 min/wk");
  });

  it("marks 12 month as insufficient when hydrated range is short", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2026-01-01",
      availableRangeEnd: "2026-03-12",
      strengthCalendarDays: [strengthWorkout("2026-03-10", "a", 40)],
    });
    const month12 = model.rows.find((row) => row.key === "month12");
    expect(month12).toMatchObject({
      hasEnoughData: false,
      displayValue: "—",
      helperText: "Data will appear when enough history is available",
      progressFill01: null,
    });
  });
});
