import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createDefaultFoodProvider } from "@/lib/nutrition/defaultFoodProvider";
import { FoodProviderNotFoundError } from "@/lib/nutrition/FoodProviderClient";
import { useNutritionMeta } from "@/lib/hooks/useNutritionMeta";
import { useSubmitTrackedMealNutrition } from "@/lib/hooks/useSubmitTrackedMealNutrition";
import {
  nutritionFoodSearchItemDtoSchema,
  type NutritionFoodSearchItemDto,
} from "@oli/contracts/nutritionFoodSearch";
import type { NutritionIngestSource } from "@/lib/events/manualNutrition";
import type { MealSlot } from "@/lib/nutrition/mealSlot";
import type { DayKey } from "@/lib/ui/calendar/types";

/** A target to quick-log: either a fully materialized food or a reference id to resolve. */
export type QuickLogTarget =
  | { kind: "food"; food: NutritionFoodSearchItemDto; servingMultiplier?: number }
  | { kind: "ref"; id: string };

export type QuickLogOptions = {
  nutritionIngestSource?: NutritionIngestSource;
  mealSlot?: MealSlot;
};

export type QuickLogResult = { ok: true; queued: boolean } | { ok: false };

export type UseNutritionQuickLogResult = {
  /** Id currently being logged (for per-row spinners), or null. */
  pendingId: string | null;
  errorMessage: string | null;
  quickLog: (target: QuickLogTarget, dayKey: DayKey, options?: QuickLogOptions) => Promise<QuickLogResult>;
};

/**
 * One-tap logging from Kitchen / Favorites / Recents.
 *
 * - A `food` target logs immediately (multiplier defaults to 1 = saved serving).
 * - A `ref` target (favorite/recent without macros) is resolved via the food
 *   provider before logging.
 *
 * All persistence goes through {@link useSubmitTrackedMealNutrition}; recents
 * are updated on success. Respects the supplied selected `dayKey`.
 */
export function useNutritionQuickLog(): UseNutritionQuickLogResult {
  const { getIdToken } = useAuth();
  const provider = useMemo(() => createDefaultFoodProvider(getIdToken), [getIdToken]);
  const submit = useSubmitTrackedMealNutrition();
  const metaApi = useNutritionMeta();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickLog = useCallback(
    async (target: QuickLogTarget, dayKey: DayKey, options?: QuickLogOptions): Promise<QuickLogResult> => {
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

        const res = await submit.submit({
          dayKey,
          food,
          servingMultiplier: multiplier,
          nutritionIngestSource: options?.nutritionIngestSource ?? "search",
          observedAtIso: new Date().toISOString(),
          ...(options?.mealSlot !== undefined ? { mealSlot: options.mealSlot } : {}),
        });
        if (!res.ok) {
          setErrorMessage("Could not log food");
          return { ok: false };
        }
        await metaApi.upsertRecent(food);
        return { ok: true, queued: res.queued === true };
      } catch (e) {
        setErrorMessage(
          e instanceof FoodProviderNotFoundError ? "Food not found" : "Could not log food",
        );
        return { ok: false };
      } finally {
        setPendingId(null);
      }
    },
    [provider, submit, metaApi],
  );

  return { pendingId, errorMessage, quickLog };
}
