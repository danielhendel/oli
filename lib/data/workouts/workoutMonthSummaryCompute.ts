import type { RawEventDoc } from "@oli/contracts";
import {
  WORKOUT_MONTH_SUMMARY_RECONCILE_VERSION,
  WORKOUT_MONTH_SUMMARY_SCHEMA_VERSION,
} from "../../contracts/workoutMonthSummary";
import type { DayKey } from "@/lib/ui/calendar/types";
import { addCalendarDaysToDayKey, enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import { deriveWorkoutDayKey } from "@/lib/data/workouts/workoutsCalendarDayKey";
import {
  createEmptyStrengthTaxonomyMaps,
  mergeManualExercisesIntoStrengthTaxonomyMaps,
  serializeStrengthTaxonomyMaps,
  type StrengthTaxonomySerialized,
} from "@/lib/data/workouts/strengthTaxonomySummaryAggregate";
import {
  parseStrengthIngestExercisesFromPayload,
  parseWorkoutHistoryItem,
} from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  sessionMatchesOverviewCardioTab,
  sessionMatchesOverviewStrengthTab,
  sortWorkoutsChronologicalAsc,
  weekKeyFromIso,
  WORKOUT_OVERVIEW_AVG_DURATION_CAP_MINUTES,
} from "@/lib/data/workouts/workoutsCalendarModel";

export type WorkoutMonthSummaryPayload = {
  schemaVersion: typeof WORKOUT_MONTH_SUMMARY_SCHEMA_VERSION;
  monthKey: string;
  computedAt: string;
  reconcileVersion: string;
  strengthSessionCount: number;
  cardioSessionCount: number;
  strengthWeekKeys: string[];
  cardioWeekKeys: string[];
  strengthDurationSumCapped: number;
  strengthDurationCountCapped: number;
  cardioDurationSumCapped: number;
  cardioDurationCountCapped: number;
  strengthTaxonomy?: StrengthTaxonomySerialized;
};

function monthFirstAndLastDayKeys(monthKey: string): { first: DayKey; last: DayKey } {
  const [ys, ms] = monthKey.split("-");
  const y = Number(ys);
  const monthNum = Number(ms);
  const first = `${ys}-${String(monthNum).padStart(2, "0")}-01` as DayKey;
  const lastD = new Date(Date.UTC(y, monthNum, 0)).getUTCDate();
  const last = `${ys}-${String(monthNum).padStart(2, "0")}-${String(lastD).padStart(2, "0")}` as DayKey;
  return { first, last };
}

/**
 * Padded observedAt window (±21d) that can contribute raw rows to any UI day in [first, last].
 * Matches workout day summary / Overview raw hydration padding.
 */
export function observedIsoWindowForMonthKeys(monthKey: string): { startIso: string; endIso: string } {
  const { first, last } = monthFirstAndLastDayKeys(monthKey);
  const startDay = addCalendarDaysToDayKey(first, -21);
  const endDay = addCalendarDaysToDayKey(last, 21);
  return {
    startIso: `${startDay}T00:00:00.000Z`,
    endIso: `${endDay}T23:59:59.999Z`,
  };
}

function mergeStrengthTaxonomyFromRawDocsForMonth(
  monthKey: string,
  rawDocs: RawEventDoc[],
): StrengthTaxonomySerialized | undefined {
  const { first, last } = monthFirstAndLastDayKeys(monthKey);
  const maps = createEmptyStrengthTaxonomyMaps();
  for (const doc of rawDocs) {
    if (doc.kind !== "strength_workout") continue;
    const dk = deriveWorkoutDayKey(doc);
    if (dk == null || dk < first || dk > last) continue;
    const payloadRaw = doc.payload;
    const payload = payloadRaw != null && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : null;
    if (payload == null) continue;
    const exercises = parseStrengthIngestExercisesFromPayload(doc.id, payload);
    if (exercises == null || exercises.length === 0) continue;
    mergeManualExercisesIntoStrengthTaxonomyMaps(maps, exercises, undefined);
  }
  return serializeStrengthTaxonomyMaps(maps) ?? undefined;
}

