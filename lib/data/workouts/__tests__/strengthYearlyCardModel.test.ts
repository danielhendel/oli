import {
  STRENGTH_YEARLY_MONTH_LETTERS,
  buildStrengthYearlyCardModel,
  countStrengthSessionsByMonthFromCalendarDays,
  mapWorkoutMonthSummariesToStrengthMonthlyCounts,
} from "@/lib/data/workouts/strengthYearlyCardModel";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutMonthSummaryItemDto } from "@/lib/contracts/retrieval";
import type { DayKey } from "@/lib/ui/calendar/types";

const TODAY = "2026-05-24" as DayKey;

function strengthHistoryItem(id: string, observedAtIso: string): WorkoutHistoryItem {
  return {
    id,
    observedAt: observedAtIso,
    sourceId: "manual",
    title: "Lift",
    workoutType: "strength",
    start: observedAtIso,
    end: null,
    durationMinutes: 45,
    calories: null,
  } as unknown as WorkoutHistoryItem;
}

function cardioHistoryItem(id: string, observedAtIso: string): WorkoutHistoryItem {
  return {
    id,
    observedAt: observedAtIso,
    sourceId: "manual",
    title: "Run",
    workoutType: "cardio",
    start: observedAtIso,
    end: null,
    durationMinutes: 30,
    calories: 250,
  } as unknown as WorkoutHistoryItem;
}

function day(d: DayKey, workouts: WorkoutHistoryItem[]): WorkoutCalendarDayLike {
  return { day: d, workouts } as WorkoutCalendarDayLike;
}

describe("buildStrengthYearlyCardModel", () => {
  it("current year: counts MTD-through-today and flags future months as 0 + isFutureMonth", () => {
    const m = buildStrengthYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      monthlyCounts: {
        "2026-01": 12,
        "2026-02": 14,
        "2026-03": 17,
        "2026-04": 19,
        "2026-05": 11,
      },
    });
    expect(m.year).toBe(2026);
    expect(m.title).toBe("2026 Strength");
    expect(m.rangeLabel).toBe("2026");
    expect(m.isCurrentYear).toBe(true);
    expect(m.hasData).toBe(true);
    expect(m.totalWorkouts).toBe(73);
    expect(m.totalDisplay).toBe("73");
    expect(m.totalQualifier).toBe("workouts completed");
    expect(m.months).toHaveLength(12);

    const may = m.months.find((mm) => mm.monthKey === "2026-05")!;
    expect(may.isCurrentMonth).toBe(true);
    expect(may.isFutureMonth).toBe(false);
    expect(may.workoutCount).toBe(11);

    const jun = m.months.find((mm) => mm.monthKey === "2026-06")!;
    expect(jun.isFutureMonth).toBe(true);
    expect(jun.workoutCount).toBe(0);
    const dec = m.months.find((mm) => mm.monthKey === "2026-12")!;
    expect(dec.isFutureMonth).toBe(true);
    expect(dec.workoutCount).toBe(0);
  });

  it("prior year: counts every month and never flags as future", () => {
    const m = buildStrengthYearlyCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      monthlyCounts: {
        "2024-01": 5,
        "2024-07": 9,
        "2024-12": 11,
      },
    });
    expect(m.title).toBe("2024 Strength");
    expect(m.isCurrentYear).toBe(false);
    expect(m.months.every((mm) => !mm.isFutureMonth)).toBe(true);
    expect(m.months.every((mm) => !mm.isCurrentMonth)).toBe(true);
    expect(m.totalWorkouts).toBe(25);
    expect(m.totalDisplay).toBe("25");
    expect(m.months.find((mm) => mm.monthKey === "2024-01")!.workoutCount).toBe(5);
    expect(m.months.find((mm) => mm.monthKey === "2024-07")!.workoutCount).toBe(9);
    expect(m.months.find((mm) => mm.monthKey === "2024-12")!.workoutCount).toBe(11);
    expect(m.months.find((mm) => mm.monthKey === "2024-03")!.workoutCount).toBe(0);
  });

  it("empty year: hasData=false, isEmpty=true, totalDisplay='0'", () => {
    const m = buildStrengthYearlyCardModel({
      selectedYear: 2023,
      todayDayKey: TODAY,
      monthlyCounts: {},
    });
    expect(m.hasData).toBe(false);
    expect(m.isEmpty).toBe(true);
    expect(m.totalWorkouts).toBe(0);
    expect(m.totalDisplay).toBe("0");
    expect(m.months).toHaveLength(12);
    expect(m.months.every((mm) => mm.workoutCount === 0)).toBe(true);
  });

  it("uses 12 single-letter month labels in order J F M A M J J A S O N D", () => {
    const m = buildStrengthYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      monthlyCounts: {},
    });
    expect(m.months.map((mm) => mm.label)).toEqual([...STRENGTH_YEARLY_MONTH_LETTERS]);
  });

  it("chartMaxScale rounds up to the next multiple of 5 (peak: 6 → 10, 12 → 15)", () => {
    const m6 = buildStrengthYearlyCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      monthlyCounts: { "2024-01": 6 },
    });
    expect(m6.chartMaxScale).toBe(10);
    const m12 = buildStrengthYearlyCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      monthlyCounts: { "2024-03": 12 },
    });
    expect(m12.chartMaxScale).toBe(15);
    const m0 = buildStrengthYearlyCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      monthlyCounts: {},
    });
    expect(m0.chartMaxScale).toBe(5);
  });

  it("ignores monthlyCounts entries outside selectedYear (defense-in-depth)", () => {
    const m = buildStrengthYearlyCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      monthlyCounts: { "2024-02": 3, "2025-02": 99 },
    });
    expect(m.totalWorkouts).toBe(3);
    expect(m.months.find((mm) => mm.monthKey === "2024-02")!.workoutCount).toBe(3);
  });
});

