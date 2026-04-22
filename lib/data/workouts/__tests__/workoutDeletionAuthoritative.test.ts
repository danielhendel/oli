import { describe, expect, it, beforeEach, jest } from "@jest/globals";

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "del-test-uid" },
    initializing: false,
    getIdToken: jest.fn(),
  }),
}));

import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import {
  buildStrengthLastWeekCardModel,
  buildStrengthThisWeekCardModel,
} from "@/lib/data/workouts/strengthThisWeekCardModel";
import {
  applyAuthoritativeWorkoutDeletionLocal,
  getCachedWorkoutsForDay,
  getLastGoodWorkoutCalendarRangeForTests,
  mergeWorkoutsIntoDayCacheForTests,
  resetWorkoutsCalendarCachesForTests,
  seedDayWorkoutsCacheForTests,
  seedLastGoodWorkoutCalendarRangeForTests,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import { invalidateWorkoutCalendarHydrate } from "@/lib/data/workouts/workoutCalendarHydrateInvalidate";

jest.mock("@/lib/data/workouts/workoutCalendarHydrateInvalidate", () => {
  const actual = jest.requireActual<typeof import("@/lib/data/workouts/workoutCalendarHydrateInvalidate")>(
    "@/lib/data/workouts/workoutCalendarHydrateInvalidate",
  );
  return {
    ...actual,
    invalidateWorkoutCalendarHydrate: jest.fn(actual.invalidateWorkoutCalendarHydrate),
  };
});

const uid = "del-test-uid";
const kindsSig = "workout";

function strengthItem(id: string, day: DayKey): WorkoutHistoryItem {
  return {
    id,
    observedAt: `${day}T12:00:00.000Z`,
    sourceId: "manual",
    title: "Lift",
    start: `${day}T12:00:00.000Z`,
    end: null,
    durationMinutes: 30,
    calories: null,
    rawKind: "strength_workout",
    workoutType: "strength",
    isDeletableRawEvent: true,
  };
}

describe("authoritative workout deletion (cache + merge trust)", () => {
  beforeEach(() => {
    resetWorkoutsCalendarCachesForTests();
    jest.mocked(invalidateWorkoutCalendarHydrate).mockClear();
  });

  it("merge: empty incoming preserves per-day cache when the day was not delete-touched", () => {
    const dayA: DayKey = "2026-03-10";
    const dayB: DayKey = "2026-03-11";
    seedDayWorkoutsCacheForTests(uid, dayA, [strengthItem("ghost-a", dayA)]);
    seedDayWorkoutsCacheForTests(uid, dayB, [strengthItem("keep-b", dayB)]);
    mergeWorkoutsIntoDayCacheForTests(uid, [
      { day: dayA, workouts: [] },
      { day: dayB, workouts: [] },
    ]);
    expect(getCachedWorkoutsForDay(uid, dayA).map((w) => w.id)).toEqual(["ghost-a"]);
    expect(getCachedWorkoutsForDay(uid, dayB).map((w) => w.id)).toEqual(["keep-b"]);
  });

  it("merge: empty incoming clears delete-touched day cache (no ghost after authoritative empty)", () => {
    const day: DayKey = "2026-03-10";
    seedDayWorkoutsCacheForTests(uid, day, [strengthItem("gone", day)]);
    applyAuthoritativeWorkoutDeletionLocal(uid, "gone");
    mergeWorkoutsIntoDayCacheForTests(uid, [{ day, workouts: [] }]);
    expect(getCachedWorkoutsForDay(uid, day)).toEqual([]);
  });

  it("merge: delete trust only affects touched days; other days still preserve on empty incoming", () => {
    const touched: DayKey = "2026-03-10";
    const other: DayKey = "2026-03-11";
    seedDayWorkoutsCacheForTests(uid, touched, [strengthItem("gone", touched)]);
    seedDayWorkoutsCacheForTests(uid, other, [strengthItem("stays", other)]);
    applyAuthoritativeWorkoutDeletionLocal(uid, "gone");
    mergeWorkoutsIntoDayCacheForTests(uid, [
      { day: touched, workouts: [] },
      { day: other, workouts: [] },
    ]);
    expect(getCachedWorkoutsForDay(uid, touched)).toEqual([]);
    expect(getCachedWorkoutsForDay(uid, other).map((w) => w.id)).toEqual(["stays"]);
  });

  it("apply removes rawEventId from per-day cache across days", () => {
    const d1: DayKey = "2026-03-09";
    const d2: DayKey = "2026-03-10";
    seedDayWorkoutsCacheForTests(uid, d1, [strengthItem("x", d1), strengthItem("dup", d1)]);
    seedDayWorkoutsCacheForTests(uid, d2, [strengthItem("dup", d2)]);
    applyAuthoritativeWorkoutDeletionLocal(uid, "dup");
    expect(getCachedWorkoutsForDay(uid, d1).map((w) => w.id)).toEqual(["x"]);
    expect(getCachedWorkoutsForDay(uid, d2)).toEqual([]);
  });

  it("apply strips workout from lastGood range shapes and durable title map", () => {
    const start: DayKey = "2026-03-08";
    const end: DayKey = "2026-03-14";
    const day: DayKey = "2026-03-10";
    const w = strengthItem("raw-1", day);
    seedLastGoodWorkoutCalendarRangeForTests(uid, start, end, kindsSig, {
      days: [
        { day: start, workouts: [] },
        { day: "2026-03-09", workouts: [] },
        { day, workouts: [w] },
        { day: "2026-03-11", workouts: [] },
        { day: "2026-03-12", workouts: [] },
        { day: "2026-03-13", workouts: [] },
        { day: end, workouts: [] },
      ],
      durableTitlesByWorkoutId: { "raw-1": "Bench" },
    });
    applyAuthoritativeWorkoutDeletionLocal(uid, "raw-1");
    const cached = getLastGoodWorkoutCalendarRangeForTests(uid, start, end, kindsSig);
    expect(cached?.days.find((d) => d.day === day)?.workouts ?? []).toEqual([]);
    expect(cached?.durableTitlesByWorkoutId.raw_1).toBeUndefined();
    expect(jest.mocked(invalidateWorkoutCalendarHydrate)).toHaveBeenCalled();
  });

  it("This Week session count drops after apply strips lastGood strength row", () => {
    const start: DayKey = "2026-03-08";
    const end: DayKey = "2026-03-14";
    const day: DayKey = "2026-03-10";
    const w = strengthItem("week-del", day);
    seedLastGoodWorkoutCalendarRangeForTests(uid, start, end, kindsSig, {
      days: enumerateDaysInclusive(start, end).map((d) =>
        d === day ? { day: d, workouts: [w] } : { day: d, workouts: [] },
      ),
      durableTitlesByWorkoutId: {},
    });
    applyAuthoritativeWorkoutDeletionLocal(uid, "week-del");
    const cached = getLastGoodWorkoutCalendarRangeForTests(uid, start, end, kindsSig)!;
    const strengthDays = mapWorkoutCalendarDaysForDomain(cached.days, "strength");
    const model = buildStrengthThisWeekCardModel({
      strengthCalendarDays: strengthDays,
      todayDayKey: day,
      weekStartDay: start,
      weekEndDay: end,
    });
    expect(model.totalWorkoutsThisWeek).toBe(0);
  });

  it("Last Week session count drops when deleted workout was in last week window", () => {
    const rangeStart: DayKey = "2026-03-01";
    const rangeEnd: DayKey = "2026-03-14";
    const lastWeekDay: DayKey = "2026-03-05";
    const w = strengthItem("last-week-del", lastWeekDay);
    seedLastGoodWorkoutCalendarRangeForTests(uid, rangeStart, rangeEnd, kindsSig, {
      days: enumerateDaysInclusive(rangeStart, rangeEnd).map((d) =>
        d === lastWeekDay ? { day: d, workouts: [w] } : { day: d, workouts: [] },
      ),
      durableTitlesByWorkoutId: {},
    });
    applyAuthoritativeWorkoutDeletionLocal(uid, "last-week-del");
    const cached = getLastGoodWorkoutCalendarRangeForTests(uid, rangeStart, rangeEnd, kindsSig)!;
    const strengthDays = mapWorkoutCalendarDaysForDomain(cached.days, "strength");
    const lastWeekModel = buildStrengthLastWeekCardModel({
      strengthCalendarDays: strengthDays,
      todayDayKey: "2026-03-10",
      lastWeekStartDay: "2026-03-01",
      lastWeekEndDay: "2026-03-07",
    });
    expect(lastWeekModel.totalWorkoutsThisWeek).toBe(0);
  });
});
