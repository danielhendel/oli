import { useCallback, useMemo, useState } from "react";
import {
  buildNutritionMealBuilderTotals,
  createEmptyMealFoodRow,
  type MealFoodRow,
} from "@/lib/data/nutrition/buildNutritionMealBuilderTotals";

function newRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type UseNutritionMealBuilderResult = {
  rows: MealFoodRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
  updateRow: (id: string, patch: Partial<MealFoodRow>) => void;
  clearMeal: () => void;
  totalsResult: ReturnType<typeof buildNutritionMealBuilderTotals>;
};

export function useNutritionMealBuilder(): UseNutritionMealBuilderResult {
  const [rows, setRows] = useState<MealFoodRow[]>(() => [createEmptyMealFoodRow(newRowId())]);

  const addRow = useCallback(() => {
    setRows((r) => [...r, createEmptyMealFoodRow(newRowId())]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((r) => {
      if (r.length <= 1) return r;
      return r.filter((row) => row.id !== id);
    });
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<MealFoodRow>) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const clearMeal = useCallback(() => {
    setRows([createEmptyMealFoodRow(newRowId())]);
  }, []);

  const totalsResult = useMemo(() => buildNutritionMealBuilderTotals(rows), [rows]);

  return { rows, addRow, removeRow, updateRow, clearMeal, totalsResult };
}
