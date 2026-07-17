/**
 * Pure workout session reconciliation core.
 * Shared by Workout module UI and Timeline feed normalization.
 * No Firestore, no network, no React.
 */

export type WorkoutSessionFamily = "strength" | "cardio" | "unknown";

export type ReconcilableWorkoutRecord = {
  id: string;
  sourceId: string;
  /** Original raw/canonical kind when known (e.g. strength_workout). */
  rawKind?: string | null;
  title?: string | null;
  workoutType?: "strength" | "cardio";
  start: string | null;
  end: string | null;
  observedAt?: string | null;
  durationMinutes?: number | null;
  calories?: number | null;
  family: WorkoutSessionFamily;
};

export type WorkoutSessionType = "strength" | "cardio" | "mixed" | "unknown";

export type ReconciledWorkoutSessionCore = {
  /** Stable across membership-preserving source-order changes. */
  id: string;
  day: string;
  sessionType: WorkoutSessionType;
  title: string;
  titleSource: "user_override" | "manual" | "provider" | "fallback";
  start: string | null;
  end: string | null;
  durationMinutes: number | null;
  calories: number | null;
  memberIds: readonly string[];
  members: readonly ReconcilableWorkoutRecord[];
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

function normalizeWindow(workout: ReconcilableWorkoutRecord): NormalizedWindow {
  const startMs = toMs(workout.start ?? workout.observedAt);
  let endMs = toMs(workout.end);
  if (
    endMs == null &&
    startMs != null &&
    typeof workout.durationMinutes === "number" &&
    workout.durationMinutes > 0
  ) {
    endMs = startMs + Math.round(workout.durationMinutes * 60_000);
  }
  return { startMs, endMs };
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
  existingFamilies: Set<WorkoutSessionFamily>,
  incoming: WorkoutSessionFamily,
): boolean {
  if (incoming === "unknown") return true;
  if (existingFamilies.has("unknown")) return true;
  if (incoming === "strength" && existingFamilies.has("cardio")) return false;
  if (incoming === "cardio" && existingFamilies.has("strength")) return false;
  return true;
}

function estimatedDurationMinutes(
  window: NormalizedWindow,
  fallback: number | null | undefined,
): number | null {
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
  session: {
    start: number | null;
    end: number | null;
    workouts: ReconcilableWorkoutRecord[];
  },
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

function chooseTitle(workouts: readonly ReconcilableWorkoutRecord[]): {
  title: string;
  source: ReconciledWorkoutSessionCore["titleSource"];
} {
  const manual = workouts.find(
    (w) => w.sourceId === "manual" && (w.title ?? "").trim().length > 0,
  );
  if (manual?.title) return { title: manual.title.trim(), source: "manual" };
  const provider = workouts.find((w) => (w.title ?? "").trim().length > 0);
  if (provider?.title) return { title: provider.title.trim(), source: "provider" };
  if (workouts.some((w) => w.family === "strength" || w.rawKind === "strength_workout")) {
    return { title: "Strength workout", source: "fallback" };
  }
  return { title: "Workout", source: "fallback" };
}

function sessionTypeFromFamilies(families: Set<WorkoutSessionFamily>): WorkoutSessionType {
  const hasStrength = families.has("strength");
  const hasCardio = families.has("cardio");
  if (hasStrength && hasCardio) return "mixed";
  if (hasStrength) return "strength";
  if (hasCardio) return "cardio";
  return "unknown";
}

function getSessionDurationMinutes(workouts: readonly ReconcilableWorkoutRecord[]): number | null {
  const manual = workouts.filter((w) => w.sourceId === "manual");
  if (manual.length > 0) {
    const sum = manual.reduce((acc, w) => {
      if (
        typeof w.durationMinutes === "number" &&
        Number.isFinite(w.durationMinutes) &&
        w.durationMinutes > 0
      ) {
        return acc + w.durationMinutes;
      }
      return acc;
    }, 0);
    return sum > 0 ? sum : null;
  }
  const provider = workouts.find(
    (w) =>
      typeof w.durationMinutes === "number" &&
      Number.isFinite(w.durationMinutes) &&
      w.durationMinutes > 0,
  );
  return provider?.durationMinutes ?? null;
}

function stableSessionId(day: string, memberIds: readonly string[]): string {
  const sorted = [...memberIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return `${day}:session:${sorted.join("|")}`;
}

/**
 * Reconcile workout records for one calendar day into merged physical sessions.
 * Deterministic for a given input set (independent of input array order).
 */
export function reconcileWorkoutSessionsCore(
  day: string,
  workouts: readonly ReconcilableWorkoutRecord[],
): ReconciledWorkoutSessionCore[] {
  if (workouts.length === 0) return [];
  const sorted = [...workouts].sort((a, b) => {
    const sa = toMs(a.start ?? a.observedAt) ?? 0;
    const sb = toMs(b.start ?? b.observedAt) ?? 0;
    if (sa !== sb) return sa - sb;
    return a.id.localeCompare(b.id);
  });

  const sessions: {
    workouts: ReconcilableWorkoutRecord[];
    families: Set<WorkoutSessionFamily>;
    start: number | null;
    end: number | null;
  }[] = [];

  for (const workout of sorted) {
    const family = workout.family;
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
        bestMatch.start =
          bestMatch.start == null ? window.startMs : Math.min(bestMatch.start, window.startMs);
      }
      if (window.endMs != null) {
        bestMatch.end =
          bestMatch.end == null ? window.endMs : Math.max(bestMatch.end, window.endMs);
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

  return sessions.map((s) => {
    const startIso = s.start == null ? null : new Date(s.start).toISOString();
    const endIso = s.end == null ? null : new Date(s.end).toISOString();
    const title = chooseTitle(s.workouts);
    const durationMinutes = getSessionDurationMinutes(s.workouts);
    const calories =
      s.workouts
        .map((w) => w.calories)
        .find((c): c is number => typeof c === "number" && c >= 0) ?? null;
    const memberIds = s.workouts.map((w) => w.id);

    return {
      id: stableSessionId(day, memberIds),
      day,
      sessionType: sessionTypeFromFamilies(s.families),
      title: title.title,
      titleSource: title.source,
      start: startIso,
      end: endIso,
      durationMinutes,
      calories,
      memberIds,
      members: s.workouts,
      sourceCount: new Set(s.workouts.map((w) => `${w.sourceId}:${w.id}`)).size,
    };
  });
}

/** Family from canonical/raw kind without requiring UI title classifiers. */
export function familyFromWorkoutKind(
  kind: string | null | undefined,
): WorkoutSessionFamily {
  if (kind === "strength_workout") return "strength";
  if (kind === "workout") return "unknown";
  return "unknown";
}
