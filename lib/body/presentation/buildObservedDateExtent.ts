/**
 * Observed date extent for Weight trend charts — actual valid points only.
 * Does not use requested period bounds.
 */

export type ObservedDateExtentPoint = {
  readonly observedAt: string;
  readonly dayKey?: string;
};

export type ObservedDateExtent = {
  readonly firstObservedAt: string;
  readonly lastObservedAt: string;
  readonly firstDayKey: string | null;
  readonly lastDayKey: string | null;
};

function dayKeyFromIso(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build first/last observed timestamps from valid chart points.
 * Invalid / non-finite timestamps are excluded.
 */
export function buildObservedDateExtent(
  points: readonly ObservedDateExtentPoint[],
): ObservedDateExtent | null {
  const valid = points
    .map((p) => {
      const ms = Date.parse(p.observedAt);
      if (!Number.isFinite(ms)) return null;
      return {
        observedAt: p.observedAt,
        ms,
        dayKey: p.dayKey ?? dayKeyFromIso(p.observedAt),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null)
    .sort((a, b) => a.ms - b.ms);

  if (valid.length === 0) return null;

  const first = valid[0]!;
  const last = valid[valid.length - 1]!;
  return {
    firstObservedAt: first.observedAt,
    lastObservedAt: last.observedAt,
    firstDayKey: first.dayKey,
    lastDayKey: last.dayKey,
  };
}
