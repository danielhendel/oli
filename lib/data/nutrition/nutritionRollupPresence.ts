import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";

/** True when daily facts include any positive nutrition rollup (matches overview “totals exist”). */
export function hasNutritionRollupFacts(n: DailyFactsDto["nutrition"] | undefined): boolean {
  if (!n) return false;
  const vals = [n.totalKcal, n.proteinG, n.carbsG, n.fatG];
  return vals.some((x) => typeof x === "number" && Number.isFinite(x) && x > 0);
}
