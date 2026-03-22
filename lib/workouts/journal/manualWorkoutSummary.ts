import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";
import { listWorkoutJournalSessionIds } from "@/lib/workouts/journal/sessionIndex";
import { listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";

export type ManualWorkoutExerciseSet = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  intensity: number | null;
};

export type ManualWorkoutExerciseSummary = {
  name: string;
  sets: ManualWorkoutExerciseSet[];
};

export type ManualWorkoutDaySummary = {
  sessionId: string;
  day: string;
  startedAt: string | null;
  customName: string | null;
  totalVolume: number | null;
  avgIntensity: number | null;
  exercises: ManualWorkoutExerciseSummary[];
};

const NAME_PREFIX = "name:";

function extractSessionName(notes: string[]): string | null {
  for (let i = notes.length - 1; i >= 0; i -= 1) {
    const note = notes[i]?.trim() ?? "";
    if (!note.toLowerCase().startsWith(NAME_PREFIX)) continue;
    const name = note.slice(NAME_PREFIX.length).trim();
    if (name.length > 0) return name;
  }
  return null;
}

/** Sum of reps×weightKg for one exercise (same inclusion rules as session total volume). */
export function totalVolumeKgForManualExercise(exercise: ManualWorkoutExerciseSummary): number {
  let volume = 0;
  for (const set of exercise.sets) {
    if (
      typeof set.reps === "number" &&
      Number.isFinite(set.reps) &&
      set.reps > 0 &&
      typeof set.weightKg === "number" &&
      Number.isFinite(set.weightKg) &&
      set.weightKg > 0
    ) {
      volume += set.reps * set.weightKg;
    }
  }
  return volume;
}

export function computeStrengthMetricsFromExercises(
  exercises: ManualWorkoutExerciseSummary[],
): { totalVolume: number | null; avgIntensity: number | null } {
  let volume = 0;
  let hasVolume = false;
  let intensitySum = 0;
  let intensityCount = 0;
  for (const exercise of exercises) {
    const exVol = totalVolumeKgForManualExercise(exercise);
    if (exVol > 0) {
      volume += exVol;
      hasVolume = true;
    }
    for (const set of exercise.sets) {
      if (typeof set.intensity === "number" && Number.isFinite(set.intensity)) {
        intensitySum += set.intensity;
        intensityCount += 1;
      }
    }
  }
  return {
    totalVolume: hasVolume ? volume : null,
    avgIntensity: intensityCount > 0 ? intensitySum / intensityCount : null,
  };
}

export async function listManualWorkoutDaySummaries(uid: string): Promise<ManualWorkoutDaySummary[]> {
  const sessionIds = await listWorkoutJournalSessionIds(uid);
  const out: ManualWorkoutDaySummary[] = [];
  for (const sessionId of sessionIds) {
    const events = await listWorkoutJournalEvents(uid, sessionId).catch(() => []);
    const reduced = reduceWorkoutSessionV1(events);
    if (reduced.status !== "completed") continue;
    const startedAt = reduced.startedAt;
    if (!startedAt) continue;
    const exercises: ManualWorkoutExerciseSummary[] = reduced.exercises
      .filter((e) => !e.removed)
      .map((e) => ({
        name: e.exerciseId.replace(/_/g, " "),
        sets: e.sets.map((s) => ({
          setNumber: s.ordinal,
          reps: s.reps ?? null,
          weightKg: s.loadKg ?? null,
          intensity: s.rpe ?? null,
        })),
      }));
    const metrics = computeStrengthMetricsFromExercises(exercises);
    out.push({
      sessionId: reduced.sessionId,
      day: ymdInTimeZoneFromIso(startedAt, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
      startedAt,
      customName: extractSessionName(reduced.notes),
      totalVolume: metrics.totalVolume,
      avgIntensity: metrics.avgIntensity,
      exercises,
    });
  }
  out.sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
  return out;
}
