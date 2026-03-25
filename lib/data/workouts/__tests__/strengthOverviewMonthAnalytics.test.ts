import {
  buildStrengthMonthOverviewFromCalendarDays,
  monthShortLabelFromMonthKey,
} from "@/lib/data/workouts/strengthOverviewMonthAnalytics";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { getMonthGrid } from "@/lib/ui/calendar/dateUtils";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

function strengthItem(id: string, day: string, startHour: number, volumeKg?: number): WorkoutHistoryItem {
  const hh = String(startHour).padStart(2, "0");
  const iso = `${day}T${hh}:00:00.000Z`;
  const base: WorkoutHistoryItem = {
    id,
    observedAt: iso,
    sourceId: "manual",
    rawKind: "strength_workout",
    title: "Lift",
    workoutType: "strength",
    start: iso,
    end: null,
    durationMinutes: 60,
    calories: null,
  };
  return volumeKg != null && volumeKg > 0 ? { ...base, strengthVolumeKg: volumeKg } : base;
}

describe("strengthOverviewMonthAnalytics", () => {
  it("monthShortLabelFromMonthKey returns short month", () => {
    const label = monthShortLabelFromMonthKey("2026-03");
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toContain("2026");
  });

  it("buildStrengthMonthOverviewFromCalendarDays counts strength sessions and typical volume over volume sessions only", () => {
    const { chartBars, metrics } = buildStrengthMonthOverviewFromCalendarDays(
      [
        { day: "2026-03-10", workouts: [strengthItem("a", "2026-03-10", 8, 100)] },
        { day: "2026-03-11", workouts: [strengthItem("b", "2026-03-11", 9)] },
        { day: "2026-03-12", workouts: [strengthItem("c", "2026-03-12", 10, 300)] },
      ],
      "2026-03",
      { todayDayKey: "2026-03-31" },
    );
    expect(metrics.totalWorkouts).toBe(3);
    expect(metrics.typicalVolumeKg).toBeCloseTo(200, 5);
    expect(chartBars.length).toBe(getMonthGrid({ year: 2026, month: 3 }).length);
    const sumBars = chartBars.reduce((s, b) => s + b.value, 0);
    expect(sumBars).toBe(3);
    expect(chartBars[0]?.label).toBe("1");
  });

  it("returns null typical volume when no session has volume", () => {
    const { metrics } = buildStrengthMonthOverviewFromCalendarDays(
      [{ day: "2026-03-10", workouts: [strengthItem("a", "2026-03-10", 10)] }],
      "2026-03",
      { todayDayKey: "2026-03-31" },
    );
    expect(metrics.totalWorkouts).toBe(1);
    expect(metrics.typicalVolumeKg).toBeNull();
  });

  it("avg per week uses elapsed days for the in-progress calendar month", () => {
    const days = [];
    for (let d = 1; d <= 7; d += 1) {
      const day = `2026-03-${String(d).padStart(2, "0")}`;
      days.push({ day, workouts: [strengthItem(`id${d}`, day, 10)] });
    }
    const { metrics } = buildStrengthMonthOverviewFromCalendarDays(days, "2026-03", {
      todayDayKey: "2026-03-10",
    });
    expect(metrics.totalWorkouts).toBe(7);
    expect(metrics.avgPerWeek).toBeCloseTo((7 * 7) / 10, 5);
  });

  it("avg per week uses full month length for a past month", () => {
    const days = [{ day: "2026-02-15", workouts: [strengthItem("a", "2026-02-15", 10)] }];
    const { metrics } = buildStrengthMonthOverviewFromCalendarDays(days, "2026-02", {
      todayDayKey: "2026-03-10",
    });
    expect(metrics.totalWorkouts).toBe(1);
    const febDays = 28; // 2026 non-leap
    expect(metrics.avgPerWeek).toBeCloseTo(7 / febDays, 5);
  });

  it("uses manual journal totalVolume when ingest volume is absent on that day", () => {
    const row: ManualWorkoutDaySummary = {
      sessionId: "j1",
      day: "2026-03-10",
      startedAt: "2026-03-10T12:00:00.000Z",
      customName: null,
      totalVolume: 900,
      avgIntensity: null,
      exercises: [],
    };
    const { metrics } = buildStrengthMonthOverviewFromCalendarDays(
      [{ day: "2026-03-10", workouts: [strengthItem("a", "2026-03-10", 10)] }],
      "2026-03",
      { todayDayKey: "2026-03-31", manualJournalSummaries: [row] },
    );
    expect(metrics.typicalVolumeKg).toBe(900);
  });

  it("skips journal volume when the day already has ingested strength_workout volume", () => {
    const row: ManualWorkoutDaySummary = {
      sessionId: "j1",
      day: "2026-03-10",
      startedAt: "2026-03-10T12:00:00.000Z",
      customName: null,
      totalVolume: 999,
      avgIntensity: null,
      exercises: [],
    };
    const { metrics } = buildStrengthMonthOverviewFromCalendarDays(
      [{ day: "2026-03-10", workouts: [strengthItem("a", "2026-03-10", 10, 100)] }],
      "2026-03",
      { todayDayKey: "2026-03-31", manualJournalSummaries: [row] },
    );
    expect(metrics.typicalVolumeKg).toBe(100);
  });
});