function groupWorkoutRawByUiDay(rawDocs: RawEventDoc[]): Map<DayKey, RawEventDoc[]> {
  const m = new Map<DayKey, RawEventDoc[]>();
  for (const doc of rawDocs) {
    if (doc.kind !== "workout" && doc.kind !== "strength_workout") continue;
    const dk = deriveWorkoutDayKey(doc);
    if (!dk) continue;
    const arr = m.get(dk) ?? [];
    arr.push(doc);
    m.set(dk, arr);
  }
  return m;
}

/**
 * Single-month Overview aggregate from raw truth — same reconciliation + strict Strength/Cardio tabs
 * as {@link buildWorkoutOverviewAnalyticsFromCalendarDays}.
 */
export function computeWorkoutMonthSummaryPayload(
  monthKey: string,
  rawDocs: RawEventDoc[],
  computedAt: string,
): WorkoutMonthSummaryPayload {
  const { first, last } = monthFirstAndLastDayKeys(monthKey);
  const byRawDay = groupWorkoutRawByUiDay(rawDocs);

  const strengthWeeks = new Set<string>();
  const cardioWeeks = new Set<string>();
  let strengthSessionCount = 0;
  let cardioSessionCount = 0;
  let strengthDurationSumCapped = 0;
  let strengthDurationCountCapped = 0;
  let cardioDurationSumCapped = 0;
  let cardioDurationCountCapped = 0;

  for (const day of enumerateDaysInclusive(first, last)) {
    const items = sortWorkoutsChronologicalAsc(
      (byRawDay.get(day) ?? []).map((d) => parseWorkoutHistoryItem(d)),
    );
    const sessions = reconcileWorkoutSessionsForDay(day, items);
    for (const s of sessions) {
      if (sessionMatchesOverviewStrengthTab(s)) {
        strengthSessionCount += 1;
        const wk = weekKeyFromIso(s.start ?? s.workouts[0]?.observedAt ?? null);
        if (wk) strengthWeeks.add(wk);
        const dm = s.durationMinutes;
        if (
          typeof dm === "number" &&
          Number.isFinite(dm) &&
          dm > 0 &&
          dm <= WORKOUT_OVERVIEW_AVG_DURATION_CAP_MINUTES
        ) {
          strengthDurationSumCapped += dm;
          strengthDurationCountCapped += 1;
        }
      } else if (sessionMatchesOverviewCardioTab(s)) {
        cardioSessionCount += 1;
        const wk = weekKeyFromIso(s.start ?? s.workouts[0]?.observedAt ?? null);
        if (wk) cardioWeeks.add(wk);
        const dm = s.durationMinutes;
        if (
          typeof dm === "number" &&
          Number.isFinite(dm) &&
          dm > 0 &&
          dm <= WORKOUT_OVERVIEW_AVG_DURATION_CAP_MINUTES
        ) {
          cardioDurationSumCapped += dm;
          cardioDurationCountCapped += 1;
        }
      }
    }
  }

  const strengthTaxonomy = mergeStrengthTaxonomyFromRawDocsForMonth(monthKey, rawDocs);

  return {
    schemaVersion: WORKOUT_MONTH_SUMMARY_SCHEMA_VERSION,
    monthKey,
    computedAt,
    reconcileVersion: WORKOUT_MONTH_SUMMARY_RECONCILE_VERSION,
    strengthSessionCount,
    cardioSessionCount,
    strengthWeekKeys: [...strengthWeeks].sort(),
    cardioWeekKeys: [...cardioWeeks].sort(),
    strengthDurationSumCapped,
    strengthDurationCountCapped,
    cardioDurationSumCapped,
    cardioDurationCountCapped,
    ...(strengthTaxonomy != null ? { strengthTaxonomy } : {}),
  };
}
