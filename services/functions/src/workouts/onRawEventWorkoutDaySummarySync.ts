// services/functions/src/workouts/onRawEventWorkoutDaySummarySync.ts
/**
 * Keeps `workoutDaySummaries` aligned when raw workout docs are updated or deleted.
 * Create-path recompute stays in {@link onRawEventCreated}; this module covers update/delete only.
 */
import { onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import type { DayKey } from "@/lib/ui/calendar/types";
import { db } from "../firebaseAdmin";
import { recomputeAndWriteWorkoutDaySummary } from "./recomputeWorkoutDaySummary";

const TRIGGER_OPTIONS = {
  document: "users/{userId}/rawEvents/{rawEventId}",
  region: "us-central1" as const,
  serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
};

type TimestampLike = { toDate: () => Date };

function isTimestampLike(v: unknown): v is TimestampLike {
  return v != null && typeof v === "object" && typeof (v as TimestampLike).toDate === "function";
}

function toIso(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  if (isTimestampLike(v)) return v.toDate().toISOString();
  return null;
}

function uiDayFromRawRecord(data: Record<string, unknown> | undefined): DayKey | null {
  if (!data) return null;
  const kind = data["kind"];
  if (kind !== "workout" && kind !== "strength_workout") return null;
  const observedAt = toIso(data["observedAt"]);
  if (!observedAt) return null;
  return deriveWorkoutDayKey({
    observedAt,
    payload: "payload" in data ? data["payload"] : {},
  });
}

/**
 * UI days whose summaries must be recomputed when raw transitions from `before` → `after`.
 * Uses the same {@link deriveWorkoutDayKey} rules as summary compute (create path).
 */
export function collectWorkoutUiDaysFromRawChange(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): DayKey[] {
  const out = new Set<DayKey>();
  const a = uiDayFromRawRecord(before);
  const b = uiDayFromRawRecord(after);
  if (a) out.add(a);
  if (b) out.add(b);
  return [...out];
}

function rawTouchesWorkoutKind(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined): boolean {
  const kb = before?.["kind"];
  const ka = after?.["kind"];
  return (
    kb === "workout" ||
    kb === "strength_workout" ||
    ka === "workout" ||
    ka === "strength_workout"
  );
}

async function recomputeDaysForRawChange(args: {
  userId: string;
  rawEventId: string;
  trigger: "update" | "delete";
  days: DayKey[];
}): Promise<void> {
  const { userId, rawEventId, trigger, days } = args;
  if (days.length === 0) return;
  for (const uiDay of days) {
    await recomputeAndWriteWorkoutDaySummary({ db, userId, uiDay });
  }
  logger.info({
    msg: "workout_day_summary_raw_change_recompute",
    userId,
    rawEventId,
    trigger,
    uiDays: days,
    dayCount: days.length,
  });
}

export const onRawEventUpdatedForWorkoutDaySummary = onDocumentUpdated(
  TRIGGER_OPTIONS,
  async (event) => {
    const userId = event.params.userId;
    const rawEventId = event.params.rawEventId;
    if (typeof userId !== "string" || typeof rawEventId !== "string") return;

    const change = event.data;
    if (!change) return;
    const before = change.before.data() as Record<string, unknown> | undefined;
    const after = change.after.data() as Record<string, unknown> | undefined;

    if (!rawTouchesWorkoutKind(before, after)) return;

    const days = collectWorkoutUiDaysFromRawChange(before, after);
    if (days.length === 0) return;

    try {
      await recomputeDaysForRawChange({ userId, rawEventId, trigger: "update", days });
    } catch (err) {
      logger.error("workout_day_summary_raw_update_recompute_failed", {
        msg: "workout_day_summary_raw_update_recompute_failed",
        userId,
        rawEventId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

export const onRawEventDeletedForWorkoutDaySummary = onDocumentDeleted(
  TRIGGER_OPTIONS,
  async (event) => {
    const userId = event.params.userId;
    const rawEventId = event.params.rawEventId;
    if (typeof userId !== "string" || typeof rawEventId !== "string") return;

    const snap = event.data;
    if (!snap) return;
    const before = snap.data() as Record<string, unknown> | undefined;
    const kind = before?.["kind"];
    if (kind !== "workout" && kind !== "strength_workout") return;

    const days = collectWorkoutUiDaysFromRawChange(before, undefined);
    if (days.length === 0) return;

    try {
      await recomputeDaysForRawChange({ userId, rawEventId, trigger: "delete", days });
    } catch (err) {
      logger.error("workout_day_summary_raw_delete_recompute_failed", {
        msg: "workout_day_summary_raw_delete_recompute_failed",
        userId,
        rawEventId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
);
