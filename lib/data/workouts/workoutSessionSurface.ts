import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import { formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { WorkoutProductDomain } from "@/lib/data/workouts/workoutDomain";
import {
  computeStrengthMetricsFromExercises,
  type ManualWorkoutDaySummary,
  type ManualWorkoutExerciseSummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Action routes (rename, duration, type) should target the manual raw row when present so
 * AsyncStorage overrides line up with journal / ingest ids (not the Apple Health row that
 * sorts first in {@link reconcileWorkoutSessionsForDay}).
 */
export function pickWorkoutForSessionActions(session: ReconciledWorkoutSession): WorkoutHistoryItem | null {
  const manual = session.workouts.find((w) => w.sourceId === "manual");
  return manual ?? session.workouts[0] ?? null;
}

function overrideHasPatch(o: WorkoutOverride): boolean {
  return Boolean(
    o.customTitle?.trim() ||
      (typeof o.correctedDurationMinutes === "number" &&
        Number.isFinite(o.correctedDurationMinutes) &&
        o.correctedDurationMinutes > 0) ||
      o.correctedWorkoutType,
  );
}

/** Prefer manual member's override, then any other member's override. */
export function pickWorkoutOverrideForSession(
  session: ReconciledWorkoutSession,
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
): WorkoutOverride | null {
  let fallback: WorkoutOverride | null = null;
  for (const w of session.workouts) {
    const o = overridesByWorkoutId[w.id];
    if (!o || !overrideHasPatch(o)) continue;
    if (w.sourceId === "manual") return o;
    if (!fallback) fallback = o;
  }
  return fallback;
}

/** Prefer durable title on manual raw id, then any session member (merged Apple + manual). */
export function pickDurableTitleForSession(
  session: ReconciledWorkoutSession,
  durableTitlesByWorkoutId: Record<string, string | undefined> | undefined,
): string | null {
  if (!durableTitlesByWorkoutId) return null;
  const manual = session.workouts.find((w) => w.sourceId === "manual");
  if (manual) {
    const t = durableTitlesByWorkoutId[manual.id]?.trim();
    if (t) return t;
  }
  for (const w of session.workouts) {
    const t = durableTitlesByWorkoutId[w.id]?.trim();
    if (t) return t;
  }
  return null;
}

/**
 * Title for overview / day list rows: durable override → AsyncStorage → journal name (strength) →
 * ingest displayName → reconciled session title → formatted representative title.
 */
export function resolveWorkoutSessionSurfaceTitle(
  session: ReconciledWorkoutSession,
  representative: WorkoutHistoryItem,
  actionWorkout: WorkoutHistoryItem,
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
  durableTitlesByWorkoutId: Record<string, string | undefined> | undefined,
  domain: WorkoutProductDomain,
  journalCustomNameForDay: string | null | undefined,
): string {
  const durable = pickDurableTitleForSession(session, durableTitlesByWorkoutId);
  if (durable) return formatWorkoutTitle(durable);
  const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
  const asyncTitle = sessionOverride?.customTitle?.trim();
  if (asyncTitle) return formatWorkoutTitle(asyncTitle);
  if (domain === "strength" && journalCustomNameForDay?.trim()) {
    return journalCustomNameForDay.trim();
  }
  const ingestName = actionWorkout.strengthIngestDisplayName?.trim();
  if (domain === "strength" && ingestName) return formatWorkoutTitle(ingestName);
  if (session.title.trim().length > 0) return session.title;
  return formatWorkoutTitle(representative.title);
}

function workoutAnchorMs(w: WorkoutHistoryItem): number | null {
  const iso = w.start ?? w.observedAt;
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/**
 * Bind local journal rows to the manual raw member of a reconciled session (same calendar day).
 * When multiple journal sessions share a day, pick the one whose `startedAt` is closest to the
 * manual ingest/journal anchor so Apple-first merge order does not attach the wrong exercises.
 */
export function pickJournalSummaryForStrengthSession(
  day: DayKey,
  session: ReconciledWorkoutSession,
  summaries: readonly ManualWorkoutDaySummary[],
): ManualWorkoutDaySummary | null {
  const sameDay = summaries.filter((s) => s.day === day);
  if (sameDay.length === 0) return null;
  const manualMember = session.workouts.find((w) => w.sourceId === "manual");
  if (!manualMember) return null;
  const anchor = workoutAnchorMs(manualMember);
  if (anchor == null) return sameDay[0] ?? null;
  let best: ManualWorkoutDaySummary = sameDay[0]!;
  let bestDist = Infinity;
  for (const s of sameDay) {
    if (!s.startedAt) continue;
    const t = Date.parse(s.startedAt);
    if (Number.isNaN(t)) continue;
    const d = Math.abs(t - anchor);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  if (bestDist === Infinity) return sameDay[0] ?? null;
  return best;
}

/** Apple / HealthKit row for duration, calories, distance, zones when present in a merged session. */
export function pickMetricsWorkoutForSession(session: ReconciledWorkoutSession): WorkoutHistoryItem | null {
  const apple = session.workouts.find((w) => w.sourceId === "apple_health");
  if (apple) return apple;
  const hk = session.workouts.find((w) => w.hk != null);
  return hk ?? null;
}

/**
 * Prefer journal exercises (local session); if absent, fall back to ingested `strength_workout` payload on the action row.
 */
export function resolveStrengthSessionExerciseDisplay(
  journalSummary: ManualWorkoutDaySummary | null | undefined,
  actionWorkout: WorkoutHistoryItem,
): {
  exercises: ManualWorkoutExerciseSummary[];
  totalVolume: number | null;
  avgIntensity: number | null;
} {
  if (journalSummary != null && journalSummary.exercises.length > 0) {
    return {
      exercises: journalSummary.exercises,
      totalVolume: journalSummary.totalVolume,
      avgIntensity: journalSummary.avgIntensity,
    };
  }
  const ingest = actionWorkout.strengthIngestExercises;
  if (ingest != null && ingest.length > 0) {
    const m = computeStrengthMetricsFromExercises(ingest);
    return { exercises: ingest, totalVolume: m.totalVolume, avgIntensity: m.avgIntensity };
  }
  return {
    exercises: [],
    totalVolume: journalSummary?.totalVolume ?? null,
    avgIntensity: journalSummary?.avgIntensity ?? null,
  };
}

export type WorkoutSessionSurfaceModel = {
  displayTitle: string;
  actionWorkout: WorkoutHistoryItem;
  metricsWorkout: WorkoutHistoryItem;
};

export function buildWorkoutSessionSurfaceModel(
  session: ReconciledWorkoutSession,
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
  domain: WorkoutProductDomain,
  journalSummary: ManualWorkoutDaySummary | null | undefined,
  durableTitlesByWorkoutId?: Record<string, string | undefined>,
): WorkoutSessionSurfaceModel {
  const representative = session.workouts[0];
  if (!representative) {
    throw new Error("buildWorkoutSessionSurfaceModel: session has no workouts");
  }
  const actionWorkout = pickWorkoutForSessionActions(session) ?? representative;
  const metricsWorkout = pickMetricsWorkoutForSession(session) ?? representative;
  const displayTitle = resolveWorkoutSessionSurfaceTitle(
    session,
    representative,
    actionWorkout,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
    domain,
    journalSummary?.customName ?? undefined,
  );
  return { displayTitle, actionWorkout, metricsWorkout };
}
