/** Normalize floating nav chrome height for stable layout/state updates. */
export function normalizeChromeHeight(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.ceil(value));
}

/** Apply height only when normalized value changed (prevents layout/setState loops). */
export function nextChromeHeightState(
  current: number | undefined,
  next: number | undefined,
): number | undefined {
  const normalized = normalizeChromeHeight(next);
  return current === normalized ? current : normalized;
}
