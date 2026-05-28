import {
  cardioSessionDistanceMeters,
  isDisplayableCardioHistorySession,
  isSupportedCardioSessionModality,
  resolveCardioSessionDisplayName,
} from "@/lib/data/workouts/cardioSessionPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  buildWorkoutSessionSurfaceModel,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import {
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { DayKey } from "@/lib/ui/calendar/types";

const METERS_PER_MILE = 1609.344;

export type CardioTodaySessionPresentationRow = {
  sessionId: string;
  /** Primary line — miles when distance exists, else duration (e.g. `26 min`). */
  primaryLine: string;
  /** Secondary line — `Modality · duration`, or modality only when primary is duration-only. */
  metaLine: string;
};

export type CardioTodayCardModel =
  | {
      kind: "completed";
      pill: "Completed";
      sessions: readonly CardioTodaySessionPresentationRow[];
    }
  | {
      kind: "rest";
      pill: "No Cardio";
      primaryTitle: string;
      subtitle: string;
    };

function sessionChronologicalSortKey(session: ReconciledWorkoutSession): string {
  return session.start ?? session.workouts[0]?.start ?? session.workouts[0]?.observedAt ?? "";
}

function listCardioSessionsForToday(sessions: readonly ReconciledWorkoutSession[]): ReconciledWorkoutSession[] {
  const cardio = sessions.filter(
    (s) =>
      s.sessionType === "cardio" &&
      isDisplayableCardioHistorySession(s) &&
      isSupportedCardioSessionModality(s),
  );
  return [...cardio].sort((a, b) => {
    const ka = sessionChronologicalSortKey(a);
    const kb = sessionChronologicalSortKey(b);
    const t = ka.localeCompare(kb);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
}

function buildPresentationRow(
  session: ReconciledWorkoutSession,
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
  durableTitlesByWorkoutId: Record<string, string | undefined>,
): CardioTodaySessionPresentationRow {
  const modality = resolveCardioSessionDisplayName(
    session,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
  );
  const surface = buildWorkoutSessionSurfaceModel(session, overridesByWorkoutId, "cardio", null, durableTitlesByWorkoutId);
  const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
  const resolvedMetrics = resolveWorkoutDisplay(
    surface.metricsWorkout,
    sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
  );
  const resolvedDuration = resolveWorkoutDisplayDurationMinutes({
    overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
    sessionDurationMinutes: null,
    fallbackWorkoutDurationMinutes: surface.metricsWorkout.durationMinutes ?? session.durationMinutes,
  });
  const durationLabel = formatWorkoutDurationLabel(resolvedDuration);
  const distanceMeters = cardioSessionDistanceMeters(session);
  const hasMiles = distanceMeters != null && distanceMeters > 0;
  if (hasMiles) {
    const mi = (distanceMeters / METERS_PER_MILE).toFixed(2);
    return {
      sessionId: session.id,
      primaryLine: `${mi} mi`,
      metaLine: durationLabel !== "—" ? `${modality} · ${durationLabel}` : modality,
    };
  }
  return {
    sessionId: session.id,
    primaryLine: durationLabel !== "—" ? durationLabel : "—",
    metaLine: modality,
  };
}

export function buildCardioTodayCardModel(input: {
  cardioCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId: Record<string, string | undefined>;
}): CardioTodayCardModel {
  const sorted = [...input.cardioCalendarDays].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const row = sorted.find((d) => d.day === input.todayDayKey);
  const sessions = row ? reconcileWorkoutSessionsForDay(row.day, row.workouts) : [];
  const todayCardio = listCardioSessionsForToday(sessions);

  if (todayCardio.length > 0) {
    const presentationRows = todayCardio.map((s) =>
      buildPresentationRow(s, input.overridesByWorkoutId, input.durableTitlesByWorkoutId),
    );
    return {
      kind: "completed",
      pill: "Completed",
      sessions: presentationRows,
    };
  }

  return {
    kind: "rest",
    pill: "No Cardio",
    primaryTitle: "No cardio today",
    subtitle: "Log a session when you train",
  };
}
