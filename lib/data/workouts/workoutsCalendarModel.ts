import type { WorkoutMonthSummaryItemDto } from "@oli/contracts";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";
import { reconcileWorkoutSessionsForDay, type ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";

export function monthKeyFromDay(day: DayKey): string {
  return day.slice(0, 7);
}

export function monthLabelFromKey(key: string): string {
  const d = new Date(`${key}-01T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function weekKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Shared workout calendar view-model: sorting and recent selection.
 * Single path: RawEvent → WorkoutHistoryItem → grouped days → recent list.
 */

export type WorkoutCalendarDayLike = {
  day: DayKey;
  workouts: WorkoutHistoryItem[];
};

/** ISO-ish timestamp used for ordering (start preferred, else observedAt). */
export function workoutDisplaySortKey(w: WorkoutHistoryItem): string {
  return w.start ?? w.observedAt;
}

/**
 * Chronological ascending within a day: earliest first.
 * Tie-break: id for stability.
 */
export function compareWorkoutsChronologicalAsc(a: WorkoutHistoryItem, b: WorkoutHistoryItem): number {
  const ka = workoutDisplaySortKey(a);
  const kb = workoutDisplaySortKey(b);
  if (!ka && !kb) return a.id.localeCompare(b.id);
  if (!ka) return -1;
  if (!kb) return 1;
  const t = ka.localeCompare(kb);
  if (t !== 0) return t;
  return a.id.localeCompare(b.id);
}

export function sortWorkoutsChronologicalAsc(items: WorkoutHistoryItem[]): WorkoutHistoryItem[] {
  return [...items].sort(compareWorkoutsChronologicalAsc);
}

export type RecentWorkoutEntry = { day: DayKey; workout: WorkoutHistoryItem };
export type RecentWorkoutSessionEntry = { day: DayKey; session: ReconciledWorkoutSession };
export type WorkoutAnalyticsMonthPoint = {
  monthKey: string;
  monthLabel: string;
  workouts: number;
  volume: number;
};
export type WorkoutAnalyticsTab = "all" | "strength" | "cardio";
/** Workouts Overview stats + chart tabs only (`mixed` excluded from both). */
export type WorkoutOverviewMetricsTab = "strength" | "cardio";
export type WorkoutAnalyticsMetrics = {
  totalWorkouts: number;
  avgPerMonth: number | null;
  avgPerWeek: number | null;
  avgDurationMinutes: number | null;
};

/** Fixed calendar span for Workouts Overview analytics (chart + metrics). */
export const WORKOUT_OVERVIEW_ANALYTICS_YEAR = 2026 as const;
export const WORKOUT_OVERVIEW_ANALYTICS_RANGE_START: DayKey = "2026-01-01";
export const WORKOUT_OVERVIEW_ANALYTICS_RANGE_END: DayKey = "2026-12-31";

export type WorkoutOverviewAnalyticsBundle = {
  chartPointsByTab: {
    strength: WorkoutAnalyticsMonthPoint[];
    cardio: WorkoutAnalyticsMonthPoint[];
  };
  metricsByTab: Record<WorkoutOverviewMetricsTab, WorkoutAnalyticsMetrics>;
};

/**
 * Distinct `weekKeyFromIso` values at UTC noon for each DayKey in [startDay, endDay] inclusive.
 * Used by {@link WORKOUT_OVERVIEW_ANALYTICS_WEEK_COUNT} (tests / reference). Overview **Avg per Week**
 * uses active weeks from sessions via the same `weekKeyFromIso` on session start (or first workout `observedAt`).
 */
export function countWeekBucketsInDayRangeInclusive(startDay: DayKey, endDay: DayKey): number {
  const weeks = new Set<string>();
  for (const d of enumerateDaysInclusive(startDay, endDay)) {
    const wk = weekKeyFromIso(`${d}T12:00:00.000Z`);
    if (wk) weeks.add(wk);
  }
  return weeks.size;
}

/** Precomputed for {@link WORKOUT_OVERVIEW_ANALYTICS_RANGE_START}..{@link WORKOUT_OVERVIEW_ANALYTICS_RANGE_END}. */
export const WORKOUT_OVERVIEW_ANALYTICS_WEEK_COUNT = countWeekBucketsInDayRangeInclusive(
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
);

/**
 * Upper bound (minutes) for durations included in Workouts Overview **Avg Duration** only.
 * Sessions longer than this are still counted in **Total Workouts** but omitted from the mean
 * (typical cause: Apple Watch workout not ended, inflated HealthKit duration).
 */
export const WORKOUT_OVERVIEW_AVG_DURATION_CAP_MINUTES = 480;

/**
 * Strength / Cardio overview tabs: strict `sessionType` match only.
 * `mixed` and `unknown` are excluded from both (no double-count).
 */
export function sessionMatchesOverviewStrengthTab(session: ReconciledWorkoutSession): boolean {
  return session.sessionType === "strength";
}

export function sessionMatchesOverviewCardioTab(session: ReconciledWorkoutSession): boolean {
  return session.sessionType === "cardio";
}

function buildTwelveMonthSkeleton(year: number): WorkoutAnalyticsMonthPoint[] {
  const out: WorkoutAnalyticsMonthPoint[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const monthKey = `${year}-${String(m).padStart(2, "0")}`;
    out.push({
      monthKey,
      monthLabel: monthLabelFromKey(monthKey),
      workouts: 0,
      volume: 0,
    });
  }
  return out;
}

function buildOverviewMetricsForFiltered(filtered: ReconciledWorkoutSession[]): WorkoutAnalyticsMetrics {
  const totalWorkouts = filtered.length;
  if (totalWorkouts === 0) {
    return { totalWorkouts: 0, avgPerMonth: null, avgPerWeek: null, avgDurationMinutes: null };
  }

  const activeMonths = new Set<string>();
  const activeWeeks = new Set<string>();
  for (const s of filtered) {
    activeMonths.add(monthKeyFromDay(s.day));
    const wk = weekKeyFromIso(s.start ?? s.workouts[0]?.observedAt ?? null);
    if (wk) activeWeeks.add(wk);
  }

  let durationSum = 0;
  let durationCount = 0;
  for (const s of filtered) {
    const dm = s.durationMinutes;
    if (
      typeof dm === "number" &&
      Number.isFinite(dm) &&
      dm > 0 &&
      dm <= WORKOUT_OVERVIEW_AVG_DURATION_CAP_MINUTES
    ) {
      durationSum += dm;
      durationCount += 1;
    }
  }

  const monthDenom = activeMonths.size;
  const weekDenom = activeWeeks.size;

  return {
    totalWorkouts,
    avgPerMonth: monthDenom > 0 ? totalWorkouts / monthDenom : null,
    avgPerWeek: weekDenom > 0 ? totalWorkouts / weekDenom : null,
    avgDurationMinutes: durationCount > 0 ? durationSum / durationCount : null,
  };
}

/**
 * Single builder for Workouts Overview chart + stats: same reconciled sessions, strict
 * Strength/Cardio split (excludes `mixed`), Jan–Dec {@link WORKOUT_OVERVIEW_ANALYTICS_YEAR}
 * zero-filled chart series; metrics use **active** month/week sets per tab and capped durations for Avg Duration.
 */
export function buildWorkoutOverviewAnalyticsFromCalendarDays(
  days: WorkoutCalendarDayLike[],
): WorkoutOverviewAnalyticsBundle {
  const year = WORKOUT_OVERVIEW_ANALYTICS_YEAR;
  const skeleton = buildTwelveMonthSkeleton(year);
  const strengthMonths = new Map(skeleton.map((p) => [p.monthKey, { ...p }]));
  const cardioMonths = new Map(skeleton.map((p) => [p.monthKey, { ...p }]));

  const sessions = days.flatMap((d) => reconcileWorkoutSessionsForDay(d.day, d.workouts));
  const strengthSessions: ReconciledWorkoutSession[] = [];
  const cardioSessions: ReconciledWorkoutSession[] = [];

  for (const s of sessions) {
    const mk = monthKeyFromDay(s.day);
    if (!mk.startsWith(`${year}-`)) continue;

    if (sessionMatchesOverviewStrengthTab(s)) {
      strengthSessions.push(s);
      const row = strengthMonths.get(mk);
      if (row) row.workouts += 1;
    } else if (sessionMatchesOverviewCardioTab(s)) {
      cardioSessions.push(s);
      const row = cardioMonths.get(mk);
      if (row) row.workouts += 1;
    }
  }

  const monthOrder = skeleton.map((p) => p.monthKey);
  const strengthSeries = monthOrder.map((k) => strengthMonths.get(k)!);
  const cardioSeries = monthOrder.map((k) => cardioMonths.get(k)!);

  return {
    chartPointsByTab: {
      strength: strengthSeries,
      cardio: cardioSeries,
    },
    metricsByTab: {
      strength: buildOverviewMetricsForFiltered(strengthSessions),
      cardio: buildOverviewMetricsForFiltered(cardioSessions),
    },
  };
}

/**
 * Reconstructs the same {@link WorkoutOverviewAnalyticsBundle} as
 * {@link buildWorkoutOverviewAnalyticsFromCalendarDays} from persisted month rows
 * (union of per-month session counts, week keys, and capped-duration aggregates).
 */
export function buildWorkoutOverviewAnalyticsFromMonthSummaryItems(
  items: WorkoutMonthSummaryItemDto[],
): WorkoutOverviewAnalyticsBundle {
  const year = WORKOUT_OVERVIEW_ANALYTICS_YEAR;
  const skeleton = buildTwelveMonthSkeleton(year);
  const byKey = new Map(items.map((i) => [i.monthKey, i]));

  const strengthSeries = skeleton.map((s) => {
    const row = byKey.get(s.monthKey);
    return {
      monthKey: s.monthKey,
      monthLabel: s.monthLabel,
      workouts: row?.strengthSessionCount ?? 0,
      volume: 0,
    };
  });
  const cardioSeries = skeleton.map((s) => {
    const row = byKey.get(s.monthKey);
    return {
      monthKey: s.monthKey,
      monthLabel: s.monthLabel,
      workouts: row?.cardioSessionCount ?? 0,
      volume: 0,
    };
  });

  const mergeMetrics = (tab: WorkoutOverviewMetricsTab): WorkoutAnalyticsMetrics => {
    let totalWorkouts = 0;
    const activeMonths = new Set<string>();
    const activeWeeks = new Set<string>();
    let durationSum = 0;
    let durationCount = 0;

    for (const m of items) {
      const count = tab === "strength" ? m.strengthSessionCount : m.cardioSessionCount;
      const weeks = tab === "strength" ? m.strengthWeekKeys : m.cardioWeekKeys;
      const dSum = tab === "strength" ? m.strengthDurationSumCapped : m.cardioDurationSumCapped;
      const dCnt = tab === "strength" ? m.strengthDurationCountCapped : m.cardioDurationCountCapped;
      totalWorkouts += count;
      if (count > 0) activeMonths.add(m.monthKey);
      for (const wk of weeks) activeWeeks.add(wk);
      durationSum += dSum;
      durationCount += dCnt;
    }

    if (totalWorkouts === 0) {
      return { totalWorkouts: 0, avgPerMonth: null, avgPerWeek: null, avgDurationMinutes: null };
    }

    return {
      totalWorkouts,
      avgPerMonth: activeMonths.size > 0 ? totalWorkouts / activeMonths.size : null,
      avgPerWeek: activeWeeks.size > 0 ? totalWorkouts / activeWeeks.size : null,
      avgDurationMinutes: durationCount > 0 ? durationSum / durationCount : null,
    };
  };

  return {
    chartPointsByTab: { strength: strengthSeries, cardio: cardioSeries },
    metricsByTab: {
      strength: mergeMetrics("strength"),
      cardio: mergeMetrics("cardio"),
    },
  };
}

/**
 * Newest-first across days, max `maxCount`. Uses same sort keys as day lists.
 */
export function getRecentWorkoutsFromCalendarDays(
  days: WorkoutCalendarDayLike[],
  maxCount = 5,
): RecentWorkoutEntry[] {
  const entries: RecentWorkoutEntry[] = [];
  for (const d of days) {
    for (const w of d.workouts) {
      entries.push({ day: d.day, workout: w });
    }
  }
  entries.sort((a, b) => {
    const ka = workoutDisplaySortKey(a.workout);
    const kb = workoutDisplaySortKey(b.workout);
    if (!ka && !kb) return a.workout.id.localeCompare(b.workout.id);
    if (!ka) return 1;
    if (!kb) return -1;
    const t = kb.localeCompare(ka);
    if (t !== 0) return t;
    return a.workout.id.localeCompare(b.workout.id);
  });
  return entries.slice(0, maxCount);
}

export function getRecentWorkoutSessionsFromCalendarDays(
  days: WorkoutCalendarDayLike[],
  maxCount = 7,
): RecentWorkoutSessionEntry[] {
  const entries: RecentWorkoutSessionEntry[] = [];
  for (const d of days) {
    const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
    for (const session of sessions) entries.push({ day: d.day, session });
  }
  entries.sort((a, b) => {
    const ka = a.session.start ?? a.session.workouts[0]?.observedAt ?? "";
    const kb = b.session.start ?? b.session.workouts[0]?.observedAt ?? "";
    if (!ka && !kb) return a.session.id.localeCompare(b.session.id);
    if (!ka) return 1;
    if (!kb) return -1;
    const t = kb.localeCompare(ka);
    if (t !== 0) return t;
    return a.session.id.localeCompare(b.session.id);
  });
  return entries.slice(0, maxCount);
}

function sessionMatchesTab(session: ReconciledWorkoutSession, tab: WorkoutAnalyticsTab): boolean {
  if (tab === "all") return true;
  if (tab === "strength") return session.sessionType === "strength" || session.sessionType === "mixed";
  return session.sessionType === "cardio" || session.sessionType === "mixed";
}

export function buildWorkoutAnalyticsMonthlyFromCalendarDays(
  days: WorkoutCalendarDayLike[],
  strengthVolumeByDay: Record<string, number> = {},
): WorkoutAnalyticsMonthPoint[] {
  const monthMap = new Map<string, WorkoutAnalyticsMonthPoint>();
  for (const d of days) {
    const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
    const monthKey = monthKeyFromDay(d.day);
    const current = monthMap.get(monthKey) ?? {
      monthKey,
      monthLabel: monthLabelFromKey(monthKey),
      workouts: 0,
      volume: 0,
    };
    current.workouts += sessions.length;
    const hasStrengthSession = sessions.some((s) => s.sessionType === "strength" || s.sessionType === "mixed");
    if (hasStrengthSession) {
      current.volume += strengthVolumeByDay[d.day] ?? 0;
    }
    monthMap.set(monthKey, current);
  }
  return [...monthMap.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function buildWorkoutAnalyticsMetrics(
  sessions: ReconciledWorkoutSession[],
  tab: WorkoutAnalyticsTab,
): WorkoutAnalyticsMetrics {
  const filtered = sessions.filter((s) => sessionMatchesTab(s, tab));
  const totalWorkouts = filtered.length;
  if (totalWorkouts === 0) {
    return { totalWorkouts: 0, avgPerMonth: null, avgPerWeek: null, avgDurationMinutes: null };
  }

  const months = new Set<string>();
  const weeks = new Set<string>();
  let durationSum = 0;
  let durationCount = 0;
  for (const s of filtered) {
    months.add(monthKeyFromDay(s.day));
    const week = weekKeyFromIso(s.start ?? s.workouts[0]?.observedAt ?? null);
    if (week) weeks.add(week);
    if (typeof s.durationMinutes === "number" && Number.isFinite(s.durationMinutes) && s.durationMinutes > 0) {
      durationSum += s.durationMinutes;
      durationCount += 1;
    }
  }
  return {
    totalWorkouts,
    avgPerMonth: months.size > 0 ? totalWorkouts / months.size : null,
    avgPerWeek: weeks.size > 0 ? totalWorkouts / weeks.size : null,
    avgDurationMinutes: durationCount > 0 ? durationSum / durationCount : null,
  };
}
