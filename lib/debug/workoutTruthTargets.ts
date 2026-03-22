/**
 * DEV-only: pinpoint historical raw-event IDs through the workouts hydrate path.
 *
 * Set `EXPO_PUBLIC_WORKOUT_TRUTH_TARGET_RAW_EVENT_IDS` to comma-separated full ids.
 * Optionally set `EXPO_PUBLIC_WORKOUT_TRUTH_TARGET_RAW_EVENT_ID_PREFIXES` for prefix match
 * (e.g. `appleHealth:v2:workout:2025-10-11` if the suffix is known from logs).
 */

export type WorkoutTruthTargetConfig = {
  exactIds: ReadonlySet<string>;
  prefixes: readonly string[];
};

export function getWorkoutTruthTargetConfig(): WorkoutTruthTargetConfig | null {
  if (!__DEV__ || process.env.JEST_WORKER_ID) return null;
  const exact = (process.env.EXPO_PUBLIC_WORKOUT_TRUTH_TARGET_RAW_EVENT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const prefixes = (process.env.EXPO_PUBLIC_WORKOUT_TRUTH_TARGET_RAW_EVENT_ID_PREFIXES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (exact.length === 0 && prefixes.length === 0) return null;
  return { exactIds: new Set(exact), prefixes };
}

export function rawEventIdMatchesTruthTargets(id: string, cfg: WorkoutTruthTargetConfig | null): boolean {
  if (!cfg) return false;
  if (cfg.exactIds.has(id)) return true;
  return cfg.prefixes.some((p) => id.startsWith(p));
}
