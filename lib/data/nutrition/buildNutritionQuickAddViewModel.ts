// lib/data/nutrition/buildNutritionQuickAddViewModel.ts
import type { NutritionLogFormFields } from "@/lib/nutrition/nutritionLogForm";

export type QuickAddMacroRowVm = {
  key: keyof Pick<NutritionLogFormFields, "totalKcal" | "proteinG" | "carbsG" | "fatG">;
  label: string;
  unit: string;
  accessibilityLabel: string;
  value: string;
  error?: string;
};

export type QuickAddFiberVm = {
  value: string;
  error?: string;
};

const MACRO_ROWS: Omit<QuickAddMacroRowVm, "value" | "error">[] = [
  { key: "totalKcal", label: "Calories", unit: "kcal", accessibilityLabel: "Calories, kilocalories" },
  { key: "proteinG", label: "Protein", unit: "g", accessibilityLabel: "Protein, grams" },
  { key: "carbsG", label: "Carbs", unit: "g", accessibilityLabel: "Carbohydrates, grams" },
  { key: "fatG", label: "Fat", unit: "g", accessibilityLabel: "Fat, grams" },
];

export function buildNutritionQuickAddViewModel(args: {
  fields: NutritionLogFormFields;
  displayedFieldErrors: Partial<Record<keyof NutritionLogFormFields, string>>;
}): { macroRows: QuickAddMacroRowVm[]; fiber: QuickAddFiberVm } {
  const macroRows: QuickAddMacroRowVm[] = MACRO_ROWS.map((row) => {
    const err = args.displayedFieldErrors[row.key];
    return {
      ...row,
      value: args.fields[row.key],
      ...(err != null ? { error: err } : {}),
    };
  });
  const fiberErr = args.displayedFieldErrors.fiberG;
  return {
    macroRows,
    fiber: {
      value: args.fields.fiberG,
      ...(fiberErr != null ? { error: fiberErr } : {}),
    },
  };
}
