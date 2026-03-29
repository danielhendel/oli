import { useMemo } from "react";
import type { NutritionLogFormFields } from "@/lib/nutrition/nutritionLogForm";
import { buildNutritionQuickAddViewModel } from "@/lib/data/nutrition/buildNutritionQuickAddViewModel";

/**
 * Memoized view-model for Quick Add macro fields (presentation-only derivation).
 */
export function useNutritionQuickAddForm(
  fields: NutritionLogFormFields,
  displayedFieldErrors: Partial<Record<keyof NutritionLogFormFields, string>>,
) {
  return useMemo(
    () => buildNutritionQuickAddViewModel({ fields, displayedFieldErrors }),
    [fields, displayedFieldErrors],
  );
}
