/**
 * Historical fat-mass presentation series — Body Fat % × compatible Weight.
 * Uses {@link resolveCompatibleFatMassKg}; presentation-only.
 */

import {
  resolveCompatibleFatMassKg,
  type BodyCompositionPairingEvidence,
} from "@/lib/body/presentation/resolveCompatibleBodyCompositionDerivation";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

function indexWeightsByDay(
  weightPoints: readonly WeightPoint[],
): Map<string, WeightPoint[]> {
  const map = new Map<string, WeightPoint[]>();
  for (const w of weightPoints) {
    if (!Number.isFinite(w.weightKg) || w.weightKg <= 0) continue;
    const list = map.get(w.dayKey) ?? [];
    list.push(w);
    map.set(w.dayKey, list);
  }
  return map;
}

function pickCompatibleWeight(
  bodyFat: WeightPoint,
  candidates: readonly WeightPoint[],
): WeightPoint | null {
  if (candidates.length === 0) return null;
  const sameEvent = candidates.find(
    (w) => w.observedAt === bodyFat.observedAt && w.sourceId === bodyFat.sourceId,
  );
  if (sameEvent) return sameEvent;
  const sameSource = candidates.find((w) => w.sourceId === bodyFat.sourceId);
  if (sameSource) return sameSource;
  // Deterministic: latest weight on the day (approved snapshot-day co-presence).
  return [...candidates].sort((a, b) => a.observedAt.localeCompare(b.observedAt)).at(-1) ?? null;
}

/**
 * Build fat-mass (kg) points for each Body Fat observation with compatible Weight.
 * Incompatible days are omitted — never invent Weight.
 */
export function buildHistoricalFatMassSeries(args: {
  readonly bodyFatPoints: readonly WeightPoint[];
  readonly weightPoints: readonly WeightPoint[];
}): WeightPoint[] {
  const byDay = indexWeightsByDay(args.weightPoints);
  const out: WeightPoint[] = [];

  for (const bf of args.bodyFatPoints) {
    const pct = bf.weightKg;
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) continue;
    const weight = pickCompatibleWeight(bf, byDay.get(bf.dayKey) ?? []);
    if (weight == null) continue;

    const evidence: BodyCompositionPairingEvidence = {
      weightKg: weight.weightKg,
      bodyFatPercent: pct,
      leanBodyMassKg: null,
      overviewDay: bf.dayKey,
      weightObservedAt: weight.observedAt,
      bodyFatObservedAt: bf.observedAt,
      weightSourceId: weight.sourceId,
      bodyFatSourceId: bf.sourceId,
      weightAndBodyFatSameEvent:
        weight.observedAt === bf.observedAt && weight.sourceId === bf.sourceId,
      latestObservedAtIso: bf.observedAt,
    };
    const derived = resolveCompatibleFatMassKg(evidence);
    if (derived.status !== "ready") continue;
    out.push({
      observedAt: bf.observedAt,
      dayKey: bf.dayKey,
      weightKg: derived.valueKg,
      sourceId: bf.sourceId,
    });
  }

  return out.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}
