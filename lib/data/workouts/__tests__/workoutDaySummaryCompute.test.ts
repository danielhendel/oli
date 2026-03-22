import { describe, expect, it } from "@jest/globals";
import type { RawEventDoc } from "@oli/contracts";
import { computeWorkoutDaySummaryPayload } from "@/lib/data/workouts/workoutDaySummaryCompute";
import {
  deriveSessionTypeFlags,
  reconcileWorkoutSessionsForDay,
} from "@/lib/data/workouts/workoutSessionReconciliation";
import { parseWorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { sortWorkoutsChronologicalAsc } from "@/lib/data/workouts/workoutsCalendarModel";

function minimalWorkoutRaw(
  id: string,
  kind: "workout" | "strength_workout",
  payload: Record<string, unknown>,
  observedAt: string,
): RawEventDoc {
  return {
    schemaVersion: 1,
    id,
    userId: "u1",
    sourceId: "manual",
    provider: "manual",
    sourceType: "app",
    kind,
    observedAt,
    receivedAt: observedAt,
    payload,
  } as RawEventDoc;
}

describe("computeWorkoutDaySummaryPayload", () => {
  it("matches reconcileWorkoutSessionsForDay + deriveSessionTypeFlags for cardio day", () => {
    const day = "2026-03-11";
    const docs: RawEventDoc[] = [
      minimalWorkoutRaw(
        "r1",
        "workout",
        {
          start: `${day}T10:00:00.000Z`,
          timezone: "UTC",
          name: "Morning Run",
        },
        `${day}T10:00:00.000Z`,
      ),
    ];
    const computedAt = "2026-03-11T12:00:00.000Z";
    const summary = computeWorkoutDaySummaryPayload(day, docs, computedAt);
    const items = sortWorkoutsChronologicalAsc(docs.map((d) => parseWorkoutHistoryItem(d)));
    const flags = deriveSessionTypeFlags(reconcileWorkoutSessionsForDay(day, items));
    expect(summary.day).toBe(day);
    expect(summary.rawWorkoutCount).toBe(1);
    expect(summary.hasStrength).toBe(flags.hasStrength);
    expect(summary.hasCardio).toBe(flags.hasCardio);
    expect(summary.reconcileVersion).toBe("1");
    expect(summary.schemaVersion).toBe(1);
  });

  it("returns zero counts for empty day input", () => {
    const day = "2026-03-12";
    const summary = computeWorkoutDaySummaryPayload(day, [], "2026-03-11T12:00:00.000Z");
    expect(summary.rawWorkoutCount).toBe(0);
    expect(summary.hasStrength).toBe(false);
    expect(summary.hasCardio).toBe(false);
  });
});
