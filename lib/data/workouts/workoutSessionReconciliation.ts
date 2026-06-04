import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { DayKey } from "@/lib/ui/calendar/types";
import { formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";
import { classifyWorkoutHistoryItemEvidence } from "@/lib/data/workouts/workoutEligibility";

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
const START_PROXIMITY_MINUTES = 35;
const DURATION_RATIO_TOLERANCE = 0.6;

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
  const kind = classifyWorkoutHistoryItemEvidence(workout);
  if (kind === "strength" || kind === "cardio") return kind;
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

function areFamiliesCompatible(
  existingFamilies: Set<"strength" | "cardio" | "unknown">,
  incoming: "strength" | "cardio" | "unknown",
): boolean {
  if (incoming === "unknown") return true;
  if (existingFamilies.has("unknown")) return true;
  if (incoming === "strength" && existingFamilies.has("cardio")) return false;
  if (incoming === "cardio" && existingFamilies.has("strength")) return false;
  return true;
}

function estimatedDurationMinutes(window: NormalizedWindow, fallback: number | null): number | null {
  // When start === end (common on legacy manual strength_workout canonicals with no durationMinutes),
  // do not invent a 1-minute duration — that blocks merging with a longer provider workout.
  if (window.startMs != null && window.endMs != null && window.endMs > window.startMs) {
    return Math.max(1, Math.round((window.endMs - window.startMs) / 60_000));
  }
  return fallback != null && Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function isDurationCompatible(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return true;
  const bigger = Math.max(a, b);
  const smaller = Math.min(a, b);
  if (bigger <= 0) return true;
  return smaller / bigger >= 1 - DURATION_RATIO_TOLERANCE;
}

function mergeScore(
  session: { start: number | null; end: number | null; workouts: WorkoutHistoryItem[] },
  incomingWindow: NormalizedWindow,
  incomingDuration: number | null,
): number {
  const incomingStart = incomingWindow.startMs;
  if (incomingStart == null || session.start == null) return Number.POSITIVE_INFINITY;
  const sessionDuration = estimatedDurationMinutes(
    { startMs: session.start, endMs: session.end },
    session.workouts[0]?.durationMinutes ?? null,
  );
  const startGap = Math.abs(incomingStart - session.start);
  const endGap = Math.abs((incomingWindow.endMs ?? incomingStart) - (session.end ?? session.start));
  if (!isDurationCompatible(sessionDuration, incomingDuration)) return Number.POSITIVE_INFINITY;
  return startGap + endGap;
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
    const incomingDuration = estimatedDurationMinutes(window, workout.durationMinutes);
    let bestMatch: (typeof sessions)[number] | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of sessions) {
      if (!areFamiliesCompatible(candidate.families, family)) continue;
      const closeByTime =
        canMerge(candidate.start, candidate.end, window) ||
        (candidate.start != null &&
          window.startMs != null &&
          Math.abs(window.startMs - candidate.start) <= START_PROXIMITY_MINUTES * 60_000);
      if (!closeByTime) continue;
      const score = mergeScore(candidate, window, incomingDuration);
      if (score < bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    if (bestMatch) {
      bestMatch.workouts.push(workout);
      bestMatch.families.add(family);
      if (window.startMs != null) {
        bestMatch.start = bestMatch.start == null ? window.startMs : Math.min(bestMatch.start, window.startMs);
      }
      if (window.endMs != null) {
        bestMatch.end = bestMatch.end == null ? window.endMs : Math.max(bestMatch.end, window.endMs);
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
