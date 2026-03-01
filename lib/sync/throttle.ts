/**
 * Deterministic foreground sync throttle.
 * Used to decide whether to run a sync based on last run time (lastCheckedAt).
 * Fail-closed: invalid lastIso -> do not run (avoid spam).
 */

export function shouldRun(
  lastIso: string | null,
  minIntervalMs: number,
  nowMs = Date.now(),
): boolean {
  if (lastIso == null) return true;
  if (typeof lastIso === "string" && lastIso.trim() === "") return false; // fail-closed: empty = invalid
  const t = Date.parse(lastIso);
  if (!Number.isFinite(t)) return false; // fail-closed: do not spam if corrupted
  return nowMs - t >= minIntervalMs;
}

export function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}
