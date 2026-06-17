import type { RawEventListItem } from "@oli/contracts";
import { manualNutritionPayloadSchema } from "@oli/contracts";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";

/** UI projection: summed macros from raw nutrition events for one calendar day. */
export type NutritionDayRollupTotals = {
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  eventCount: number;
};

function roundMacro(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Sums nutrition macros from raw events (same rows shown in View Food logged meals).
 * Not persisted truth — a projection for immediate post-mutation UI consistency.
 */
export function rollupNutritionTotalsFromRawEvents(
  items: readonly RawEventListItem[],
): NutritionDayRollupTotals {
  let totalKcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let eventCount = 0;

  for (const r of items) {
    if (r.kind !== "nutrition" || r.payload == null) continue;
    const parsed = manualNutritionPayloadSchema.safeParse(r.payload);
    if (!parsed.success) continue;
    const pl = parsed.data;
    if (!Number.isFinite(pl.totalKcal) || pl.totalKcal < 0) continue;
    if (!Number.isFinite(pl.proteinG) || pl.proteinG < 0) continue;
    if (!Number.isFinite(pl.carbsG) || pl.carbsG < 0) continue;
    if (!Number.isFinite(pl.fatG) || pl.fatG < 0) continue;

    totalKcal += pl.totalKcal;
    proteinG += pl.proteinG;
    carbsG += pl.carbsG;
    fatG += pl.fatG;
    eventCount += 1;
  }

  return {
    totalKcal: Math.round(totalKcal),
    proteinG: roundMacro(proteinG),
    carbsG: roundMacro(carbsG),
    fatG: roundMacro(fatG),
    eventCount,
  };
}

/** Converts a raw rollup into the DailyFacts nutrition slice shape for card models. */
export function nutritionRollupToFactsSlice(
  rollup: NutritionDayRollupTotals,
): DailyFactsDto["nutrition"] | undefined {
  if (rollup.eventCount === 0) return undefined;
  return {
    totalKcal: rollup.totalKcal,
    proteinG: rollup.proteinG,
    carbsG: rollup.carbsG,
    fatG: rollup.fatG,
  };
}

export function hasPositiveNutritionRollupTotals(rollup: NutritionDayRollupTotals): boolean {
  return (
    rollup.eventCount > 0 &&
    (rollup.totalKcal > 0 || rollup.proteinG > 0 || rollup.carbsG > 0 || rollup.fatG > 0)
  );
}

/** Dev/diagnostic: compare raw sum vs DailyFacts slice for one day. */
export function formatNutritionTotalsDebugReport(args: {
  dayKey: string;
  rawRollup: NutritionDayRollupTotals;
  factsNutrition?: DailyFactsDto["nutrition"];
  factsComputedAt?: string;
}): string {
  const raw = args.rawRollup;
  const f = args.factsNutrition;
  const lines = [
    `day=${args.dayKey}`,
    `rawEvents=${raw.eventCount}`,
    `rawKcal=${raw.totalKcal} rawP=${raw.proteinG} rawC=${raw.carbsG} rawF=${raw.fatG}`,
    `factsKcal=${f?.totalKcal ?? "—"} factsP=${f?.proteinG ?? "—"} factsC=${f?.carbsG ?? "—"} factsF=${f?.fatG ?? "—"}`,
    `factsComputedAt=${args.factsComputedAt ?? "—"}`,
  ];
  return lines.join("\n");
}
