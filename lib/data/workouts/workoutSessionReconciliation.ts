import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";
import { classifyWorkoutHistoryItemEvidence } from "@/lib/data/workouts/workoutEligibility";
import {
  reconcileWorkoutSessionsCore,
  type ReconcilableWorkoutRecord,
  type ReconciledWorkoutSessionCore,
  type WorkoutSessionFamily,
  type WorkoutSessionType,
} from "@/lib/domain/workouts/reconcileWorkoutSessionsCore";

export type { WorkoutSessionType };

export type WorkoutSessionSourceSummary = {
  source: string;
  rawEventId: string;
  kind?: string;
  title?: string | null;
  start?: string | null;
  end?: string | null;
};

export type ReconciledWorkoutSession = {
  id: string;
  day: DayKey;
  sessionType: WorkoutSessionType;
  title: string;
  titleSource: "user_override" | "manual" | "provider" | "fallback";
  start: string | null;
  end: string | null;
  durationMinutes: number | null;
  calories: number | null;
  workouts: WorkoutHistoryItem[];
  sourceSummaries: WorkoutSessionSourceSummary[];
  sourceCount: number;
};

function familyForWorkout(workout: WorkoutHistoryItem): WorkoutSessionFamily {
  const kind = classifyWorkoutHistoryItemEvidence(workout);
  if (kind === "strength" || kind === "cardio") return kind;
  return "unknown";
}

function toReconcilable(workout: WorkoutHistoryItem): ReconcilableWorkoutRecord {
  return {
    id: workout.id,
    sourceId: workout.sourceId,
    ...(workout.rawKind ? { rawKind: workout.rawKind } : {}),
    title: workout.title,
    ...(workout.workoutType ? { workoutType: workout.workoutType } : {}),
    start: workout.start,
    end: workout.end,
    observedAt: workout.observedAt,
    durationMinutes: workout.durationMinutes,
    calories: workout.calories,
    family: familyForWorkout(workout),
  };
}

function fromCore(
  day: DayKey,
  core: ReconciledWorkoutSessionCore,
  byId: Map<string, WorkoutHistoryItem>,
  index: number,
): ReconciledWorkoutSession {
  const workouts = core.memberIds
    .map((id) => byId.get(id))
    .filter((w): w is WorkoutHistoryItem => w != null);
  // Preserve legacy indexed id shape used by session storage / menus.
  const legacyId = `${day}:session:${index}:${workouts.map((w) => w.id).join("|")}`;
  return {
    id: legacyId,
    day,
    sessionType: core.sessionType,
    title: formatWorkoutTitle(core.title),
    titleSource: core.titleSource,
    start: core.start,
    end: core.end,
    durationMinutes: core.durationMinutes,
    calories: core.calories,
    workouts,
    sourceSummaries: workouts.map((w) => ({
      source: w.sourceId,
      rawEventId: w.id,
      ...(w.workoutType ? { kind: w.workoutType } : {}),
      ...(w.title ? { title: w.title } : {}),
      ...(w.start ? { start: w.start } : {}),
      ...(w.end ? { end: w.end } : {}),
    })),
    sourceCount: core.sourceCount,
  };
}

export function reconcileWorkoutSessionsForDay(
  day: DayKey,
  workouts: WorkoutHistoryItem[],
): ReconciledWorkoutSession[] {
  if (workouts.length === 0) return [];
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const core = reconcileWorkoutSessionsCore(
    day,
    workouts.map(toReconcilable),
  );
  return core.map((session, index) => fromCore(day, session, byId, index));
}

export function deriveSessionTypeFlags(
  sessions: ReconciledWorkoutSession[],
): { hasStrength: boolean; hasCardio: boolean } {
  let hasStrength = false;
  let hasCardio = false;
  for (const session of sessions) {
    if (session.sessionType === "strength") hasStrength = true;
    if (session.sessionType === "cardio") hasCardio = true;
    if (session.sessionType === "mixed") {
      hasStrength = true;
      hasCardio = true;
    }
  }
  return { hasStrength, hasCardio };
}

/**
 * Re-match a reconciled session from a previous render to the current day's workouts after hydrate/refresh.
 * UI code often keeps `ReconciledWorkoutSession` in React state while `workouts` on that day update
 * (merge, delete, sync). Session `id` is derived from member raw ids, so it can change when membership changes.
 */
export function matchReconciledWorkoutSessionToLatestDayWorkouts(
  day: DayKey,
  staleSession: ReconciledWorkoutSession,
  latestDayWorkouts: WorkoutHistoryItem[],
): ReconciledWorkoutSession | null {
  const freshSessions = reconcileWorkoutSessionsForDay(day, latestDayWorkouts);
  const exact = freshSessions.find((s) => s.id === staleSession.id);
  if (exact) return exact;
  const staleIds = new Set(staleSession.workouts.map((w) => w.id));
  return freshSessions.find((s) => s.workouts.some((w) => staleIds.has(w.id))) ?? null;
}

export type WorkoutCalendarDayLikeForSessionResolve = {
  day: DayKey;
  workouts: WorkoutHistoryItem[];
};

/**
 * Strength/Cardio overview menus: resolve `selectedWorkoutForMenu.session` against latest calendar rows
 * so delete/edit targets stay aligned after background refetch while the overflow menu stays open.
 */
export function resolveReconciledSessionWithLatestCalendarDays(
  days: readonly WorkoutCalendarDayLikeForSessionResolve[],
  selection: { day: DayKey; session: ReconciledWorkoutSession },
): ReconciledWorkoutSession {
  const row = days.find((d) => d.day === selection.day);
  if (!row) return selection.session;
  return (
    matchReconciledWorkoutSessionToLatestDayWorkouts(selection.day, selection.session, row.workouts) ??
    selection.session
  );
}
