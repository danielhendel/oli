import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";

export type WorkoutSessionType = "strength" | "cardio" | "mixed" | "unknown";

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

const MERGE_GAP_MINUTES = 30;

type NormalizedWindow = {
  startMs: number | null;
  endMs: number | null;
};

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function normalizeWindow(workout: WorkoutHistoryItem): NormalizedWindow {
  const startMs = toMs(workout.start ?? workout.observedAt);
  let endMs = toMs(workout.end);
  if (endMs == null && startMs != null && typeof workout.durationMinutes === "number" && workout.durationMinutes > 0) {
    endMs = startMs + Math.round(workout.durationMinutes * 60_000);
  }
  return { startMs, endMs };
}

function familyForWorkout(workout: WorkoutHistoryItem): "strength" | "cardio" | "unknown" {
  if (workout.workoutType === "strength") return "strength";
  if (workout.workoutType === "cardio") return "cardio";
  if (/strength|squat|deadlift|bench|lift/i.test(workout.title)) return "strength";
  if (workout.title.trim().length > 0) return "cardio";
  return "unknown";
}

function canMerge(
  sessionStart: number | null,
  sessionEnd: number | null,
  workoutWindow: NormalizedWindow,
): boolean {
  const { startMs, endMs } = workoutWindow;
  if (sessionStart == null || startMs == null) return false;
  const left = sessionEnd ?? sessionStart;
  const right = endMs ?? startMs;
  const overlap = startMs <= left && right >= sessionStart;
  if (overlap) return true;
  const gapMs = Math.abs(startMs - left);
  return gapMs <= MERGE_GAP_MINUTES * 60_000;
}

function chooseTitle(workouts: WorkoutHistoryItem[]): { title: string; source: ReconciledWorkoutSession["titleSource"] } {
  const manual = workouts.find((w) => w.sourceId === "manual" && w.title.trim().length > 0);
  if (manual) return { title: formatWorkoutTitle(manual.title), source: "manual" };
  const provider = workouts.find((w) => w.title.trim().length > 0);
  if (provider) return { title: formatWorkoutTitle(provider.title), source: "provider" };
  return { title: "Workout", source: "fallback" };
}

function sessionTypeFromFamilies(families: Set<"strength" | "cardio" | "unknown">): WorkoutSessionType {
  const hasStrength = families.has("strength");
  const hasCardio = families.has("cardio");
  if (hasStrength && hasCardio) return "mixed";
  if (hasStrength) return "strength";
  if (hasCardio) return "cardio";
  return "unknown";
}

function getSessionDurationMinutes(workouts: WorkoutHistoryItem[]): number | null {
  const manual = workouts.filter((w) => w.sourceId === "manual");
  if (manual.length > 0) {
    const sum = manual.reduce((acc, w) => {
      if (typeof w.durationMinutes === "number" && Number.isFinite(w.durationMinutes) && w.durationMinutes > 0) {
        return acc + w.durationMinutes;
      }
      return acc;
    }, 0);
    return sum > 0 ? sum : null;
  }
  const provider = workouts.find(
    (w) => typeof w.durationMinutes === "number" && Number.isFinite(w.durationMinutes) && w.durationMinutes > 0,
  );
  return provider?.durationMinutes ?? null;
}

export function reconcileWorkoutSessionsForDay(
  day: DayKey,
  workouts: WorkoutHistoryItem[],
): ReconciledWorkoutSession[] {
  if (workouts.length === 0) return [];
  const sorted = [...workouts].sort((a, b) => {
    const sa = toMs(a.start ?? a.observedAt) ?? 0;
    const sb = toMs(b.start ?? b.observedAt) ?? 0;
    if (sa !== sb) return sa - sb;
    return a.id.localeCompare(b.id);
  });

  const sessions: {
    workouts: WorkoutHistoryItem[];
    families: Set<"strength" | "cardio" | "unknown">;
    start: number | null;
    end: number | null;
  }[] = [];

  for (const workout of sorted) {
    const family = familyForWorkout(workout);
    const window = normalizeWindow(workout);
    const existing = sessions[sessions.length - 1];
    if (existing && existing.families.has(family) && canMerge(existing.start, existing.end, window)) {
      existing.workouts.push(workout);
      existing.families.add(family);
      if (window.startMs != null) {
        existing.start = existing.start == null ? window.startMs : Math.min(existing.start, window.startMs);
      }
      if (window.endMs != null) {
        existing.end = existing.end == null ? window.endMs : Math.max(existing.end, window.endMs);
      }
    } else {
      sessions.push({
        workouts: [workout],
        families: new Set([family]),
        start: window.startMs,
        end: window.endMs,
      });
    }
  }

  return sessions.map((s, index) => {
    const startIso = s.start == null ? null : new Date(s.start).toISOString();
    const endIso = s.end == null ? null : new Date(s.end).toISOString();
    const title = chooseTitle(s.workouts);
    const durationMinutes = getSessionDurationMinutes(s.workouts);
    const calories = s.workouts
      .map((w) => w.calories)
      .find((c): c is number => typeof c === "number" && c >= 0) ?? null;

    return {
      id: `${day}:session:${index}:${s.workouts.map((w) => w.id).join("|")}`,
      day,
      sessionType: sessionTypeFromFamilies(s.families),
      title: title.title,
      titleSource: title.source,
      start: startIso,
      end: endIso,
      durationMinutes,
      calories,
      workouts: s.workouts,
      sourceSummaries: s.workouts.map((w) => ({
        source: w.sourceId,
        rawEventId: w.id,
        ...(w.workoutType ? { kind: w.workoutType } : {}),
        ...(w.title ? { title: w.title } : {}),
        ...(w.start ? { start: w.start } : {}),
        ...(w.end ? { end: w.end } : {}),
      })),
      sourceCount: new Set(s.workouts.map((w) => `${w.sourceId}:${w.id}`)).size,
    };
  });
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
