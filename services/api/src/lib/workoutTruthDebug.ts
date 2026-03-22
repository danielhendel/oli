/**
 * Opt-in server logs for GET /users/me/raw-events (workouts historical proof).
 *
 * Enable: WORKOUT_TRUTH_SERVER_RAW_EVENTS_DEBUG=1
 * Targets: WORKOUT_TRUTH_DEBUG_TARGET_IDS=id1,id2
 * Optional prefixes: WORKOUT_TRUTH_DEBUG_TARGET_PREFIXES=appleHealth:v2:workout:2025-10-11,...
 */

export type RawEventsTruthDebugConfig = {
  exactIds: ReadonlySet<string>;
  prefixes: readonly string[];
};

export function getRawEventsTruthDebugConfig(): RawEventsTruthDebugConfig | null {
  if (process.env.WORKOUT_TRUTH_SERVER_RAW_EVENTS_DEBUG !== "1") return null;
  const exact = (process.env.WORKOUT_TRUTH_DEBUG_TARGET_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const prefixes = (process.env.WORKOUT_TRUTH_DEBUG_TARGET_PREFIXES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (exact.length === 0 && prefixes.length === 0) return null;
  return { exactIds: new Set(exact), prefixes };
}

export function rawEventIdMatchesTruthDebug(id: string, cfg: RawEventsTruthDebugConfig): boolean {
  if (cfg.exactIds.has(id)) return true;
  return cfg.prefixes.some((p) => id.startsWith(p));
}
