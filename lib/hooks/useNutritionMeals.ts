import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  createNutritionMeal,
  deleteNutritionMeal,
  getNutritionMeals,
} from "@/lib/api/usersMe";
import type { CreateMealRequest, Meal } from "@oli/contracts/nutritionMeal";

export type UseNutritionMealsResult = {
  items: readonly Meal[];
  loading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  createMeal: (body: CreateMealRequest) => Promise<boolean>;
  removeMeal: (mealId: string) => Promise<boolean>;
};

// Caller-generated Idempotency-Key (mirrors app/(app)/labs/log.tsx repo-truth pattern).
function makeIdempotencyKey(): string {
  return `meal-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useNutritionMeals(): UseNutritionMealsResult {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<readonly Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setItems([]);
        setErrorMessage("Sign in required");
        return;
      }
      const res = await getNutritionMeals(token);
      if (!res.ok) {
        setErrorMessage(res.error ?? "Could not load meals");
        return;
      }
      setItems(res.json.items);
    } catch {
      setErrorMessage("Could not load meals");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createMeal = useCallback(
    async (body: CreateMealRequest): Promise<boolean> => {
      try {
        const token = await getIdToken();
        if (!token) return false;
        const res = await createNutritionMeal(body, token, makeIdempotencyKey());
        if (!res.ok) {
          setErrorMessage(res.error ?? "Could not save meal");
          return false;
        }
        // Server computes totals and is authoritative; re-read after idempotent write.
        await refresh();
        return true;
      } catch {
        setErrorMessage("Could not save meal");
        return false;
      }
    },
    [getIdToken, refresh],
  );

  const removeMeal = useCallback(
    async (mealId: string): Promise<boolean> => {
      try {
        const token = await getIdToken();
        if (!token) return false;
        const res = await deleteNutritionMeal(mealId, token);
        if (!res.ok) {
          setErrorMessage(res.error ?? "Could not delete meal");
          return false;
        }
        setItems((prev) => prev.filter((x) => x.id !== mealId));
        return true;
      } catch {
        setErrorMessage("Could not delete meal");
        return false;
      }
    },
    [getIdToken],
  );

  return { items, loading, errorMessage, refresh, createMeal, removeMeal };
}
