import type { NutritionPayload } from "../schemas";

export function nutritionTotals(
  p: NutritionPayload
): { kcal?: number; proteinG?: number; carbG?: number; fatG?: number; fiberG?: number; sodiumMg?: number } {
  if (p.totals) return { ...p.totals };

  const total = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 };
  if (Array.isArray(p.entries)) {
    for (const e of p.entries) {
      const n = e.inlineItem?.nutrients;
      if (!n) continue;
      const servings = typeof e.servings === "number" ? e.servings : 1;
      total.kcal += (n.kcal ?? 0) * servings;
      total.proteinG += (n.proteinG ?? 0) * servings;
      total.carbG += (n.carbG ?? 0) * servings;
      total.fatG += (n.fatG ?? 0) * servings;
      total.fiberG += (n.fiberG ?? 0) * servings;
      total.sodiumMg += (n.sodiumMg ?? 0) * servings;
    }
  }

  const out: { kcal?: number; proteinG?: number; carbG?: number; fatG?: number; fiberG?: number; sodiumMg?: number } = {};
  if (total.kcal) out.kcal = total.kcal;
  if (total.proteinG) out.proteinG = total.proteinG;
  if (total.carbG) out.carbG = total.carbG;
  if (total.fatG) out.fatG = total.fatG;
  if (total.fiberG) out.fiberG = total.fiberG;
  if (total.sodiumMg) out.sodiumMg = total.sodiumMg;
  return out;
}
