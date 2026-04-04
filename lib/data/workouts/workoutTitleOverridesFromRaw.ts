import type { RawEventListItem } from "@oli/contracts";

export type DurableTitleOverrideAccumulator = Map<string, { displayName: string; tieMs: number }>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** Tie-break: payload.appliedAt when parseable, else raw observedAt. */
export function workoutTitleOverrideTieMs(appliedAtRaw: unknown, observedAt: string): number {
  if (typeof appliedAtRaw === "string") {
    const t = Date.parse(appliedAtRaw);
    if (!Number.isNaN(t)) return t;
  }
  const o = Date.parse(observedAt);
  return Number.isNaN(o) ? 0 : o;
}

/**
 * Merge one list row into the accumulator (latest tieMs wins per targetWorkoutId).
 */
export function mergeWorkoutTitleOverrideListRow(
  acc: DurableTitleOverrideAccumulator,
  row: Pick<RawEventListItem, "kind" | "observedAt"> & { payload?: unknown },
): void {
  if (row.kind !== "workout_title_override") return;
  const p = row.payload;
  if (!isRecord(p)) return;
  const target =
    typeof p.targetWorkoutId === "string" ? p.targetWorkoutId.trim() : "";
  const name = typeof p.displayName === "string" ? p.displayName.trim() : "";
  if (!target || !name) return;
  const tieMs = workoutTitleOverrideTieMs(p.appliedAt, row.observedAt);
  const prev = acc.get(target);
  if (!prev || tieMs >= prev.tieMs) {
    acc.set(target, { displayName: name, tieMs });
  }
}

export function durableTitleOverrideMapToRecord(
  acc: DurableTitleOverrideAccumulator,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, v] of acc) {
    out[id] = v.displayName;
  }
  return out;
}
