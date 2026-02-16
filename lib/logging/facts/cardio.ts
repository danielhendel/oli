import type { CardioPayload } from "../schemas";

export function cardioTotals(p: CardioPayload): { distanceKmTotal?: number; durationMinTotal?: number } {
  let distance = 0;
  let durationMs = 0;

  if (p.summary) {
    if (typeof p.summary.distanceKm === "number") distance += Math.max(0, p.summary.distanceKm);
    if (typeof p.summary.durationMs === "number") durationMs += Math.max(0, p.summary.durationMs);
  }
  if (Array.isArray(p.laps)) {
    for (const l of p.laps) {
      if (typeof l.distanceKm === "number") distance += Math.max(0, l.distanceKm);
      if (typeof l.durationMs === "number") durationMs += Math.max(0, l.durationMs);
    }
  }

  const dist = distance > 0 ? distance : undefined;
  const durMin = durationMs > 0 ? Math.round(durationMs / 60000) : undefined;

  const out: { distanceKmTotal?: number; durationMinTotal?: number } = {};
  if (dist !== undefined) out.distanceKmTotal = dist;
  if (durMin !== undefined) out.durationMinTotal = durMin;
  return out;
}
