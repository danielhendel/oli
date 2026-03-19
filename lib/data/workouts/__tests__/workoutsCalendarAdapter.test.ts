import { describe, expect, it } from "@jest/globals";
import type { RawEventDoc } from "@oli/contracts";
import { parseWorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import type { WorkoutRawForDayDerivation } from "@/lib/data/workouts/workoutsCalendarDayKey";

import type { WorkoutCalendarDay } from "../useWorkoutsCalendar";

function groupForTest(
  rawDocs: RawEventDoc[],
  start: DayKey,
  end: DayKey,
): WorkoutCalendarDay[] {
  const byDay = new Map<DayKey, ReturnType<typeof parseWorkoutHistoryItem>[]>();

  for (const doc of rawDocs) {
    const raw: WorkoutRawForDayDerivation = {
      observedAt: doc.observedAt,
      payload: doc.payload,
    };
    const dayKey = deriveWorkoutDayKey(raw);
    if (!dayKey) continue;
    const item = parseWorkoutHistoryItem(doc);
    const existing = byDay.get(dayKey) ?? [];
    existing.push(item);
    byDay.set(dayKey, existing);
  }

  const allDays = enumerateDaysInclusive(start, end);
  return allDays.map((day) => ({
    day,
    workouts: byDay.get(day) ?? [],
  }));
}

describe("workouts calendar adapter grouping", () => {
  const base: Omit<RawEventDoc, "payload"> = {
    schemaVersion: 1,
    id: "id",
    userId: "u",
    sourceId: "manual",
    provider: "manual",
    sourceType: "test",
    kind: "workout",
    receivedAt: "2026-03-10T10:00:00.000Z",
    observedAt: "2026-03-10T10:00:00.000Z",
  };

  it("groups workouts by day and preserves multiple sources on same day", () => {
    const docs: RawEventDoc[] = [
      {
        ...base,
        id: "w1",
        sourceId: "manual",
        observedAt: "2026-03-01T09:00:00.000Z",
        payload: {
          start: "2026-03-01T09:00:00.000Z",
          end: "2026-03-01T10:00:00.000Z",
          timezone: "UTC",
          sport: "Run",
          durationMinutes: 60,
        },
      },
      {
        ...base,
        id: "w2",
        sourceId: "apple_health",
        provider: "apple_health",
        observedAt: "2026-03-01T15:00:00.000Z",
        payload: {
          start: "2026-03-01T15:00:00.000Z",
          end: "2026-03-01T16:00:00.000Z",
          timezone: "UTC",
          sport: "Cycle",
          durationMinutes: 60,
          hk: { sourceId: "healthkit", activityId: 1 },
        },
      },
      {
        ...base,
        id: "w3",
        sourceId: "manual",
        observedAt: "2026-03-02T07:30:00.000Z",
        payload: {
          start: "2026-03-02T07:30:00.000Z",
          end: "2026-03-02T08:00:00.000Z",
          timezone: "UTC",
          sport: "Walk",
          durationMinutes: 30,
        },
      },
    ];

    const days = groupForTest(docs, "2026-03-01", "2026-03-03");

    const day1 = days.find((d) => d.day === "2026-03-01");
    const day2 = days.find((d) => d.day === "2026-03-02");
    const day3 = days.find((d) => d.day === "2026-03-03");

    expect(day1?.workouts).toHaveLength(2);
    expect(new Set(day1?.workouts.map((w) => w.sourceId))).toEqual(
      new Set(["manual", "apple_health"]),
    );
    expect(day2?.workouts).toHaveLength(1);
    expect(day3?.workouts).toHaveLength(0);
  });

  it("includes strength_workout days and keeps types distinct", () => {
    const strengthBase: Omit<RawEventDoc, "payload"> = {
      ...base,
      kind: "strength_workout",
      observedAt: "2026-03-05T10:00:00.000Z",
    };

    const docs: RawEventDoc[] = [
      {
        ...base,
        id: "w_run",
        observedAt: "2026-03-05T06:00:00.000Z",
        payload: {
          start: "2026-03-05T06:00:00.000Z",
          end: "2026-03-05T07:00:00.000Z",
          timezone: "UTC",
          sport: "Run",
          durationMinutes: 60,
        },
      },
      {
        ...strengthBase,
        id: "s1",
        payload: {
          startedAt: "2026-03-05T18:00:00.000Z",
          timeZone: "UTC",
          exercises: [
            {
              name: "Squat",
              sets: [{ reps: 5, load: 100, unit: "kg" }],
            },
          ],
        },
      },
    ];

    const days = groupForTest(docs, "2026-03-05", "2026-03-05");
    const target = days[0];
    expect(target.workouts).toHaveLength(2);
    const titles = target.workouts.map((w) => w.title).sort();
    expect(titles).toContain("Run");
    expect(titles).toContain("Squat");
  });

  it("uses payload day when provided and not just UTC observedAt", () => {
    const docs: RawEventDoc[] = [
      {
        ...base,
        id: "late",
        observedAt: "2026-03-01T23:30:00.000Z",
        payload: {
          start: "2026-03-01T23:30:00.000Z",
          end: "2026-03-02T00:30:00.000Z",
          timezone: "America/New_York",
          day: "2026-03-01",
          sport: "Late Run",
          durationMinutes: 60,
        },
      },
    ];

    const days = groupForTest(docs, "2026-03-01", "2026-03-02");
    const d1 = days.find((d) => d.day === "2026-03-01");
    const d2 = days.find((d) => d.day === "2026-03-02");
    expect(d1?.workouts).toHaveLength(1);
    expect(d2?.workouts).toHaveLength(0);
  });
});

