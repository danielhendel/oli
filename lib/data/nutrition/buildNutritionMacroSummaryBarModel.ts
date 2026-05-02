// lib/data/nutrition/buildNutritionMacroSummaryBarModel.ts
import type { NutritionLogFormFields } from "@/lib/nutrition/nutritionLogForm";
import { validateNutritionLogForm } from "@/lib/nutrition/nutritionLogForm";

export type NutritionMacroSummaryBarModel = {
  /** Short headline, e.g. "2,000 kcal" */
  headline: string;
  /** Macro chips line */
  detail: string;
  /** True when draft passes full validation (ready to save). */
  isReadyToSave: boolean;
};

export function buildNutritionMacroSummaryBarModel(fields: NutritionLogFormFields): NutritionMacroSummaryBarModel {
  const v = validateNutritionLogForm(fields);
  if (v.ok) {
    const fib =
      v.values.fiberG != null && v.values.fiberG > 0
        ? ` · Fiber ${Math.round(v.values.fiberG)}g`
        : "";
    return {
      headline: `${Math.round(v.values.totalKcal).toLocaleString()} kcal`,
      detail: `P ${Math.round(v.values.proteinG)}g · C ${Math.round(v.values.carbsG)}g · F ${Math.round(v.values.fatG)}g${fib}`,
      isReadyToSave: true,
    };
  }
  const t = fields.totalKcal.trim();
  const hasAny =
    t !== "" ||
    fields.proteinG.trim() !== "" ||
    fields.carbsG.trim() !== "" ||
    fields.fatG.trim() !== "" ||
    fields.fiberG.trim() !== "";
  return {
    headline: hasAny ? "Day draft (in progress)" : "Day draft",
    detail: hasAny ? "Finish required macros to save." : "Enter calories and macros above, then tap Save day.",
    isReadyToSave: false,
  };
}
