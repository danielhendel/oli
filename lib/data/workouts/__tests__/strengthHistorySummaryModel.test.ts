import {
  buildStrengthHistorySummaryModel,
  formatStrengthAvgWorkoutsPerWeekDisplay,
} from "../strengthHistorySummaryModel";

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

describe("formatStrengthAvgWorkoutsPerWeekDisplay", () => {
  it("uses one decimal and per week suffix", () => {
    expect(formatStrengthAvgWorkoutsPerWeekDisplay(4.375)).toBe("4.4 per week");
  });
});

describe("buildStrengthHistorySummaryModel", () => {
  it("lists rows in product order with per-week display only (no minutes)", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-15",
      strengthCalendarDays: [strengthWorkout("2026-03-10", "a", 40)],
    });
    expect(model.rows.map((r) => r.label)).toEqual(["7 Day", "30 Day", "90 Day", "YTD", "12 Month"]);
    for (const row of model.rows) {
      if (row.hasEnoughData) {
        expect(row.displayValue).toContain("per week");
        expect(row.displayValue).not.toContain("min");
      }
    }
  });

  it("7 Day uses trailing 7 local days through today (same aggregation as 30 Day)", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-15",
      strengthCalendarDays: [
        strengthWorkout("2026-03-09", "a", 30),
        strengthWorkout("2026-03-10", "b", 30),
      ],
    });
    const row = model.rows.find((r) => r.key === "thisWeek");
    expect(row?.label).toBe("7 Day");
    expect(row?.hasEnoughData).toBe(true);
    expect(row?.displayValue).toBe("2.0 per week");
  });

  it("5 sessions in the last 7 days average to 5.0 per week", () => {
    const days = ["2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12"];
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-15",
      strengthCalendarDays: days.map((d, i) => strengthWorkout(d, `w${i}`, 30)),
    });
    const row = model.rows.find((r) => r.key === "thisWeek");
    expect(row?.displayValue).toBe("5.0 per week");
  });

  it("7 Day is not tied to calendar week boundaries (single mid-week session vs partial-week extrapolation)", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-15",
      strengthCalendarDays: [strengthWorkout("2026-03-09", "a", 30)],
    });
    const row = model.rows.find((r) => r.key === "thisWeek");
    expect(row?.displayValue).toBe("1.0 per week");
  });

  it("marks 12 Month insufficient when hydrated range does not cover trailing 365", () => {
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

  it("90 Day window ends on local yesterday (baseline semantics)", () => {
    const model = buildStrengthHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-15",
      strengthCalendarDays: [],
    });
    const row = model.rows.find((r) => r.key === "day90");
    expect(row?.hasEnoughData).toBe(true);
    expect(row?.displayValue).toBe("0.0 per week");
  });
});
