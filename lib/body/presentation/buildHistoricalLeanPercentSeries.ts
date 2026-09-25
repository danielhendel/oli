/**
 * Historical Lean Mass % presentation series — Lean Mass / compatible Weight.
 * Uses {@link resolveCompatibleLeanMassPercentage}; never 100 − Body Fat.
 * Presentation-only.
 */

import {
  resolveCompatibleLeanMassPercentage,
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
  lean: WeightPoint,
  candidates: readonly WeightPoint[],
): WeightPoint | null {
  if (candidates.length === 0) return null;
  const sameEvent = candidates.find(
    (w) => w.observedAt === lean.observedAt && w.sourceId === lean.sourceId,
  );
  if (sameEvent) return sameEvent;
  const sameSource = candidates.find((w) => w.sourceId === lean.sourceId);
  if (sameSource) return sameSource;
  return [...candidates].sort((a, b) => a.observedAt.localeCompare(b.observedAt)).at(-1) ?? null;
}

/**
 * Build Lean Mass percentage points for each Lean Mass observation with compatible Weight.
 */
export function buildHistoricalLeanPercentSeries(args: {
  readonly leanMassPoints: readonly WeightPoint[];
  readonly weightPoints: readonly WeightPoint[];
}): WeightPoint[] {
  const byDay = indexWeightsByDay(args.weightPoints);
  const out: WeightPoint[] = [];

  for (const lean of args.leanMassPoints) {
    const leanKg = lean.weightKg;
    if (!Number.isFinite(leanKg) || leanKg <= 0) continue;
    const weight = pickCompatibleWeight(lean, byDay.get(lean.dayKey) ?? []);
    if (weight == null) continue;

    const evidence: BodyCompositionPairingEvidence = {
      weightKg: weight.weightKg,
      bodyFatPercent: null,
      leanBodyMassKg: leanKg,
      overviewDay: lean.dayKey,
      weightObservedAt: weight.observedAt,
      leanObservedAt: lean.observedAt,
      weightSourceId: weight.sourceId,
      leanSourceId: lean.sourceId,
      weightAndLeanSameEvent:
        weight.observedAt === lean.observedAt && weight.sourceId === lean.sourceId,
      latestObservedAtIso: lean.observedAt,
    };
    const derived = resolveCompatibleLeanMassPercentage(evidence);
    if (derived.status !== "ready" || derived.percent == null) continue;
    out.push({
      observedAt: lean.observedAt,
      dayKey: lean.dayKey,
      weightKg: derived.percent,
      sourceId: lean.sourceId,
    });
  }

  return out.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}
