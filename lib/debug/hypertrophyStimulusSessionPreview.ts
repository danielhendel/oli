/**
 * Debug-only preview model: map local completed workout summaries to hypertrophy stimulus.
 * Pure — no IO, no React, no Firebase.
 */

import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import {
  buildHypertrophyStimulusSessionSummary,
  type HypertrophyStimulusSessionSetInput,
  type HypertrophyStimulusSessionSummary,
} from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusSessionSummary";

export type HypertrophyStimulusSessionPreviewEmptyReason = "no_sessions";

export type HypertrophyStimulusSessionListItem = {
  sessionId: string;
  day: string;
  startedAt: string | null;
  label: string;
  exerciseCount: number;
};

export type HypertrophyStimulusSessionPreviewModel = {
  selectedSession: ManualWorkoutDaySummary | null;
  availableSessions: HypertrophyStimulusSessionListItem[];
  summary: HypertrophyStimulusSessionSummary | null;
  emptyReason: HypertrophyStimulusSessionPreviewEmptyReason | null;
  fallbackExerciseLabel: string;
};

export function sessionLabelForManualWorkoutSummary(summary: ManualWorkoutDaySummary): string {
  if (summary.customName != null && summary.customName.trim().length > 0) {
    return summary.customName.trim();
  }
  return `${summary.day} workout`;
}

/** Map completed manual workout sets into hypertrophy stimulus session inputs. */
export function mapManualWorkoutSummaryToHypertrophyStimulusSets(
  summary: ManualWorkoutDaySummary,
): HypertrophyStimulusSessionSetInput[] {
  const sets: HypertrophyStimulusSessionSetInput[] = [];

  for (const exercise of summary.exercises) {
    const exerciseId = exercise.exerciseId.trim();
    if (exerciseId.length === 0) continue;

    for (const set of exercise.sets) {
      if (set.isWarmup === true) continue;
      if (typeof set.reps !== "number" || !Number.isFinite(set.reps) || set.reps <= 0) continue;
      const row: HypertrophyStimulusSessionSetInput = {
        exerciseId,
        reps: set.reps,
      };
      if (set.weightKg !== undefined) row.loadKg = set.weightKg;
      if (set.intensity !== undefined) row.rpe = set.intensity;
      sets.push(row);
    }
  }

  return sets;
}

/** Display-safe fallback exercise list for debug UI (stable catalog ids only). */
export function formatHypertrophyFallbackExerciseIds(exerciseIds: readonly string[]): string {
  const safe = exerciseIds
    .map((id) => id.trim())
    .filter((id) => /^[a-z0-9]+(_[a-z0-9]+)*$/.test(id));
  if (safe.length === 0) return "None";
  return safe.join(", ");
}

export function buildHypertrophyStimulusSessionPreviewModel(args: {
  sessions: readonly ManualWorkoutDaySummary[];
  selectedSessionId?: string | null;
}): HypertrophyStimulusSessionPreviewModel {
  const sortedSessions = [...args.sessions].sort((a, b) =>
    (b.startedAt ?? "").localeCompare(a.startedAt ?? ""),
  );

  const availableSessions = sortedSessions.map((session) => ({
    sessionId: session.sessionId,
    day: session.day,
    startedAt: session.startedAt,
    label: sessionLabelForManualWorkoutSummary(session),
    exerciseCount: session.exercises.length,
  }));

  if (sortedSessions.length === 0) {
    return {
      selectedSession: null,
      availableSessions: [],
      summary: null,
      emptyReason: "no_sessions",
      fallbackExerciseLabel: "None",
    };
  }

  const selectedSessionId = args.selectedSessionId?.trim();
  const selectedSession =
    selectedSessionId != null && selectedSessionId.length > 0
      ? (sortedSessions.find((session) => session.sessionId === selectedSessionId) ??
        sortedSessions[0]!)
      : sortedSessions[0]!;

  const summary = buildHypertrophyStimulusSessionSummary({
    sessionId: selectedSession.sessionId,
    sets: mapManualWorkoutSummaryToHypertrophyStimulusSets(selectedSession),
  });

  return {
    selectedSession,
    availableSessions,
    summary,
    emptyReason: null,
    fallbackExerciseLabel: formatHypertrophyFallbackExerciseIds(summary.exercisesWithFallback),
  };
}
