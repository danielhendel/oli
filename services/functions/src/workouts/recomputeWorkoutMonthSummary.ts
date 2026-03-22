import type { Firestore } from "firebase-admin/firestore";
import { computeWorkoutMonthSummaryPayload, observedIsoWindowForMonthKeys } from "@/lib/data/workouts/workoutMonthSummaryCompute";
import { monthKeyFromDay, WORKOUT_OVERVIEW_ANALYTICS_YEAR } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";
import { fetchWorkoutRawDocsForObservedAtIsoWindow } from "./recomputeWorkoutDaySummary";

export async function recomputeAndWriteWorkoutMonthSummaryForMonthKey(args: {
  db: Firestore;
  userId: string;
  monthKey: string;
}): Promise<void> {
  const { db, userId, monthKey } = args;
  const { startIso, endIso } = observedIsoWindowForMonthKeys(monthKey);
  const rawDocs = await fetchWorkoutRawDocsForObservedAtIsoWindow(db, userId, startIso, endIso);
  const computedAt = new Date().toISOString();
  const payload = computeWorkoutMonthSummaryPayload(monthKey, rawDocs, computedAt);
  await db.collection("users").doc(userId).collection("workoutMonthSummaries").doc(monthKey).set(payload);
}

export async function recomputeWorkoutMonthSummariesForYear(args: {
  db: Firestore;
  userId: string;
  year: number;
}): Promise<{ monthsProcessed: number }> {
  const { db, userId, year } = args;
  for (let m = 1; m <= 12; m += 1) {
    const monthKey = `${year}-${String(m).padStart(2, "0")}`;
    await recomputeAndWriteWorkoutMonthSummaryForMonthKey({ db, userId, monthKey });
  }
  return { monthsProcessed: 12 };
}

/**
 * After a day summary write, refresh the Overview month row when the day falls in the fixed analytics year.
 */
export async function maybeRecomputeWorkoutMonthSummaryForUiDay(args: {
  db: Firestore;
  userId: string;
  uiDay: DayKey;
}): Promise<void> {
  const { db, userId, uiDay } = args;
  const mk = monthKeyFromDay(uiDay);
  if (!mk.startsWith(`${WORKOUT_OVERVIEW_ANALYTICS_YEAR}-`)) return;
  await recomputeAndWriteWorkoutMonthSummaryForMonthKey({ db, userId, monthKey: mk });
}
