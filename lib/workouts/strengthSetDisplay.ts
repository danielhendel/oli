/**
 * Shared strength set display math for workout day detail and exercise history.
 * Epley e1RM = loadKg * (1 + reps/30). Same as lib/workouts/memory/exerciseHistory.
 */

export const LB_PER_KG = 1 / 0.45359237;

export function epleyE1RmKg(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30);
}

export type StrengthSetDisplayInput = {
  ordinal?: number;
  setNumber?: number;
  reps: number | null;
  loadKg?: number | null;
  weightKg?: number | null;
  rpe?: number | null;
  intensity?: number | null;
};

export function formatStrengthSetTableCells(set: StrengthSetDisplayInput): {
  setLabel: string;
  repsLabel: string;
  weightLabel: string;
  rpeLabel: string;
  e1RmLbLabel: string;
  volLbLabel: string;
} {
  const ord = typeof set.ordinal === "number" ? set.ordinal : set.setNumber ?? 0;
  const reps = set.reps;
  const loadKg = set.loadKg ?? set.weightKg;
  const hasLoad = loadKg != null && loadKg > 0;
  const weightStr = hasLoad ? `${(loadKg! * LB_PER_KG).toFixed(1)}` : "BW";
  const rpeRaw = set.rpe ?? set.intensity;
  const rpeStr = rpeRaw != null ? String(rpeRaw) : "—";
  const safeReps = typeof reps === "number" && Number.isFinite(reps) ? reps : 0;
  const e1RmKg = hasLoad ? epleyE1RmKg(loadKg!, safeReps) : null;
  const e1RmStr = e1RmKg != null ? `${Math.round(e1RmKg * LB_PER_KG)}` : "—";
  const volumeKg = hasLoad && safeReps > 0 ? safeReps * loadKg! : 0;
  const volStr = volumeKg > 0 ? `${Math.round(volumeKg * LB_PER_KG)}` : "—";

  return {
    setLabel: String(ord),
    repsLabel: reps != null ? String(reps) : "—",
    weightLabel: weightStr,
    rpeLabel: rpeStr,
    e1RmLbLabel: e1RmStr,
    volLbLabel: volStr,
  };
}
