import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createDefaultFoodProvider } from "@/lib/nutrition/defaultFoodProvider";
import { FoodProviderNotFoundError } from "@/lib/nutrition/FoodProviderClient";
import {
  defaultServingOption,
  resolveServing,
} from "@/lib/nutrition/servingSelection";
import {
  buildMealDraftItemFromFood,
  describeServingSelection,
} from "@/lib/nutrition/mealDraftItem";
import {
  newMealDraftItemId,
  nutritionMealDraftStore,
  type NutritionMealDraftItem,
} from "@/lib/data/nutrition/nutritionMealDraftStore";
import {
  nutritionFoodSearchItemDtoSchema,
  type NutritionFoodSearchItemDto,
} from "@oli/contracts/nutritionFoodSearch";

/** A target to add to the meal draft: a materialized food or a reference id to resolve. */
export type AddToMealDraftTarget =
  | { kind: "food"; food: NutritionFoodSearchItemDto; servingMultiplier?: number }
  | { kind: "ref"; id: string };

export type AddToMealDraftResult =
  | { ok: true; item: NutritionMealDraftItem }
  | { ok: false };

export type UseAddFoodToMealDraftResult = {
  /** Id currently being added (for per-row spinners), or null. */
  pendingId: string | null;
  errorMessage: string | null;
  addToDraft: (target: AddToMealDraftTarget) => Promise<AddToMealDraftResult>;
};

/**
 * Meal-builder counterpart to {@link useNutritionQuickLog}: instead of logging a food to the day,
 * it resolves the chosen serving and appends an item to the in-memory meal draft store. A `ref`
 * target (favorite/recent with no macros) is resolved via the food provider before adding.
 *
 * No Firebase/API writes occur here — the only side effect is the in-memory draft mutation.
 */
export function useAddFoodToMealDraft(): UseAddFoodToMealDraftResult {
  const { getIdToken } = useAuth();
  const provider = useMemo(() => createDefaultFoodProvider(getIdToken), [getIdToken]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addToDraft = useCallback(
    async (target: AddToMealDraftTarget): Promise<AddToMealDraftResult> => {
      const targetId = target.kind === "food" ? target.food.id : target.id;
      setPendingId(targetId);
      setErrorMessage(null);
      try {
        let food: NutritionFoodSearchItemDto;
        let multiplier = 1;
        if (target.kind === "food") {
          food = target.food;
          multiplier = target.servingMultiplier ?? 1;
        } else {
          const detail = await provider.getFoodById(target.id);
          const parsed = nutritionFoodSearchItemDtoSchema.safeParse(detail);
          if (!parsed.success) {
            setErrorMessage("Could not load food");
            return { ok: false };
          }
          food = parsed.data;
        }

        const option = defaultServingOption(food);
        const resolved = resolveServing(food, option, multiplier);
        const servingLabel =
          multiplier === 1
            ? food.servingLabel
            : describeServingSelection(food, option, multiplier);
        const item = buildMealDraftItemFromFood({
          id: newMealDraftItemId(),
          food,
          nutrition: resolved.nutrition,
          servingLabel,
        });
        nutritionMealDraftStore.addItem(item);
        return { ok: true, item };
      } catch (e) {
        setErrorMessage(
          e instanceof FoodProviderNotFoundError ? "Food not found" : "Could not add food",
        );
        return { ok: false };
      } finally {
        setPendingId(null);
      }
    },
    [provider],
  );

  return { pendingId, errorMessage, addToDraft };
}
