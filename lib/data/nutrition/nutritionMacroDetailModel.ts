import type { RawEventListItem } from "@oli/contracts";
import { manualNutritionPayloadSchema } from "@oli/contracts";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import {
  NUTRITION_MACRO_LABEL,
  NUTRITION_MACRO_TARGET_G,
  amountOfTargetLabel,
  goalPercentLabel,
  goalProgress,
  isFiniteNonNegative,
  type NutritionMacroKey,
} from "@/lib/data/nutrition/nutritionGoals";

export type { NutritionMacroKey } from "@/lib/data/nutrition/nutritionGoals";

export function isNutritionMacroKey(v: string): v is NutritionMacroKey {
  return v === "protein" || v === "carbs" || v === "fat";
}

export type NutritionMacroFoodRow = {
  id: string;
  title: string;
  subtitle: string;
  /** Macro contribution for this food, e.g. "32 g". */
  valueLabel: string;
};

export type NutritionMacroDetailModel = {
  macro: NutritionMacroKey;
  title: string;
  unit: "g";
  currentValue: number | null;
  targetValue: number;
  /** "43 / 250 g". */
  amountLabel: string;
  /** "19%" or "—". */
  percentLabel: string;
  /** 0–1. */
  progress: number;
  foods: readonly NutritionMacroFoodRow[];
};

function macroValueFromFacts(
  nutrition: DailyFactsDto["nutrition"] | undefined,
  macro: NutritionMacroKey,
): number | undefined {
  if (nutrition == null) return undefined;
  if (macro === "protein") return nutrition.proteinG;
  if (macro === "carbs") return nutrition.carbsG;
  return nutrition.fatG;
}

function macroGramsFromPayload(
  payload: { proteinG: number; carbsG: number; fatG: number },
  macro: NutritionMacroKey,
): number {
  if (macro === "protein") return payload.proteinG;
  if (macro === "carbs") return payload.carbsG;
  return payload.fatG;
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function mealSlotLabel(slot: string | undefined): string {
  if (!slot) return "";
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

/**
 * Builds a per-macro detail model for the selected day.
 *
 * - `currentValue`/`targetValue`/`percent`/`progress` use the display nutrition slice
 *   (raw-event rollup when loaded, else DailyFacts).
 * - `foods` is derived from raw nutrition events (each event = one logged food/meal), ranked by
 *   the macro's contribution descending. Foods with no contribution to this macro are omitted.
 */
export function buildNutritionMacroDetailModel(args: {
  macro: NutritionMacroKey;
  nutrition: DailyFactsDto["nutrition"] | undefined;
  rawItems: readonly RawEventListItem[];
}): NutritionMacroDetailModel {
  const { macro } = args;
  const target = NUTRITION_MACRO_TARGET_G[macro];
  const current = macroValueFromFacts(args.nutrition, macro);

  const scored: { row: NutritionMacroFoodRow; grams: number; t: number }[] = [];
  for (const r of args.rawItems) {
    if (r.kind !== "nutrition" || r.payload == null) continue;
    const parsed = manualNutritionPayloadSchema.safeParse(r.payload);
    if (!parsed.success) continue;
    const pl = parsed.data;
    const grams = macroGramsFromPayload(pl, macro);
    if (!Number.isFinite(grams) || grams <= 0) continue;

    const t = Date.parse(r.observedAt);
    const food = pl.foodLabel?.trim();
    const title = food && food.length > 0 ? food : pl.logScope === "day_aggregate" ? "Quick add" : "Nutrition";
    const slot = mealSlotLabel(pl.mealSlot);
    const time = formatTimeShort(r.observedAt);
    const subtitle = [slot, time].filter((x) => x.length > 0).join(" · ") || time || "Logged";

    scored.push({
      row: { id: r.id, title, subtitle, valueLabel: `${Math.round(grams)} g` },
      grams,
      t: Number.isFinite(t) ? t : 0,
    });
  }
  scored.sort((a, b) => (b.grams !== a.grams ? b.grams - a.grams : b.t - a.t));

  return {
    macro,
    title: NUTRITION_MACRO_LABEL[macro],
    unit: "g",
    currentValue: isFiniteNonNegative(current) ? Math.round(current) : null,
    targetValue: target,
    amountLabel: amountOfTargetLabel(current, target, "g"),
    percentLabel: goalPercentLabel(current, target),
    progress: goalProgress(current, target),
    foods: scored.map((s) => s.row),
  };
}