describe("countStrengthSessionsByMonthFromCalendarDays", () => {
  it("counts strength sessions per month using the canonical strength-tab rule", () => {
    const days: WorkoutCalendarDayLike[] = [
      day("2026-01-05" as DayKey, [strengthHistoryItem("s-jan-1", "2026-01-05T18:00:00.000Z")]),
      day("2026-01-07" as DayKey, [strengthHistoryItem("s-jan-2", "2026-01-07T18:00:00.000Z")]),
      day("2026-02-10" as DayKey, [strengthHistoryItem("s-feb-1", "2026-02-10T18:00:00.000Z")]),
    ];
    const counts = countStrengthSessionsByMonthFromCalendarDays(days, 2026);
    expect(counts["2026-01"]).toBe(2);
    expect(counts["2026-02"]).toBe(1);
    expect(counts["2026-03"]).toBeUndefined();
  });

  it("excludes cardio-only sessions from the strength count", () => {
    const days: WorkoutCalendarDayLike[] = [
      day("2026-03-09" as DayKey, [cardioHistoryItem("c-mar-1", "2026-03-09T09:00:00.000Z")]),
      day("2026-03-12" as DayKey, [strengthHistoryItem("s-mar-1", "2026-03-12T18:00:00.000Z")]),
    ];
    const counts = countStrengthSessionsByMonthFromCalendarDays(days, 2026);
    expect(counts["2026-03"]).toBe(1);
  });

  it("ignores days outside the requested year", () => {
    const days: WorkoutCalendarDayLike[] = [
      day("2025-12-31" as DayKey, [strengthHistoryItem("s-2025", "2025-12-31T18:00:00.000Z")]),
      day("2026-01-01" as DayKey, [strengthHistoryItem("s-2026", "2026-01-01T18:00:00.000Z")]),
    ];
    const counts = countStrengthSessionsByMonthFromCalendarDays(days, 2026);
    expect(counts["2026-01"]).toBe(1);
    expect(counts["2025-12"]).toBeUndefined();
  });
});

describe("mapWorkoutMonthSummariesToStrengthMonthlyCounts", () => {
  function item(monthKey: string, strengthSessionCount: number): WorkoutMonthSummaryItemDto {
    return {
      schemaVersion: 2,
      monthKey,
      computedAt: "2026-05-24T00:00:00.000Z",
      reconcileVersion: "2",
      strengthSessionCount,
      cardioSessionCount: 0,
      strengthWeekKeys: [],
      cardioWeekKeys: [],
      strengthDurationSumCapped: 0,
      strengthDurationCountCapped: 0,
      cardioDurationSumCapped: 0,
      cardioDurationCountCapped: 0,
    } as unknown as WorkoutMonthSummaryItemDto;
  }
  it("maps DTO items into a monthKey→count record", () => {
    const counts = mapWorkoutMonthSummariesToStrengthMonthlyCounts([
      item("2024-01", 7),
      item("2024-06", 12),
      item("2024-12", 4),
    ]);
    expect(counts).toEqual({ "2024-01": 7, "2024-06": 12, "2024-12": 4 });
  });
  it("tolerates an empty items array", () => {
    const counts = mapWorkoutMonthSummariesToStrengthMonthlyCounts([]);
    expect(counts).toEqual({});
  });
});
