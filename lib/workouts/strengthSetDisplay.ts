/**
 * Shared strength set display math for workout day detail and exercise history.
 * Epley e1RM = loadKg * (1 + reps/30). Same as lib/workouts/memory/exerciseHistory.
 */

import { kgToLbs } from "@/lib/metrics/metricUnits";
import { trainingVolumeKgForManualSet } from "@/lib/workouts/strength/strengthVolumeKg";

/** lb per kg (display); prefer `kgToLbs(kg)` for totals to match `formatTypicalStrengthVolumeLabel`. */
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
  /** When true, Vol column shows "—" (excluded from training volume). */
  isWarmup?: boolean;
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
  const volumeKg = trainingVolumeKgForManualSet({
    reps,
    weightKg: loadKg ?? null,
    ...(set.isWarmup === true ? { isWarmup: true as const } : {}),
  });
  const volStr = volumeKg > 0 ? `${Math.round(kgToLbs(volumeKg))}` : "—";

  return {
    setLabel: String(ord),
    repsLabel: reps != null ? String(reps) : "—",
    weightLabel: weightStr,
    rpeLabel: rpeStr,
    e1RmLbLabel: e1RmStr,
    volLbLabel: volStr,
  };
}
